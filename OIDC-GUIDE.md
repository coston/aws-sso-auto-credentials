# Google OIDC Authentication Guide for AWS SSO Auto-Credentials

This guide provides detailed instructions for setting up and using Google as an OIDC provider with aws-sso-auto-credentials to authenticate to AWS.

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Step-by-Step Setup Guide](#step-by-step-setup-guide)
- [Command-Line Options](#command-line-options)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Extending to Other OIDC Providers](#extending-to-other-oidc-providers)

## Introduction

OpenID Connect (OIDC) is an identity layer built on top of the OAuth 2.0 protocol that allows clients to verify the identity of end-users based on the authentication performed by an authorization server. The aws-sso-auto-credentials tool now supports using Google as an OIDC provider to authenticate to AWS.

### Benefits of Using Google OIDC with AWS

- **Unified Identity Management**: Leverage your existing Google-based identity system for AWS access
- **Reduced Credential Management**: No need to maintain separate AWS SSO credentials
- **Simplified User Experience**: Users can authenticate with their familiar Google accounts
- **Enhanced Security**: No long-lived access keys stored on developer machines
- **Automatic Credential Refresh**: Credentials are refreshed on-demand when needed

### Comparison with AWS SSO

| Feature            | AWS SSO                                | Google OIDC                                        |
| ------------------ | -------------------------------------- | -------------------------------------------------- |
| Identity Provider  | AWS IAM Identity Center                | Google                                             |
| Setup Complexity   | Requires AWS SSO configuration         | Requires Google Cloud and AWS IAM setup            |
| User Experience    | Web-based login through AWS            | Uses existing Google authentication                |
| Best For           | Organizations already using AWS SSO    | Organizations with Google Workspace/Cloud Identity |
| Credential Refresh | Automatic via aws-sso-auto-credentials | Automatic via aws-sso-auto-credentials             |

## Prerequisites

Before you begin, ensure you have the following:

### Google Cloud Requirements

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed and configured
- A Google Cloud Project with Identity Platform enabled
- OAuth 2.0 Client ID from Google Cloud Console

### AWS Requirements

- AWS CLI v2 installed
- `jq` installed (`brew install jq` on macOS or appropriate package manager for your OS)
- Permission to create IAM roles and identity providers in AWS

## Step-by-Step Setup Guide

### 1. Create OAuth Client ID in Google Cloud

1. Go to the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials) page
2. Click **"Create Credentials"** and select **"OAuth 2.0 Client ID"**
3. Choose **Web Application** as the application type
4. Give it a name (e.g., "AWS Authentication")
5. No redirect URI is needed for this use case
6. Click **Create**
7. Note the **Client ID** that looks like: `1234567890-abcxyz.apps.googleusercontent.com`

### 2. Set Up IAM in AWS

#### 2.1 Create OIDC Provider in AWS

```bash
aws iam create-open-id-connect-provider \
  --url https://accounts.google.com \
  --client-id-list 1234567890-abcxyz.apps.googleusercontent.com \
  --thumbprint-list a031c46782e6e6c662c2c87c76da9aa62ccabd8e \
  --profile <your-admin-profile>
```

Note: The thumbprint `a031c46782e6e6c662c2c87c76da9aa62ccabd8e` is for Google's accounts.google.com. This may change over time, so check AWS documentation for the current thumbprint.

#### 2.2 Create IAM Role Trust Policy

First, get your Google `sub` claim:

```bash
gcloud auth print-identity-token | cut -d. -f2 | base64 -d | jq .sub
```

This will output something like `"123456789012345678901"` which is your unique Google account identifier.

Create a file named `trust-policy.json` with the following content:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<your-account-id>:oidc-provider/accounts.google.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "accounts.google.com:sub": "<your-google-sub-claim>"
        }
      }
    }
  ]
}
```

Replace `<your-account-id>` with your AWS account ID and `<your-google-sub-claim>` with the value you obtained from the previous step.

#### 2.3 Create IAM Role and Attach Policy

```bash
aws iam create-role \
  --role-name GoogleOIDCRole \
  --assume-role-policy-document file://trust-policy.json \
  --profile <your-admin-profile>

aws iam attach-role-policy \
  --role-name GoogleOIDCRole \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess \
  --profile <your-admin-profile>
```

Note: Replace `ReadOnlyAccess` with the appropriate policy for your use case.

### 3. Configure aws-sso-auto-credentials with Google OIDC

Run the aws-sso-auto-credentials tool with the OIDC options:

```bash
aws-sso-auto-credentials \
  --oidc-provider google \
  --oidc-client-id 1234567890-abcxyz.apps.googleusercontent.com \
  --role-arn arn:aws:iam::<your-account-id>:role/GoogleOIDCRole
