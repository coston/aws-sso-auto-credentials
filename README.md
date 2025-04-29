# AWS SSO Auto-Credentials

A cross-platform Node.js CLI tool to automate the setup of AWS IAM Identity Center (AWS SSO) with auto-refreshing credentials.

## Features

- **Cross-platform support**: Works on MacOS, Linux, and Windows (with Git Bash or WSL)
- **Zero background processes**: Credentials are refreshed on-demand when needed
- **Profile-specific scripts**: Each profile gets its own refresh script for better multi-profile management
- **Easy setup**: Interactive prompts guide you through the configuration process
- **Minimal configuration**: Works in under 5 minutes with minimal input required

## Demo

A web-based demonstration of the tool is available online at [coston.github.io/aws-sso-auto-credentials/](https://coston.github.io/aws-sso-auto-credentials/) or in the `demo` directory.

To view the demo locally:

1. Open the `demo/index.html` file in your web browser
2. Follow the simulated terminal interaction to see how the tool works
3. View the explanation of each step and the generated files

## Installation

### Global Installation

```bash
npm install -g aws-sso-auto-credentials
```

### Using npx

```bash
npx aws-sso-auto-credentials
```

## Prerequisites

- Node.js 14 or higher
- AWS CLI v2 installed
- jq installed (recommended for Linux/macOS)

## Usage

Run the CLI tool:

```bash
aws-sso-auto-credentials
```

The tool will guide you through the setup process with interactive prompts.

### Command Line Options

```
Options:
  --force        Overwrite existing profiles or scripts without prompt
  --dry-run      Show planned changes without making them
  --script-path  Custom location for refresh script (default: ~/.aws/)
  --manual-setup Skip AWS SSO configuration and manually enter profile details
  --skip-login   Skip automatic AWS SSO login after setup
```

## How It Works

The tool sets up two AWS CLI profiles:

1. **Base SSO Profile** (`<prefix>-sso`): Used for AWS CLI SSO login maintenance
2. **Auto-Credentials Profile** (`<prefix>-auto-credentials`): Uses `credential_process` to auto-credentials credentials on demand

It also creates a profile-specific script named `~/.aws/refresh-if-needed-<prefix>.sh` that:

- Checks if the SSO session token is near expiration
- Runs `aws sso login --profile <prefix>-sso` automatically if needed
- Otherwise, proceeds without doing anything

## After Setup

The tool will automatically log you in with AWS SSO after setup (unless you use the `--skip-login` option). After that:

1. Use the auto-credentials profile for all AWS commands:

   ```bash
   AWS_PROFILE=<prefix>-auto-credentials aws s3 ls
   ```

2. Never worry about manually refreshing credentials again!

If you used the `--skip-login` option or need to login again later:

```bash
aws sso login --profile <prefix>-sso
```

## Why Two Profiles?

- The `-sso` profile is needed for AWS CLI SSO login maintenance
- The `-auto-credentials` profile uses `credential_process` to auto-credentials credentials on demand

## License

MIT
