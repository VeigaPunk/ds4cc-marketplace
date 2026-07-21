use serde::Deserialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
pub struct Source {
    pub source: String,
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct Policy {
    pub installation: Option<String>,
    pub authentication: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MarketplaceEntry {
    pub name: String,
    pub source: Source,
    pub policy: Option<Policy>,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Marketplace {
    pub name: Option<String>,
    pub interface: Option<serde_json::Value>,
    pub plugins: Vec<MarketplaceEntry>,
}

#[derive(Debug, Deserialize)]
pub struct Author {
    pub name: String,
}

#[allow(non_snake_case)]
#[derive(Debug, Deserialize)]
pub struct PluginInterface {
    pub displayName: String,
    pub shortDescription: String,
    pub longDescription: String,
    pub developerName: String,
    pub category: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct Plugin {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: Author,
    pub skills: Option<String>,
    pub interface: PluginInterface,
}

/// Validate a marketplace.json file. Returns a list of error strings.
/// Plugin source paths are resolved relative to `marketplace_json`'s parent directory.
/// This is the legacy layout: `marketplace.json` lives beside the `plugins/` directory.
pub fn validate_marketplace(marketplace_json: &Path) -> anyhow::Result<Vec<String>> {
    let plugins_base = marketplace_json.parent().unwrap_or_else(|| Path::new("."));
    validate_marketplace_with_base(marketplace_json, plugins_base)
}

/// Auto-detect and validate the marketplace rooted at `root`.
///
/// Search order:
/// 1. `<root>/marketplace.json` — legacy layout, plugins at `./plugins/<name>`.
/// 2. `<root>/.agents/plugins/marketplace.json` — canonical Codex layout, plugins at
///    `./marketplace/plugins/<name>`.
///
/// In both cases plugin source paths are resolved relative to `root`.
pub fn validate_marketplace_dir(root: &Path) -> anyhow::Result<Vec<String>> {
    let legacy = root.join("marketplace.json");
    let canonical = root
        .join(".agents")
        .join("plugins")
        .join("marketplace.json");

    let json = if legacy.exists() {
        legacy
    } else if canonical.exists() {
        canonical
    } else {
        return Err(anyhow::anyhow!(
            "No marketplace.json found at '{}' or '{}'",
            root.join("marketplace.json").display(),
            canonical.display()
        ));
    };

    validate_marketplace_with_base(&json, root)
}

/// Internal: validate a marketplace json, resolving plugin paths relative to `plugins_base`.
fn validate_marketplace_with_base(
    marketplace_json: &Path,
    plugins_base: &Path,
) -> anyhow::Result<Vec<String>> {
    let content = std::fs::read_to_string(marketplace_json)
        .map_err(|e| anyhow::anyhow!("Failed to read marketplace.json: {}", e))?;

    let marketplace: Marketplace = serde_json::from_str(&content)
        .map_err(|e| anyhow::anyhow!("Failed to parse marketplace.json: {}", e))?;

    let mut errors = Vec::new();

    if marketplace.plugins.is_empty() {
        errors.push("marketplace.json: plugins list is empty".to_string());
    }

    for entry in &marketplace.plugins {
        let plugin_errors = validate_plugin(plugins_base, entry);
        errors.extend(plugin_errors);
    }

    Ok(errors)
}

/// Validate a single plugin entry. Returns a list of error strings.
///
/// # Security invariant
///
/// No file I/O is performed until the plugin directory has been confirmed to
/// reside strictly within `marketplace_root` (symlinks resolved via
/// `std::fs::canonicalize`).  Path-traversal in `entry.name` or
/// `entry.source.path`, and symlink escapes at the plugin-dir, plugin.json,
/// or skills/ level, are all rejected before any read.
pub fn validate_plugin(marketplace_root: &Path, entry: &MarketplaceEntry) -> Vec<String> {
    let mut errors = Vec::new();

    // ── Security gate 1: validate name before any path construction ───────────
    //
    // A crafted name such as "../../etc" would make expected_legacy equal
    // "./plugins/../../etc", which trivially matches a matching source.path and
    // would cause plugin_dir to escape the root without this guard.
    if !is_safe_name(&entry.name) {
        errors.push(format!(
            "Plugin '{}': name contains path-traversal or invalid characters",
            entry.name
        ));
        return errors; // cannot proceed safely
    }

    // Check source type
    if entry.source.source != "local" {
        errors.push(format!(
            "Plugin '{}': source.source must be 'local', got '{}'",
            entry.name, entry.source.source
        ));
    }

    // ── Security gate 2: validate source.path format; reject before any read ──
    //
    // Early return ensures we never attempt to resolve or read a path we've
    // flagged as malformed — regardless of what the filesystem holds there.
    let expected_legacy = format!("./plugins/{}", entry.name);
    let expected_canonical = format!("./marketplace/plugins/{}", entry.name);
    if entry.source.path != expected_legacy && entry.source.path != expected_canonical {
        errors.push(format!(
            "Plugin '{}': source.path must be '{}' or '{}', got '{}'",
            entry.name, expected_legacy, expected_canonical, entry.source.path
        ));
        // Stop here: do not attempt to resolve or read a path we have already
        // rejected.  This prevents any out-of-root I/O even when the filesystem
        // holds an exploitable target at the malformed path.
        return errors;
    }

    // Canonicalize marketplace_root once; required for all subsequent checks.
    let canonical_root = match marketplace_root.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            errors.push(format!(
                "Plugin '{}': failed to canonicalize marketplace root '{}': {}",
                entry.name,
                marketplace_root.display(),
                e
            ));
            return errors;
        }
    };

    // Resolve plugin_dir from source.path (strip leading "./") relative to root.
    let relative_path = entry.source.path.trim_start_matches("./");
    let plugin_dir_raw = marketplace_root.join(relative_path);

    // ── Security gate 3: reject plugin directory symlink / traversal escape ───
    //
    // Canonicalize resolves symlinks; if the resolved path is outside root, a
    // symlink under plugins/ is pointing to an external target.
    let plugin_dir: PathBuf = match plugin_dir_raw.canonicalize() {
        Ok(p) => {
            if !p.starts_with(&canonical_root) {
                errors.push(format!(
                    "Plugin '{}': plugin directory '{}' resolves to '{}' which is outside \
                     marketplace root — symlink escape or path traversal detected",
                    entry.name,
                    plugin_dir_raw.display(),
                    p.display()
                ));
                return errors;
            }
            p
        }
        // Directory does not exist yet — let subsequent I/O produce a clear
        // "no such file" error rather than a cryptic canonicalize failure.
        Err(_) => plugin_dir_raw.clone(),
    };

    // ── Security gate 4: reject plugin.json symlink escape ────────────────────
    let plugin_json_path = plugin_dir.join(".codex-plugin").join("plugin.json");
    if let Ok(canonical_json) = plugin_json_path.canonicalize() {
        if !canonical_json.starts_with(&canonical_root) {
            errors.push(format!(
                "Plugin '{}': plugin.json resolves to '{}' which is outside marketplace \
                 root — symlink escape detected",
                entry.name,
                canonical_json.display()
            ));
            return errors;
        }
    }
    // (If canonicalize fails the file doesn't exist; read_to_string below will
    // surface a clear I/O error.)

    // Read plugin.json
    let plugin_content = match std::fs::read_to_string(&plugin_json_path) {
        Ok(c) => c,
        Err(e) => {
            errors.push(format!(
                "Plugin '{}': failed to read plugin.json manifest: {}",
                entry.name, e
            ));
            return errors;
        }
    };

    let plugin: Plugin = match serde_json::from_str(&plugin_content) {
        Ok(p) => p,
        Err(e) => {
            errors.push(format!(
                "Plugin '{}': failed to parse plugin.json: {}",
                entry.name, e
            ));
            return errors;
        }
    };

    // Check plugin name matches entry name
    if plugin.name != entry.name {
        errors.push(format!(
            "Plugin '{}': plugin.json name '{}' does not match entry name",
            entry.name, plugin.name
        ));
    }

    // Check version is semver (X.Y.Z)
    if !is_valid_semver(&plugin.version) {
        errors.push(format!(
            "Plugin '{}': version '{}' is not valid semver (expected X.Y.Z)",
            entry.name, plugin.version
        ));
    }

    // Check description non-empty
    if plugin.description.trim().is_empty() {
        errors.push(format!("Plugin '{}': description is empty", entry.name));
    }

    // Check author.name non-empty
    if plugin.author.name.trim().is_empty() {
        errors.push(format!("Plugin '{}': author.name is empty", entry.name));
    }

    // Check interface fields non-empty
    if plugin.interface.displayName.trim().is_empty() {
        errors.push(format!(
            "Plugin '{}': interface.displayName is empty",
            entry.name
        ));
    }
    if plugin.interface.shortDescription.trim().is_empty() {
        errors.push(format!(
            "Plugin '{}': interface.shortDescription is empty",
            entry.name
        ));
    }
    if plugin.interface.longDescription.trim().is_empty() {
        errors.push(format!(
            "Plugin '{}': interface.longDescription is empty",
            entry.name
        ));
    }
    if plugin.interface.developerName.trim().is_empty() {
        errors.push(format!(
            "Plugin '{}': interface.developerName is empty",
            entry.name
        ));
    }
    if plugin.interface.category.trim().is_empty() {
        errors.push(format!(
            "Plugin '{}': interface.category is empty",
            entry.name
        ));
    }

    // Check capabilities non-empty
    if plugin.interface.capabilities.is_empty() {
        errors.push(format!(
            "Plugin '{}': interface.capabilities is empty",
            entry.name
        ));
    }

    // Check skills/ directory exists
    let skills_dir = plugin_dir.join("skills");
    if !skills_dir.exists() || !skills_dir.is_dir() {
        errors.push(format!(
            "Plugin '{}': skills/ directory not found",
            entry.name
        ));
    }

    // Check README.md exists
    let readme_path = plugin_dir.join("README.md");
    if !readme_path.exists() {
        errors.push(format!("Plugin '{}': README.md not found", entry.name));
    }

    // ── Security gate 5 (inside collect_md_files): reject skills/ symlink escape
    //
    // collect_md_files canonicalizes every path it encounters and rejects any
    // that resolves outside canonical_root.  This catches symlinks inside
    // skills/ that point to external directories.
    if skills_dir.exists() && skills_dir.is_dir() {
        let mut skill_paths: Vec<PathBuf> = Vec::new();
        if let Err(e) = collect_md_files(&canonical_root, &skills_dir, &mut skill_paths) {
            errors.push(format!(
                "Plugin '{}': failed to walk skills/ directory: {}",
                entry.name, e
            ));
            return errors;
        }

        if skill_paths.is_empty() {
            errors.push(format!(
                "Plugin '{}': no SKILL.md files found in skills/",
                entry.name
            ));
        } else {
            for skill_path in &skill_paths {
                match std::fs::read_to_string(skill_path) {
                    Ok(content) => {
                        if !is_skill_actionable(&content) {
                            errors.push(format!(
                                "Plugin '{}': skill file '{}' is not actionable (no code block, $ command, or recognized command pattern)",
                                entry.name,
                                skill_path.file_name().unwrap_or_default().to_string_lossy()
                            ));
                        }
                    }
                    Err(e) => {
                        errors.push(format!(
                            "Plugin '{}': failed to read skill file '{}': {}",
                            entry.name,
                            skill_path.display(),
                            e
                        ));
                    }
                }
            }
        }
    }

    errors
}

/// Returns `true` if `name` is safe to use as a plugin directory component.
///
/// Rejects:
/// - empty strings
/// - names starting with `.`  (hidden dirs / current-dir)
/// - names containing `/` or `\`  (embedded separators)
/// - names whose path components include `..` or `.`  (traversal)
/// - names that are not a single `Normal` path component
fn is_safe_name(name: &str) -> bool {
    if name.is_empty() || name.starts_with('.') {
        return false;
    }
    if name.contains('/') || name.contains('\\') {
        return false;
    }
    // Every component must be a plain Normal segment — no ParentDir (..) or
    // RootDir or CurDir (.) sneaking through.
    Path::new(name)
        .components()
        .all(|c| matches!(c, std::path::Component::Normal(_)))
}

/// Recursively collect all `.md` files (case-insensitive) under `dir` into `out`.
///
/// Every entry is canonicalized before being inspected.  If the canonical path
/// falls outside `canonical_root` (symlink escape) an `io::Error` is returned
/// immediately — no further traversal occurs.
fn collect_md_files(
    canonical_root: &Path,
    dir: &Path,
    out: &mut Vec<PathBuf>,
) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        // Resolve symlinks; reject anything that escapes the marketplace root.
        let canonical_path = path.canonicalize()?;
        if !canonical_path.starts_with(canonical_root) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                format!(
                    "path '{}' resolves to '{}' which is outside marketplace root \
                     — symlink escape detected",
                    path.display(),
                    canonical_path.display()
                ),
            ));
        }

        if canonical_path.is_dir() {
            collect_md_files(canonical_root, &canonical_path, out)?;
        } else if canonical_path
            .extension()
            .map(|e| e.to_string_lossy().eq_ignore_ascii_case("md"))
            .unwrap_or(false)
        {
            out.push(canonical_path);
        }
    }
    Ok(())
}

