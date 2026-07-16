use ds4cc_validator::validate_marketplace_dir;
use std::path::PathBuf;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let root = if args.len() > 1 {
        PathBuf::from(&args[1])
    } else {
        PathBuf::from(".")
    };

    match validate_marketplace_dir(&root) {
        Ok(errors) => {
            if errors.is_empty() {
                println!("Validation passed.");
                std::process::exit(0);
            } else {
                for e in &errors {
                    eprintln!("ERROR: {}", e);
                }
                std::process::exit(1);
            }
        }
        Err(e) => {
            eprintln!("Fatal: {}", e);
            std::process::exit(1);
        }
    }
}
