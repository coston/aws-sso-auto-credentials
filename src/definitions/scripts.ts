/**
 * Script templates for AWS SSO auto-refresh
 */

/**
 * Generate the content of the refresh script
 * @param profileName The AWS profile name to use for SSO login
 * @returns The script content as a string
 */
export function generateRefreshScriptContent(profileName: string): string {
  return `#!/usr/bin/env bash

# AWS SSO credential refresh script for profile: ${profileName}
# This script checks if the SSO session is valid and refreshes it if needed
# Generated by aws-sso-auto-credentials

set -e

# Function to check if jq is installed
check_jq() {
  if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed." >&2
    echo "Please install jq: https://stedolan.github.io/jq/download/" >&2
    exit 1
  fi
}

# Function to get credentials from SSO cache
get_sso_credentials() {
  local profile="$1"
  local cache_dir="$HOME/.aws/sso/cache"
  local latest_file=""
  local latest_time=0

  # Find the most recent cache file
  if [ -d "$cache_dir" ]; then
    for file in "$cache_dir"/*.json; do
      if [ -f "$file" ]; then
        # Check if file contains access token
        if grep -q "accessToken" "$file" 2>/dev/null; then
          file_time=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null)
          if [ "$file_time" -gt "$latest_time" ]; then
            latest_time=$file_time
            latest_file=$file
          fi
        fi
      fi
    done
  fi

  # If we found a cache file, check if it's valid
  if [ -n "$latest_file" ]; then
    # Extract expiration time
    if command -v jq &> /dev/null; then
      expiration=$(jq -r '.expiresAt' "$latest_file" 2>/dev/null)
      if [ -n "$expiration" ] && [ "$expiration" != "null" ]; then
        # Convert expiration to timestamp
        expiration_timestamp=$(date -d "$expiration" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$expiration" +%s 2>/dev/null)
        current_timestamp=$(date +%s)

        # Add buffer time (5 minutes) to ensure we refresh before expiration
        buffer_time=300
        if [ "$((expiration_timestamp - current_timestamp))" -gt "$buffer_time" ]; then
          # Token is still valid, no need to refresh
          return 0
        fi
      fi
    fi
  fi

  # If we get here, we need to refresh the token
  return 1
}

# Function to get AWS credentials
get_aws_credentials() {
  # Check if we need to refresh SSO login
  if ! get_sso_credentials "${profileName}"; then
    echo "SSO session expired or not found. Refreshing..." >&2
    aws sso login --profile "${profileName}" >&2
    if [ $? -ne 0 ]; then
      echo "Failed to refresh SSO session" >&2
      exit 1
    fi
  fi

  # Use the AWS CLI to get credentials directly
  # This is a simpler approach that should work with all AWS CLI versions

  # Create a temporary credentials file
  local temp_creds_file=$(mktemp)

  # Use the AWS CLI to get caller identity with the SSO profile
  # This forces the CLI to resolve the SSO credentials
  aws sts get-caller-identity --profile "${profileName}" > /dev/null 2>&1

  if [ $? -ne 0 ]; then
    echo "Failed to get caller identity with SSO profile" >&2
    rm -f "$temp_creds_file"
    exit 1
  fi

  # Now export the credentials to the temporary file
  # We'll use the environment variables that the AWS CLI sets
  AWS_PROFILE="${profileName}" aws configure export-credentials --format process > "$temp_creds_file" 2>/dev/null

  if [ $? -ne 0 ]; then
    # If export-credentials fails, try a different approach
    echo "Failed to export credentials, trying alternative method" >&2

    # Get credentials from the AWS CLI cache
    local credentials_file="$HOME/.aws/cli/cache/${profileName}.json"
    if [ -f "$credentials_file" ]; then
      cat "$credentials_file" > "$temp_creds_file"
    else
      echo "Could not find cached credentials" >&2
      rm -f "$temp_creds_file"
      exit 1
    fi
  fi

  # Check if the file contains the Version field
  if ! grep -q "Version" "$temp_creds_file"; then
    # If not, add it
    local temp_fixed_file=$(mktemp)
    jq '. + {Version: "1"}' "$temp_creds_file" > "$temp_fixed_file"
    mv "$temp_fixed_file" "$temp_creds_file"
  fi

  # Output the credentials
  cat "$temp_creds_file"

  # Clean up
  rm -f "$temp_creds_file"
}

# Main execution
if [ "$1" = "--json" ]; then
  check_jq
  get_aws_credentials
else
  get_aws_credentials >/dev/null
  echo "AWS credentials refreshed successfully"
fi
`;
}
