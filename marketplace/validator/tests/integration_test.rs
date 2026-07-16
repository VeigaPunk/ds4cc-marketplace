use ds4cc_validator::{
    is_skill_actionable, validate_marketplace, validate_marketplace_dir, validate_plugin,
    MarketplaceEntry, Source,
};
use std::fs;
use std::path::Path;
use std::process::Command;
use tempfile::TempDir;

// ─── Helpers: resolve the real marketplace root from CARGO_MANIFEST_DIR ───────

/// Returns the path to the real `marketplace/` directory (parent of the validator crate),
/// or `None` if the file doesn't exist (isolated / CI-only crate build).
fn real_marketplace_root() -> Option<std::path::PathBuf> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("validator crate has no parent directory");
    let mj = root.join("marketplace.json");
    if mj.exists() {
        Some(root.to_path_buf())
    } else {
        None
    }
}

/// Returns the repo root (grandparent of the validator crate) if the canonical
/// `.agents/plugins/marketplace.json` exists there.
fn repo_root_with_agents_layout() -> Option<std::path::PathBuf> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()? // marketplace/
        .parent()?; // ds4cc-marketplace/
    let canonical = root
        .join(".agents")
        .join("plugins")
        .join("marketplace.json");
    if canonical.exists() {
        Some(root.to_path_buf())
    } else {
        None
    }
}

/// Create a valid plugin.json content
fn valid_plugin_json(name: &str) -> String {
    serde_json::json!({
        "name": name,
        "version": "1.0.0",
        "description": "A test plugin",
        "author": {
            "name": "Test Author"
        },
        "interface": {
            "displayName": "Test Plugin",
            "shortDescription": "Short description",
            "longDescription": "A longer description of what this plugin does.",
            "developerName": "Test Developer",
            "category": "productivity",
            "capabilities": ["read", "write"]
        }
    })
    .to_string()
}

/// Create a valid plugin directory structure under `root/plugins/<name>/`
fn create_valid_plugin(root: &Path, name: &str) {
    let plugin_dir = root.join("plugins").join(name);
    let codex_dir = plugin_dir.join(".codex-plugin");
    let skills_dir = plugin_dir.join("skills");

    fs::create_dir_all(&codex_dir).unwrap();
    fs::create_dir_all(&skills_dir).unwrap();

    // Write plugin.json
    fs::write(codex_dir.join("plugin.json"), valid_plugin_json(name)).unwrap();

    // Write README.md
    fs::write(
        plugin_dir.join("README.md"),
        "# Test Plugin\n\nThis is a test plugin.",
    )
    .unwrap();

    // Write an actionable SKILL.md with a fenced code block
    let skill_content = "# Overview\n\nRun the plugin:\n\n```bash\ncargo run\n```\n";
    fs::write(skills_dir.join("OVERVIEW.md"), skill_content).unwrap();
}

/// Create a marketplace.json with a single plugin entry
fn create_marketplace_json(root: &Path, plugin_name: &str) {
    let marketplace = serde_json::json!({
        "name": "Test Marketplace",
        "plugins": [
            {
                "name": plugin_name,
                "source": {
                    "source": "local",
                    "path": format!("./plugins/{}", plugin_name)
                }
            }
        ]
    });
    fs::write(root.join("marketplace.json"), marketplace.to_string()).unwrap();
}

// ─── Test 1: Valid marketplace passes ────────────────────────────────────────

#[test]
fn test_valid_marketplace_passes() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    create_valid_plugin(root, "my-plugin");
    create_marketplace_json(root, "my-plugin");

    let marketplace_json = root.join("marketplace.json");
    let result = validate_marketplace(&marketplace_json).unwrap();
    assert!(result.is_empty(), "Expected no errors, got: {:?}", result);
}

// ─── Test 2: Missing plugin.json fails ───────────────────────────────────────

#[test]
fn test_missing_plugin_json_fails() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    // Create plugin directory but NO plugin.json
    let plugin_dir = root.join("plugins").join("broken-plugin");
    fs::create_dir_all(plugin_dir.join(".codex-plugin")).unwrap();
    fs::create_dir_all(plugin_dir.join("skills")).unwrap();
    fs::write(plugin_dir.join("README.md"), "# broken").unwrap();

    create_marketplace_json(root, "broken-plugin");

    let marketplace_json = root.join("marketplace.json");
    let result = validate_marketplace(&marketplace_json).unwrap();

    assert!(
        !result.is_empty(),
        "Expected errors for missing plugin.json"
    );
    let combined = result.join("\n").to_lowercase();
    assert!(
        combined.contains("manifest")
            || combined.contains("plugin.json")
            || combined.contains("no such file")
            || combined.contains("failed to read"),
        "Expected error about missing plugin.json, got: {:?}",
        result
    );
}

