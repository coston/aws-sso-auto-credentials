import { promises as fs } from "fs";
import path from "path";

/**
 * Interface for file system operations
 * Provides a secure replacement for fs-extra with minimal functionality
 */
export interface FileSystem {
  ensureDir(dirPath: string): Promise<void>;
  pathExists(filePath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  chmod(filePath: string, mode: number): Promise<void>;
}

/**
 * Implementation of FileSystem interface using native Node.js fs/promises
 */
export const fileSystem: FileSystem = {
  /**
   * Ensures a directory exists, creating it if necessary
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory already exists or other error
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  },

  /**
   * Checks if a path exists
   */
  async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Reads a file with UTF-8 encoding
   */
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf8");
  },

  /**
   * Writes content to a file, creating directories if needed
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, "utf8");
  },

  /**
   * Sets file permissions (chmod)
   */
  async chmod(filePath: string, mode: number): Promise<void> {
    await fs.chmod(filePath, mode);
  },
};

// Export default instance for convenience
export default fileSystem;
