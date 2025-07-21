import { Command } from "@cliffy/command";
import { colors as c } from "@cliffy/ansi/colors";
import { ActionInstall } from "./actions/install.ts";
import { ActionList } from "./actions/list.ts";
import { ActionRemove } from "./actions/remove.ts";
import { ActionDebug } from "./actions/debug.ts";
import { GlobalFlags, InstallFlags, ListFlags } from "./flags.ts";

/**
 * Main command-line interface for the dotfiles installer.
 *
 * TODO: --source or -s should fallback to default cwd.
 * or maybe we keep the structure as `cwd/components`, not very sure just yet.
 *
 */
await new Command()
  .name("dotbox")
  .version("0.1.0")
  .description("A flexible, manifest-driven dotfile installer powered by Deno.")
  .option(
    GlobalFlags.source.flags,
    GlobalFlags.source.desc,
    GlobalFlags.source.opts,
  )

  // List command
  .command(
    "list",
    `List all available components with "${c.yellow("manifest.jsonc")}"`,
  )
  .option(ListFlags.tags.flags, ListFlags.tags.desc)
  .option(ListFlags.exclude.flags, ListFlags.exclude.desc)
  .option(ListFlags.json.flags, ListFlags.json.desc)
  .option(ListFlags.table.flags, ListFlags.table.desc)
  .option(ListFlags.sort.flags, ListFlags.sort.desc, ListFlags.sort.opts)
  .action(ActionList.Runner)

  // Install command
  .command("install [...components:string]", "Install components by name")
  .option(InstallFlags.tags.flags, InstallFlags.tags.desc)
  .option(InstallFlags.exclude.flags, InstallFlags.exclude.desc)
  .option(
    InstallFlags.sort.flags,
    InstallFlags.sort.desc,
    InstallFlags.sort.opts,
  )
  .option(InstallFlags.skipBuilds.flags, InstallFlags.skipBuilds.desc)
  .option(InstallFlags.skipFiles.flags, InstallFlags.skipFiles.desc)
  .option(InstallFlags.dryRun.flags, InstallFlags.dryRun.desc)
  .option(InstallFlags.force.flags, InstallFlags.force.desc)
  .action(ActionInstall.Runner)

  // Remove command
  .command("remove <...components:string>", "Remove installed components")
  .option("--dry-run", "Simulate removal without making changes")
  .action(ActionRemove.Runner)

  // Debug command
  .command("debug <component:string>", "Debug a component")
  .option("--id <id:string>", "Simulate a specific distro or machine ID", {
    default: "nobara",
  })
  .action(ActionDebug.Runner)

  .parse(Deno.args);
