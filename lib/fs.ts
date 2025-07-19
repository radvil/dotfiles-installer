import { resolve } from "@std/path";
import { copy, ensureDir } from "@std/fs";
import { log } from "./log.ts";
import { ConfigSrc } from "./manifest.ts";

/**
 * Expands the '~' (home directory) symbol in a given path.
 * If the path starts with '~', it replaces it with the value of the HOME environment variable.
 * If HOME is not set, it throws an error.
 *
 * @param path - The path string to resolve.
 * @returns The resolved absolute path.
 * @throws {Error} If the HOME environment variable is not set when '~' is used.
 */
export function resolveHomePath(path: string): string {
  if (path.startsWith("~")) {
    const home = Deno.env.get("HOME");
    if (!home) {
      throw new Error(
        "Cannot resolve '~': HOME environment variable is not set.",
      );
    }
    // Replace '~' only if it's at the beginning of the path and followed by '/' or end of string
    return resolve(path.replace(/^~(?=$|\/|\\)/, home));
  }
  return resolve(path);
}

/**
 * Resolves the absolute source and destination paths for a given configuration entry.
 * The `from` path is resolved relative to the component's source directory.
 * The `to` path is resolved with home directory expansion.
 *
 * @param cmpName - The name of the component.
 * @param entry - The configuration source entry containing `from` and `to` paths.
 * @returns An object containing the resolved absolute `from` and `to` paths.
 */
export function getResolvedConfigPaths(
  sourcePath: string,
  cmpName: string,
  entry: ConfigSrc,
): Pick<ConfigSrc, "from" | "to"> {
  // Assuming 'components' is a top-level directory where component sources are located
  const from = resolve(sourcePath, cmpName, entry.from);
  const to = resolveHomePath(entry.to);
  return { from, to };
}

/**
 * Performs a file operation (copy or symlink) based on the provided configuration entry.
 * It handles path resolution, directory creation, and overwriting existing files.
 *
 * @param cmpName - The name of the component being installed.
 * @param entry - The configuration source entry defining the file operation.
 * @param force - A boolean indicating whether to force overwrite existing destination files.
 * @throws {Error} If the source file/directory does not exist.
 * @throws {Error} If there's an error during file operation (e.g., permissions).
 */
export async function performFileOperation(
  sourcePath: string,
  cmpName: string,
  entry: ConfigSrc,
  force = false,
) {
  const { from, to } = getResolvedConfigPaths(sourcePath, cmpName, entry);

  try {
    const sourceStat = await Deno.stat(from);

    // Ensure the parent directory of the destination path exists
    const destDir = new URL(".", `file://${to}`).pathname;
    await ensureDir(destDir);

    // Determine if force overwrite is active (either via CLI flag or manifest setting)
    const isForced = force || entry.force;
    const destExists = await Deno.lstat(to).catch(() => null);

    if (destExists) {
      if (!isForced) {
        log.skip(`Destination exists and force not set -- skipping: ${to}`);
        return;
      }

      // If forced, remove the existing destination before proceeding
      log.info(`Force removing existing destination: ${to}`);
      await Deno.remove(to, { recursive: true }).catch((err) => {
        log.error(
          `Failed to remove existing destination ${to}: ${err.message}`,
        );
        throw err; // Re-throw to stop the operation if removal fails
      });
    }

    if (entry.method === "copy") {
      log.info(`Copying from ${from} to ${to}`);
      await copy(from, to, { overwrite: true });
    } else {
      // Default to symlink if method is not 'copy' or explicitly 'symlink'
      const sourceType = sourceStat.isDirectory ? "dir" : "file";
      log.info(`Symlinking ${sourceType} from ${from} to ${to}`);
      await Deno.symlink(from, to, { type: sourceType });
    }
    log.success(`Operation successful for ${cmpName}: ${from} -> ${to}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    log.error(
      `Failed to perform file operation for ${cmpName} (from: ${from}, to: ${to}): ${msg}`,
    );
    throw error; // Re-throw the error to propagate it up
  }
}
