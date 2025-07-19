import { colors } from "@cliffy/ansi/colors";
import { log } from "../lib/log.ts";
import { resolveManifest } from "../lib/manifest.ts";
import z from "zod/v4";

/**
 * Schema for validating the flags passed to the debug action.
 */
const schemaActionDebug = z.object({
  id: z.string().default("nobara"), // Default value for --id
  sourcePath: z.string(),
});

/**
 * Type definition for the validated flags of the debug action.
 */
type Flags = z.infer<typeof schemaActionDebug>;

/**
 * Action to display debugging information for a specific component.
 * It resolves and prints the component's manifest and build commands.
 *
 * @param rawFlags - Raw flags object from the command line.
 * @param cmpName - The name of the component to debug.
 */
const actionDebugComponent = async (rawFlags: unknown, cmpName: string) => {
  const flags: Flags = schemaActionDebug.parse(rawFlags);

  try {
    log.info(`Debugging component: ${colors.green(cmpName)}`);
    log.info(`Simulated Machine ID: ${colors.yellow(flags.id)}`);

    const manifest = await resolveManifest(cmpName, flags.sourcePath);
    log.info("Resolved Manifest:");
    console.log(colors.yellow(JSON.stringify(manifest, null, 2)));

    if (manifest.builds) {
      log.info("Build Commands (if any):");
      for (const key in manifest.builds) {
        log.info(`  ${colors.cyan(key)}:`);
        // deno-lint-ignore no-explicit-any
        (manifest.builds as any)[key].forEach((cmd: string) =>
          console.log(`    - ${cmd}`),
        );
      }
    } else {
      log.info("No build commands found for this component.");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    log.error(`Failed to debug component ${colors.green(cmpName)}: ${msg}`);
  }
};

/**
 * Exports for the debug action, including its schema and runner function.
 */
export const ActionDebug = {
  Schema: schemaActionDebug,
  Runner: actionDebugComponent,
};
