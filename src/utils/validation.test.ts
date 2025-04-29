import { describe, it } from "node:test";
import assert from "node:assert";
import {
  validateAwsRegion,
  validateAwsAccountId,
  validateAwsRoleName,
} from "./validation";

describe("AWS Validation Utilities", () => {
  describe("validateAwsRegion", () => {
    it("should validate correct AWS regions", () => {
      assert.strictEqual(validateAwsRegion("us-east-1"), true);
      assert.strictEqual(validateAwsRegion("eu-west-2"), true);
      assert.strictEqual(validateAwsRegion("ap-southeast-1"), true);
    });

    it("should reject invalid AWS regions", () => {
      assert.notStrictEqual(validateAwsRegion(""), true);
      assert.notStrictEqual(validateAwsRegion("invalid"), true);
      assert.notStrictEqual(validateAwsRegion("us_east_1"), true);
      assert.notStrictEqual(validateAwsRegion("US-EAST-1"), true);
    });
  });

  describe("validateAwsAccountId", () => {
    it("should validate correct AWS account IDs", () => {
      assert.strictEqual(validateAwsAccountId("123456789012"), true);
    });

    it("should reject invalid AWS account IDs", () => {
      assert.notStrictEqual(validateAwsAccountId(""), true);
      assert.notStrictEqual(validateAwsAccountId("12345"), true);
      assert.notStrictEqual(validateAwsAccountId("1234567890123"), true);
      assert.notStrictEqual(validateAwsAccountId("abcdefghijkl"), true);
    });
  });

  describe("validateAwsRoleName", () => {
    it("should validate correct AWS role names", () => {
      assert.strictEqual(validateAwsRoleName("AdminRole"), true);
      assert.strictEqual(validateAwsRoleName("ReadOnly-Role"), true);
      assert.strictEqual(validateAwsRoleName("Role_With.Special@Chars"), true);
    });

    it("should reject invalid AWS role names", () => {
      assert.notStrictEqual(validateAwsRoleName(""), true);
      assert.notStrictEqual(validateAwsRoleName("Role*WithInvalidChars"), true);
      assert.notStrictEqual(validateAwsRoleName("Role/WithInvalidChars"), true);
      assert.notStrictEqual(validateAwsRoleName("a".repeat(65)), true);
    });
  });
});
