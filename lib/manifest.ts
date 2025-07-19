import { z } from "zod/v4";
import { colors as c } from "@cliffy/ansi/colors";
import { Table } from "@cliffy/table";
import { join } from "@std/path/join";
import { exists } from "@std/fs/exists";
import { parse } from "@std/jsonc/parse";
import { log } from "./log.ts";
import { getAvailableDistros } from "./distro.ts";
import { resolve } from "@std/path/resolve";

/**
 * Base path for components. This will be resolved dynamically based on the source provided.
 * If no source is provided, it defaults to a relative 'components' directory.
 */
const DEFAULT_COMPONENTS_BASE_PATH = resolve(Deno.cwd(), "components");

/**
 * All available tags for configurations, including detected distribution IDs and a wildcard.
 */
const availableTags = [...getAvailableDistros(), "*"] as const;

/**
 * Zod schema for defining a single configuration source within a dotfile component.
 * This describes how a file or folder from the component's source should be installed.
 */
export const ConfigSrcSchema = z.object({
  /**
   * The source path of the file or directory, relative to the component's `src/` directory.
   * e.g., `nvim` for `src/nvim`.
   */
  from: z.string({
    error: "'from' path is required for a config source.",
  }),

  /**
   * The destination path on the host system where the file/directory should be installed.
   * This path can use `~` for the home directory, which will be resolved at runtime.
   * e.g., `~/.config/nvim`.
   */
  to: z.string({
    error: "'to' path is required for a config source.",
  }),

  /**
   * The installation method to use: `copy` to copy the file, or `symlink` to create a symbolic link.
   */
  method: z.enum(["copy", "symlink"], {
    error: "'method' must be either 'copy' or 'symlink'.",
  }),

  /**
   * If `true`, the installer will force overwrite any existing files or directories at the destination path.
   * Defaults to `false`.
   */
  force: z.coerce.boolean().default(false),

  /**
   * An array of tags associated with this specific configuration. These tags can be used
   * to conditionally install configurations based on the detected operating system or other criteria.
   * Defaults to `["*"]` (all systems).
   */
  tags: z.array(z.enum(availableTags)).default(["*"]),
});

/**
 * TypeScript type derived from `ConfigSrcSchema`.
 */
export type ConfigSrc = z.infer<typeof ConfigSrcSchema>;

/**
 * Zod schema for the main dotfile component manifest file (`manifest.jsonc`).
 * This schema defines the structure and properties of a dotfile component.
 */
export const DotfileManifestSchema = z.object({
  /**
   * The unique name of the dotfile component (e.g., `neovim`, `zsh`).
   */
  name: z.string({
    error: "Component 'name' is required.",
  }),

  /**
   * An optional description of the component.
   */
  description: z.string().optional(),

  /**
   * An optional priority number for the component. Components with lower priority numbers
   * are typically processed first during installation. Defaults to `Infinity` if not set.
   */
  priority: z.coerce.number().optional(),

  /**
   * An optional record of build commands, keyed by tag (e.g., `nobara`, `*`).
   * These commands are executed during installation and can be OS-specific.
   */
  builds: z
    .partialRecord(z.enum(availableTags), z.array(z.string()))
    .optional(),

  /**
   * An optional array of `ConfigSrc` objects, defining the files and directories to be installed.
   */
  configs: z.array(ConfigSrcSchema).optional(),

  /**
   * An optional array of cleanup commands to be executed when the component is removed.
   */
  cleanup: z.array(z.string()).optional(),
});

/**
 * TypeScript type derived from `DotfileManifestSchema`.
 */
export type DotfileManifest = z.infer<typeof DotfileManifestSchema>;

/**
 * Resolves and validates a single dotfile component manifest.
 * This function ensures that the manifest file exists, is valid, and that
 * its referenced source paths (`src/` and `configs[].from`) are accessible.
 *
 * @param cmpName - The name of the component to resolve.
 * @param sourcePath - The base path where components are located.
 * @returns A promise that resolves to the validated `DotfileManifest`.
 * @throws {Error} If the manifest is not found, is invalid, or if source paths are missing.
 */
export async function resolveManifest(
  cmpName: string,
  sourcePath: string,
): Promise<DotfileManifest> {
  const componentDir = join(sourcePath, cmpName);
  const manifestPath = join(componentDir, "manifest.jsonc");
  const srcPath = join(componentDir);

  try {
    // 1. Check if manifest.jsonc exists
    if (!(await exists(manifestPath))) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    // 2. Read and parse manifest.jsonc
    const rawManifest = await Deno.readTextFile(manifestPath);
    const parsedManifest = parse(rawManifest);
    const manifest = DotfileManifestSchema.parse(parsedManifest);

    // 3. Check that src/ directory exists
    const srcStat = await Deno.stat(srcPath).catch(() => null);
    if (!srcStat || !srcStat.isDirectory) {
      throw new Error(
        `Missing or invalid 'src/' directory for component '${cmpName}': ${srcPath}`,
      );
    }

    // 4. Validate files[].from paths within src/
    if (manifest.configs) {
      for (const config of manifest.configs) {
        const fullFromPath = join(srcPath, config.from);
        if (!(await exists(fullFromPath))) {
          throw new Error(
            `Source file/directory not found for config '${config.from}' in component '${cmpName}': ${fullFromPath}`,
          );
        }
      }
    }

    return manifest;
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(
      `Failed to resolve manifest for component '${cmpName}': ${msg}`,
    );
  }
}

