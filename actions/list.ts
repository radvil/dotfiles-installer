import z from "zod/v4";
import {
  DotfileManifest,
  getAvailableManifests,
  printComponentsSummaries,
} from "../lib/manifest.ts";
import { log } from "../lib/log.ts";
import { strListToArray } from "../lib/string.ts";
import { detectDistro } from "../lib/distro.ts";
import { colors as c } from "@cliffy/ansi/colors";

const schemaActionList = z
  .object({
    tags: z.string().optional().transform(strListToArray),
    exclude: z.string().optional().transform(strListToArray),
    json: z.boolean().optional(),
    table: z.boolean().optional(),
    sort: z.enum(["priority", "name"]).optional().default("priority"),
    source: z.string().optional(),
  })
  .refine((v) => !(v.json && v.table), {
    message: "Can't use --json and --table at the same time.",
    path: ["json"], // or ["table"]
  });

type Flags = z.infer<typeof schemaActionList>;

/*
 * USAGE:
 *
 * `deno task list`
 * `deno task list --table`
 * `deno task list --json`
 * `deno task list --sort=name`
 * `deno task list --sort=name --table`
 * `deno task list --tags=nobara,arch --sort=name --table`
 */
const actionListComponents = async (rawFlags: unknown) => {
  const f: Flags = schemaActionList.parse(rawFlags);
  const listType = f.json ? "json" : "table";

  try {
    const machineId = await detectDistro();
    const autoTags = f.tags ?? [machineId, "*"];
    const all: DotfileManifest[] = await getAvailableManifests(
      f.sort,
      [],
      f.source,
    );
    const filteredByTags: DotfileManifest[] = f.tags?.length
      ? all.filter((x) => {
        return x.configs?.some((c) => {
          return c.tags.some((t) => autoTags.includes(t));
        });
      })
      : all;

    const finalList = f.exclude?.length
      ? filteredByTags.filter((x) => !f.exclude?.includes(x.name))
      : filteredByTags;

    let msg = "Available components:";
    if (finalList.length) {
      msg += ` Tags: ${c.yellow(autoTags.join(",").replace(",*", ""))}`;
    }
    if (f.exclude?.length) {
      msg += ` | Excluded: ${c.yellow(f.exclude.join(","))}`;
    }

    log.title(msg);
    await printComponentsSummaries(finalList, listType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    log.error(msg);
  }
};

export const ActionList = {
  Schema: schemaActionList,
  Runner: actionListComponents,
};
