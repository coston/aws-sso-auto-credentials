import { describe, it } from "node:test";
import assert from "node:assert";
import { createRefreshScript } from "./scripts";
import fileSystem from "./fs/fileSystem";
import path from "path";
import os from "os";

// Mock the fileSystem module
const originalPathExists = fileSystem.pathExists;
const originalEnsureDir = fileSystem.ensureDir;
const originalWriteFile = fileSystem.writeFile;
const originalChmod = fileSystem.chmod;

// Helper to restore mocks
function restoreMocks() {
  fileSystem.pathExists = originalPathExists;
  fileSystem.ensureDir = originalEnsureDir;
  fileSystem.writeFile = originalWriteFile;
  fileSystem.chmod = originalChmod;
}

describe("Scripts Utilities", () => {
  describe("createRefreshScript", () => {
    it("should throw an error if script exists and force is not set", async () => {
      // Mock fileSystem.pathExists to return true
      fileSystem.pathExists = async () => true;

      // Create options for the test
      const options = {
        scriptPath: "/path/to/script.sh",
        profileName: "test-profile",
        force: false,
      };

      // Assert that createRefreshScript throws an error
      await assert.rejects(
        async () => {
          await createRefreshScript(options);
        },
        {
          message: `Script ${options.scriptPath} already exists. Use --force to overwrite.`,
        }
      );

      // Restore original functions
      restoreMocks();
    });

    it("should create script if force is set even if script exists", async () => {
      // Mock fileSystem functions
      fileSystem.pathExists = async () => true;
      fileSystem.ensureDir = async () => {};

      let writtenContent = "";
      fileSystem.writeFile = async (path, content) => {
        writtenContent = content;
      };

      fileSystem.chmod = async () => {};

      // Create options for the test
      const options = {
        scriptPath: "/path/to/script.sh",
        profileName: "test-profile",
        force: true,
      };

      // Call the function
      await createRefreshScript(options);

      // Assert that the script content contains the profile name
      assert.ok(writtenContent.includes(`profile: ${options.profileName}`));

      // Restore original functions
      restoreMocks();
    });

    it("should create script if it doesn't exist", async () => {
      // Mock fileSystem functions
      fileSystem.pathExists = async () => false;
      fileSystem.ensureDir = async () => {};

      let writtenContent = "";
      let writtenPath = "";
      fileSystem.writeFile = async (path, content) => {
        writtenPath = path;
        writtenContent = content;
      };

      let chmodCalled = false;
      fileSystem.chmod = async () => {
        chmodCalled = true;
      };

      // Create options for the test
      const options = {
        scriptPath: "/path/to/script.sh",
        profileName: "test-profile",
      };

      // Call the function
      await createRefreshScript(options);

      // Assert that the script was written to the correct path
      assert.strictEqual(writtenPath, options.scriptPath);

      // Assert that the script content contains the profile name
      assert.ok(writtenContent.includes(`profile: ${options.profileName}`));

      // Assert that chmod was called if not on Windows
      if (os.platform() !== "win32") {
        assert.ok(
          chmodCalled,
          "chmod should be called on non-Windows platforms"
        );
      }

      // Restore original functions
      restoreMocks();
    });
  });
});
