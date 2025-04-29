/**
 * AWS Config Parser
 * A secure replacement for the ini package focused specifically on AWS config files
 */

/**
 * Parse AWS config file content into an object
 * @param content The content of the AWS config file
 * @returns Parsed config object
 */
export function parseAwsConfig(content: string): Record<string, any> {
  const config: Record<string, any> = {};
  let currentSection: string | null = null;

  // Split by lines and process each line
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (
      !trimmedLine ||
      trimmedLine.startsWith("#") ||
      trimmedLine.startsWith(";")
    ) {
      continue;
    }

    // Check if this is a section header: [section]
    const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      config[currentSection] = {};
      continue;
    }

    // Must be a key=value pair
    const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (keyValueMatch && currentSection) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();
      config[currentSection][key] = value;
    }
  }

  return config;
}

/**
 * Stringify an object into AWS config format
 * @param config The config object to stringify
 * @returns AWS config file content
 */
export function stringifyAwsConfig(config: Record<string, any>): string {
  const lines: string[] = [];

  for (const [section, values] of Object.entries(config)) {
    lines.push(`[${section}]`);

    for (const [key, value] of Object.entries(values as Record<string, any>)) {
      lines.push(`${key} = ${value}`);
    }

    // Add empty line between sections
    lines.push("");
  }

  return lines.join("\n");
}
