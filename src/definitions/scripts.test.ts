import { describe, it } from "node:test";
import assert from "node:assert";
import {
  generateRefreshScriptContent,
  generateGoogleOidcRefreshScriptContent,
} from "./scripts";

describe("Script Templates", () => {
  // Existing functionality tests could go here

  describe("generateGoogleOidcRefreshScriptContent", () => {
    it("should generate a valid Google OIDC refresh script content", () => {
      const profileName = "test-oidc";
      const roleArn = "arn:aws:iam::123456789012:role/OIDCRole";
      const clientId = "123456789-abcdef.apps.googleusercontent.com";

      const scriptContent = generateGoogleOidcRefreshScriptContent(
        profileName,
        roleArn,
        clientId
      );

      // Check that the script contains the expected elements
      assert.ok(
        scriptContent.includes(
          `# Google OIDC credential refresh script for profile: ${profileName}`
        ),
        "Script should include the profile name"
      );
      assert.ok(
        scriptContent.includes(`local role_arn="${roleArn}"`),
        "Script should include the role ARN"
      );
      assert.ok(
        scriptContent.includes(`local client_id="${clientId}"`),
        "Script should include the client ID"
      );

      // Check for essential functions
      assert.ok(
        scriptContent.includes("check_jq()"),
        "Script should include the check_jq function"
      );
      assert.ok(
        scriptContent.includes("check_gcloud()"),
        "Script should include the check_gcloud function"
      );
      assert.ok(
        scriptContent.includes("get_aws_credentials()"),
        "Script should include the get_aws_credentials function"
      );

      // Check for gcloud command
      assert.ok(
        scriptContent.includes("gcloud auth print-identity-token"),
        "Script should include the gcloud auth command"
      );

      // Check for AWS STS command
      assert.ok(
        scriptContent.includes("aws sts assume-role-with-web-identity"),
        "Script should include the AWS STS assume-role-with-web-identity command"
      );

      // Check for proper JSON formatting
      assert.ok(
        scriptContent.includes("jq '{"),
        "Script should include JSON formatting with jq"
      );
    });
  });
});