```

Alternatively, you can run the tool without options and follow the interactive prompts:

```bash
aws-sso-auto-credentials
```

When prompted, choose to use OIDC authentication instead of AWS SSO, and provide the requested information.

## Command-Line Options

The following command-line options are available for OIDC configuration:

- `--oidc-provider <provider>`: Specifies the OIDC provider to use (currently only 'google' is supported)
- `--oidc-client-id <id>`: Client ID for the OIDC provider
- `--role-arn <arn>`: AWS IAM Role ARN to assume with OIDC

### Examples

Basic usage with all options specified:

```bash
aws-sso-auto-credentials \
  --oidc-provider google \
  --oidc-client-id 1234567890-abcxyz.apps.googleusercontent.com \
  --role-arn arn:aws:iam::123456789012:role/GoogleOIDCRole
```

Using with a custom script path:

```bash
aws-sso-auto-credentials \
  --oidc-provider google \
  --oidc-client-id 1234567890-abcxyz.apps.googleusercontent.com \
  --role-arn arn:aws:iam::123456789012:role/GoogleOIDCRole \
  --script-path ~/scripts/aws/
```

Force overwrite of existing profiles:

```bash
aws-sso-auto-credentials \
  --oidc-provider google \
  --oidc-client-id 1234567890-abcxyz.apps.googleusercontent.com \
  --role-arn arn:aws:iam::123456789012:role/GoogleOIDCRole \
  --force
```

## How It Works

The Google OIDC integration works through the following process:

1. **Setup Phase**:

   - The tool creates an OIDC profile (`<prefix>-oidc`) in your AWS config file
   - It creates a refresh script (`~/.aws/refresh-if-needed-<prefix>.sh`) that handles token acquisition and role assumption
   - It creates an auto-credentials profile (`<prefix>-auto-credentials`) that uses the refresh script via `credential_process`

2. **Authentication Flow**:

   - When you use the auto-credentials profile, AWS CLI calls the refresh script
   - The script uses `gcloud auth print-identity-token` to obtain a fresh OIDC token from Google
   - It then calls `aws sts assume-role-with-web-identity` to exchange the token for temporary AWS credentials
   - The temporary credentials are returned to AWS CLI in the expected format

3. **Credential Refresh**:
   - Credentials are refreshed automatically when they expire
   - No background processes are needed - refresh happens on-demand
   - The Google token is obtained fresh each time, ensuring it's always valid

### Security Considerations

- The OIDC token is never stored on disk - it's obtained from Google when needed
- Temporary AWS credentials are used instead of long-lived access keys
- The IAM role's trust policy restricts which Google accounts can assume the role
- The IAM role's permissions policy restricts what actions can be performed

## Troubleshooting

### Common Issues and Solutions

#### "Error: Failed to get Google OIDC token"

- Ensure you're logged in to gcloud: `gcloud auth login`
- Verify your Google Cloud SDK is up to date: `gcloud components update`
- Check if your OAuth client ID is correct

#### "Error: Failed to assume role via web identity"

- Verify the IAM role ARN is correct
- Check that the trust policy includes your Google account's `sub` claim
- Ensure the OIDC provider is properly set up in AWS IAM
- Verify the client ID in the AWS OIDC provider matches your Google OAuth client ID

#### "Error: jq is required but not installed"

- Install jq using your package manager:
  - macOS: `brew install jq`
  - Ubuntu/Debian: `apt-get install jq`
  - CentOS/RHEL: `yum install jq`

#### "Error: gcloud is required but not installed"

- Install the Google Cloud SDK from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

### Debugging Tips

- Run the refresh script manually to see detailed output:

  ```bash
  bash ~/.aws/refresh-if-needed-<prefix>.sh --json
  ```

- Check your AWS config file for correct profile configuration:

  ```bash
  cat ~/.aws/config
  ```

- Verify your Google identity token:
  ```bash
  gcloud auth print-identity-token
  ```

## Extending to Other OIDC Providers

While the current implementation only supports Google as an OIDC provider, the architecture is designed to be extensible to other providers in the future.

### Architecture Overview

The aws-sso-auto-credentials tool uses a modular approach for OIDC providers:

1. **Provider Configuration**: Each provider has its own configuration in the AWS config file
2. **Token Acquisition**: Each provider has its own method for obtaining tokens
3. **Refresh Script Generation**: The tool generates provider-specific refresh scripts

### Implementing a New Provider

To implement a new OIDC provider, the following components would need to be extended:

1. **Provider Validation**: Add validation for the new provider in the prompts
2. **Config Generation**: Create a function to generate the appropriate AWS config
3. **Refresh Script**: Implement a script that obtains tokens from the new provider
4. **Environment Check**: Add checks for any required dependencies

If you're interested in contributing support for additional OIDC providers, please check the project's GitHub repository for contribution guidelines.
