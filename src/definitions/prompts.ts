import { PromptOptions } from "../utils/cli/prompt";
import {
  validateAwsRegion,
  validateAwsAccountId,
  validateAwsRoleName,
} from "../utils/validation";

/**
 * Prompts for AWS SSO setup
 */
export const setupPrompts = {
  /**
   * Prompt for AWS profile prefix
   */
  prefix: {
    message:
      "Enter a prefix for your AWS profiles (e.g., engineering, platform)",
    validate: (input: string) => {
      if (!input.trim()) return "Prefix cannot be empty";
      if (!/^[a-zA-Z0-9-]+$/.test(input))
        return "Prefix can only contain letters, numbers, and hyphens";
      return true;
    },
  } as PromptOptions,

  /**
   * Prompt for AWS region
   */
  region: {
    message: "Enter your AWS region",
    default: "us-east-1",
    validate: validateAwsRegion,
  } as PromptOptions,

  /**
   * Prompt for AWS SSO start URL
   */
  ssoStartUrl: {
    message: "Enter your AWS SSO start URL",
    validate: (input: string) => {
      if (!input.trim()) return "SSO start URL cannot be empty";
      try {
        new URL(input);
        return true;
      } catch (error) {
        return "Please enter a valid URL";
      }
    },
  } as PromptOptions,

  /**
   * Prompt for AWS account ID
   */
  accountId: {
    message: "Enter your AWS account ID",
    validate: validateAwsAccountId,
  } as PromptOptions,

  /**
   * Prompt for AWS role name
   */
  roleName: {
    message: "Enter your AWS role name (permission set)",
    validate: validateAwsRoleName,
  } as PromptOptions,
};

/**
 * Prompts for existing profile selection
 */
export const profileSelectionPrompts = {
  /**
   * Prompt for using an existing SSO profile
   */
  useExisting: {
    message: "Do you want to use an existing SSO profile? (yes/no)",
    default: "yes",
    validate: (input: string) => {
      const normalized = input.toLowerCase();
      return normalized === "yes" ||
        normalized === "no" ||
        normalized === "y" ||
        normalized === "n"
        ? true
        : "Please enter yes or no";
    },
  } as PromptOptions,

  /**
   * Prompt for selecting an existing profile
   */
  profileName: (existingSsoProfiles: string[]) =>
    ({
      message: "Enter the name of the existing SSO profile to use",
      validate: (input: string) => {
        return existingSsoProfiles.includes(input)
          ? true
          : `Profile not found. Available profiles: ${existingSsoProfiles.join(
              ", "
            )}`;
      },
    } as PromptOptions),
};

/**
 * Prompts for OIDC setup
 */
export const oidcPrompts = {
  /**
   * Prompt for using OIDC authentication
   */
  useOidc: {
    message:
      "Do you want to use OIDC authentication instead of AWS SSO? (yes/no)",
    default: "no",
    validate: (input: string) => {
      const normalized = input.toLowerCase();
      return normalized === "yes" ||
        normalized === "no" ||
        normalized === "y" ||
        normalized === "n"
        ? true
        : "Please enter yes or no";
    },
  } as PromptOptions,

  /**
   * Prompt for OIDC provider
   */
  oidcProvider: {
    message: "Enter the OIDC provider (currently only 'google' is supported)",
    default: "google",
    validate: (input: string) => {
      if (input.toLowerCase() !== "google") {
        return "Currently only 'google' is supported as an OIDC provider";
      }
      return true;
    },
  } as PromptOptions,

  /**
   * Prompt for OIDC client ID
   */
  oidcClientId: {
    message:
      "Enter your OIDC client ID (e.g., for Google: 1234567890-abcxyz.apps.googleusercontent.com)",
    validate: (input: string) => {
      if (!input.trim()) return "Client ID cannot be empty";
      if (
        input.includes("google") &&
        !input.endsWith(".apps.googleusercontent.com")
      ) {
        return "Google client ID should end with .apps.googleusercontent.com";
      }
      return true;
    },
  } as PromptOptions,

  /**
   * Prompt for AWS IAM role ARN
   */
  roleArn: {
    message: "Enter the AWS IAM role ARN to assume with OIDC",
    validate: (input: string) => {
      if (!input.trim()) return "Role ARN cannot be empty";
      if (!input.startsWith("arn:aws:iam::")) {
        return "Role ARN should start with arn:aws:iam::";
      }
      if (!input.includes(":role/")) {
        return "Role ARN should include :role/";
      }
      return true;
    },
  } as PromptOptions,
};
