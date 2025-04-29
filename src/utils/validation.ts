/**
 * Validate AWS region format
 */
export function validateAwsRegion(input: string): boolean | string {
  if (!input.trim()) {
    return "AWS region cannot be empty";
  }

  // Basic region format validation
  const regionRegex = /^[a-z]{2}-[a-z]+-\d{1,2}$/;
  if (!regionRegex.test(input)) {
    return "Invalid AWS region format (e.g., us-east-1, eu-west-2)";
  }

  return true;
}

/**
 * Validate AWS account ID format
 */
export function validateAwsAccountId(input: string): boolean | string {
  if (!input.trim()) {
    return "AWS account ID cannot be empty";
  }

  // Account ID should be 12 digits
  const accountIdRegex = /^\d{12}$/;
  if (!accountIdRegex.test(input)) {
    return "AWS account ID must be 12 digits";
  }

  return true;
}

/**
 * Validate AWS role name format
 */
export function validateAwsRoleName(input: string): boolean | string {
  if (!input.trim()) {
    return "AWS role name cannot be empty";
  }

  // Basic role name validation
  if (input.length > 64) {
    return "AWS role name cannot exceed 64 characters";
  }

  // Check for invalid characters
  const invalidCharsRegex = /[^a-zA-Z0-9+=,.@_-]/;
  if (invalidCharsRegex.test(input)) {
    return "AWS role name contains invalid characters";
  }

  return true;
}
