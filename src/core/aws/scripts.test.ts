import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import { createRefreshScript, createGoogleOidcRefreshScript } from "./scripts";
import fileSystem from "../../utils/fs/fileSystem";

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

describe("AWS Scripts Operations", () => {
  // Existing functionality tests could go here

  describe("createGoogleOidcRefreshScript", () => {
    it("should throw an error if script exists and force is not set", async () => {
      // Mock fileSystem.pathExists to return true
      fileSystem.pathExists = async () => true;

      // Create options for the test
      const options = {
        scriptPath: "/path/to/script.sh",
        profileName: "test-oidc",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        clientId: "123456789-abcdef.apps.googleusercontent.com",
        force: false,
      };

      // Assert that createGoogleOidcRefreshScript throws an error
      await assert.rejects(
        async () => {
          await createGoogleOidcRefreshScript(options);
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
        profileName: "test-oidc",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        clientId: "123456789-abcdef.apps.googleusercontent.com",
        force: true,
      };

      // Call the function
      await createGoogleOidcRefreshScript(options);

      // Assert that the script content contains the expected values
      assert.ok(
        writtenContent.includes(`profile: ${options.profileName}`),
        "Script should include the profile name"
      );
      assert.ok(
        writtenContent.includes(`local role_arn="${options.roleArn}"`),
        "Script should include the role ARN"
      );
      assert.ok(
        writtenContent.includes(`local client_id="${options.clientId}"`),
        "Script should include the client ID"
      );

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
      let chmodPath = "";
      let chmodMode = 0;
      fileSystem.chmod = async (path, mode) => {
        chmodCalled = true;
        chmodPath = path;
        chmodMode = mode;
      };

      // Create options for the test
      const options = {
        scriptPath: "/path/to/script.sh",
        profileName: "test-oidc",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        clientId: "123456789-abcdef.apps.googleusercontent.com",
      };

      // Call the function
      await createGoogleOidcRefreshScript(options);

      // Assert that the script was written to the correct path
      assert.strictEqual(writtenPath, options.scriptPath);

      // Assert that the script content contains the expected values
      assert.ok(
        writtenContent.includes(`profile: ${options.profileName}`),
        "Script should include the profile name"
      );
      assert.ok(
        writtenContent.includes(`local role_arn="${options.roleArn}"`),
        "Script should include the role ARN"
      );
      assert.ok(
        writtenContent.includes(`local client_id="${options.clientId}"`),
        "Script should include the client ID"
      );

      // Assert that chmod was called if not on Windows
      if (os.platform() !== "win32") {
        assert.ok(
          chmodCalled,
          "chmod should be called on non-Windows platforms"
        );
        assert.strictEqual(
          chmodPath,
          options.scriptPath,
          "chmod should be called on the script path"
        );
        assert.strictEqual(
          chmodMode,
          0o755,
          "chmod should set the mode to 0755"
        );
      }

      // Restore original functions
      restoreMocks();
    });

    it("should ensure the directory exists before writing the script", async () => {
      // Mock fileSystem functions
      fileSystem.pathExists = async () => false;

      let dirEnsured = "";
      fileSystem.ensureDir = async (dir) => {
        dirEnsured = dir;
      };

      fileSystem.writeFile = async () => {};
      fileSystem.chmod = async () => {};

      // Create options for the test
      const options = {
        scriptPath: "/path/to/script.sh",
        profileName: "test-oidc",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        clientId: "123456789-abcdef.apps.googleusercontent.com",
      };

      // Call the function
      await createGoogleOidcRefreshScript(options);

      // Assert that the directory was ensured
      assert.strictEqual(
        dirEnsured,
        path.dirname(options.scriptPath),
        "Directory should be ensured before writing the script"
      );

      // Restore original functions
      restoreMocks();
    });
  });
});
