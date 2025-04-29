import os from "os";
import path from "path";
import fileSystem from "../../utils/fs/fileSystem";
import { generateRefreshScriptContent } from "../../definitions/scripts";

interface RefreshScriptOptions {
  scriptPath: string;
  profileName: string;
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
