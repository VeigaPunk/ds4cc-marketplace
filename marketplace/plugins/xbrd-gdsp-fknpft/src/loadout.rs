use anyhow::{anyhow, Context, Result};
use std::path::{Component, Path, PathBuf};

/// Quintessential Godspeed dispatch form, compiled from the package-owned
/// `directive.md` so a loadout cannot silently substitute another variant.
pub const GODSPEED_DIRECTIVE: &str = include_str!("../skills/godspeed/directive.md");

/// A resolved loadout of one or more skills, ready to be injected into a target CLI.
#[derive(Debug, Default, Clone)]
pub struct Loadout {
    /// (skill name, file contents) pairs, in the order the user requested.
    entries: Vec<(String, String)>,
}

impl Loadout {
    /// Empty loadout — injection into a CLI should be a no-op.
    pub fn empty() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    /// Resolve skill names using the default search path:
    ///   1. $HOME/.agents/skills/<name>/SKILL.md
    ///   2. $HOME/.claude/skills/<name>/SKILL.md
    ///   3. $HOME/.config/xbreed/skills/<name>/SKILL.md
    pub fn resolve(names: &[String]) -> Result<Self> {
        let home = std::env::var("HOME").context("HOME is not set")?;
        let search_dirs = [
            PathBuf::from(format!("{home}/.agents/skills")),
            PathBuf::from(format!("{home}/.claude/skills")),
            PathBuf::from(format!("{home}/.config/xbreed/skills")),
        ];
        Self::resolve_with_paths(names, &search_dirs)
    }

