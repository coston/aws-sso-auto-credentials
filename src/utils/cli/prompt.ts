import readline from "readline";
import { Writable } from "stream";

/**
 * Options for prompting the user
 */
export interface PromptOptions {
  message: string;
  default?: string;
  validate?: (input: string) => boolean | string;
  type?: "input" | "password";
}

/**
 * Create a readline interface with optional hidden input
 * @param options Prompt options
 * @returns Readline interface
 */
function createInterface(options: PromptOptions): readline.Interface {
  // For password input, we'll use a custom output stream that doesn't echo
  if (options.type === "password") {
    const mutableStdout = new Writable({
      write: function (chunk, encoding, callback) {
        callback();
      },
    });

    return readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });
  }

  // For normal input
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt for user input
 * @param options Prompt options
 * @returns User input
 */
export async function prompt(options: PromptOptions): Promise<string> {
  const rl = createInterface(options);

  // For password input, we need to manually write the prompt
  if (options.type === "password") {
    process.stdout.write(`${options.message} `);
  }

  try {
    let valid = false;
    let result = "";

    while (!valid) {
      // Format the prompt with default value if provided
      const promptText = options.default
        ? `${options.message} (${options.default}): `
        : `${options.message}: `;

      // Get user input
      result = await new Promise<string>((resolve) => {
        rl.question(options.type === "password" ? "" : promptText, (answer) => {
          // Echo a newline for password inputs
          if (options.type === "password") {
            process.stdout.write("\n");
          }
          resolve(answer);
        });
      });

      // Use default if input is empty
      if (!result && options.default) {
        result = options.default;
      }

      // Validate input if validator provided
      if (options.validate) {
        const validationResult = options.validate(result);
        if (validationResult === true) {
          valid = true;
        } else {
          console.error(`Error: ${validationResult}`);
          // For password, we need to re-prompt manually
          if (options.type === "password") {
            process.stdout.write(`${options.message} `);
          }
        }
      } else {
        valid = true;
      }
    }

    return result;
  } finally {
    rl.close();
  }
}

/**
 * Prompt for multiple questions
 * @param questions Record of questions to prompt for
 * @returns Record of answers
 */
export async function promptMultiple<T extends Record<string, string>>(
  questions: Record<keyof T, PromptOptions>
): Promise<T> {
  const result = {} as T;

  for (const [key, options] of Object.entries(questions)) {
    result[key as keyof T] = (await prompt(
      options as PromptOptions
    )) as T[keyof T];
  }

  return result;
}
