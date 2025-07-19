# Dotfiles Installer

A flexible, manifest-driven dotfile installer powered by Deno.

This tool allows you to manage and install dotfile components from any source directory or repository that follows a simple manifest structure. It is designed to be a standalone utility that you can use to manage one or more sets of dotfile configurations.

## Core Concept

The installer works by reading `manifest.jsonc` files located within component directories. Each component is a self-contained directory that includes:

-   `manifest.jsonc`: A JSONC file describing the component and its files.
-   `src/`: A directory containing the actual dotfiles to be installed.
-   `builds/` (Optional): A directory for OS-specific installation scripts.

The installer can be pointed at any directory containing this structure, allowing you to keep your dotfiles completely separate from the installer's logic.

## Prerequisites

You must have [Deno](https://deno.land/) installed to run this application.

## Usage

The installer is a command-line application with several commands.

```bash
deno run main.ts <command> [options]
```

### Global Options

This option can be used with any command.

| Option                 | Description                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `-s, --source <path>`  | **Required.** The absolute or relative path to the directory containing your `components`. This is the root of your dotfiles repository. |

---

### `list`

Lists all available components found in the source directory.

**Usage:**
`deno run main.ts list --source <path_to_your_dotfiles>`

**Options:**

| Option                 | Description                                        | Default    |
| ---------------------- | -------------------------------------------------- | ---------- |
| `--tags <tags>`        | Show components matching specific tags (e.g., `nobara,fedora`). | (auto-detects OS) |
| `--json`               | Output the list in JSON format.                    | `false`    |
| `--table`              | Display the output in a rich table format.         | `false`    |
| `--sort <type>`        | Sort components by `priority` or `name`.           | `priority` |

---

### `install`

Installs one or more components.

**Usage:**
`deno run main.ts install --source <path_to_your_dotfiles> [component_names...]`

**Arguments:**

| Argument              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `[component_names...]`| A space-separated list of component names to install. If omitted, all components are considered. |

**Options:**

| Option                 | Description                                                              | Default    |
| ---------------------- | ------------------------------------------------------------------------ | ---------- |
| `--tags <tags>`        | Install configs matching specific tags (e.g., `nobara,fedora`).          | (auto-detects OS) |
| `--sort <type>`        | Sort components by `priority` or `name` before installing.               | `priority` |
| `--skip-builds`        | Do not run any installation scripts (`builds/` directory).               | `false`    |
| `--skip-files`         | Do not perform any file operations (symlinking or copying).              | `false`    |
| `--dry-run`            | Simulate the entire installation process without making any changes.     | `false`    |
| `--force`              | Force overwrite destination files if they already exist.                 | `false`    |

---

### `remove`

Removes the files and symlinks associated with a component.

**Usage:**
`deno run main.ts remove --source <path_to_your_dotfiles> <component_names...>`

**Arguments:**

| Argument              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `<component_names...>`| **Required.** A space-separated list of component names to remove. |

**Options:**

| Option      | Description                                           | Default |
| ----------- | ----------------------------------------------------- | ------- |
| `--dry-run` | Simulate the removal process without deleting anything. | `false` |

---

### `debug`

Displays debugging information for a specific component, such as its resolved manifest and build commands.

**Usage:**
`deno run main.ts debug --source <path_to_your_dotfiles> <component_name>`

**Arguments:**

| Argument           | Description                                |
| ------------------ | ------------------------------------------ |
| `<component_name>` | **Required.** The name of the component to debug. |

**Options:**

| Option        | Description                               | Default  |
| ------------- | ----------------------------------------- | -------- |
| `--id <id>`   | A specific distro or machine ID to simulate for. | `nobara` |

## Example Workflow

1.  Clone your dotfiles repository and the installer repository.
    ```bash
    git clone https://github.com/your-username/dotfiles.git
    git clone https://github.com/your-username/dotfiles-installer.git
    ```

2.  Navigate to the installer directory.
    ```bash
    cd dotfiles-installer
    ```

3.  List the components available in your dotfiles.
    ```bash
    deno run main.ts list --source ../dotfiles
    ```

4.  Install the `neovim` and `git` components.
    ```bash
    deno run main.ts install --source ../dotfiles neovim git
    ```
