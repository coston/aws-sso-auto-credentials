import path from "path";
import os from "os";
import { checkEnvironment } from "../utils/environment";
import {
  createSsoProfile,
  createAutoRefreshProfile,
  createOidcProfile,
} from "../core/aws/config";
import {
  createRefreshScript,
  createGoogleOidcRefreshScript,
} from "../core/aws/scripts";
import {
  validateAwsRegion,
  validateAwsAccountId,
  validateAwsRoleName,
} from "../utils/validation";
import { promptMultiple, prompt } from "../utils/cli/prompt";
import { STATUS, MESSAGES, formatStatus } from "../definitions/messages";
import fileSystem from "../utils/fs/fileSystem";
import { parseAwsConfig } from "../utils/parsers/configParser";
import { spawn } from "child_process";
import {
  setupPrompts,
  profileSelectionPrompts,
  oidcPrompts,
} from "../definitions/prompts";
import { checkGoogleCloudSdk } from "../utils/environment";

export interface SetupOptions {
  force?: boolean;
  dryRun?: boolean;
  scriptPath?: string;
  manualSetup?: boolean;
  skipLogin?: boolean;
  oidcProvider?: string;
  oidcClientId?: string;
  roleArn?: string;
}

interface SetupAnswers extends Record<string, any> {
  prefix: string;
  region: string;
  ssoStartUrl?: string;
  accountId?: string;
  roleName?: string;
  oidcProvider?: string;
  oidcClientId?: string;
  roleArn?: string;
  useOidc?: boolean;
}

/**
 * Perform an operation with status messages
 * @param description Operation description
 * @param operation Operation to perform
 * @returns Operation result
 */
async function performOperation<T>(
  description: string,
  operation: () => Promise<T>
): Promise<T> {
  console.log(`${description}...`);
  try {
    const result = await operation();
    console.log(formatStatus(`${description} completed`, "SUCCESS"));
    return result;
  } catch (error) {
    console.log(formatStatus(`${description} failed`, "ERROR"));
    throw error;
  }
}

