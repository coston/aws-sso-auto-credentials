import { describe, it } from "node:test";
import assert from "node:assert";
import { parseAwsConfig, stringifyAwsConfig } from "./configParser";

describe("AWS Config Parser", () => {
  describe("parseAwsConfig", () => {
    it("should parse a simple AWS config file", () => {
      const configContent = `
[default]
region = us-east-1
output = json

[profile dev]
region = us-west-2
output = text
`;

      const expected = {
        default: {
          region: "us-east-1",
          output: "json",
        },
        "profile dev": {
          region: "us-west-2",
          output: "text",
        },
      };

      const result = parseAwsConfig(configContent);
      assert.deepStrictEqual(result, expected);
    });

    it("should handle comments and empty lines", () => {
      const configContent = `
# This is a comment
[default]
region = us-east-1
; Another comment
output = json

[profile dev]
# Comment within section
region = us-west-2
output = text
`;

      const expected = {
        default: {
          region: "us-east-1",
          output: "json",
        },
        "profile dev": {
          region: "us-west-2",
          output: "text",
        },
      };

      const result = parseAwsConfig(configContent);
      assert.deepStrictEqual(result, expected);
    });

    it("should handle SSO profile configuration", () => {
      const configContent = `
[profile sso-user]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = SSOReadOnlyRole
region = us-west-2
output = json
`;

      const expected = {
        "profile sso-user": {
          sso_start_url: "https://my-sso-portal.awsapps.com/start",
          sso_region: "us-east-1",
          sso_account_id: "123456789012",
          sso_role_name: "SSOReadOnlyRole",
          region: "us-west-2",
          output: "json",
        },
      };

      const result = parseAwsConfig(configContent);
      assert.deepStrictEqual(result, expected);
    });

    it("should handle empty config", () => {
      const result = parseAwsConfig("");
      assert.deepStrictEqual(result, {});
    });
  });

  describe("stringifyAwsConfig", () => {
    it("should stringify a simple AWS config object", () => {
      const config = {
        default: {
          region: "us-east-1",
          output: "json",
        },
        "profile dev": {
          region: "us-west-2",
          output: "text",
        },
      };

      const expected = `[default]
region = us-east-1
output = json

[profile dev]
region = us-west-2
output = text
`;

      const result = stringifyAwsConfig(config);
      assert.strictEqual(result, expected);
    });

    it("should stringify an SSO profile configuration", () => {
      const config = {
        "profile sso-user": {
          sso_start_url: "https://my-sso-portal.awsapps.com/start",
          sso_region: "us-east-1",
          sso_account_id: "123456789012",
          sso_role_name: "SSOReadOnlyRole",
          region: "us-west-2",
          output: "json",
        },
      };

      const expected = `[profile sso-user]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = SSOReadOnlyRole
region = us-west-2
output = json
`;

      const result = stringifyAwsConfig(config);
      assert.strictEqual(result, expected);
    });

    it("should handle empty config object", () => {
      const result = stringifyAwsConfig({});
      assert.strictEqual(result, "");
    });
  });

  describe("roundtrip", () => {
    it("should correctly roundtrip from string to object and back", () => {
      const originalConfig = `
[default]
region = us-east-1
output = json

[profile dev]
region = us-west-2
output = text
`;

      const parsed = parseAwsConfig(originalConfig);
      const stringified = stringifyAwsConfig(parsed);

      // Remove leading/trailing whitespace for comparison
      const normalizedOriginal = originalConfig.trim();
      const normalizedStringified = stringified.trim();

      assert.strictEqual(normalizedStringified, normalizedOriginal);
    });
  });
});
