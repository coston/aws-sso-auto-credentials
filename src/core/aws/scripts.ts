import os from "os";
import path from "path";
import fileSystem from "../../utils/fs/fileSystem";
import {
  generateRefreshScriptContent,
  generateGoogleOidcRefreshScriptContent,
} from "../../definitions/scripts";

interface RefreshScriptOptions {
  scriptPath: string;
  profileName: string;
  force?: boolean;
}

interface GoogleOidcRefreshScriptOptions {
  scriptPath: string;
  profileName: string;
  roleArn: string;
  clientId: string;
  force?: boolean;
}

/**
 * Create the refresh script that checks if SSO session is valid and refreshes if needed
 */
export async function createRefreshScript(
  options: RefreshScriptOptions
): Promise<void> {
  // Check if script already exists
  if ((await fileSystem.pathExists(options.scriptPath)) && !options.force) {
    throw new Error(
      `Script ${options.scriptPath} already exists. Use --force to overwrite.`
    );
  }

  // Ensure directory exists
  await fileSystem.ensureDir(path.dirname(options.scriptPath));

  // Generate script content
  const scriptContent = generateRefreshScriptContent(options.profileName);

  // Write script to file
  await fileSystem.writeFile(options.scriptPath, scriptContent);

  // Make script executable (not applicable on Windows)
  if (os.platform() !== "win32") {
    await fileSystem.chmod(options.scriptPath, 0o755);
  }
}

/**
 * Create the Google OIDC refresh script that gets a Google OIDC token and uses it to assume an AWS role
 */
export async function createGoogleOidcRefreshScript(
  options: GoogleOidcRefreshScriptOptions
): Promise<void> {
  // Check if script already exists
  if ((await fileSystem.pathExists(options.scriptPath)) && !options.force) {
    throw new Error(
      `Script ${options.scriptPath} already exists. Use --force to overwrite.`
    );
  }

  // Ensure directory exists
  await fileSystem.ensureDir(path.dirname(options.scriptPath));

  // Generate script content
  const scriptContent = generateGoogleOidcRefreshScriptContent(
    options.profileName,
    options.roleArn,
    options.clientId
  );

  // Write script to file
  await fileSystem.writeFile(options.scriptPath, scriptContent);

  // Make script executable (not applicable on Windows)
  if (os.platform() !== "win32") {
    await fileSystem.chmod(options.scriptPath, 0o755);
  }
}
