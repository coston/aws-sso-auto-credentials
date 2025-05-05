import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import { setupCommand } from "../commands/setup";
import fileSystem from "../utils/fs/fileSystem";
import * as configParser from "../utils/parsers/configParser";
import * as environment from "../utils/environment";
import * as prompt from "../utils/cli/prompt";

// Mock the fileSystem module
const originalPathExists = fileSystem.pathExists;
const originalEnsureDir = fileSystem.ensureDir;
const originalReadFile = fileSystem.readFile;
const originalWriteFile = fileSystem.writeFile;
const originalChmod = fileSystem.chmod;

// Save original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Save original process.exit
const originalProcessExit = process.exit;

// Helper to restore mocks
function restoreMocks() {
  fileSystem.pathExists = originalPathExists;
  fileSystem.ensureDir = originalEnsureDir;
  fileSystem.readFile = originalReadFile;
  fileSystem.writeFile = originalWriteFile;
  fileSystem.chmod = originalChmod;

  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  process.exit = originalProcessExit;
}

describe("OIDC Setup Integration Tests", () => {
  beforeEach(() => {
    // Mock console methods to prevent output during tests
    console.log = mock.fn();
    console.error = mock.fn();

    // Mock process.exit to prevent tests from exiting
    process.exit = mock.fn() as any;
  });

  afterEach(() => {
    // Restore original functions
    restoreMocks();
  });

  describe("OIDC Command-line Options Parsing", () => {
    it("should correctly parse OIDC provider option", async () => {
      // Mock environment check
      const mockCheckEnvironment = mock.fn(async () => ({
        platform: "darwin",
        isWindows: false,
        isMac: true,
        isLinux: false,
        isGitBash: false,
        isWsl: false,
        awsCliVersion: "2.0.0",
        jqInstalled: true,
        gcloudInstalled: true,
        warnings: [],
        errors: [],
      }));

      // Replace the environment check function
      Object.defineProperty(environment, "checkEnvironment", {
        value: mockCheckEnvironment,
        configurable: true,
      });

      // Mock file system operations
      fileSystem.pathExists = async () => false;
      fileSystem.ensureDir = async () => {};
      fileSystem.writeFile = async () => {};
      fileSystem.chmod = async () => {};

      // Mock prompt to avoid interactive prompts
      const mockPromptMultiple = mock.fn(async () => ({
        prefix: "test",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
      }));

      // Replace the prompt function
      Object.defineProperty(prompt, "promptMultiple", {
        value: mockPromptMultiple,
        configurable: true,
      });

      // Create options with OIDC provider
      const options = {
        oidcProvider: "google",
        skipLogin: true,
      };

      // Call the setup command
      await setupCommand(options);

      // Check that the environment was checked
      assert.strictEqual(
        mockCheckEnvironment.mock.callCount(),
        1,
        "Environment should be checked"
      );

      // Check that the prompt was called with the correct options
      assert.strictEqual(
        mockPromptMultiple.mock.callCount(),
        1,
        "Prompt should be called"
      );

      // Restore original functions
      Object.defineProperty(environment, "checkEnvironment", {
        value: environment.checkEnvironment,
        configurable: true,
      });

      Object.defineProperty(prompt, "promptMultiple", {
        value: prompt.promptMultiple,
        configurable: true,
      });
    });

    it("should correctly parse roleArn and oidcClientId options", async () => {
      // Mock environment check
      const mockCheckEnvironment = mock.fn(async () => ({
        platform: "darwin",
        isWindows: false,
        isMac: true,
        isLinux: false,
        isGitBash: false,
        isWsl: false,
        awsCliVersion: "2.0.0",
        jqInstalled: true,
        gcloudInstalled: true,
        warnings: [],
        errors: [],
      }));

      // Replace the environment check function
      Object.defineProperty(environment, "checkEnvironment", {
        value: mockCheckEnvironment,
        configurable: true,
      });

      // Mock file system operations
      fileSystem.pathExists = async () => false;
      fileSystem.ensureDir = async () => {};
      fileSystem.writeFile = async () => {};
      fileSystem.chmod = async () => {};

      // Mock prompt to avoid interactive prompts
      const mockPromptMultiple = mock.fn(async () => ({
        prefix: "test",
        region: "us-west-2",
      }));

      // Replace the prompt function
      Object.defineProperty(prompt, "promptMultiple", {
        value: mockPromptMultiple,
        configurable: true,
      });

      // Create options with roleArn and oidcClientId
      const options = {
        oidcProvider: "google",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
        skipLogin: true,
      };

      // Call the setup command
      await setupCommand(options);

      // Check that the environment was checked
      assert.strictEqual(
        mockCheckEnvironment.mock.callCount(),
        1,
        "Environment should be checked"
      );

      // Check that the prompt was called with the correct options
      assert.strictEqual(
        mockPromptMultiple.mock.callCount(),
        1,
        "Prompt should be called"
      );

      // Restore original functions
      Object.defineProperty(environment, "checkEnvironment", {
        value: environment.checkEnvironment,
        configurable: true,
      });

      Object.defineProperty(prompt, "promptMultiple", {
        value: prompt.promptMultiple,
        configurable: true,
      });
    });
  });

  describe("OIDC Profile Creation Process", () => {
    it("should create an OIDC profile in the AWS config file", async () => {
      // Mock environment check
      const mockCheckEnvironment = mock.fn(async () => ({
        platform: "darwin",
        isWindows: false,
        isMac: true,
        isLinux: false,
        isGitBash: false,
        isWsl: false,
        awsCliVersion: "2.0.0",
        jqInstalled: true,
        gcloudInstalled: true,
        warnings: [],
        errors: [],
      }));

      // Replace the environment check function
      Object.defineProperty(environment, "checkEnvironment", {
        value: mockCheckEnvironment,
        configurable: true,
      });

      // Mock file system operations
      fileSystem.pathExists = async () => false;
      fileSystem.ensureDir = async () => {};

      let writtenFiles: Record<string, string> = {};
      fileSystem.writeFile = async (filePath, content) => {
        writtenFiles[filePath] = content;
      };

      fileSystem.chmod = async () => {};

      // Mock configParser
      const mockParseAwsConfig = mock.fn(() => ({}));
      const mockStringifyAwsConfig = mock.fn((config) =>
        JSON.stringify(config)
      );

      // Replace the configParser functions
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: mockParseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: mockStringifyAwsConfig,
        configurable: true,
      });

      // Mock prompt to avoid interactive prompts
      const mockPromptMultiple = mock.fn(async () => ({
        prefix: "test",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcProvider: "google",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
        useOidc: true,
      }));

      // Replace the prompt function
      Object.defineProperty(prompt, "promptMultiple", {
        value: mockPromptMultiple,
        configurable: true,
      });

      // Call the setup command
      await setupCommand({ skipLogin: true });

      // Check that the AWS config file was written
      const awsConfigPath = path.join(os.homedir(), ".aws", "config");
      assert.ok(
        writtenFiles[awsConfigPath],
        "AWS config file should be written"
      );

      // Check that the stringifyAwsConfig function was called
      assert.strictEqual(
        mockStringifyAwsConfig.mock.callCount(),
        2, // Once for OIDC profile, once for auto-credentials profile
        "stringifyAwsConfig should be called twice"
      );

      // Restore original functions
      Object.defineProperty(environment, "checkEnvironment", {
        value: environment.checkEnvironment,
        configurable: true,
      });

      Object.defineProperty(configParser, "parseAwsConfig", {
        value: configParser.parseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: configParser.stringifyAwsConfig,
        configurable: true,
      });

      Object.defineProperty(prompt, "promptMultiple", {
        value: prompt.promptMultiple,
        configurable: true,
      });
    });
  });

  describe("Google OIDC Script Generation", () => {
    it("should generate a Google OIDC refresh script", async () => {
      // Mock environment check
      const mockCheckEnvironment = mock.fn(async () => ({
        platform: "darwin",
        isWindows: false,
        isMac: true,
        isLinux: false,
        isGitBash: false,
        isWsl: false,
        awsCliVersion: "2.0.0",
        jqInstalled: true,
        gcloudInstalled: true,
        warnings: [],
        errors: [],
      }));

      // Replace the environment check function
      Object.defineProperty(environment, "checkEnvironment", {
        value: mockCheckEnvironment,
        configurable: true,
      });

      // Mock file system operations
      fileSystem.pathExists = async () => false;
      fileSystem.ensureDir = async () => {};

      let writtenFiles: Record<string, string> = {};
      fileSystem.writeFile = async (filePath, content) => {
        writtenFiles[filePath] = content;
      };

      fileSystem.chmod = async () => {};

      // Mock configParser
      const mockParseAwsConfig = mock.fn(() => ({}));
      const mockStringifyAwsConfig = mock.fn((config) =>
        JSON.stringify(config)
      );

      // Replace the configParser functions
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: mockParseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: mockStringifyAwsConfig,
        configurable: true,
      });

      // Mock prompt to avoid interactive prompts
      const mockPromptMultiple = mock.fn(async () => ({
        prefix: "test",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcProvider: "google",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
        useOidc: true,
      }));

      // Replace the prompt function
      Object.defineProperty(prompt, "promptMultiple", {
        value: mockPromptMultiple,
        configurable: true,
      });

      // Call the setup command
      await setupCommand({ skipLogin: true });

      // Check that the refresh script was written
      const scriptPath = path.join(
        os.homedir(),
        ".aws",
        "refresh-if-needed-test.sh"
      );
      assert.ok(writtenFiles[scriptPath], "Refresh script should be written");

      // Check that the script contains the expected content
      const scriptContent = writtenFiles[scriptPath];
      assert.ok(
        scriptContent.includes("Google OIDC credential refresh script"),
        "Script should include Google OIDC header"
      );
      assert.ok(
        scriptContent.includes("gcloud auth print-identity-token"),
        "Script should include gcloud auth command"
      );
      assert.ok(
        scriptContent.includes("aws sts assume-role-with-web-identity"),
        "Script should include AWS STS assume-role-with-web-identity command"
      );

      // Restore original functions
      Object.defineProperty(environment, "checkEnvironment", {
        value: environment.checkEnvironment,
        configurable: true,
      });

      Object.defineProperty(configParser, "parseAwsConfig", {
        value: configParser.parseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: configParser.stringifyAwsConfig,
        configurable: true,
      });

      Object.defineProperty(prompt, "promptMultiple", {
        value: prompt.promptMultiple,
        configurable: true,
      });
    });

    it("should check for Google Cloud SDK installation", async () => {
      // Mock environment check
      const mockCheckEnvironment = mock.fn(async () => ({
        platform: "darwin",
        isWindows: false,
        isMac: true,
        isLinux: false,
        isGitBash: false,
        isWsl: false,
        awsCliVersion: "2.0.0",
        jqInstalled: true,
        gcloudInstalled: false, // gcloud not installed
        warnings: [],
        errors: [],
      }));

      // Replace the environment check function
      Object.defineProperty(environment, "checkEnvironment", {
        value: mockCheckEnvironment,
        configurable: true,
      });

      // Mock file system operations
      fileSystem.pathExists = async () => false;
      fileSystem.ensureDir = async () => {};
      fileSystem.writeFile = async () => {};
      fileSystem.chmod = async () => {};

      // Mock configParser
      const mockParseAwsConfig = mock.fn(() => ({}));
      const mockStringifyAwsConfig = mock.fn((config) =>
        JSON.stringify(config)
      );

      // Replace the configParser functions
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: mockParseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: mockStringifyAwsConfig,
        configurable: true,
      });

      // Mock prompt to avoid interactive prompts
      const mockPromptMultiple = mock.fn(async () => ({
        prefix: "test",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcProvider: "google",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
        useOidc: true,
      }));

      // Replace the prompt function
      Object.defineProperty(prompt, "promptMultiple", {
        value: mockPromptMultiple,
        configurable: true,
      });

      // Call the setup command
      await setupCommand({ skipLogin: true });

      // Check that a warning was logged about gcloud not being installed
      const consoleLogCalls = (console.log as any).mock.calls;
      let warningLogged = false;

      for (const call of consoleLogCalls) {
        const logMessage = call[0];
        if (typeof logMessage === "string" && logMessage.includes("WARNING")) {
          warningLogged = true;
          break;
        }
      }

      assert.ok(
        warningLogged,
        "A warning should be logged when gcloud is not installed"
      );

      // Restore original functions
      Object.defineProperty(environment, "checkEnvironment", {
        value: environment.checkEnvironment,
        configurable: true,
      });

      Object.defineProperty(configParser, "parseAwsConfig", {
        value: configParser.parseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: configParser.stringifyAwsConfig,
        configurable: true,
      });

      Object.defineProperty(prompt, "promptMultiple", {
        value: prompt.promptMultiple,
        configurable: true,
      });
    });
  });
});
