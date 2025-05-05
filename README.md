# AWS SSO Auto-Credentials

A cross-platform Node.js CLI tool to automate the setup of AWS IAM Identity Center (AWS SSO) with auto-refreshing credentials.

## Features

- **Cross-platform support**: Works on MacOS, Linux, and Windows (with Git Bash or WSL)
- **Zero background processes**: Credentials are refreshed on-demand when needed
- **Profile-specific scripts**: Each profile gets its own refresh script for better multi-profile management
- **Easy setup**: Interactive prompts guide you through the configuration process
- **Minimal configuration**: Works in under 5 minutes with minimal input required
- **OIDC provider support**: Authenticate to AWS using Google as an OIDC provider

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
- Google Cloud SDK (required for Google OIDC authentication)

## Authentication Methods

This tool supports two authentication methods:

1. **AWS IAM Identity Center (SSO)**: The traditional method using AWS SSO for authentication
2. **OIDC with Google**: Use your Google identity to authenticate to AWS

The OIDC integration is ideal for organizations that want to integrate AWS access with their existing Google-based identity system, providing a more seamless experience and reducing the need for separate AWS SSO credentials.

For detailed instructions on setting up Google OIDC authentication, see the [OIDC-GUIDE.md](OIDC-GUIDE.md).

## Usage

Run the CLI tool:

```bash
aws-sso-auto-credentials
```

The tool will guide you through the setup process with interactive prompts.

### Command Line Options

```
Options:
  --force             Overwrite existing profiles or scripts without prompt
  --dry-run           Show planned changes without making them
  --script-path       Custom location for refresh script (default: ~/.aws/)
  --manual-setup      Skip AWS SSO configuration and manually enter profile details
  --skip-login        Skip automatic AWS SSO login after setup
  --oidc-provider     OIDC provider to use (e.g., 'google')
  --oidc-client-id    Client ID for OIDC provider
  --role-arn          AWS IAM Role ARN to assume with OIDC
```

## How It Works

### AWS SSO Authentication

When using AWS SSO, the tool sets up two AWS CLI profiles:

1. **Base SSO Profile** (`<prefix>-sso`): Used for AWS CLI SSO login maintenance
2. **Auto-Credentials Profile** (`<prefix>-auto-credentials`): Uses `credential_process` to auto-refresh credentials on demand

It also creates a profile-specific script named `~/.aws/refresh-if-needed-<prefix>.sh` that:

- Checks if the SSO session token is near expiration
- Runs `aws sso login --profile <prefix>-sso` automatically if needed
- Otherwise, proceeds without doing anything

### OIDC Authentication

When using OIDC with Google, the tool sets up:

1. **OIDC Profile** (`<prefix>-oidc`): Contains the OIDC provider and role configuration
2. **Auto-Credentials Profile** (`<prefix>-auto-credentials`): Uses `credential_process` to auto-refresh credentials on demand

It creates a profile-specific script named `~/.aws/refresh-if-needed-<prefix>.sh` that:

- Uses Google Cloud SDK to obtain an OIDC token
- Uses the token to assume an AWS IAM role via the AWS STS assume-role-with-web-identity API
- Returns the temporary credentials in the format expected by AWS CLI

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

- For AWS SSO: The `-sso` profile is needed for AWS CLI SSO login maintenance
- For OIDC: The `-oidc` profile contains the OIDC provider and role configuration
- In both cases: The `-auto-credentials` profile uses `credential_process` to auto-refresh credentials on demand

## License

MIT
