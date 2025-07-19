import $ from "@david/dax";
import { colors as c } from "@cliffy/ansi/colors";
import { log } from "./log.ts";

/**
 * Runs a shell command, logging its execution and handling dry-run scenarios.
 *
 * @param cmd - The command string to execute.
 * @param dryRun - If true, the command will only be logged, not executed.
 * @returns A promise that resolves when the command completes.
 */
export async function runShellCommand(cmd: string, dryRun = false) {
  if (dryRun) {
    log.dryRun();
    console.log(c.yellow(`Simulating command: ${cmd}`));
    return;
  }

  log.action(`Executing command: ${cmd}`);

  try {
    await $`'${cmd}'`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    log.error(`Command failed: ${c.red(cmd)}`, msg);
    // Re-throw the error to allow calling functions to handle it if necessary
    throw error;
  }
}

/**
 * Checks if a given file mode indicates executability for any user.
 *
 * @param mode - The file mode (e.g., from `Deno.FileInfo.mode`).
 * @returns True if the file is executable by owner, group, or others; otherwise, false.
 */
function isExecutable(mode: number): boolean {
  // Check owner, group, and others executable bits
  return (mode & 0o111) !== 0;
}

/**
 * Ensures that a file at the given path is executable. If it's not, it attempts to set
 * its permissions to 0o755 (rwxr-xr-x).
 *
 * @param path - The path to the file.
 * @returns A promise that resolves to true if the file is executable after the operation,
 *          or false if the file does not exist.
 * @throws {Error} If an error occurs during file stat or chmod, other than NotFound.
 */
export async function ensureExecutable(path: string): Promise<boolean> {
  try {
    const stat = await Deno.lstat(path);

    if (!stat.isFile) {
      log.warn(`Path is not a file, skipping executable check: ${path}`);
      return false;
    }

    if (stat.mode === null) {
      log.warn(`Could not determine file mode for: ${path}`);
      return false;
    }

    if (!isExecutable(stat.mode)) {
      log.info(`Making file executable: ${path}`);
      await Deno.chmod(path, 0o755);
      // Verify after chmod
      const newStat = await Deno.lstat(path);
      return isExecutable(newStat.mode!);
    }

    return true; // Already executable
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      log.warn(`File not found, cannot ensure executable: ${path}`);
      return false;
    }
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    log.error(`Error ensuring executable for ${path}: ${msg}`);
    throw err; // Re-throw other errors
  }
}