    /// Resolve skill names using explicit search directories.
    /// Exposed for unit tests; production callers should use `resolve`.
    pub fn resolve_with_paths(names: &[String], search_dirs: &[PathBuf]) -> Result<Self> {
        let mut entries = Vec::with_capacity(names.len());
        for name in names {
            validate_skill_name(name)?;
            let path = find_skill(name, search_dirs).ok_or_else(|| {
                let attempted = search_dirs
                    .iter()
                    .map(|d| format!("  {}/{}/SKILL.md", d.display(), name))
                    .collect::<Vec<_>>()
                    .join("\n");
                anyhow!("skill not found: {name}\nsearched:\n{attempted}")
            })?;
            let body = read_skill_body(name, &path)?;
            entries.push((name.clone(), body));
        }
        Ok(Self { entries })
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn contains(&self, name: &str) -> bool {
        self.entries
            .iter()
            .any(|(entry_name, _)| entry_name == name)
    }

    /// Render the full concat string. Empty loadout renders as an empty string.
    pub fn to_concat(&self) -> String {
        if self.entries.is_empty() {
            return String::new();
        }
        let names: Vec<&str> = self.entries.iter().map(|(n, _)| n.as_str()).collect();
        let mut out = format!("# xbreed loadout: {}\n\n", names.join(", "));
        for (i, (name, body)) in self.entries.iter().enumerate() {
            if i > 0 {
                out.push_str("\n---\n\n");
            }
            out.push_str(&format!("## {name}\n\n{body}"));
            if !body.ends_with('\n') {
                out.push('\n');
            }
        }
        out
    }
}

/// Resolve the exact payload injected for a skill loadout.
///
/// Godspeed is intentionally special: `--with godspeed` transports the
/// quintessential sibling `directive.md`, not a shortened SKILL.md wrapper
/// that merely tells an interactive host to open another file. The companion
/// must be a real file inside the resolved skill directory so a higher-priority
/// user skill cannot escape its search root through a symlink.
fn read_skill_body(name: &str, skill_path: &Path) -> Result<String> {
    let payload_path = if name == "godspeed" {
        let skill_dir = skill_path
            .parent()
            .ok_or_else(|| anyhow!("godspeed skill has no containing directory"))?;
        let candidate = skill_dir.join("directive.md");
        let resolved = std::fs::canonicalize(&candidate).with_context(|| {
            format!(
                "godspeed requires canonical directive.md beside SKILL.md: {}",
                candidate.display()
            )
        })?;
        if !resolved.starts_with(skill_dir) || !resolved.is_file() {
            return Err(anyhow!(
                "godspeed directive must be a regular file inside {}",
                skill_dir.display()
            ));
        }
        resolved
    } else {
        skill_path.to_path_buf()
    };

    let body = std::fs::read_to_string(&payload_path).with_context(|| {
        format!(
            "failed to read skill payload {}: {}",
            name,
            payload_path.display()
        )
    })?;
    if name == "godspeed" && body != GODSPEED_DIRECTIVE {
        return Err(anyhow!(
            "godspeed directive does not match the package-owned quintessential directive.md: {}",
            payload_path.display()
        ));
    }
    Ok(body)
}

fn find_skill(name: &str, search_dirs: &[PathBuf]) -> Option<PathBuf> {
    for dir in search_dirs {
        let candidate = dir.join(name).join("SKILL.md");
        let Ok(root) = std::fs::canonicalize(dir) else {
            continue;
        };
        let Ok(resolved) = std::fs::canonicalize(&candidate) else {
            continue;
        };
        if resolved.starts_with(&root) && resolved.is_file() {
            return Some(resolved);
        }
    }
    None
}

fn validate_skill_name(name: &str) -> Result<()> {
    let path = Path::new(name);
    let normal_component = matches!(path.components().next(), Some(Component::Normal(_)))
        && path.components().count() == 1;
    if name.is_empty()
        || !normal_component
        || name.contains('/')
        || name.contains('\\')
        || name == "."
        || name == ".."
    {
        return Err(anyhow!("invalid skill identifier: {name}"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    fn write_skill(root: &Path, name: &str, body: &str) -> PathBuf {
        let dir = root.join(name);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("SKILL.md");
        fs::write(&path, body).unwrap();
        path
    }

    #[test]
    fn empty_loadout_renders_empty_string() {
        let l = Loadout::empty();
        assert!(l.is_empty());
        assert_eq!(l.to_concat(), "");
    }

    #[test]
    fn resolve_single_skill_from_first_dir() {
        let tmp = tempdir().unwrap();
        let dir_a = tmp.path().join("a");
        fs::create_dir_all(&dir_a).unwrap();
        write_skill(&dir_a, "runner", "GO FAST");

        let l = Loadout::resolve_with_paths(
            &["runner".to_string()],
            &[dir_a.clone(), tmp.path().join("b")],
        )
        .unwrap();

        let c = l.to_concat();
        assert!(c.contains("# xbreed loadout: runner"));
        assert!(c.contains("## runner"));
        assert!(c.contains("GO FAST"));
    }

    #[test]
    fn resolve_fallback_to_second_dir() {
        let tmp = tempdir().unwrap();
        let dir_a = tmp.path().join("a");
        let dir_b = tmp.path().join("b");
        fs::create_dir_all(&dir_a).unwrap();
        write_skill(&dir_b, "the-curator", "curate");

        let l = Loadout::resolve_with_paths(
            &["the-curator".to_string()],
            &[dir_a.clone(), dir_b.clone()],
        )
        .unwrap();
        assert!(l.to_concat().contains("curate"));
    }

    #[test]
    fn resolve_missing_returns_err_listing_attempted_paths() {
        let tmp = tempdir().unwrap();
        let err = Loadout::resolve_with_paths(
            &["nope".to_string()],
            &[tmp.path().join("a"), tmp.path().join("b")],
        )
        .unwrap_err();
        let msg = format!("{err:#}");
        assert!(msg.contains("skill not found: nope"));
        assert!(msg.contains("a/nope/SKILL.md"));
        assert!(msg.contains("b/nope/SKILL.md"));
    }

    #[test]
    fn concat_preserves_argument_order_and_has_separators() {
        let tmp = tempdir().unwrap();
        let dir = tmp.path().join("skills");
        write_skill(&dir, "alpha", "A-body");
        write_skill(&dir, "beta", "B-body");

        let l = Loadout::resolve_with_paths(&["beta".to_string(), "alpha".to_string()], &[dir])
            .unwrap();

        let c = l.to_concat();
        let beta_idx = c.find("## beta").unwrap();
        let alpha_idx = c.find("## alpha").unwrap();
        assert!(beta_idx < alpha_idx, "expected beta before alpha in concat");
        assert!(c.contains("\n---\n"), "expected separator between skills");
    }

    #[test]
    fn concat_appends_newline_when_skill_body_has_none() {
        let tmp = tempdir().unwrap();
        let dir = tmp.path().join("skills");
        write_skill(&dir, "runner", "GO FAST");

        let l = Loadout::resolve_with_paths(&["runner".to_string()], &[dir]).unwrap();

        assert_eq!(
            l.to_concat(),
            "# xbreed loadout: runner\n\n## runner\n\nGO FAST\n"
        );
    }

    #[test]
    fn first_dir_wins_over_second() {
        let tmp = tempdir().unwrap();
        let dir_a = tmp.path().join("a");
        let dir_b = tmp.path().join("b");
        write_skill(&dir_a, "runner", "FROM A");
        write_skill(&dir_b, "runner", "FROM B");

        let l = Loadout::resolve_with_paths(&["runner".to_string()], &[dir_a, dir_b]).unwrap();
        let c = l.to_concat();
        assert!(c.contains("FROM A"));
        assert!(!c.contains("FROM B"));
    }

    #[test]
    fn godspeed_loadout_injects_full_directive_instead_of_pointer_wrapper() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("skills");
        let skill = write_skill(
            &root,
            "godspeed",
            "POINTER WRAPPER: read directive.md before acting",
        );
        fs::write(
            skill.parent().unwrap().join("directive.md"),
            GODSPEED_DIRECTIVE,
        )
        .unwrap();

        let loadout = Loadout::resolve_with_paths(&["godspeed".to_string()], &[root]).unwrap();
        let rendered = loadout.to_concat();
        assert!(rendered.contains("You are a Godspeed-enabled subagent."));
        assert!(rendered.contains("Don't aim — let the frontier walk itself."));
        assert!(rendered.contains("## IMMEDIATELY STOP ASKING CLARIFYING QUESTIONS."));
        assert!(!rendered.contains("POINTER WRAPPER"));
    }

    #[test]
    fn godspeed_rejects_a_noncanonical_directive_variant() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("skills");
        let skill = write_skill(&root, "godspeed", "pointer");
        fs::write(
            skill.parent().unwrap().join("directive.md"),
            "You are a reduced Godspeed variant.\n",
        )
        .unwrap();

        let err = Loadout::resolve_with_paths(&["godspeed".to_string()], &[root]).unwrap_err();
        assert!(format!("{err:#}").contains("quintessential directive.md"));
    }

    #[test]
    fn godspeed_without_directive_fails_closed() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("skills");
        write_skill(&root, "godspeed", "pointer only");

        let err = Loadout::resolve_with_paths(&["godspeed".to_string()], &[root]).unwrap_err();
        assert!(format!("{err:#}").contains("requires canonical directive.md"));
    }

    #[cfg(unix)]
    #[test]
    fn rejects_godspeed_directive_symlink_escape() {
        use std::os::unix::fs::symlink;

        let tmp = tempdir().unwrap();
        let root = tmp.path().join("skills");
        let skill = write_skill(&root, "godspeed", "pointer");
        let outside = tmp.path().join("directive.md");
        fs::write(&outside, "outside directive").unwrap();
        symlink(&outside, skill.parent().unwrap().join("directive.md")).unwrap();

        let err = Loadout::resolve_with_paths(&["godspeed".to_string()], &[root]).unwrap_err();
        assert!(format!("{err:#}").contains("must be a regular file inside"));
    }

    #[test]
    fn rejects_path_like_skill_identifiers() {
        let tmp = tempdir().unwrap();
        for name in ["../escape", "a/b", "a\\b", ".", "..", "/absolute"] {
            let err =
                Loadout::resolve_with_paths(&[name.to_string()], &[tmp.path().into()]).unwrap_err();
            assert!(format!("{err:#}").contains("invalid skill identifier"));
        }
    }

    #[cfg(unix)]
    #[test]
    fn rejects_skill_symlink_escape() {
        use std::os::unix::fs::symlink;

        let tmp = tempdir().unwrap();
        let root = tmp.path().join("skills");
        let outside = tmp.path().join("outside");
        write_skill(&outside, "escaped", "outside body");
        fs::create_dir_all(&root).unwrap();
        symlink(outside.join("escaped"), root.join("escaped")).unwrap();

        let err = Loadout::resolve_with_paths(&["escaped".to_string()], &[root]).unwrap_err();
        assert!(format!("{err:#}").contains("skill not found"));
    }

    #[cfg(unix)]
    #[test]
    fn rejects_final_skill_file_symlink_escape() {
        use std::os::unix::fs::symlink;

        let tmp = tempdir().unwrap();
        let root = tmp.path().join("skills");
        let skill = root.join("escaped");
        let outside = tmp.path().join("outside-SKILL.md");
        fs::create_dir_all(&skill).unwrap();
        fs::write(&outside, "outside body").unwrap();
        symlink(&outside, skill.join("SKILL.md")).unwrap();

        let err = Loadout::resolve_with_paths(&["escaped".to_string()], &[root]).unwrap_err();
        assert!(format!("{err:#}").contains("skill not found"));
    }
}
