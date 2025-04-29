import os from "os";

/**
 * AWS Config Templates
 * Templates for AWS configuration profiles
 */

/**
 * Generate an AWS SSO profile configuration
 * @param profileName The name of the profile
 * @param region The AWS region
 * @param sessionName The SSO session name
 * @param accountId The AWS account ID
 * @param roleName The AWS role name
 * @returns The profile configuration object
 */
export function generateSsoProfileConfig(
  profileName: string,
  region: string,
  sessionName: string,
  accountId: string,
  roleName: string
): Record<string, any> {
  const profileKey = `profile ${profileName}`;
  const sessionKey = `sso-session ${sessionName}`;

  const config: Record<string, any> = {};

  // Create the SSO session
  config[sessionKey] = {
    sso_start_url: "", // This will be set by the caller
    sso_region: region,
  };

  // Create the profile using the SSO session
  config[profileKey] = {
    sso_session: sessionName,
    sso_account_id: accountId,
    sso_role_name: roleName,
    region: region,
  };

  return config;
}

/**
 * Generate an AWS auto-credentials profile configuration
 * @param profileName The name of the profile
 * @param region The AWS region
 * @param scriptPath The path to the refresh script
 * @returns The profile configuration object
 */
export function generateAutoRefreshProfileConfig(
  profileName: string,
  region: string,
  scriptPath: string
): Record<string, any> {
  const profileKey = `profile ${profileName}`;

  // Format script path based on platform
  let formattedScriptPath = scriptPath;
  if (os.platform() === "win32") {
    // On Windows, use double backslashes in paths
    formattedScriptPath = formattedScriptPath.replace(/\//g, "\\\\");
  }

  const config: Record<string, any> = {};

  // Create the profile
  config[profileKey] = {
    credential_process: `bash ${formattedScriptPath} --json`,
    region: region,
  };

  return config;
}