// ─── Test 3: Docs-only skill fails ───────────────────────────────────────────

#[test]
fn test_docs_only_skill_fails() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    create_valid_plugin(root, "docs-plugin");

    // Overwrite the SKILL.md with a non-actionable docs-only body
    let skills_dir = root.join("plugins").join("docs-plugin").join("skills");
    let docs_only = "Read the README, docs, and key instruction files in the plugin repository package under this plugin root.\nSummarize the current workflow, how to use it, and the key commands.\nKeep it concise and actionable.";
    fs::write(skills_dir.join("OVERVIEW.md"), docs_only).unwrap();

    create_marketplace_json(root, "docs-plugin");

    let marketplace_json = root.join("marketplace.json");
    let result = validate_marketplace(&marketplace_json).unwrap();

    assert!(
        !result.is_empty(),
        "Expected errors for non-actionable skill"
    );
    let combined = result.join("\n").to_lowercase();
    assert!(
        combined.contains("actionable") || combined.contains("skill"),
        "Expected error about non-actionable skill, got: {:?}",
        result
    );
}

// ─── Test 4: Actionable skill passes ─────────────────────────────────────────

#[test]
fn test_actionable_skill_passes() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    create_valid_plugin(root, "action-plugin");

    // The default SKILL.md from create_valid_plugin already has a code block
    // Let's explicitly set it to be sure
    let skills_dir = root.join("plugins").join("action-plugin").join("skills");
    let actionable = "# Run the plugin\n\n```bash\ncargo run --release\n```\n";
    fs::write(skills_dir.join("OVERVIEW.md"), actionable).unwrap();

    create_marketplace_json(root, "action-plugin");

    let marketplace_json = root.join("marketplace.json");
    let result = validate_marketplace(&marketplace_json).unwrap();

    assert!(
        result.is_empty(),
        "Expected no errors for actionable skill, got: {:?}",
        result
    );
}

// ─── Test 5: is_skill_actionable with code block → true ──────────────────────

#[test]
fn test_is_skill_actionable_with_code_block() {
    let content = "# My Skill\n\nDo this:\n\n```bash\ncargo build\n```\n";
    assert!(
        is_skill_actionable(content),
        "Expected true for skill with code block"
    );
}

// ─── Test 6: is_skill_actionable boilerplate → false ─────────────────────────

#[test]
fn test_is_skill_not_actionable_boilerplate() {
    let content = "Read the README, docs, and key instruction files in the plugin repository package under this plugin root.\nSummarize the current workflow, how to use it, and the key commands.\nKeep it concise and actionable.";
    assert!(
        !is_skill_actionable(content),
        "Expected false for docs-only boilerplate skill"
    );
}

// ─── Test 7: Semver validation ────────────────────────────────────────────────

