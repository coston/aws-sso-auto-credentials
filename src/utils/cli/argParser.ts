/**
 * Simple argument parser
 * A secure replacement for commander with minimal functionality
 */

/**
 * Command option definition
 */
interface CommandOption {
  name: string;
  description: string;
  defaultValue?: string | boolean;
  type?: "string" | "boolean";
}

/**
 * Command definition
 */
interface Command {
  name: string;
  description: string;
  options: CommandOption[];
  action: (options: Record<string, any>) => Promise<void>;
}

/**
 * Argument parser for CLI applications
 */
export class ArgumentParser {
  private programName: string;
  private programDescription: string;
  private programVersion: string;
  private commands: Command[] = [];
  private defaultCommand: string | null = null;

  /**
   * Create a new argument parser
   * @param name Program name
   * @param description Program description
   * @param version Program version
   */
  constructor(name: string, description: string, version: string) {
    this.programName = name;
    this.programDescription = description;
    this.programVersion = version;
  }

  /**
   * Add a command to the parser
   * @param name Command name
   * @param description Command description
   * @returns This parser for chaining
   */
  command(name: string, description: string): ArgumentParser {
    this.commands.push({
      name,
      description,
      options: [],
      action: async () => {},
    });
    return this;
  }

  /**
   * Add an option to the last added command
   * @param flag Option flag (e.g., "--force", "--script-path <path>")
   * @param description Option description
   * @param defaultValue Default value for the option
   * @returns This parser for chaining
   */
  option(
    flag: string,
    description: string,
    defaultValue?: string | boolean
  ): ArgumentParser {
    const lastCommand = this.commands[this.commands.length - 1];
    if (!lastCommand) {
      throw new Error("No command defined");
    }

    // Parse flag format (e.g., "--force", "--script-path <path>")
    const flagMatch = flag.match(
      /^--([a-zA-Z0-9-]+)(?:\s+<([a-zA-Z0-9-]+)>)?$/
    );
    if (!flagMatch) {
      throw new Error(`Invalid flag format: ${flag}`);
    }

    const name = flagMatch[1].replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    const hasValue = !!flagMatch[2];

    lastCommand.options.push({
      name,
      description,
      defaultValue,
      type: hasValue ? "string" : "boolean",
    });

    return this;
  }

  /**
   * Set the action for the last added command
   * @param callback Action callback
   * @returns This parser for chaining
   */
  action(
    callback: (options: Record<string, any>) => Promise<void>
  ): ArgumentParser {
    const lastCommand = this.commands[this.commands.length - 1];
    if (!lastCommand) {
      throw new Error("No command defined");
    }

    lastCommand.action = callback;
    return this;
  }

  /**
   * Set a default command to run if no command is specified
   * @param commandName Command name
   * @returns This parser for chaining
   */
  setDefaultCommand(commandName: string): ArgumentParser {
    this.defaultCommand = commandName;
    return this;
  }

  /**
   * Parse command line arguments and execute the appropriate command
   * @param argv Command line arguments
   */
  async parse(argv: string[]): Promise<void> {
    // Remove the first two arguments (node and script path)
    const args = argv.slice(2);

    // Check for help flag
    if (args.includes("--help") || args.includes("-h")) {
      this.showHelp();
      return;
    }

    // Check for version flag
    if (args.includes("--version") || args.includes("-v")) {
      console.log(this.programVersion);
      return;
    }

    // Find the command to execute
    let commandName = args[0];
    let commandArgs = args.slice(1);

    // If no command specified, use default command
    if (!commandName && this.defaultCommand) {
      commandName = this.defaultCommand;
      commandArgs = args;
    }

    // Find the command
    const command = this.commands.find((cmd) => cmd.name === commandName);
    if (!command) {
      console.error(`Unknown command: ${commandName}`);
      this.showHelp();
      process.exit(1);
    }

    // Parse options
    const options: Record<string, any> = {};

    // Set default values
    for (const option of command.options) {
      if (option.defaultValue !== undefined) {
        options[option.name] = option.defaultValue;
      }
    }

    // Parse command line options
    for (let i = 0; i < commandArgs.length; i++) {
      const arg = commandArgs[i];

      if (arg.startsWith("--")) {
        const optionName = arg.slice(2);
        const option = command.options.find(
          (opt) =>
            opt.name.replace(
              /[A-Z]/g,
              (letter) => `-${letter.toLowerCase()}`
            ) === optionName
        );

        if (!option) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }

        if (option.type === "boolean") {
          options[option.name] = true;
        } else {
          // Next argument is the value
          i++;
          if (i >= commandArgs.length) {
            console.error(`Option ${arg} requires a value`);
            process.exit(1);
          }
          options[option.name] = commandArgs[i];
        }
      }
    }

    // Execute the command
    try {
      await command.action(options);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  }

  /**
   * Display help information
   */
  private showHelp(): void {
    console.log(`${this.programName} - ${this.programDescription}`);
    console.log(`Version: ${this.programVersion}\n`);
    console.log("Usage:");
    console.log(`  ${this.programName} [command] [options]\n`);

    console.log("Commands:");
    for (const command of this.commands) {
      console.log(`  ${command.name}\t${command.description}`);
    }

    console.log("\nOptions:");
    for (const command of this.commands) {
      for (const option of command.options) {
        const flag = `--${option.name.replace(
          /[A-Z]/g,
          (letter) => `-${letter.toLowerCase()}`
        )}`;
        const defaultValue =
          option.defaultValue !== undefined
            ? ` (default: ${option.defaultValue})`
            : "";
        console.log(`  ${flag}\t${option.description}${defaultValue}`);
      }
    }
  }
}

/**
 * Create a new argument parser
 * @param name Program name
 * @param description Program description
 * @param version Program version
 * @returns New argument parser
 */
export function createParser(
  name: string,
  description: string,
  version: string
): ArgumentParser {
  return new ArgumentParser(name, description, version);
}
