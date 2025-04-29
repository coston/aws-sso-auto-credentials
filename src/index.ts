#!/usr/bin/env node

import { createParser } from "./utils/cli/argParser";
import { STATUS } from "./utils/cli/constants";
import { setupCommand } from "./commands/setup";

// Hardcoded version from package.json
const version = "1.0.0";

// Create the CLI program
const program = createParser(
  "aws-sso-auto-credentials",
  "CLI tool to automate AWS SSO credential refresh setup",
  version
);

// Add commands
program
  .command("setup", "Set up AWS SSO auto-credentials profiles and scripts")
  .option("--force", "Overwrite existing profiles or scripts without prompt")
  .option("--dry-run", "Show planned changes without making them")
  .option(
    "--script-path <path>",
    "Custom location for refresh script",
    "~/.aws/"
  )
  .option(
    "--manual-setup",
    "Skip AWS SSO configuration and manually enter profile details"
  )
  .option("--skip-login", "Skip automatic AWS SSO login after setup")
  .action(setupCommand);

// Set default command
program.setDefaultCommand("setup");

// Parse command line arguments
program.parse(process.argv);

// Handle unhandled errors
process.on("unhandledRejection", (error) => {
  console.error(`${STATUS.ERROR} Error:`, error);
  process.exit(1);
});
