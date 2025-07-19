import z from "zod/v4";
import { colors as c } from "@cliffy/ansi/colors";
import { join } from "@std/path/join";
import { exists } from "@std/fs/exists";
import { ArgumentValue } from "@cliffy/command";
import { log } from "../lib/log.ts";
import {
  ConfigSrcSchema,
  DotfileManifest,
  getAvailableManifests,
  printComponentsSummaries,
} from "../lib/manifest.ts";
import { ensureExecutable, runShellCommand } from "../lib/shell.ts";
import { performFileOperation, resolveHomePath } from "../lib/fs.ts";
import { detectDistro } from "../lib/distro.ts";
import { strListToArray } from "../lib/string.ts";

/**
 * Schema for validating the flags passed to the install action.
 */
const schemaActionInstall = z.object({
  tags: z.string().optional().transform(strListToArray),
  exclude: z.string().optional().transform(strListToArray),
  sort: z.enum(["priority", "name"]).optional().default("priority"),
  dryRun: z.coerce.boolean().default(false),
  force: z.coerce.boolean().default(false),
  skipBuilds: z.coerce.boolean().default(false),
  skipFiles: z.coerce.boolean().default(false),
  source: z.string().optional(),
});

/**
 * Type definition for the validated flags of the install action.
 */
type Flags = z.infer<typeof schemaActionInstall>;

/**
 * Retrieves the build commands for a given component based on the machine ID.
 *
 * @param machineId - The detected machine or distribution ID.
 * @param man - The dotfile manifest for the component.
 * @param source - The optional source directory for components.
 * @returns A promise that resolves to an array of shell commands.
 */
export async function getComponentBuilds(
  machineId: string,
  man: DotfileManifest,
  source?: string,
): Promise<string[]> {
  // deno-lint-ignore no-explicit-any
  const commands = (man.builds as any)?.[machineId] || man.builds?.["*"] || [];
  const buildsDir = source
    ? join(source, man.name, "builds")
    : join("./components", man.name, "builds");
  const fullPath = resolveHomePath(buildsDir);

  if (!(await exists(fullPath))) {
    return commands;
  }

  for await (const entry of Deno.readDir(fullPath)) {
    const matched = entry.name.split(".")[0] === machineId;
    if (!entry.isFile || !matched) continue;
    const filePath = `${fullPath}/${entry.name}`;
    await ensureExecutable(filePath);
    commands.push(`bash -c "${filePath}"`);
  }

  return commands;
}

/**
 * Installs the build dependencies and runs build scripts for a component.
 *
 * @param id - The detected machine or distribution ID.
 * @param entry - The dotfile manifest for the component.
 * @param flags - The flags passed to the install action.
 */
async function installBuilds(id: string, entry: DotfileManifest, flags: Flags) {
  if (flags.skipBuilds) {
    log.skip(`${c.yellow("--skip-builds")} for ${c.green(entry.name)}...`);
    return;
  }

  log.title(`Installing component ${c.green(entry.name)}...`);

  try {
    const commands = await getComponentBuilds(id, entry, flags.source);
    if (!commands?.length) {
      log.skip(`${c.green(entry.name)} has no build commands.`);
      return;
    }

    for await (const cmd of commands) {
      await runShellCommand(cmd, flags.dryRun);
    }
  } catch (error) {
    const e = error instanceof Error ? error.message : JSON.stringify(error);
    log.error(`Failed to execute builds for ${c.green(entry.name)}`, e);
  }
}

/**
 * Installs the configuration files for a component.
 *
 * @param id - The detected machine or distribution ID.
 * @param entry - The dotfile manifest for the component.
 * @param f - The flags passed to the install action.
 */
async function installConfigs(id: string, entry: DotfileManifest, f: Flags) {
  try {
    const configs = entry.configs;

    if (f.skipFiles) {
      log.skip(
        `Component: ${c.green(entry.name)}. ${
          c.yellow(
            "--skip-files",
          )
        } specified`,
      );
      return;
    }

    if (!configs?.length) {
      log.skip(`Component: ${entry.name} has no configs provided`);
      return;
    }

    // install configs
    log.info("Configurations:");

    for await (const rawConfig of configs) {
      const config = ConfigSrcSchema.parse(rawConfig);

      // if --tags was not specified use distroId.
      const selectedTags = f.tags ?? [id, "*"];
      const hasTagged = config.tags.some((x) => selectedTags.includes(x));
      if (!hasTagged) continue;

      const icon = config.method === "symlink" ? "🔗" : "📄";
      const method = config.method.toUpperCase();
      const msg = `${icon} ${method}: ${c.yellow(config.from)} → ${
        c.green(
          config.to,
        )
      }`;

      console.log(msg);

      if (f.dryRun || !f.source) continue;

      await performFileOperation(f.source, entry.name, config, f.force);
    }

    log.success(`✔ Config: '${entry.name}' installed!`);
  } catch (err) {
    // make sure to run the run the rest when one produced error.
    const msg = err instanceof Error
      ? `Failed to install config for "${entry.name}". ${err.message}`
      : `An error occured when installing config for "${entry.name}"`;
    log.error(msg);
  }
}

/**
 * Main runner function for the install action.
 * Parses flags, filters components, and orchestrates the installation process.
 *
 * @param rawFlags - Raw flags object from the command line.
 * @param args - Additional arguments (component names) from the command line.
 */
const actionInstallComponents = async (
  rawFlags: unknown,
  ...args: ArgumentValue["name"][]
) => {
  const cmpNames = [...args].filter((x) => typeof x === "string");
  const f: Flags = schemaActionInstall.parse(rawFlags);

  if (f.skipFiles && f.skipBuilds) {
    log.error("Can't use --only-files and --only-builds together.");
    Deno.exit(1);
  }

  const machineId = await detectDistro();
  const autoTags = f.tags ?? [machineId, "*"];
  const all: DotfileManifest[] = await getAvailableManifests(
    f.sort,
    cmpNames,
    f.source,
  );
  const filteredByTags: DotfileManifest[] = f.tags?.length
    ? all.filter((x) => {
      return x.configs?.some((v) => {
        return v.tags.some((z) => autoTags.includes(z));
      });
    })
    : all;

  const finalList = f.exclude?.length
    ? filteredByTags.filter((x) => !f.exclude?.includes(x.name))
    : filteredByTags;

  let msg = "Following component(s) will be installed.";
  if (finalList.length) {
    msg += ` Tags: ${c.yellow(autoTags.join(",").replace(",*", ""))}`;
  }
  if (f.exclude?.length) {
    msg += ` | Excluded: ${c.yellow(f.exclude.join(","))}`;
  }

  log.title(msg);
  await printComponentsSummaries(finalList, "table");

  for await (const entry of finalList) {
    await installBuilds(machineId, entry, f);
    await installConfigs(machineId, entry, f);
  }
};

/**
 * Exports for the install action, including its schema and runner function.
 */
export const ActionInstall = {
  Schema: schemaActionInstall,
  Runner: actionInstallComponents,
};