#[test]
fn test_semver_validation() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    let plugin_name = "semver-plugin";
    create_valid_plugin(root, plugin_name);

    // Good semver: 1.2.3 — no version errors
    {
        let codex_dir = root.join("plugins").join(plugin_name).join(".codex-plugin");
        let good_plugin = serde_json::json!({
            "name": plugin_name,
            "version": "1.2.3",
            "description": "A test plugin",
            "author": { "name": "Test Author" },
            "interface": {
                "displayName": "Test Plugin",
                "shortDescription": "Short",
                "longDescription": "Long description",
                "developerName": "Developer",
                "category": "productivity",
                "capabilities": ["read"]
            }
        });
        fs::write(codex_dir.join("plugin.json"), good_plugin.to_string()).unwrap();

        let entry = MarketplaceEntry {
            name: plugin_name.to_string(),
            source: Source {
                source: "local".to_string(),
                path: format!("./plugins/{}", plugin_name),
            },
            policy: None,
            category: None,
        };

        let errors = validate_plugin(root, &entry);
        let version_errors: Vec<_> = errors
            .iter()
            .filter(|e| e.contains("semver") || e.contains("version"))
            .collect();
        assert!(
            version_errors.is_empty(),
            "Expected no version errors for '1.2.3', got: {:?}",
            version_errors
        );
    }

    // Bad semver: 1.0 — should produce a version error
    {
        let codex_dir = root.join("plugins").join(plugin_name).join(".codex-plugin");
        let bad_plugin = serde_json::json!({
            "name": plugin_name,
            "version": "1.0",
            "description": "A test plugin",
            "author": { "name": "Test Author" },
            "interface": {
                "displayName": "Test Plugin",
                "shortDescription": "Short",
                "longDescription": "Long description",
                "developerName": "Developer",
                "category": "productivity",
                "capabilities": ["read"]
            }
        });
        fs::write(codex_dir.join("plugin.json"), bad_plugin.to_string()).unwrap();

        let entry = MarketplaceEntry {
            name: plugin_name.to_string(),
            source: Source {
                source: "local".to_string(),
                path: format!("./plugins/{}", plugin_name),
            },
            policy: None,
            category: None,
        };

        let errors = validate_plugin(root, &entry);
        let version_errors: Vec<_> = errors
            .iter()
            .filter(|e| e.contains("semver") || e.contains("version"))
            .collect();
        assert!(
            !version_errors.is_empty(),
            "Expected a version error for '1.0', got no version errors. All errors: {:?}",
            errors
        );
    }
}

// ─── Test 8: Real marketplace.json validates without errors ───────────────────
// Ported from validate_marketplace.py::test_marketplace_shape /
//   test_plugin_manifest_alignment / test_plugin_has_files / test_skill_actionability

#[test]
fn test_real_marketplace_validates() {
    let Some(root) = real_marketplace_root() else {
        eprintln!("Skipping test_real_marketplace_validates: marketplace.json not found");
        return;
    };
    let marketplace_json = root.join("marketplace.json");
    let result = validate_marketplace(&marketplace_json)
        .expect("validate_marketplace should not fail fatally");
    assert!(
        result.is_empty(),
        "Real marketplace validation errors:\n{}",
        result.join("\n")
    );
}

// ─── Test 9: Expected plugins are all present ─────────────────────────────────
// Ported from validate_marketplace.py::test_expected_plugins_present and
//   test_codex_isolated.sh (plugin presence checks)

#[test]
fn test_expected_plugins_present() {
    let Some(root) = real_marketplace_root() else {
        eprintln!("Skipping test_expected_plugins_present: marketplace.json not found");
        return;
    };
    let marketplace_json = root.join("marketplace.json");
    let content = fs::read_to_string(&marketplace_json).expect("failed to read marketplace.json");
    let marketplace: serde_json::Value =
        serde_json::from_str(&content).expect("failed to parse marketplace.json");

    let names: Vec<String> = marketplace["plugins"]
        .as_array()
        .expect("plugins must be an array")
        .iter()
        .filter_map(|p| p["name"].as_str().map(String::from))
        .collect();

    let expected = [
        "spoderman",
        "xbrd-gdsp-fknpft",
        "aaronplug",
        "infinizoom",
        "godspeed-codex-command",
        "the-puppeteer",
        "godspeed-core",
        "myagents",
        "mycommands",
        "myskills",
        "agent-wall",
        "ds4cc",
    ];

    let missing: Vec<&str> = expected
        .iter()
        .copied()
        .filter(|&e| !names.iter().any(|n| n == e))
        .collect();

    assert!(
        missing.is_empty(),
        "Missing expected plugins: {:?}\nFound: {:?}",
        missing,
        names
    );
}

// ─── Test 10: Isolated Codex process execution ────────────────────────────────
// Ported from test_codex_isolated.sh using std::process::Command.
// Uses a temp CODEX_HOME so no real user config is touched.

