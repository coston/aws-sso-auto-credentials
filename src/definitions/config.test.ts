import { describe, it } from "node:test";
import assert from "node:assert";
import {
  generateSsoProfileConfig,
  generateAutoRefreshProfileConfig,
  generateOidcProfileConfig,
} from "./config";
import os from "os";

describe("AWS Config Templates", () => {
  // Existing functionality tests could go here

  describe("generateOidcProfileConfig", () => {
    it("should generate a valid OIDC profile configuration for Google provider", () => {
      const profileName = "test-oidc";
      const region = "us-west-2";
      const roleArn = "arn:aws:iam::123456789012:role/OIDCRole";
      const oidcProvider = "google";
      const oidcClientId = "123456789-abcdef.apps.googleusercontent.com";

      const config = generateOidcProfileConfig(
        profileName,
        region,
        roleArn,
        oidcProvider,
        oidcClientId
      );

      const profileKey = `profile ${profileName}`;
      assert.ok(config[profileKey], "Profile configuration should exist");
      assert.strictEqual(
        config[profileKey].region,
        region,
        "Region should match"
      );
      assert.strictEqual(
        config[profileKey].role_arn,
        roleArn,
        "Role ARN should match"
      );
      assert.strictEqual(
        config[profileKey].web_identity_provider,
        "accounts.google.com",
        "Web identity provider should be accounts.google.com for Google"
      );
      assert.strictEqual(
        config[profileKey].client_id,
        oidcClientId,
        "Client ID should match"
      );
    });

    it("should generate a valid OIDC profile configuration for non-Google provider", () => {
      const profileName = "test-oidc";
      const region = "us-west-2";
      const roleArn = "arn:aws:iam::123456789012:role/OIDCRole";
      const oidcProvider = "custom.provider.com";
      const oidcClientId = "client-id-123";

      const config = generateOidcProfileConfig(
        profileName,
        region,
        roleArn,
        oidcProvider,
        oidcClientId
      );

      const profileKey = `profile ${profileName}`;
      assert.ok(config[profileKey], "Profile configuration should exist");
      assert.strictEqual(
        config[profileKey].region,
        region,
        "Region should match"
      );
      assert.strictEqual(
        config[profileKey].role_arn,
        roleArn,
        "Role ARN should match"
      );
      assert.strictEqual(
        config[profileKey].web_identity_provider,
        oidcProvider,
        "Web identity provider should match the provided value for non-Google providers"
      );
      assert.strictEqual(
        config[profileKey].client_id,
        oidcClientId,
        "Client ID should match"
      );
    });
  });
});
