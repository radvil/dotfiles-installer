import z from "zod/v4";
import { ArgumentValue } from "@cliffy/command";
import { colors as c } from "@cliffy/ansi/colors";
import { log } from "../lib/log.ts";
import { resolveManifest } from "../lib/manifest.ts";
import { runShellCommand } from "../lib/shell.ts";

/**
 * Schema for validating the flags passed to the remove action.
 */
const schemaActionRemove = z.object({
  dryRun: z.coerce.boolean().default(false),
  sourcePath: z.string(),
});

/**
 * Type definition for the validated flags of the remove action.
 */
type Flags = z.infer<typeof schemaActionRemove>;

/**
 * Action to remove dotfile components.
 * It executes cleanup commands defined in the component's manifest.
 *
 * @param rawFlags - Raw flags object from the command line.
 * @param args - Additional arguments (component names) from the command line.
 */
const actionRemoveComponent = async (
  rawFlags: unknown,
  ...args: ArgumentValue["name"][]
) => {
  const flags: Flags = schemaActionRemove.parse(rawFlags);
  const cmpNames = [...args].filter((x) => typeof x === "string");

  for await (const cmpName of cmpNames) {
    try {
      const manifest = await resolveManifest(cmpName, flags.sourcePath);
      if (manifest.cleanup?.length) {
        log.info(`Executing cleanup commands for ${c.green(manifest.name)}:`);
        for (const cmd of manifest.cleanup) {
          await runShellCommand(cmd, flags.dryRun);
        }
      } else {
        log.info(`No cleanup commands found for ${c.green(manifest.name)}.`);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : JSON.stringify(error);
      log.error(`Failed to remove component ${c.green(cmpName)}: ${msg}`);
    }
  }
};

/**
 * Exports for the remove action, including its schema and runner function.
 */
export const ActionRemove = {
  Schema: schemaActionRemove,
  Runner: actionRemoveComponent,
};