#[test]
fn test_codex_cli_isolated_process() {
    // Check codex is in PATH; skip gracefully if not
    let codex_path = Command::new("which")
        .arg("codex")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !codex_path {
        eprintln!("Skipping test_codex_cli_isolated_process: codex not in PATH");
        return;
    }

    // Test 1: `codex plugin --help` shows "marketplace" subcommand
    let help_output = Command::new("codex")
        .args(["plugin", "--help"])
        .output()
        .expect("failed to run codex plugin --help");

    let help_text = format!(
        "{}{}",
        String::from_utf8_lossy(&help_output.stdout),
        String::from_utf8_lossy(&help_output.stderr)
    );
    assert!(
        help_text.contains("marketplace"),
        "Expected 'marketplace' in `codex plugin --help` output.\nGot: {}",
        help_text
    );

    // Test 2: `codex plugin list` with isolated CODEX_HOME and a local marketplace URL.
    // Accept plugin names in output OR a known auth/network error — the process must not crash.
    let Some(root) = real_marketplace_root() else {
        eprintln!("Skipping codex plugin list sub-test: marketplace.json not found");
        return;
    };
    let marketplace_json = root.join("marketplace.json");
    let marketplace_url = format!("file://{}", marketplace_json.display());

    let tmp = TempDir::new().expect("failed to create temp dir");
    let codex_home = tmp.path().join(".codex");
    fs::create_dir_all(&codex_home).expect("failed to create temp CODEX_HOME");

    let list_output = Command::new("codex")
        .args([
            "-c",
            &format!(
                "plugins.marketplaces=[{{url='{}',name='ds4cc-test'}}]",
                marketplace_url
            ),
            "plugin",
            "list",
        ])
        .env("CODEX_HOME", &codex_home)
        .output()
        .expect("failed to run `codex plugin list`");

    let list_text = format!(
        "{}{}",
        String::from_utf8_lossy(&list_output.stdout),
        String::from_utf8_lossy(&list_output.stderr)
    );

    // Accept: plugin names shown, or auth/login required error, or any non-empty output.
    // The only failure is a completely silent crash (no output at all).
    assert!(
        !list_text.is_empty(),
        "`codex plugin list` produced no output (exit={})",
        list_output.status
    );
}

// ─── Test 11: FNM multishell Node isolation ───────────────────────────────────
// Node-dependent plugins (aaronplug, infinizoom) require a pinned Node version.
// FNM's `exec --using <alias>` spawns an isolated subprocess with exactly that
// Node binary in PATH — no global env mutation, safe for concurrent test runs.

#[test]
fn test_fnm_node_isolation() {
    // Skip gracefully if fnm not available
    let fnm_ok = Command::new("which")
        .arg("fnm")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if !fnm_ok {
        eprintln!("Skipping test_fnm_node_isolation: fnm not in PATH");
        return;
    }

    // Sanity: fnm reports its own version
    let ver = Command::new("fnm")
        .arg("--version")
        .output()
        .expect("fnm --version failed");
    assert!(ver.status.success(), "fnm --version exited non-zero");
    let ver_str = String::from_utf8_lossy(&ver.stdout);
    assert!(
        ver_str.starts_with("fnm "),
        "Unexpected fnm output: {}",
        ver_str
    );

    // Core isolation probe: fnm exec pins the active Node to lts-latest and
    // runs node in a clean subprocess with that version in PATH.
    // Each fnm exec call is fully self-contained — no eval/source required.
    let node_ver = Command::new("fnm")
        .args(["exec", "--using", "lts-latest", "--", "node", "--version"])
        .output()
        .expect("fnm exec node --version failed");

    let nv_out = String::from_utf8_lossy(&node_ver.stdout);
    let nv_err = String::from_utf8_lossy(&node_ver.stderr);
    let nv = format!("{}{}", nv_out, nv_err);

    assert!(
        !nv.trim().is_empty(),
        "fnm exec node --version produced no output (exit={})",
        node_ver.status
    );

    if node_ver.status.success() {
        assert!(
            nv_out.trim().starts_with('v'),
            "Expected Node version starting with 'v', got: {}",
            nv
        );
    }

    // Package.json parse probe: verify aaronplug's Node deps manifest is valid
    // JSON without executing npm/bun install (cheap, safe, sufficient for CI).
    let Some(root) = real_marketplace_root() else {
        eprintln!("Skipping aaronplug package.json check: marketplace root not found");
        return;
    };
    let pkg_json = root.join("plugins").join("aaronplug").join("package.json");
    if pkg_json.exists() {
        let content = fs::read_to_string(&pkg_json).expect("failed to read aaronplug package.json");
        let _: serde_json::Value =
            serde_json::from_str(&content).expect("aaronplug package.json is not valid JSON");
    }
}

// ─── Test 12: Canonical .agents/plugins/marketplace.json validates ────────────
// Validates the Codex-native layout at <repo-root>/.agents/plugins/marketplace.json
// using validate_marketplace_dir(), which resolves plugin paths relative to the
// repo root (not the json file's parent). All 12 plugins must pass with no errors.