export async function setupCommand(options: SetupOptions): Promise<void> {
  console.log(`\n${STATUS.INFO} AWS SSO Auto-Credentials Setup\n`);

  // Normalize script path
  options.scriptPath = options.scriptPath?.replace("~", os.homedir());

  // Check environment
  try {
    const envCheck = await performOperation(
      "Checking environment",
      async () => {
        return await checkEnvironment();
      }
    );

    if (envCheck.warnings.length > 0) {
      console.log(`\n${STATUS.WARNING} Warnings:`);
      envCheck.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    if (envCheck.errors.length > 0) {
      console.log(`\n${STATUS.ERROR} Errors:`);
      envCheck.errors.forEach((error) => console.log(`  - ${error}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(`${STATUS.ERROR} Error during environment check:`, error);
    process.exit(1);
  }

  // Get user input
  const answers = await promptUser(options);

  // Create AWS config directory if it doesn't exist
  const awsConfigDir = path.join(os.homedir(), ".aws");
  if (!(await fileSystem.pathExists(awsConfigDir))) {
    if (options.dryRun) {
      console.log(`[DRY RUN] Would create directory: ${awsConfigDir}`);
    } else {
      await fileSystem.ensureDir(awsConfigDir);
    }
  }

  // Determine if we're using OIDC or SSO
  const isOidc = answers.useOidc || !!answers.oidcProvider;

  // Create SSO profile (only if not using OIDC)
  if (!isOidc) {
    try {
      if (options.dryRun) {
        console.log(
          `[DRY RUN] Would create SSO profile: ${answers.prefix}-sso`
        );
      } else {
        // Check if profile already exists and we're not forcing
        const awsConfigPath = path.join(os.homedir(), ".aws", "config");
        let profileExists = false;

        if (await fileSystem.pathExists(awsConfigPath)) {
          const configContent = await fileSystem.readFile(awsConfigPath);
          const config = parseAwsConfig(configContent);
          profileExists = !!config[`profile ${answers.prefix}-sso`];
        }

        if (profileExists && !options.force) {
          console.log(
            `${STATUS.WARNING} Profile ${answers.prefix}-sso already exists.`
          );
          console.log(
            `${STATUS.INFO} Use --force to overwrite existing profiles.`
          );
          console.log(`${STATUS.INFO} Continuing with existing profile...`);
        } else {
          await performOperation("Creating SSO profile", async () => {
            await createSsoProfile({
              profileName: `${answers.prefix}-sso`,
              region: answers.region,
              ssoStartUrl: answers.ssoStartUrl!,
              accountId: answers.accountId!,
              roleName: answers.roleName!,
              force: options.force,
            });
            return true;
          });
          console.log(`Created SSO profile: ${answers.prefix}-sso`);
        }
      }
    } catch (error) {
      console.error(
        `${STATUS.ERROR} Failed to create SSO profile: ${answers.prefix}-sso`
      );
      console.error(`Error:`, error);
      process.exit(1);
    }
  } else {
    // Create OIDC profile
    try {
      if (options.dryRun) {
        console.log(
          `[DRY RUN] Would create OIDC profile: ${answers.prefix}-oidc`
        );
      } else {
        // Check if profile already exists and we're not forcing
        const awsConfigPath = path.join(os.homedir(), ".aws", "config");
        let profileExists = false;

        if (await fileSystem.pathExists(awsConfigPath)) {
          const configContent = await fileSystem.readFile(awsConfigPath);
          const config = parseAwsConfig(configContent);
          profileExists = !!config[`profile ${answers.prefix}-oidc`];
        }

        if (profileExists && !options.force) {
          console.log(
            `${STATUS.WARNING} Profile ${answers.prefix}-oidc already exists.`
          );
          console.log(
            `${STATUS.INFO} Use --force to overwrite existing profiles.`
          );
          console.log(`${STATUS.INFO} Continuing with existing profile...`);
        } else {
          await performOperation("Creating OIDC profile", async () => {
            await createOidcProfile({
              profileName: `${answers.prefix}-oidc`,
              region: answers.region,
              roleArn: answers.roleArn!,
              oidcProvider: answers.oidcProvider!,
              oidcClientId: answers.oidcClientId!,
              force: options.force,
            });
            return true;
          });
          console.log(`Created OIDC profile: ${answers.prefix}-oidc`);
        }
      }
    } catch (error) {
      console.error(
        `${STATUS.ERROR} Failed to create OIDC profile: ${answers.prefix}-oidc`
      );
      console.error(`Error:`, error);
      process.exit(1);
    }
  }

  // Create refresh script
  try {
    const scriptPath = options.scriptPath || path.join(os.homedir(), ".aws");
    const scriptName = `refresh-if-needed-${answers.prefix}.sh`;
    const fullScriptPath = path.join(scriptPath, scriptName);

    if (options.dryRun) {
      console.log(`[DRY RUN] Would create refresh script: ${fullScriptPath}`);
    } else {
      // Check if script already exists and we're not forcing
      if ((await fileSystem.pathExists(fullScriptPath)) && !options.force) {
        console.log(
          `${STATUS.WARNING} Script ${fullScriptPath} already exists.`
        );
        console.log(`${STATUS.INFO} Use --force to overwrite existing files.`);
        console.log(`${STATUS.INFO} Continuing with existing script...`);
      } else {
        await performOperation("Creating refresh script", async () => {
          if (isOidc && answers.oidcProvider === "google") {
            await createGoogleOidcRefreshScript({
              scriptPath: fullScriptPath,
              profileName: `${answers.prefix}-oidc`,
              roleArn: answers.roleArn!,
              clientId: answers.oidcClientId!,
              force: options.force,
            });
          } else {
            await createRefreshScript({
              scriptPath: fullScriptPath,
              profileName: `${answers.prefix}-sso`,
              force: options.force,
            });
          }
          return true;
        });
        console.log(`Created refresh script: ${fullScriptPath}`);
      }
    }
  } catch (error) {
    console.error(`${STATUS.ERROR} Failed to create refresh script`);
    console.error(`Error:`, error);
    process.exit(1);
  }

  // Create auto-credentials profile
  try {
    if (options.dryRun) {
      console.log(
        `[DRY RUN] Would create auto-credentials profile: ${answers.prefix}-auto-credentials`
      );
    } else {
      const scriptPath = options.scriptPath || path.join(os.homedir(), ".aws");
      const scriptName = `refresh-if-needed-${answers.prefix}.sh`;
      const fullScriptPath = path.join(scriptPath, scriptName);

      // Check if profile already exists and we're not forcing
      const awsConfigPath = path.join(os.homedir(), ".aws", "config");
      let profileExists = false;

      if (await fileSystem.pathExists(awsConfigPath)) {
        const configContent = await fileSystem.readFile(awsConfigPath);
        const config = parseAwsConfig(configContent);
        profileExists = !!config[`profile ${answers.prefix}-auto-credentials`];
      }

      if (profileExists && !options.force) {
        console.log(
          `${STATUS.WARNING} Profile ${answers.prefix}-auto-credentials already exists.`
        );
        console.log(
          `${STATUS.INFO} Use --force to overwrite existing profiles.`
        );
        console.log(`${STATUS.INFO} Continuing with existing profile...`);
      } else {
        await performOperation(
          "Creating auto-credentials profile",
          async () => {
            await createAutoRefreshProfile({
              profileName: `${answers.prefix}-auto-credentials`,
              region: answers.region,
              scriptPath: fullScriptPath,
              force: options.force,
            });
            return true;
          }
        );
        console.log(
          `Created auto-credentials profile: ${answers.prefix}-auto-credentials`
        );
      }
    }
  } catch (error) {
    console.error(
      `${STATUS.ERROR} Failed to create auto-credentials profile: ${answers.prefix}-auto-credentials`
    );
    console.error(`Error:`, error);
    process.exit(1);
  }

  // Success message
  console.log(`\n${STATUS.SUCCESS} Setup completed successfully!\n`);

  // Run AWS SSO login if not in dry run mode and not skipping login and not using OIDC
  if (!options.dryRun && !options.skipLogin && !isOidc) {
    try {
      console.log(`${STATUS.INFO} Initiating AWS SSO login...`);
      console.log(
        `${STATUS.INFO} This will open a browser window for authentication.`
      );

      // Run AWS SSO login
      await runAwsSsoLogin(`${answers.prefix}-sso`);

      console.log(`\n${STATUS.SUCCESS} AWS SSO login completed successfully!`);
    } catch (error) {
      console.error(`${STATUS.ERROR} AWS SSO login failed:`, error);
      console.log(`\n${STATUS.INFO} You can manually run the login command:`);
      console.log(`  aws sso login --profile ${answers.prefix}-sso`);
    }
  }

  // Updated usage instructions
  console.log("\nTo use your AWS credentials:");

  if (isOidc) {
    console.log(
      `  Use ${answers.prefix}-auto-credentials profile for all AWS commands:`
    );
  } else {
    // If login was skipped or in dry run mode, show the login step
    if (options.dryRun || options.skipLogin) {
      console.log(`  1. Run: aws sso login --profile ${answers.prefix}-sso`);
      console.log(
        `  2. Use ${answers.prefix}-auto-credentials profile for all AWS commands:`
      );
    } else {
      console.log(
        `  Use ${answers.prefix}-auto-credentials profile for all AWS commands:`
      );
    }
  }

  console.log(
    `     AWS_PROFILE=${answers.prefix}-auto-credentials aws sts get-caller-identity`
  );
  console.log("\nCredentials will be automatically refreshed when needed.");

  // If force wasn't used, mention it for future reference
  if (!options.force) {
    console.log(
      `\n${STATUS.INFO} Note: Use --force to overwrite existing profiles and scripts.`
    );
  }

  // Validate setup if not in dry run mode
  if (!options.dryRun) {
    console.log(`\n${STATUS.INFO} Validating setup...`);
    if (isOidc) {
      console.log(`Run the following command to verify your setup:`);
      console.log(
        `  AWS_PROFILE=${answers.prefix}-auto-credentials aws sts get-caller-identity\n`
      );
    } else if (options.skipLogin) {
      console.log(`Run the following commands to verify your setup:`);
      console.log(`  1. aws sso login --profile ${answers.prefix}-sso`);
      console.log(
        `  2. AWS_PROFILE=${answers.prefix}-auto-credentials aws sts get-caller-identity\n`
      );
    } else {
      console.log(`Run the following command to verify your setup:`);
      console.log(
        `  AWS_PROFILE=${answers.prefix}-auto-credentials aws sts get-caller-identity\n`
      );
    }
  }
}

/**
 * Run aws configure sso and wait for completion
 * @returns Profile details if a new profile was created, undefined otherwise
 */
async function runSsoLogin(): Promise<SetupAnswers | undefined> {
  console.log(`\n${STATUS.INFO} Running 'aws configure sso'...`);

  try {
    // Get existing profiles before running aws configure sso
    const awsConfigPath = path.join(os.homedir(), ".aws", "config");
    let existingProfiles: string[] = [];
    let configContentBefore = "";

    if (await fileSystem.pathExists(awsConfigPath)) {
      configContentBefore = await fileSystem.readFile(awsConfigPath);
      try {
        const configBefore = parseAwsConfig(configContentBefore);
        existingProfiles = Object.keys(configBefore)
          .filter((key) => key.startsWith("profile "))
          .map((key) => key.replace("profile ", ""));

        // Store existing profiles but don't log them
      } catch (error) {
        console.log(`${STATUS.WARNING} Could not parse existing AWS config`);
      }
    }

    // Run aws configure sso
    const ssoProcess = spawn("aws", ["configure", "sso"], {
      stdio: "inherit",
      shell: true,
    });

    // Wait for the process to complete
    await new Promise<void>((resolve, reject) => {
      ssoProcess.on("close", (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`aws configure sso exited with code ${code}`));
        }
      });
    });

    console.log(`\n${STATUS.SUCCESS} AWS SSO configuration successful!`);

    // Add a small delay to ensure the config file is updated
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Read the updated config file to find the newly created profile
    if (await fileSystem.pathExists(awsConfigPath)) {
      const configContentAfter = await fileSystem.readFile(awsConfigPath);

      // Check if the content has changed
      if (configContentAfter === configContentBefore) {
        console.log(
          `${STATUS.WARNING} AWS config file has not changed after configuration`
        );
      }

      try {
        const configAfter = parseAwsConfig(configContentAfter);

        // Find all profiles after configuration
        const allProfilesAfter = Object.keys(configAfter)
          .filter((key) => key.startsWith("profile "))
          .map((key) => key.replace("profile ", ""));

        // Determine which profiles are new without logging all profiles
        const newProfiles = allProfilesAfter.filter(
          (profile) => !existingProfiles.includes(profile)
        );

        // Find newly created SSO profiles - more lenient check
        const newSsoProfiles = newProfiles.filter((profile) => {
          const profileConfig = configAfter[`profile ${profile}`];
          // More lenient check - any profile with sso in it
          return (
            profileConfig &&
            (profileConfig.sso_start_url ||
              profileConfig.sso_account_id ||
              profileConfig.sso_role_name ||
              profileConfig.sso_region ||
              profileConfig.sso_session ||
              (profile.toLowerCase().includes("administrator") &&
                profile.includes("-")))
          );
        });

        // If no new profiles found with filter, try to find by name pattern
        if (newSsoProfiles.length === 0) {
          // Look for profiles with a pattern like "AdministratorAccess-123456789012"
          const adminProfiles = allProfilesAfter.filter(
            (profile) =>
              profile.toLowerCase().includes("administrator") &&
              profile.includes("-")
          );

          if (adminProfiles.length > 0) {
            // Add these to newSsoProfiles without logging

            // Add these to newSsoProfiles
            adminProfiles.forEach((profile) => {
              if (!newSsoProfiles.includes(profile)) {
                newSsoProfiles.push(profile);
              }
            });
          }
        }

        if (newSsoProfiles.length > 0) {
          // Use the first new profile automatically
          const profileName = newSsoProfiles[0];
          const profileConfig = configAfter[`profile ${profileName}`];

          console.log(
            `${STATUS.INFO} Found newly created profile '${profileName}' from aws configure sso`
          );

          // Automatically use the newly created profile
          console.log(
            `${STATUS.INFO} Using newly created profile '${profileName}' for auto-credentials setup`
          );

          // Extract values with fallbacks
          const region =
            profileConfig?.region || profileConfig?.sso_region || "us-east-1";
          let accountId = profileConfig?.sso_account_id;
          let roleName = profileConfig?.sso_role_name;

          // If accountId is missing, try to extract from profile name (e.g., AdministratorAccess-474671518642)
          if (!accountId && profileName.includes("-")) {
            const parts = profileName.split("-");
            const possibleAccountId = parts[parts.length - 1];
            if (/^\d{12}$/.test(possibleAccountId)) {
              accountId = possibleAccountId;
              console.log(
                `${STATUS.INFO} Extracted account ID from profile name: ${accountId}`
              );
            }
          }

          // If roleName is missing, use the part before the dash
          if (!roleName && profileName.includes("-")) {
            roleName = profileName.split("-")[0];
            console.log(
              `${STATUS.INFO} Extracted role name from profile name: ${roleName}`
            );
          }

          // If we have enough information, return the profile details
          if (accountId && roleName) {
            // Log the profile config for debugging
            console.log(
              `${STATUS.INFO} Profile config:`,
              JSON.stringify(profileConfig, null, 2)
            );

            // Get SSO start URL from config
            let ssoStartUrl = profileConfig?.sso_start_url;

            // Check if profile uses sso_session
            if (!ssoStartUrl && profileConfig?.sso_session) {
              console.log(
                `${STATUS.INFO} Profile uses sso_session: ${profileConfig.sso_session}`
              );

              // Look for the corresponding sso-session section
              const ssoSessionKey = `sso-session ${profileConfig.sso_session}`;
              if (configAfter[ssoSessionKey]) {
                ssoStartUrl = configAfter[ssoSessionKey].sso_start_url;
                console.log(
                  `${STATUS.INFO} Found SSO start URL in sso-session ${profileConfig.sso_session}: ${ssoStartUrl}`
                );
              } else {
                console.log(
                  `${STATUS.WARNING} Could not find sso-session ${profileConfig.sso_session} in config`
                );
              }
            }

            // If ssoStartUrl is still missing, look for it in other profiles
            if (!ssoStartUrl) {
              console.log(
                `${STATUS.WARNING} No SSO start URL found in profile, looking in other profiles...`
              );

              // First check all sso-session sections
              for (const key of Object.keys(configAfter)) {
                if (key.startsWith("sso-session ")) {
                  const ssoSession = configAfter[key];
                  if (ssoSession.sso_start_url) {
                    ssoStartUrl = ssoSession.sso_start_url;
                    console.log(
                      `${STATUS.INFO} Found SSO start URL in ${key}: ${ssoStartUrl}`
                    );
                    break;
                  }
                }
              }

              // If still not found, check all profiles
              if (!ssoStartUrl) {
                for (const key of Object.keys(configAfter)) {
                  if (key.startsWith("profile ")) {
                    const otherProfile = configAfter[key];
                    if (otherProfile.sso_start_url) {
                      ssoStartUrl = otherProfile.sso_start_url;
                      console.log(
                        `${STATUS.INFO} Found SSO start URL in profile ${key}: ${ssoStartUrl}`
                      );
                      break;
                    }
                  }
                }
              }
            }

            // If we still don't have an SSO start URL, ask the user
            if (!ssoStartUrl) {
              console.log(
                `${STATUS.WARNING} Could not find SSO start URL in any profile`
              );
              ssoStartUrl = await prompt(setupPrompts.ssoStartUrl);
            }

            return {
              prefix: profileName,
              region: region,
              ssoStartUrl: ssoStartUrl,
              accountId: accountId,
              roleName: roleName,
            };
          } else {
            console.log(
              `${STATUS.WARNING} Could not extract all required information from profile`
            );
          }
        } else {
          console.log(
            `${STATUS.WARNING} No new SSO profiles found after configuration`
          );
        }
      } catch (error) {
        console.error(
          `${STATUS.ERROR} Error parsing AWS config file after configuration:`,
          error
        );
      }
    }
  } catch (error) {
    console.error(`${STATUS.ERROR} Failed to run aws configure sso:`, error);
    console.log(`\n${STATUS.INFO} Continuing with manual configuration...`);
  }

  // Return undefined if no new profile was created or user declined
  return undefined;
}

/**
 * Run AWS SSO login for a profile
 * @param profileName The AWS profile name to login with
 * @returns Promise that resolves when login is complete
 */
async function runAwsSsoLogin(profileName: string): Promise<void> {
  console.log(
    `\n${STATUS.INFO} Running AWS SSO login for profile: ${profileName}...`
  );

  try {
    // Use spawn to run the AWS SSO login command
    // This will open a browser for authentication
    const ssoProcess = spawn(
      "aws",
      ["sso", "login", "--profile", profileName],
      {
        stdio: "inherit",
        shell: true,
      }
    );

    // Wait for the process to complete
    await new Promise<void>((resolve, reject) => {
      ssoProcess.on("close", (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`aws sso login exited with code ${code}`));
        }
      });
    });

    console.log(`\n${STATUS.SUCCESS} AWS SSO login successful!`);
  } catch (error) {
    console.error(`${STATUS.ERROR} Failed to run AWS SSO login:`, error);
    throw error;
  }
}

async function promptUser(options: SetupOptions): Promise<SetupAnswers> {
  // Check if OIDC options are provided via command line
  if (options.oidcProvider) {
    console.log(
      `\n${STATUS.INFO} OIDC provider specified: ${options.oidcProvider}`
    );

    // Check for required OIDC parameters
    if (!options.oidcClientId) {
      options.oidcClientId = await prompt(oidcPrompts.oidcClientId);
    }

    if (!options.roleArn) {
      options.roleArn = await prompt(oidcPrompts.roleArn);
    }

    // Check for Google Cloud SDK if using Google OIDC
    if (options.oidcProvider.toLowerCase() === "google") {
      const gcloudInstalled = await checkGoogleCloudSdk();
      if (!gcloudInstalled) {
        console.log(
          `\n${STATUS.WARNING} Google Cloud SDK (gcloud) is required for Google OIDC authentication.`
        );
        console.log(
          `${STATUS.INFO} Please install it from: https://cloud.google.com/sdk/docs/install`
        );
        process.exit(1);
      }
    }

    // Get profile prefix
    const prefix = await prompt(setupPrompts.prefix);
    const region = await prompt(setupPrompts.region);

    return {
      prefix,
      region,
      useOidc: true,
      oidcProvider: options.oidcProvider,
      oidcClientId: options.oidcClientId,
      roleArn: options.roleArn,
    };
  }

  // If manual setup is specified, skip SSO configuration and go straight to manual input
  if (options.manualSetup) {
    console.log(
      `\n${STATUS.INFO} Manual setup mode selected. Skipping AWS SSO configuration.`
    );

    // Ask if user wants to use OIDC
    const useOidc = await prompt(oidcPrompts.useOidc);

    if (useOidc.toLowerCase().startsWith("y")) {
      // OIDC setup
      const oidcProvider = await prompt(oidcPrompts.oidcProvider);

      // Check for Google Cloud SDK if using Google OIDC
      if (oidcProvider.toLowerCase() === "google") {
        const gcloudInstalled = await checkGoogleCloudSdk();
        if (!gcloudInstalled) {
          console.log(
            `\n${STATUS.WARNING} Google Cloud SDK (gcloud) is required for Google OIDC authentication.`
          );
          console.log(
            `${STATUS.INFO} Please install it from: https://cloud.google.com/sdk/docs/install`
          );
          process.exit(1);
        }
      }

      const answers = await promptMultiple<SetupAnswers>({
        prefix: setupPrompts.prefix,
        region: setupPrompts.region,
        oidcProvider: { ...oidcPrompts.oidcProvider, default: oidcProvider },
        oidcClientId: oidcPrompts.oidcClientId,
        roleArn: oidcPrompts.roleArn,
      });

      return {
        ...answers,
        useOidc: true,
      };
    } else {
      // Standard SSO setup
      const answers = await promptMultiple<SetupAnswers>({
        prefix: setupPrompts.prefix,
        region: setupPrompts.region,
        ssoStartUrl: setupPrompts.ssoStartUrl,
        accountId: setupPrompts.accountId,
        roleName: setupPrompts.roleName,
      });

      return {
        ...answers,
        useOidc: false,
      };
    }
  }

  // Check for existing AWS SSO profiles
  const awsConfigPath = path.join(os.homedir(), ".aws", "config");
  let existingSsoProfiles: string[] = [];
  let config: Record<string, any> = {};

  if (await fileSystem.pathExists(awsConfigPath)) {
    // Make sure we read the file as a string
    const configContent = await fileSystem.readFile(awsConfigPath);
    console.log(`\n${STATUS.INFO} Reading AWS config file: ${awsConfigPath}`);

    try {
      config = parseAwsConfig(configContent);

      // Debug: Log the parsed config structure
      console.log(
        `${STATUS.INFO} Found ${
          Object.keys(config).length
        } sections in AWS config`
      );

      // Find profiles with SSO configuration - more lenient matching
      existingSsoProfiles = Object.keys(config)
        .filter((key) => key.startsWith("profile "))
        .map((key) => key.replace("profile ", ""))
        .filter((profile) => {
          const profileConfig = config[`profile ${profile}`];
          // More lenient check - any profile with sso in it
          return (
            profileConfig &&
            (profileConfig.sso_start_url ||
              profileConfig.sso_account_id ||
              profileConfig.sso_role_name ||
              profileConfig.sso_region ||
              profileConfig.sso_session)
          );
        });

      console.log(
        `${STATUS.INFO} Found ${existingSsoProfiles.length} SSO profiles`
      );

      if (existingSsoProfiles.length === 0) {
        // If no profiles found with the strict filter, log all profiles for debugging
        console.log(`${STATUS.INFO} Available profile sections:`);
        Object.keys(config)
          .filter((key) => key.startsWith("profile "))
          .forEach((profile) => {
            console.log(`  - ${profile}`);
          });
      }
    } catch (error) {
      console.error(`${STATUS.ERROR} Error parsing AWS config file:`, error);
      console.log(`${STATUS.INFO} Raw config content (first 200 chars):`);
      console.log(configContent.substring(0, 200) + "...");
    }
  }

  // Ask if user wants to use OIDC instead of SSO
  const useOidc = await prompt(oidcPrompts.useOidc);

  if (useOidc.toLowerCase().startsWith("y")) {
    // OIDC setup
    const oidcProvider = await prompt(oidcPrompts.oidcProvider);

    // Check for Google Cloud SDK if using Google OIDC
    if (oidcProvider.toLowerCase() === "google") {
      const gcloudInstalled = await checkGoogleCloudSdk();
      if (!gcloudInstalled) {
        console.log(
          `\n${STATUS.WARNING} Google Cloud SDK (gcloud) is required for Google OIDC authentication.`
        );
        console.log(
          `${STATUS.INFO} Please install it from: https://cloud.google.com/sdk/docs/install`
        );
        process.exit(1);
      }
    }

    const answers = await promptMultiple<SetupAnswers>({
      prefix: setupPrompts.prefix,
      region: setupPrompts.region,
      oidcProvider: { ...oidcPrompts.oidcProvider, default: oidcProvider },
      oidcClientId: oidcPrompts.oidcClientId,
      roleArn: oidcPrompts.roleArn,
    });

    return {
      ...answers,
      useOidc: true,
    };
  }

  // If we found existing SSO profiles, ask if the user wants to use one
  if (existingSsoProfiles.length > 0) {
    console.log(
      `\n${
        STATUS.INFO
      } Found existing AWS SSO profiles: ${existingSsoProfiles.join(", ")}`
    );

    // Use the imported prompt function
    const useExisting = await prompt(profileSelectionPrompts.useExisting);

    if (useExisting.toLowerCase().startsWith("y")) {
      // Let user select from existing profiles
      const profileName = await prompt(
        profileSelectionPrompts.profileName(existingSsoProfiles)
      );

      // Get profile details
      const profileConfig = config[`profile ${profileName}`];

      // Get SSO start URL - check for sso_session first
      let ssoStartUrl = profileConfig.sso_start_url;
      if (!ssoStartUrl && profileConfig.sso_session) {
        const ssoSessionKey = `sso-session ${profileConfig.sso_session}`;
        if (config[ssoSessionKey] && config[ssoSessionKey].sso_start_url) {
          ssoStartUrl = config[ssoSessionKey].sso_start_url;
          console.log(
            `${STATUS.INFO} Found SSO start URL in sso-session ${profileConfig.sso_session}: ${ssoStartUrl}`
          );
        }
      }

      return {
        prefix: profileName,
        region: profileConfig.region || profileConfig.sso_region,
        ssoStartUrl: ssoStartUrl,
        accountId: profileConfig.sso_account_id,
        roleName: profileConfig.sso_role_name,
        useOidc: false,
      };
    } else {
      // User declined to use existing profile
      // Run aws configure sso
      const newProfileDetails = await runSsoLogin();
      if (newProfileDetails) {
        return {
          ...newProfileDetails,
          useOidc: false,
        };
      }
    }
  } else {
    // No existing SSO profiles found
    console.log(`\n${STATUS.INFO} No existing AWS SSO profiles found.`);

    // Run aws configure sso
    const newProfileDetails = await runSsoLogin();
    if (newProfileDetails) {
      return {
        ...newProfileDetails,
        useOidc: false,
      };
    }
  }

  // Fall back to manual configuration if needed
  const answers = await promptMultiple<SetupAnswers>({
    prefix: setupPrompts.prefix,
    region: setupPrompts.region,
    ssoStartUrl: setupPrompts.ssoStartUrl,
    accountId: setupPrompts.accountId,
    roleName: setupPrompts.roleName,
  });

  return {
    ...answers,
    useOidc: false,
  };
}
