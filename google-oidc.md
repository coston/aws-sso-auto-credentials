# Authenticate to AWS with Google OIDC and Assume IAM Role via `credential_process`

This guide walks you through setting up a secure, interactive-free way to assume an AWS IAM role using your Google account, with automatic credential refreshing via AWS's `credential_process`. This setup integrates seamlessly with the AWS CLI, SDKs, and tools like **Roo Code in VS Code**.

---

## What You'll Set Up

- Use Google OIDC tokens to authenticate securely
- Assume AWS IAM roles without long-lived access keys
- Use `credential_process` to auto-refresh credentials on demand
- Works with Roo Code, AWS CLI, and any SDK using the AWS profile

---

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install)
- AWS CLI installed (`brew install awscli` or package manager)
- `jq` installed (`brew install jq`)
- Google Cloud Project with Identity Platform enabled
- OAuth 2.0 Client ID from Google Cloud Console
- Permission to create IAM roles and identity providers in AWS

---

## Step 1: Create OAuth Client ID in Google Cloud

1. Go to: [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials" "OAuth 2.0 Client ID"**
3. Choose **Web Application**, give it a name
4. No redirect URI needed
5. Save the **Client ID**, e.g.:

   ```
   1234567890-abcxyz.apps.googleusercontent.com
   ```

---

## Step 2: Set Up IAM in AWS

### 2.1 Create OIDC Provider in AWS

```bash
aws iam create-open-id-connect-provider \
  --url https://accounts.google.com \
  --client-id-list 1234567890-abcxyz.apps.googleusercontent.com \
  --thumbprint-list a031c46782e6e6c662c2c87c76da9aa62ccabd8e \
  --profile <your-admin-profile>
```

### 2.2 Create IAM Role Trust Policy

Get your Google `sub` claim:

```bash
gcloud auth print-identity-token | cut -d. -f2 | base64 -d | jq .sub
```

Create `trust-policy.json`:

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

### 2.3 Create IAM Role and Attach Policy

```bash
aws iam create-role \
  --role-name GoogleOIDCRole \
  --assume-role-policy-document file://trust-policy.json \
  --profile <your-admin-profile>

aws iam attach-role-policy \
  --role-name GoogleOIDCRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess \
  --profile <your-admin-profile>
```

---

## Step 3: Create Credential Script

Create `~/refresh-if-needed.sh`:

```bash
#!/bin/bash

AWS_ROLE_ARN="arn:aws:iam::<your-account-id>:role/GoogleOIDCRole"
AWS_REGION="us-east-1"

if [[ "$1" == "--json" ]]; then
  OIDC_TOKEN=$(gcloud auth print-identity-token 2>/dev/null)

  CREDS_JSON=$(aws sts assume-role-with-web-identity \
    --role-arn "$AWS_ROLE_ARN" \
    --role-session-name "google-oidc-session" \
    --web-identity-token "$OIDC_TOKEN" \
    --region "$AWS_REGION" 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "Error: Failed to assume role via web identity" >&2
    exit 1
  fi

  echo "$CREDS_JSON" | jq '{
    Version: 1,
    AccessKeyId: .Credentials.AccessKeyId,
    SecretAccessKey: .Credentials.SecretAccessKey,
    SessionToken: .Credentials.SessionToken,
    Expiration: .Credentials.Expiration
  }'
  exit 0
fi

echo " Skipping refresh: not called with --json"
```

Make it executable:

```bash
chmod +x ~/refresh-if-needed.sh
```

---

## Step 4: Update AWS Config

Edit `~/.aws/config` and add:

```ini
[profile roo-google-oidc]
credential_process = bash ~/refresh-if-needed.sh --json
region = us-east-1
```

Use the profile in your shell:

```bash
export AWS_PROFILE=roo-google-oidc
```

---

## Step 5: Test It

```bash
aws sts get-caller-identity --profile roo-google-oidc
```

You should see your AWS identity and account. Now, tools like **Roo Code**, AWS CLI, and any SDK will automatically invoke your credential script only when needed.