#[test]
fn test_canonical_agents_layout_validates() {
    let Some(root) = repo_root_with_agents_layout() else {
        eprintln!(
            "Skipping test_canonical_agents_layout_validates: \
             .agents/plugins/marketplace.json not found"
        );
        return;
    };

    let result =
        validate_marketplace_dir(&root).expect("validate_marketplace_dir should not fail fatally");

    assert!(
        result.is_empty(),
        "Canonical agents layout validation errors:\n{}",
        result.join("\n")
    );
}

// ─── Test 13: Real codex plugin list shows all 12 ds4cc plugins ──────────────
// Evidence gate: runs `codex plugin list` and asserts all 12 plugin names appear
// in the output under the `ds4cc` marketplace section.

#[test]
fn test_codex_plugin_list_ds4cc_complete() {
    let codex_ok = Command::new("which")
        .arg("codex")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if !codex_ok {
        eprintln!("Skipping test_codex_plugin_list_ds4cc_complete: codex not in PATH");
        return;
    }

    let output = Command::new("codex")
        .args(["plugin", "list"])
        .output()
        .expect("failed to run codex plugin list");

    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    let expected = [
        "spoderman@ds4cc",
        "xbrd-gdsp-fknpft@ds4cc",
        "aaronplug@ds4cc",
        "infinizoom@ds4cc",
        "godspeed-codex-command@ds4cc",
        "the-puppeteer@ds4cc",
        "godspeed-core@ds4cc",
        "myagents@ds4cc",
        "mycommands@ds4cc",
        "myskills@ds4cc",
        "agent-wall@ds4cc",
        "ds4cc@ds4cc",
    ];

    let missing: Vec<&str> = expected
        .iter()
        .copied()
        .filter(|&name| !text.contains(name))
        .collect();

    assert!(
        missing.is_empty(),
        "Missing from `codex plugin list` output: {:?}\nFull output:\n{}",
        missing,
        text
    );
}

// ─── Security tests (red-first) ───────────────────────────────────────────────
// These tests MUST fail before the fix lands and MUST pass after.

// ─── Sec-1: Malicious name with path-traversal components ────────────────────
// name = "../../../etc" crafted so that expected_legacy = "./plugins/../../../etc"
// which would MATCH source.path → plugin_dir escapes root without a name guard.

#[test]
fn test_malicious_name_traversal() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    // No plugin directories created — validator must reject before any I/O.
    let marketplace = serde_json::json!({
        "plugins": [{
            "name": "../../../etc",
            "source": {
                "source": "local",
                "path": "./plugins/../../../etc"
            }
        }]
    });
    fs::write(root.join("marketplace.json"), marketplace.to_string()).unwrap();

    let result = validate_marketplace(&root.join("marketplace.json")).unwrap();
    assert!(
        !result.is_empty(),
        "Expected traversal/invalid-name error; validator produced no errors"
    );
    let combined = result.join("\n").to_lowercase();
    assert!(
        combined.contains("traversal") || combined.contains("invalid") || combined.contains("name"),
        "Expected path-traversal rejection, got: {:?}",
        result
    );
}

// ─── Sec-2: Malicious source.path with traversal components ──────────────────
// Safe name but source.path = "./plugins/../../outside" which the format check
// should reject AND must not attempt any out-of-root read.

#[test]
fn test_malicious_source_path_traversal() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    // Do NOT create anything outside the root — validator must stop early.
    let marketplace = serde_json::json!({
        "plugins": [{
            "name": "legit-plugin",
            "source": {
                "source": "local",
                "path": "./plugins/../../outside"
            }
        }]
    });
    fs::write(root.join("marketplace.json"), marketplace.to_string()).unwrap();

    let result = validate_marketplace(&root.join("marketplace.json")).unwrap();
    assert!(
        !result.is_empty(),
        "Expected error for traversal source.path; validator produced no errors"
    );
    let combined = result.join("\n").to_lowercase();
    assert!(
        combined.contains("source.path")
            || combined.contains("traversal")
            || combined.contains("path")
            || combined.contains("outside"),
        "Expected path rejection, got: {:?}",
        result
    );
}

// ─── Sec-3: Plugin directory is a symlink pointing outside marketplace root ───

