import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { fileSystem } from "./fileSystem";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Create a temporary test directory
const TEST_DIR = path.join(os.tmpdir(), `fs-test-${Date.now()}`);

describe("FileSystem", () => {
  // Setup: Create test directory before tests
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  // Cleanup: Remove test directory after tests
  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      console.error("Error cleaning up test directory:", error);
    }
  });

  describe("ensureDir", () => {
    it("should create a directory if it doesn't exist", async () => {
      const dirPath = path.join(TEST_DIR, "new-dir");

      // Ensure directory doesn't exist initially
      const existsBefore = await fileSystem.pathExists(dirPath);
      assert.strictEqual(existsBefore, false);

      // Create directory
      await fileSystem.ensureDir(dirPath);

      // Check if directory exists now
      const existsAfter = await fileSystem.pathExists(dirPath);
      assert.strictEqual(existsAfter, true);
    });

    it("should not throw if directory already exists", async () => {
      const dirPath = path.join(TEST_DIR, "existing-dir");

      // Create directory first
      await fs.mkdir(dirPath, { recursive: true });

      // Ensure directory exists
      const existsBefore = await fileSystem.pathExists(dirPath);
      assert.strictEqual(existsBefore, true);

      // Should not throw when ensuring an existing directory
      await assert.doesNotReject(async () => {
        await fileSystem.ensureDir(dirPath);
      });
    });
  });

  describe("pathExists", () => {
    it("should return true if path exists", async () => {
      const filePath = path.join(TEST_DIR, "test-file.txt");

      // Create a file
      await fs.writeFile(filePath, "test content", "utf8");

      // Check if file exists
      const exists = await fileSystem.pathExists(filePath);
      assert.strictEqual(exists, true);
    });

    it("should return false if path doesn't exist", async () => {
      const filePath = path.join(TEST_DIR, "non-existent-file.txt");

      // Check if file exists
      const exists = await fileSystem.pathExists(filePath);
      assert.strictEqual(exists, false);
    });
  });

  describe("readFile and writeFile", () => {
    it("should write and read file content correctly", async () => {
      const filePath = path.join(TEST_DIR, "test-content.txt");
      const content = "Hello, world!";

      // Write content to file
      await fileSystem.writeFile(filePath, content);

      // Read content from file
      const readContent = await fileSystem.readFile(filePath);

      // Verify content
      assert.strictEqual(readContent, content);
    });

    it("should create parent directories when writing a file", async () => {
      const nestedFilePath = path.join(TEST_DIR, "nested", "dir", "test.txt");
      const content = "Nested file content";

      // Write content to nested file
      await fileSystem.writeFile(nestedFilePath, content);

      // Check if parent directories were created
      const dirExists = await fileSystem.pathExists(
        path.dirname(nestedFilePath)
      );
      assert.strictEqual(dirExists, true);

      // Check if file exists and has correct content
      const readContent = await fileSystem.readFile(nestedFilePath);
      assert.strictEqual(readContent, content);
    });
  });

  describe("chmod", () => {
    it("should change file permissions", async function (this: any) {
      // Skip this test on Windows as chmod behaves differently
      if (os.platform() === "win32") {
        this.skip();
        return;
      }

      const filePath = path.join(TEST_DIR, "executable.sh");
      const content = "#!/bin/bash\necho 'Hello'";

      // Write file
      await fileSystem.writeFile(filePath, content);

      // Change permissions to make it executable (0o755)
      await fileSystem.chmod(filePath, 0o755);

      // Check if permissions were changed
      const stats = await fs.stat(filePath);
      const isExecutable = !!(stats.mode & 0o100); // Check if owner execute bit is set

      assert.strictEqual(isExecutable, true);
    });
  });
});