/**
 * Helper function to get a single manifest, with error logging.
 * @param entryName - The name of the component.
 * @param componentsPath - The base path where components are located.
 * @returns A promise that resolves to the `DotfileManifest` or `undefined` if an error occurs.
 */
async function getManifest(
  entryName: string,
  componentsPath: string,
): Promise<DotfileManifest | undefined> {
  try {
    return await resolveManifest(entryName, componentsPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    log.warn(`Skipping component '${c.green(entryName)}': ${msg}`);
    return undefined;
  }
}

/**
 * Retrieves a list of available dotfile manifests based on specified criteria.
 * It can filter by component names and sort the results.
 *
 * @param sortBy - The field to sort the manifests by (`priority` or `name`).
 * @param cmpNames - An optional array of specific component names to retrieve. If empty, all components are considered.
 * @param source - An optional source directory for components. Defaults to `DEFAULT_COMPONENTS_BASE_PATH`.
 * @returns A promise that resolves to an array of `DotfileManifest` objects.
 */
export async function getAvailableManifests(
  sortBy: "priority" | "name",
  cmpNames: string[] = [],
  source?: string,
): Promise<DotfileManifest[]> {
  const manifests: DotfileManifest[] = [];
  const componentsPath = source
    ? resolve(source)
    : DEFAULT_COMPONENTS_BASE_PATH;

  if (!(await exists(componentsPath))) {
    log.error(`Components source directory not found: ${componentsPath}`);
    return [];
  }

  if (cmpNames.length > 0) {
    // If specific component names are provided, try to get only those manifests.
    for (const cmpName of cmpNames) {
      const manifest = await getManifest(cmpName, componentsPath);
      if (manifest) {
        manifests.push(manifest);
      }
    }
  } else {
    // Otherwise, read all directories in the components path and try to get their manifests.
    for await (const entry of Deno.readDir(componentsPath)) {
      if (entry.isDirectory) {
        const manifest = await getManifest(entry.name, componentsPath);
        if (manifest) {
          manifests.push(manifest);
        }
      }
    }
  }

  // Sort the collected manifests.
  if (sortBy === "priority") {
    manifests.sort((a, b) => {
      const ap = a.priority ?? Infinity;
      const bp = b.priority ?? Infinity;
      // If priorities are equal, sort by name for consistent ordering.
      return ap !== bp ? ap - bp : a.name.localeCompare(b.name);
    });
  } else {
    manifests.sort((a, b) => a.name.localeCompare(b.name));
  }

  return manifests;
}

/**
 * Prints a summary of dotfile components to the console.
 * Can output in JSON format or a human-readable table.
 *
 * @param entries - An array of `DotfileManifest` objects to summarize.
 * @param printType - The desired output format: `json` or `table`.
 */
export function printComponentsSummaries(
  entries: DotfileManifest[],
  printType: "json" | "table",
) {
  if (printType === "json") {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (entries.length === 0) {
    log.info("No components found to display.");
    return;
  }

  // Default to table if printType is not 'json'
  if (printType === "table") {
    const rows = entries.map((cmp) => {
      const nameColor = (priority: number | undefined) => {
        if (priority === undefined) return c.white;
        if (priority <= 1) return c.brightGreen;
        if (priority <= 4) return c.yellow;
        return c.gray;
      };

      // Format source and destination paths for display
      const sourcePaths =
        cmp.configs?.map((x) => c.yellow(x.from)).join("\n") ||
        c.bgYellow.black.bold(" N/A ");
      const destPaths =
        cmp.configs?.map((x) => c.green(x.to)).join("\n") ||
        c.bgYellow.black.bold(" N/A ");

      // Format tags for display
      const tags =
        cmp.configs
          ?.flatMap((x) => x.tags)
          .filter((value, index, self) => self.indexOf(value) === index) // Unique tags
          .map((tag) => c.cyan(tag))
          .join(", ") || c.bgCyan.black.bold(" N/A ");

      return [
        nameColor(cmp.priority)(cmp.name),
        cmp.priority !== undefined ? cmp.priority.toString() : "N/A",
        sourcePaths,
        destPaths,
        tags,
      ];
    });

    new Table()
      .header(["Component", "Priority", "Source", "Destination", "Tags"])
      .border(true)
      .body(rows)
      .render();
  }
}
