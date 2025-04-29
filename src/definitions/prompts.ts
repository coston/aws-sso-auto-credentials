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
