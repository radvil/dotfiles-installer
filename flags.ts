export const GlobalFlags = {
  source: {
    flags: "-s, --source <path:string>",
    desc: "Source directory for components",
    opts: { global: true },
  },
};

export const ListFlags = {
  tags: {
    flags: "--tags <tags:string>",
    desc: "Show components with tagged configs",
  },
  exclude: {
    flags: "--exclude <components:string>",
    desc: "Exclude components by name, separated by comma",
  },
  json: {
    flags: "--json",
    desc: "Output in JSON format",
  },
  table: {
    flags: "--table",
    desc: "Display output as a table",
  },
  sort: {
    flags: "--sort <type:string>",
    desc: "Sort by 'priority' or 'name'",
    opts: { default: "priority" },
  },
};

export const InstallFlags = {
  tags: {
    flags: "--tags <tags:string>",
    desc: "Select by tags instead of distro detection",
  },
  exclude: {
    flags: "--exclude <components:string>",
    desc: "Exclude components by name, separated by comma",
  },
  sort: {
    flags: "--sort <type:string>",
    desc: "Sort by 'priority' or 'name'",
    opts: { default: "priority" },
  },
  skipBuilds: {
    flags: "--skip-builds",
    desc: "Run only file operations",
  },
  skipFiles: {
    flags: "--skip-files",
    desc: "Run only builds/setup",
  },
  dryRun: {
    flags: "--dry-run",
    desc: "Simulate install without changes",
  },
  force: {
    flags: "--force",
    desc: "Force overwrite of destination files",
  },
};

