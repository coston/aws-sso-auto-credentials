import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import fileSystem from "../../utils/fs/fileSystem";
import {
  parseAwsConfig,
  stringifyAwsConfig,
} from "../../utils/parsers/configParser";
import {
  generateSsoProfileConfig,
  generateAutoRefreshProfileConfig,
  generateOidcProfileConfig,
} from "../../definitions/config";

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

interface OidcProfileOptions {
  profileName: string;
  region: string;
  roleArn: string;
  oidcProvider: string;
  oidcClientId: string;
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

  // Check if profile already exists
  const profileKey = `profile ${options.profileName}`;
  if (config[profileKey] && !options.force) {
    throw new Error(
      `Profile ${options.profileName} already exists. Use --force to overwrite.`
    );
  }

  // Create a session name based on the profile name
  const sessionName = `${options.profileName}-session`;

  // Generate the SSO profile config
  const ssoConfig = generateSsoProfileConfig(
    options.profileName,
    options.region,
    sessionName,
    options.accountId,
    options.roleName
  );

  // Set the SSO start URL
  const sessionKey = `sso-session ${sessionName}`;
  ssoConfig[sessionKey].sso_start_url = options.ssoStartUrl;

  // Merge the generated config with the existing config
  Object.assign(config, ssoConfig);

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

  // Check if profile already exists
  const profileKey = `profile ${options.profileName}`;
  if (config[profileKey] && !options.force) {
    throw new Error(
      `Profile ${options.profileName} already exists. Use --force to overwrite.`
    );
  }

  // Generate the auto-refresh profile config
  const autoRefreshConfig = generateAutoRefreshProfileConfig(
    options.profileName,
    options.region,
    options.scriptPath
  );

  // Merge the generated config with the existing config
  Object.assign(config, autoRefreshConfig);

  // Write config back to file
  await fileSystem.writeFile(awsConfigPath, stringifyAwsConfig(config));
}

/**
 * Create or update an AWS OIDC profile in the AWS config file
 */
export async function createOidcProfile(
  options: OidcProfileOptions
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

  // Check if profile already exists
  const profileKey = `profile ${options.profileName}`;
  if (config[profileKey] && !options.force) {
    throw new Error(
      `Profile ${options.profileName} already exists. Use --force to overwrite.`
    );
  }

  // Generate the OIDC profile config
  const oidcConfig = generateOidcProfileConfig(
    options.profileName,
    options.region,
    options.roleArn,
    options.oidcProvider,
    options.oidcClientId
  );

  // Merge the generated config with the existing config
  Object.assign(config, oidcConfig);

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
