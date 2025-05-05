import { describe, it, mock } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import { createOidcProfile } from "./config";
import fileSystem from "../../utils/fs/fileSystem";
import * as configParser from "../../utils/parsers/configParser";

// Mock the fileSystem module
const originalPathExists = fileSystem.pathExists;
const originalEnsureDir = fileSystem.ensureDir;
const originalReadFile = fileSystem.readFile;
const originalWriteFile = fileSystem.writeFile;

// Helper to restore fileSystem mocks
function restoreMocks() {
  fileSystem.pathExists = originalPathExists;
  fileSystem.ensureDir = originalEnsureDir;
  fileSystem.readFile = originalReadFile;
  fileSystem.writeFile = originalWriteFile;
}

describe("AWS Config Operations", () => {
  // Existing functionality tests could go here

  describe("createOidcProfile", () => {
    it("should throw an error if profile exists and force is not set", async () => {
      // Mock fileSystem functions
      fileSystem.pathExists = async () => true;
      fileSystem.readFile = async () => "existing config content";

      // Mock configParser functions
      const parseAwsConfigMock = mock.fn(() => ({
        "profile test-oidc": {
          region: "us-east-1",
        },
      }));

      // Save original function
      const originalParseAwsConfig = configParser.parseAwsConfig;

      // Replace with mock
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: parseAwsConfigMock,
        configurable: true,
      });

      // Create options for the test
      const options = {
        profileName: "test-oidc",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcProvider: "google",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
        force: false,
      };

      // Assert that createOidcProfile throws an error
      await assert.rejects(
        async () => {
          await createOidcProfile(options);
        },
        {
          message: `Profile ${options.profileName} already exists. Use --force to overwrite.`,
        }
      );

      // Restore original functions
      restoreMocks();
    });

    it("should create a new OIDC profile if it doesn't exist", async () => {
      // Mock fileSystem functions
      fileSystem.pathExists = async () => true;
      fileSystem.ensureDir = async () => {};
      fileSystem.readFile = async () => "existing config content";

      const mockConfig = {};

      // Mock configParser functions
      const parseAwsConfigMock = mock.fn(() => mockConfig);
      const stringifyAwsConfigMock = mock.fn((config) =>
        JSON.stringify(config)
      );

      // Save original functions
      const originalParseAwsConfig = configParser.parseAwsConfig;
      const originalStringifyAwsConfig = configParser.stringifyAwsConfig;

      // Replace with mocks
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: parseAwsConfigMock,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: stringifyAwsConfigMock,
        configurable: true,
      });

      let writtenContent = "";
      let writtenPath = "";
      fileSystem.writeFile = async (path, content) => {
        writtenPath = path;
        writtenContent = content;
      };

      // Create options for the test
      const options = {
        profileName: "test-oidc",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcProvider: "google",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
      };

      // Call the function
      await createOidcProfile(options);

      // Assert that the config was written to the correct path
      assert.strictEqual(
        writtenPath,
        path.join(os.homedir(), ".aws", "config"),
        "Config should be written to the AWS config file"
      );

      // Assert that the config contains the OIDC profile
      const parsedConfig = JSON.parse(writtenContent);
      const profileKey = `profile ${options.profileName}`;
      assert.ok(parsedConfig[profileKey], "Profile should exist in the config");
      assert.strictEqual(
        parsedConfig[profileKey].region,
        options.region,
        "Region should match"
      );
      assert.strictEqual(
        parsedConfig[profileKey].role_arn,
        options.roleArn,
        "Role ARN should match"
      );
      assert.strictEqual(
        parsedConfig[profileKey].web_identity_provider,
        "accounts.google.com",
        "Web identity provider should be accounts.google.com for Google"
      );
      assert.strictEqual(
        parsedConfig[profileKey].client_id,
        options.oidcClientId,
        "Client ID should match"
      );

      // Restore original functions
      restoreMocks();

      // Restore configParser functions
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: originalParseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: originalStringifyAwsConfig,
        configurable: true,
      });
    });

    it("should overwrite an existing OIDC profile if force is set", async () => {
      // Mock fileSystem functions
      fileSystem.pathExists = async () => true;
      fileSystem.ensureDir = async () => {};
      fileSystem.readFile = async () => "existing config content";

      const mockConfig = {
        "profile test-oidc": {
          region: "us-east-1",
          role_arn: "arn:aws:iam::111111111111:role/OldRole",
          web_identity_provider: "accounts.google.com",
          client_id: "old-client-id",
        },
      };

      // Mock configParser functions
      const parseAwsConfigMock = mock.fn(() => mockConfig);
      const stringifyAwsConfigMock = mock.fn((config) =>
        JSON.stringify(config)
      );

      // Save original functions
      const originalParseAwsConfig = configParser.parseAwsConfig;
      const originalStringifyAwsConfig = configParser.stringifyAwsConfig;

      // Replace with mocks
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: parseAwsConfigMock,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: stringifyAwsConfigMock,
        configurable: true,
      });

      let writtenContent = "";
      fileSystem.writeFile = async (path, content) => {
        writtenContent = content;
      };

      // Create options for the test
      const options = {
        profileName: "test-oidc",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/NewRole",
        oidcProvider: "google",
        oidcClientId: "new-client-id",
        force: true,
      };

      // Call the function
      await createOidcProfile(options);

      // Assert that the config contains the updated OIDC profile
      const parsedConfig = JSON.parse(writtenContent);
      const profileKey = `profile ${options.profileName}`;
      assert.ok(parsedConfig[profileKey], "Profile should exist in the config");
      assert.strictEqual(
        parsedConfig[profileKey].region,
        options.region,
        "Region should be updated"
      );
      assert.strictEqual(
        parsedConfig[profileKey].role_arn,
        options.roleArn,
        "Role ARN should be updated"
      );
      assert.strictEqual(
        parsedConfig[profileKey].client_id,
        options.oidcClientId,
        "Client ID should be updated"
      );

      // Restore original functions
      restoreMocks();

      // Restore configParser functions
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: originalParseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: originalStringifyAwsConfig,
        configurable: true,
      });
    });

    it("should create AWS directory if it doesn't exist", async () => {
      // Mock fileSystem functions
      fileSystem.pathExists = async (path) => {
        // Return false for .aws directory, true for config file
        return path.endsWith("config");
      };

      let dirCreated = false;
      fileSystem.ensureDir = async () => {
        dirCreated = true;
      };

      fileSystem.readFile = async () => "existing config content";
      fileSystem.writeFile = async () => {};

      // Mock configParser functions
      const parseAwsConfigMock = mock.fn(() => ({}));
      const stringifyAwsConfigMock = mock.fn(() => "");

      // Save original functions
      const originalParseAwsConfig = configParser.parseAwsConfig;
      const originalStringifyAwsConfig = configParser.stringifyAwsConfig;

      // Replace with mocks
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: parseAwsConfigMock,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: stringifyAwsConfigMock,
        configurable: true,
      });

      // Create options for the test
      const options = {
        profileName: "test-oidc",
        region: "us-west-2",
        roleArn: "arn:aws:iam::123456789012:role/OIDCRole",
        oidcProvider: "google",
        oidcClientId: "123456789-abcdef.apps.googleusercontent.com",
      };

      // Call the function
      await createOidcProfile(options);

      // Assert that the directory was created
      assert.ok(
        dirCreated,
        "AWS directory should be created if it doesn't exist"
      );

      // Restore original functions
      restoreMocks();

      // Restore configParser functions
      Object.defineProperty(configParser, "parseAwsConfig", {
        value: originalParseAwsConfig,
        configurable: true,
      });

      Object.defineProperty(configParser, "stringifyAwsConfig", {
        value: originalStringifyAwsConfig,
        configurable: true,
      });
    });
  });
});
