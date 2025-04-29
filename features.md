# AWS SSO Auto-Credentials: Features Documentation

## Overview

AWS SSO Auto-Credentials is a cross-platform Node.js CLI tool designed to automate the setup and management of AWS IAM Identity Center (AWS SSO) credentials. It eliminates the need for manual credential refreshing while maintaining security best practices.

## Core Features

### 1. Zero Background Processes

Unlike other credential management solutions, AWS SSO Auto-Credentials does not run any persistent background processes. Instead, it:

- Refreshes credentials on-demand only when needed
- Uses the AWS CLI's built-in SSO functionality
- Minimizes resource usage and security exposure

### 2. Cross-Platform Support

The tool is designed to work seamlessly across multiple operating systems:

- **macOS**: Full native support
- **Linux**: Full native support
- **Windows**: Compatible with Git Bash or Windows Subsystem for Linux (WSL)

### 3. Profile-Specific Credential Management

Each AWS profile gets its own dedicated refresh script, providing:

- Better isolation between different AWS accounts and roles
- Independent credential refresh cycles
- Clearer organization for users who work with multiple AWS environments

### 4. Automated Credential Refresh

The tool automatically:

- Checks if the SSO session token is near expiration
- Runs `aws sso login` only when necessary
- Proceeds without any action if credentials are still valid

### 5. Interactive Setup Process

The setup process is designed to be user-friendly with:

- Guided interactive prompts
- Sensible defaults
- Validation of inputs (region, account ID, role name)
- Support for AWS CLI's `aws configure sso` integration

### 6. Minimal Configuration Requirements

Setup can be completed in under 5 minutes with minimal input required:

- AWS region
- SSO start URL
- AWS account ID
- IAM role name (permission set)
- Profile prefix for naming

## Detailed Functionality

### Dual-Profile Architecture

The tool sets up two complementary AWS CLI profiles:

1. **Base SSO Profile** (`<prefix>-sso`):

   - Configured with standard AWS SSO settings
   - Used for AWS CLI SSO login maintenance
   - Contains SSO start URL, region, account ID, and role name

2. **Auto-Credentials Profile** (`<prefix>-auto-credentials`):
   - Uses `credential_process` to invoke the refresh script
   - Automatically refreshes credentials when needed
   - Used for all AWS operations

### Refresh Script Mechanism

The tool creates a profile-specific script (`~/.aws/refresh-if-needed-<prefix>.sh`) that:

1. Checks the SSO cache directory for valid session tokens
2. Examines token expiration time with a 5-minute buffer
3. Automatically triggers `aws sso login` if the token is expired or missing
4. Returns valid credentials in the format expected by the AWS CLI

### Environment Validation

Before setup, the tool performs comprehensive environment checks:

- Verifies AWS CLI installation (recommends v2)
- Checks for jq installation on Linux/macOS
- Detects platform-specific configurations (WSL, Git Bash)
- Provides warnings and recommendations for optimal setup

### Command Line Options

The tool supports several command line options:

- `--force`: Overwrite existing profiles or scripts without prompting
- `--dry-run`: Show planned changes without making them
- `--script-path`: Specify a custom location for the refresh script

## Technical Implementation

### Security-Focused Design

- No storage of AWS credentials in plain text
- Leverages AWS CLI's secure credential handling
- Minimal dependency footprint to reduce attack surface
- Uses native Node.js modules where possible

### File System Operations

- Creates and manages AWS config files
- Generates executable shell scripts with proper permissions
- Handles platform-specific path formatting

### AWS Configuration Management

- Parses and modifies AWS config files
- Creates properly formatted profile entries
- Configures credential_process mechanism

### User Experience

- Provides clear status messages during setup
- Offers validation for all user inputs
- Displays helpful error messages when issues occur
- Shows usage instructions after successful setup

## Use Cases

### 1. Developer Workflow

Ideal for developers who:

- Work with AWS services daily
- Switch between multiple AWS accounts or roles
- Need to maintain active SSO sessions without interruption

### 2. CI/CD Integration

Can be used in CI/CD pipelines to:

- Set up automated AWS authentication
- Maintain credentials throughout build processes
- Avoid hardcoded credentials in build configurations

### 3. Multi-Account Management

Perfect for organizations that:

- Use AWS Organizations with multiple accounts
- Require developers to access different environments (dev, staging, prod)
- Want to enforce SSO-based authentication across teams

## Conclusion

AWS SSO Auto-Credentials provides a streamlined, secure solution for managing AWS SSO credentials across platforms. By automating the credential refresh process while maintaining security best practices, it eliminates the friction of manual credential management without compromising on security.
