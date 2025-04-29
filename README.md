# AWS SSO Auto-Credentials Demo

This is a GitHub Pages compatible demo that emulates the CLI experience of the [AWS SSO Auto-Credentials](https://github.com/username/aws-sso-auto-credentials) tool.

## About the Demo

This demo simulates the interactive CLI experience of setting up AWS SSO Auto-Credentials, a tool that automates the setup of AWS IAM Identity Center (AWS SSO) with auto-refreshing credentials.

The demo shows:

1. The interactive setup process
2. The prompts and responses
3. The files created during setup
4. Explanations of what's happening at each step

## Features Demonstrated

- **Cross-platform support**: Works on MacOS, Linux, and Windows
- **Zero background processes**: Credentials are refreshed on-demand when needed
- **Profile-specific scripts**: Each profile gets its own refresh script
- **Easy setup**: Interactive prompts guide you through the configuration process
- **Minimal configuration**: Works in under 5 minutes with minimal input required

## How to Use the Demo

1. The demo automatically starts when the page loads
2. Watch as the CLI commands and responses are simulated
3. Read the explanations on the right side to understand what's happening
4. View the generated files by clicking on the file tabs
5. Use the "Restart Demo" button to start over
6. Use the "Toggle Speed" button to switch between normal and fast speed

## How to Host on GitHub Pages

1. Push this repository to GitHub
2. Go to the repository settings
3. Navigate to the "Pages" section
4. Select the branch you want to deploy (usually `main` or `master`)
5. Save the settings
6. GitHub will provide a URL where your demo is hosted

## About the Real Tool

The real AWS SSO Auto-Credentials tool:

- Is a cross-platform Node.js CLI tool
- Automates the setup of AWS IAM Identity Center (AWS SSO) with auto-refreshing credentials
- Creates profile-specific refresh scripts
- Eliminates the need for manual credential refreshing
- Maintains security best practices

## License

MIT
