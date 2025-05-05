import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

interface EnvironmentCheckResult {
  platform: string;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  isGitBash: boolean;
  isWsl: boolean;
  awsCliVersion?: string;
  jqInstalled: boolean;
  gcloudInstalled?: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Check the environment for required dependencies and configurations
 */
export async function checkEnvironment(): Promise<EnvironmentCheckResult> {
  const platform = os.platform();
  const isWindows = platform === "win32";
  const isMac = platform === "darwin";
  const isLinux = platform === "linux";

  const result: EnvironmentCheckResult = {
    platform,
    isWindows,
    isMac,
    isLinux,
    isGitBash: false,
    isWsl: false,
    jqInstalled: false,
    gcloudInstalled: false,
    warnings: [],
    errors: [],
  };

  // Check if running in WSL on Windows
  if (isLinux) {
    try {
      const { stdout } = await execAsync("uname -a");
      result.isWsl =
        stdout.toLowerCase().includes("microsoft") ||
        stdout.toLowerCase().includes("wsl");
    } catch (error) {
      // Ignore error, assume not WSL
    }
  }

  // Check if running in Git Bash on Windows
  if (isWindows) {
    try {
      const { stdout } = await execAsync("uname -a");
      result.isGitBash =
        stdout.toLowerCase().includes("mingw") ||
        stdout.toLowerCase().includes("msys");
    } catch (error) {
      // Ignore error, assume not Git Bash
    }
  }

  // Check AWS CLI version
  try {
    const { stdout } = await execAsync("aws --version");
    const versionMatch = stdout.match(/aws-cli\/(\d+\.\d+\.\d+)/);

    if (versionMatch && versionMatch[1]) {
      result.awsCliVersion = versionMatch[1];

      // Check if AWS CLI version is 2.x
      const majorVersion = parseInt(versionMatch[1].split(".")[0], 10);
      if (majorVersion < 2) {
        result.warnings.push(
          "AWS CLI version 1.x detected. Version 2.x is recommended for best experience."
        );
      }
    } else {
      result.warnings.push("AWS CLI version could not be determined.");
    }
  } catch (error) {
    result.errors.push(
      "AWS CLI not found. Please install AWS CLI v2: https://aws.amazon.com/cli/"
    );
  }

  // Check for jq on non-Windows platforms
  if (!isWindows) {
    try {
      await execAsync("jq --version");
      result.jqInstalled = true;
    } catch (error) {
      result.warnings.push(
        "jq not found. It's recommended for JSON processing on Linux/macOS."
      );
    }
  }

  // Windows-specific checks
  if (isWindows && !result.isGitBash) {
    result.warnings.push(
      "On Windows, Git Bash is recommended for best experience with this tool."
    );
  }

  // Check for Google Cloud SDK (gcloud)
  try {
    await execAsync("gcloud --version");
    result.gcloudInstalled = true;
  } catch (error) {
    // We don't add a warning or error here by default
    // This will only be needed if using Google OIDC
  }

  return result;
}

/**
 * Check if Google Cloud SDK is installed
 * @returns Promise that resolves to true if gcloud is installed, false otherwise
 */
export async function checkGoogleCloudSdk(): Promise<boolean> {
  try {
    await execAsync("gcloud --version");
    return true;
  } catch (error) {
    return false;
  }
}
