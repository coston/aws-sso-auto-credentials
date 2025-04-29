import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import fileSystem from "./fs/fileSystem";
import { parseAwsConfig, stringifyAwsConfig } from "./parsers/configParser";

const execAsync = promisify(exec);

interface SsoProfileOptions {
  profileName: string;
  region: string;
  ssoStartUrl: string;
  accountId: string;
  roleName: string;
  force?: boolean;
}

interface AutoRefreshProfileOptions {
  profileName: string;
  region: string;
  scriptPath: string;
  force?: boolean;
}

/**
 * Create or update an AWS SSO profile in the AWS config file
 */
export async function createSsoProfile(
  options: SsoProfileOptions
): Promise<void> {
  const awsConfigPath = path.join(os.homedir(), ".aws", "config");

  // Create .aws directory if it doesn't exist
  await fileSystem.ensureDir(path.join(os.homedir(), ".aws"));

  // Read existing config or create empty config
  let config: Record<string, any> = {};
  if (await fileSystem.pathExists(awsConfigPath)) {
    const configContent = await fileSystem.readFile(awsConfigPath);
    config = parseAwsConfig(configContent);
  }

  const profileKey = `profile ${options.profileName}`;

  // Check if profile already exists
  if (config[profileKey] && !options.force) {
    throw new Error(
      `Profile ${options.profileName} already exists. Use --force to overwrite.`
    );
  }

  // Create or update profile
  config[profileKey] = {
    sso_start_url: options.ssoStartUrl,
    sso_region: options.region,
    sso_account_id: options.accountId,
    sso_role_name: options.roleName,
    region: options.region,
  };

  // Write config back to file
  await fileSystem.writeFile(awsConfigPath, stringifyAwsConfig(config));
}

/**
 * Create or update an AWS auto-credentials profile in the AWS config file
 */
export async function createAutoRefreshProfile(
  options: AutoRefreshProfileOptions
): Promise<void> {
  const awsConfigPath = path.join(os.homedir(), ".aws", "config");

  // Create .aws directory if it doesn't exist
  await fileSystem.ensureDir(path.join(os.homedir(), ".aws"));

  // Read existing config or create empty config
  let config: Record<string, any> = {};
  if (await fileSystem.pathExists(awsConfigPath)) {
    const configContent = await fileSystem.readFile(awsConfigPath);
    config = parseAwsConfig(configContent);
  }

  const profileKey = `profile ${options.profileName}`;

  // Check if profile already exists
  if (config[profileKey] && !options.force) {
    throw new Error(
      `Profile ${options.profileName} already exists. Use --force to overwrite.`
    );
  }

  // Format script path based on platform
  let formattedScriptPath = options.scriptPath;
  if (os.platform() === "win32") {
    // On Windows, use double backslashes in paths
    formattedScriptPath = formattedScriptPath.replace(/\//g, "\\\\");
  }

  // Create or update profile
  config[profileKey] = {
    credential_process: `bash ${formattedScriptPath} --json`,
    region: options.region,
  };

  // Write config back to file
  await fileSystem.writeFile(awsConfigPath, stringifyAwsConfig(config));
}

/**
 * Get the AWS config file path
 */
export function getAwsConfigPath(): string {
  return path.join(os.homedir(), ".aws", "config");
}

/**
 * Get the AWS credentials file path
 */
export function getAwsCredentialsPath(): string {
  return path.join(os.homedir(), ".aws", "credentials");
}
