import { colors as c } from "@cliffy/ansi/colors";

/**
 * A utility object for logging messages to the console with different styles and prefixes.
 */
export const log = {
  /**
   * Logs a title message with a blue penguin prefix.
   * @param msg - The message parts to log.
   */
  title: (...msg: string[]) => {
    const pfx = c.blue.bold("[🐧]");
    console.log(`\n${pfx}`, c.blue(msg.join(" ")), "\n");
  },
  /**
   * Logs an informational message with a blue INFO prefix.
   * @param msg - The message parts to log.
   */
  info: (...msg: string[]) => {
    const pfx = c.blue.bold("[INFO]");
    console.log(`\n${pfx}`, c.blue(msg.join(" ")), "\n");
  },
  /**
   * Logs a success message with a green SUCCESS prefix.
   * @param msg - The message parts to log.
   */
  success: (...msg: string[]) => {
    const pfx = c.bgGreen.brightWhite.bold("[SUCCESS]");
    console.log(`\n${pfx}`, c.green(msg.join(" ")), "\n");
  },
  /**
   * Logs an action message with a cyan ACTION prefix.
   * @param msg - The message parts to log.
   */
  action: (...msg: string[]) => {
    const pfx = c.bgCyan.black.bold("[ACTION]");
    console.log(`\n${pfx}`, c.cyan(msg.join(" ")), "\n");
  },
  /**
   * Logs a warning message with a yellow WARN prefix.
   * @param msg - The message parts to log.
   */
  warn: (...msg: string[]) => {
    const prefix = c.bgYellow.black.bold(" WARN ");
    console.log(`\n${prefix}`, c.yellow(msg.join(" ")));
  },
  /**
   * Logs an error message with a red ERROR prefix.
   * @param msg - The message parts to log.
   */
  error: (...msg: string[]) => {
    const prefix = c.bgRed.white.bold("[ERROR]");
    console.log(`\n${prefix}`, c.red(msg.join(" ")), "\n");
  },
  /**
   * Logs a dry-run message, indicating no changes were applied.
   * @param exec - A boolean indicating if the dry-run message should be displayed.
   */
  dryRun: (exec = true) => {
    if (!exec) return;
    const prefix = c.yellow.black.bold("[DRY-RUN]");
    console.log(`${prefix}`, c.gray("No changes applied..."));
  },
  /**
   * Logs a skip message with a cyan SKIP prefix.
   * @param msg - The message parts to log.
   */
  skip: (...msg: string[]) => {
    const pfx = c.cyan.bold("[SKIP]");
    console.log(`\n${pfx}`, ...msg, "\n");
  },
};