/// Check if a version string is valid semver (X.Y.Z where X, Y, Z are non-negative integers).
fn is_valid_semver(version: &str) -> bool {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() != 3 {
        return false;
    }
    parts.iter().all(|p| p.parse::<u32>().is_ok())
}

/// Check if a skill file content is actionable.
/// Strips frontmatter (content between --- delimiters at the start), then checks for:
/// - A fenced code block (```)
/// - A line starting with $
/// - A specific command pattern: codex , cargo , node , bash , ./, npx
pub fn is_skill_actionable(skill_content: &str) -> bool {
    // Strip frontmatter if present
    let body = strip_frontmatter(skill_content);

    // Check for fenced code block
    if body.contains("```") {
        return true;
    }

    // Check line-by-line
    for line in body.lines() {
        let trimmed = line.trim_start();
        if trimmed.starts_with('$') {
            return true;
        }
        if trimmed.starts_with("codex ")
            || trimmed.starts_with("grok ")
            || trimmed.starts_with("claude ")
            || trimmed.starts_with("copilot ")
            || trimmed.starts_with("cargo ")
            || trimmed.starts_with("node ")
            || trimmed.starts_with("bash ")
            || trimmed.starts_with("./")
            || trimmed.starts_with("npx ")
        {
            return true;
        }
    }

    false
}

/// Strip YAML frontmatter from skill content.
/// If content starts with ---, find the closing --- and return content after it.
fn strip_frontmatter(content: &str) -> &str {
    if !content.starts_with("---") {
        return content;
    }

    // Skip the opening ---
    let after_open = &content[3..];

    // Find the closing ---
    if let Some(close_pos) = after_open.find("\n---") {
        // Return everything after the closing ---\n
        let after_close = &after_open[close_pos + 4..]; // skip \n---
                                                        // Skip optional trailing newline after closing ---
        after_close.strip_prefix('\n').unwrap_or(after_close)
    } else {
        // No closing ---, return original
        content
    }
}
