import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { checkEnvironment, checkGoogleCloudSdk } from "./environment";
import * as childProcess from "child_process";
import * as util from "util";

// Save original functions
const originalExec = childProcess.exec;
const originalPromisify = util.promisify;

// Helper to restore mocks
function restoreMocks() {
  // Restore original functions
  Object.defineProperty(childProcess, "exec", {
    value: originalExec,
    configurable: true,
  });

  Object.defineProperty(util, "promisify", {
    value: originalPromisify,
    configurable: true,
  });
}

describe("Environment Utilities", () => {
  describe("checkEnvironment", () => {
    it("should detect Google Cloud SDK when installed", async () => {
      // Mock the exec function to simulate gcloud being installed
      const mockExecAsync = mock.fn(async () => ({
        stdout: "Google Cloud SDK 123.0.0",
        stderr: "",
      }));

      // Mock promisify to return our mock exec function
      const mockPromisify = mock.fn(() => mockExecAsync);

      // Replace the functions
      Object.defineProperty(util, "promisify", {
        value: mockPromisify,
        configurable: true,
      });

      // Call the function
      const result = await checkEnvironment();

      // Assert that gcloud is detected
      assert.strictEqual(
        result.gcloudInstalled,
        true,
        "Google Cloud SDK should be detected as installed"
      );

      // Verify that exec was called with the correct command
      const execCalls = mockExecAsync.mock.calls;
      let gcloudCommandCalled = false;

      for (const call of execCalls) {
        if (call[0] === "gcloud --version") {
          gcloudCommandCalled = true;
          break;
        }
      }

      assert.ok(
        gcloudCommandCalled,
        "exec should be called with 'gcloud --version'"
      );
    });

    it("should detect Google Cloud SDK as not installed when command fails", async () => {
      // Mock the exec function to simulate gcloud not being installed
      const mockExecAsync = mock.fn(async (cmd) => {
        if (cmd === "gcloud --version") {
          throw new Error("Command not found");
        }
        return { stdout: "", stderr: "" };
      });

      // Mock promisify to return our mock exec function
      const mockPromisify = mock.fn(() => mockExecAsync);

      // Replace the functions
      Object.defineProperty(util, "promisify", {
        value: mockPromisify,
        configurable: true,
      });

      // Call the function
      const result = await checkEnvironment();

      // Assert that gcloud is not detected
      assert.strictEqual(
        result.gcloudInstalled,
        false,
        "Google Cloud SDK should be detected as not installed"
      );

      // Restore original functions
      restoreMocks();
    });
  });

  describe("checkGoogleCloudSdk", () => {
    it("should return true when Google Cloud SDK is installed", async () => {
      // Mock the exec function to simulate gcloud being installed
      const mockExecAsync = mock.fn(async () => ({
        stdout: "Google Cloud SDK 123.0.0",
        stderr: "",
      }));

      // Mock promisify to return our mock exec function
      const mockPromisify = mock.fn(() => mockExecAsync);

      // Replace the functions
      Object.defineProperty(util, "promisify", {
        value: mockPromisify,
        configurable: true,
      });

      // Call the function
      const result = await checkGoogleCloudSdk();

      // Assert that the function returns true
      assert.strictEqual(
        result,
        true,
        "checkGoogleCloudSdk should return true when gcloud is installed"
      );

      // Restore original functions
      restoreMocks();
    });

    it("should return false when Google Cloud SDK is not installed", async () => {
      // Mock the exec function to simulate gcloud not being installed
      const mockExecAsync = mock.fn(async () => {
        throw new Error("Command not found");
      });

      // Mock promisify to return our mock exec function
      const mockPromisify = mock.fn(() => mockExecAsync);

      // Replace the functions
      Object.defineProperty(util, "promisify", {
        value: mockPromisify,
        configurable: true,
      });

      // Call the function
      const result = await checkGoogleCloudSdk();

      // Assert that the function returns false
      assert.strictEqual(
        result,
        false,
        "checkGoogleCloudSdk should return false when gcloud is not installed"
      );

      // Restore original functions
      restoreMocks();
    });
  });
});
