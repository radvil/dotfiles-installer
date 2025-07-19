import { colors } from "@cliffy/ansi/colors";
import { log } from "./log.ts";
import { DistroId, PackagerByDistro } from "../constants/distro.ts";

/**
 * Returns a list of all supported distribution IDs.
 * @returns An array of supported `DistroId` strings.
 */
export function getAvailableDistros(): DistroId[] {
  return Object.keys(PackagerByDistro) as DistroId[];
}

/**
 * Detects the current Linux distribution by reading /etc/os-release.
 * It extracts the ID and validates it against a list of supported distributions.
 * If the distribution is not supported or cannot be detected, it logs an error and exits.
 *
 * @returns A promise that resolves to the detected `DistroId`.
 * @throws {Error} If `/etc/os-release` cannot be read, or if the detected distribution is not supported.
 */
export async function detectDistro(): Promise<DistroId> {
  try {
    const osRelease = await Deno.readTextFile("/etc/os-release");
    const idMatch = osRelease.match(/^ID="?([a-zA-Z0-9]+)"?/m);

    const selected = idMatch?.[1]?.toLowerCase();

    if (!selected) {
      log.error("Could not detect distribution ID from /etc/os-release.");
      Deno.exit(1);
    }

    const availableDistros = getAvailableDistros();
    if (!availableDistros.includes(selected as DistroId)) {
      throw new Error(
        `Detected distribution "${colors.yellow(selected)}" is not supported. ` +
          `Supported distributions are: ${colors.green(availableDistros.join(", "))}.`,
      );
    }

    return selected as DistroId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    log.error(`Failed to detect distribution: ${msg}`);
    Deno.exit(1);
  }
}
