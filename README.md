# OpenCode Profile Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Version, share and switch [OpenCode](https://opencode.ai) setups across a
> software engineering team.

AI coding agents are only as consistent as their configuration. When every
engineer tunes prompts, models and permissions by hand, the team ends up with
agents that behave differently, run with different safety rails, and cannot be
reviewed or improved together.

OpenCode Profile Manager treats that configuration as code. A team keeps its
**profiles** in one Git repository and every engineer installs or switches them
with an interactive terminal tool that backs up and verifies every change.

## What a profile defines

A profile is a complete OpenCode setup:

- **Instructions** shared by every agent (`AGENTS.md`)
- **Agents and subagents**, each with its own prompt, model and reasoning effort
- **Permissions**: which agent can read, edit, run commands, call subagents or
  load skills
- **Output contracts** that make subagent responses predictable for the agents
  that consume them
- **Skills**: reusable, on-demand guidance such as review checklists or ADR
  templates
- **MCP servers**, with secrets read from the environment

## Why teams use it

- **One source of truth.** Agent behavior is reviewed in pull requests, like
  any other code.
- **Safe rollout.** Every install is staged, verified and rolled back on
  failure; previous setups are backed up and can be restored from the menu.
- **Least privilege by default.** Profiles express who may edit, run or
  delegate, and the shipped example keeps orchestrating agents away from the
  code entirely.
- **Several workflows side by side.** A minimal profile for quick tasks and a
  delegation-heavy one for larger changes can coexist; engineers switch in
  seconds.
- **Provider-agnostic.** Models are plain `provider/model-id` strings: GitHub
  Copilot, Anthropic, OpenAI, local models or any provider OpenCode supports.

## Quick start

Requirements: Node.js, npm and Git. OpenCode is installed by the tool if it is
missing.

```bash
git clone https://github.com/RafaGonzalezDev/opencode-profile-manager.git
cd opencode-profile-manager
npm install
npm run setup
```

Then:

1. Copy `.env.example` to `~/.config/opencode/.env`, or export the variables
   in your shell, and fill in the keys.
2. Replace the `REPLACE_WITH_*` model placeholders of the profile you chose.

## Adopting it in your team

1. Fork or copy this repository into your organization.
2. Pick a starting profile and adapt it: models, permissions, prompts, skills
   and MCP servers. The [customization guide](docs/customizing-profiles.md)
   covers each of them.
3. Add as many profiles as your workflows need; any directory under
   `profiles/` with the required entries appears in the installer.
4. Ask every engineer to run `npm run setup`. To roll out a change later, they
   pull and run it again.

## Included profiles

| Profile | For | Description |
|---|---|---|
| [`vanilla`](profiles/vanilla/README.md) | Individual, low-ceremony work | Plain OpenCode plus the Context7 MCP. Preselected by the installer. |
| [`orchestrated`](profiles/orchestrated/README.md) | Teams that want separation of duties | Primary agents only orchestrate and read docs and ADRs; subagents explore, implement, test, debug and review, each with its own model, permissions and output format. |

Both are templates: change them freely.

## How the installer works

1. Checks the environment (Node.js, npm, Git).
2. Detects OpenCode and offers to install or update it (Homebrew or npm).
3. Lets you choose a profile, or keep the current one.
4. Shows the differences with your current configuration.
5. Backs up the managed files before replacing them.
6. Applies the profile transactionally, rolling back if apply or verification
   fails.
7. Verifies the installed files against the profile.

The main menu can also restore any of the 5 most recent backups.

### Flags

- `--dry-run` previews the installation without writing files
- `--force` skips confirmation prompts
- `--skip-opencode-check` skips the OpenCode installation check
- `--verbose` enables detailed logs

### Managed files

Only these entries inside `~/.config/opencode/` are managed:

- `AGENTS.md`
- `opencode.json`
- `tui.json` (optional)
- `agents/`
- `skills/`
- `themes/` (optional)
- `.env.example` (shared, from the repository root)

Your real `.env` is never replaced or included in backups. Backups live in
`~/.config/opencode/backups/` and record the profile, every file hash and its
permissions.

### Safety rules

- Symbolic links are rejected inside managed entries and profiles.
- If the current configuration cannot be inspected safely, the tool aborts
  before installing.
- Installs and restores use a staging area plus rollback, never in-place
  destructive replacement.

## Repository layout

```text
profiles/            installable profiles, one directory each
  <profile>/
    AGENTS.md        instructions shared by every agent (required)
    opencode.json    models, permissions, MCP servers (required)
    agents/          agent prompts and permissions (required, may be empty)
    skills/          skills (required, may be empty)
    README.md        what the profile is for
cli/                 the interactive installer (TypeScript, Ink)
docs/                guides for maintaining profiles
.env.example         keys referenced by the MCP servers
```

## Built with

The installer is a Node.js CLI written in TypeScript on top of:

- [Ink](https://github.com/vadimdemedes/ink): React renderer for the
  terminal UI
- [React](https://react.dev): component model used by Ink
- [ink-spinner](https://github.com/vadimdemedes/ink-spinner): progress
  spinners
- [execa](https://github.com/sindresorhus/execa): runs `opencode`, `npm`,
  `brew` and `git` for environment checks and installs

Tests use the built-in `node:test` runner; no test framework is required.

## Development

```bash
npm --prefix cli test
```

Tests use a temporary `HOME` and never touch your real configuration. The
symbolic link and runtime tests rely on POSIX behavior, so run the suite on
Linux, macOS or WSL.

## Troubleshooting

- Missing prerequisites: install Node.js, npm or Git and rerun `npm run setup`.
- `opencode` not found after installing: open a new shell and run
  `opencode --version`.
- Agents fail with an unknown model: replace the `REPLACE_WITH_*` placeholders;
  `opencode models` lists the ids available to you.
- Something went wrong: restore a backup from the main menu.

## License

[MIT](LICENSE)
