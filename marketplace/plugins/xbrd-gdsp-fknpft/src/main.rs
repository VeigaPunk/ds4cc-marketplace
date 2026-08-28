use clap::Parser;
use std::path::{Path, PathBuf};
use xbreed::cli::{Cli, Commands, MailboxAction, PrecheckAction, TeamAction};

fn expand_path(p: &Path) -> anyhow::Result<PathBuf> {
    let s = p.to_string_lossy();
    if let Some(stripped) = s.strip_prefix("~/") {
        let home = std::env::var("HOME")?;
        Ok(PathBuf::from(format!("{home}/{stripped}")))
    } else {
        Ok(p.to_path_buf())
    }
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Guard { cli: _, policy } => {
            let policy = expand_path(&policy)?;
            xbreed::guard::run_from_stdin(&policy)
        }
        Commands::Sync { policy, out } => {
            let policy = expand_path(&policy)?;
            let out = expand_path(&out)?;
            let written = xbreed::sync::write_claude_settings(&out, &policy)?;
            println!("wrote {}", written.display());
            Ok(())
        }
        Commands::Claude { args } => {
            let home = std::env::var("HOME")?;
            let policy = PathBuf::from(format!("{home}/.config/xbreed/policy.yaml"));
            let out_dir = PathBuf::from(format!("{home}/.config/xbreed/generated"));
            let settings = xbreed::sync::write_claude_settings(&out_dir, &policy)?;

            let models_path = PathBuf::from(format!("{home}/.config/xbreed/models.yaml"));
            let (model, effort) = xbreed::config::Models::load(&models_path)
                .map(|m| (m.claude.default, m.claude.effort))
                .unwrap_or_else(|_| ("claude-opus-4-9".to_string(), "high".to_string()));

            let status = xbreed::launch::launch_claude(&model, &effort, &settings, &args)?;
            std::process::exit(status.code().unwrap_or(1));
        }
        Commands::Ask {
            cli,
            prompt,
            with,
            effort,
            model,
            service_tier,
            spark,
            review,
            full,
            gpt55,
            json,
            output_last_message,
        } => {
            // Godspeed is part of every dispatch contract. Keep it first and
            // make any caller-supplied skills additive; there is no opt-out.
            let mut loadout_names = vec!["godspeed".to_string()];
            loadout_names.extend(with.into_iter().filter(|name| name != "godspeed"));
            let loadout = xbreed::loadout::Loadout::resolve(&loadout_names)?;
            let out = xbreed::ask::dispatch_with_service_tier(
                &cli,
                &prompt,
                &loadout,
                effort.as_deref(),
                model.as_deref(),
                spark,
                review,
                full,
                gpt55,
                json,
                output_last_message.as_deref(),
                service_tier.as_deref(),
            )?;
            print!("{out}");
            Ok(())
        }
        Commands::Precheck { check } => match check {
            PrecheckAction::PaneCap { team_size } => {
                if xbreed::precheck::accepts_team_size(team_size) {
                    println!("pane-cap ok: team_size={team_size} accepted");
                    Ok(())
                } else {
                    eprintln!(
                        "cannot spawn {team_size} teammates: maximum team size is {}",
                        xbreed::precheck::MAX_TEAM_SIZE
                    );
                    std::process::exit(1);
                }
            }
        },
        Commands::Team { action } => match action {
            TeamAction::Init => xbreed::team::init(),
            TeamAction::Mailbox { subaction } => {
                let cwd = std::env::current_dir()?;
                match subaction {
                    MailboxAction::Write {
                        from,
                        kind,
                        payload,
                    } => {
                        xbreed::mailbox::write_event(&cwd, &from, &kind, &payload)?;
                        Ok(())
                    }
                    MailboxAction::Drain { inject } => {
                        let events = xbreed::mailbox::drain_events(&cwd)?;
                        if inject {
                            println!("{}", xbreed::mailbox::format_hook_injection(&events));
                        } else {
                            println!("{}", serde_json::to_string_pretty(&events)?);
                        }
                        Ok(())
                    }
                    MailboxAction::Compact {
                        keep_types,
                        digest_older_than,
                    } => {
                        let (kept, compacted) =
                            xbreed::mailbox::compact_events(&cwd, &keep_types, digest_older_than)?;
                        println!("kept {kept}, compacted {compacted}");
                        Ok(())
                    }
                }
            }
        },
    }
}