#[test]
fn test_plugin_dir_symlink_escape() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    // Build a valid plugin layout OUTSIDE the marketplace root.
    let outside = TempDir::new().unwrap();
    let secret_dir = outside.path().join("secret");
    fs::create_dir_all(secret_dir.join(".codex-plugin")).unwrap();
    fs::create_dir_all(secret_dir.join("skills")).unwrap();
    fs::write(
        secret_dir.join(".codex-plugin").join("plugin.json"),
        valid_plugin_json("evil"),
    )
    .unwrap();
    fs::write(secret_dir.join("README.md"), "# evil").unwrap();
    fs::write(
        secret_dir.join("skills").join("SKILL.md"),
        "```bash\ncargo run\n```",
    )
    .unwrap();

    // Create plugins/ dir inside root and make "evil" a symlink to the outside dir.
    fs::create_dir_all(root.join("plugins")).unwrap();
    std::os::unix::fs::symlink(&secret_dir, root.join("plugins").join("evil")).unwrap();

    create_marketplace_json(root, "evil");

    let result = validate_marketplace(&root.join("marketplace.json")).unwrap();
    assert!(
        !result.is_empty(),
        "Expected error: plugin dir symlink '{}' escapes marketplace root; validator produced no errors",
        root.join("plugins/evil").display()
    );
    let combined = result.join("\n").to_lowercase();
    assert!(
        combined.contains("outside")
            || combined.contains("traversal")
            || combined.contains("root")
            || combined.contains("escape")
            || combined.contains("symlink"),
        "Expected containment/escape error, got: {:?}",
        result
    );
}

// ─── Sec-4: plugin.json is a symlink pointing to a file outside root ──────────

#[test]
fn test_plugin_json_symlink_escape() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    // Place the "evil" JSON file outside the marketplace root.
    let outside = TempDir::new().unwrap();
    let outside_json = outside.path().join("evil.json");
    fs::write(&outside_json, valid_plugin_json("my-plugin")).unwrap();

    // Create a real plugin dir but make plugin.json a symlink to the outside file.
    let plugin_dir = root.join("plugins").join("my-plugin");
    fs::create_dir_all(plugin_dir.join(".codex-plugin")).unwrap();
    std::os::unix::fs::symlink(
        &outside_json,
        plugin_dir.join(".codex-plugin").join("plugin.json"),
    )
    .unwrap();

    create_marketplace_json(root, "my-plugin");

    let result = validate_marketplace(&root.join("marketplace.json")).unwrap();
    assert!(
        !result.is_empty(),
        "Expected error: plugin.json symlink '{}' escapes marketplace root; validator produced no errors",
        plugin_dir.join(".codex-plugin/plugin.json").display()
    );
    let combined = result.join("\n").to_lowercase();
    assert!(
        combined.contains("outside")
            || combined.contains("traversal")
            || combined.contains("root")
            || combined.contains("escape")
            || combined.contains("symlink"),
        "Expected containment/escape error, got: {:?}",
        result
    );
}

// ─── Sec-5: Symlink inside skills/ points to a directory outside root ─────────

#[test]
fn test_recursive_skills_symlink_escape() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    // Build a legitimate plugin first.
    create_valid_plugin(root, "symlink-plugin");

    // Build a skills directory OUTSIDE the root with .md content.
    let outside = TempDir::new().unwrap();
    let outside_skills = outside.path().join("external-skills");
    fs::create_dir_all(&outside_skills).unwrap();
    fs::write(outside_skills.join("EVIL.md"), "```bash\nrm -rf /\n```").unwrap();

    // Place a symlink named "escaped" inside the plugin's skills/ directory.
    let skills_dir = root.join("plugins").join("symlink-plugin").join("skills");
    std::os::unix::fs::symlink(&outside_skills, skills_dir.join("escaped")).unwrap();

    create_marketplace_json(root, "symlink-plugin");

    let result = validate_marketplace(&root.join("marketplace.json")).unwrap();
    assert!(
        !result.is_empty(),
        "Expected error: skills/ symlink '{}' escapes marketplace root; validator produced no errors",
        skills_dir.join("escaped").display()
    );
    let combined = result.join("\n").to_lowercase();
    assert!(
        combined.contains("outside")
            || combined.contains("traversal")
            || combined.contains("root")
            || combined.contains("escape")
            || combined.contains("skill"),
        "Expected containment/escape error, got: {:?}",
        result
    );
}
