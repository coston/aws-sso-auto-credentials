/**
 * CLI Messages
 * Status indicators and other messages for CLI output
 */

/**
 * Status indicators for CLI output
 */
export const STATUS = {
  SUCCESS: "✅",
  ERROR: "❌",
  WARNING: "⚠️",
  INFO: "ℹ️",
  WORKING: "⏳",
};

/**
 * Common messages used in the CLI
 */
export const MESSAGES = {
  OPERATION_STARTED: "Operation started",
  OPERATION_COMPLETED: "Operation completed successfully",
  OPERATION_FAILED: "Operation failed",
  CHECKING_ENVIRONMENT: "Checking environment",
  CREATING_PROFILE: "Creating profile",
  CREATING_SCRIPT: "Creating refresh script",
  SETUP_COMPLETE: "Setup completed successfully",
};

/**
 * Format a message with a status indicator
 * @param message The message to format
 * @param status The status indicator to use
 * @returns Formatted message with status indicator
 */
export function formatStatus(
  message: string,
  status: keyof typeof STATUS
): string {
  return `${STATUS[status]} ${message}`;
}
