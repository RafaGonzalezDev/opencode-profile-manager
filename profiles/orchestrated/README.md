# Orchestrated profile

A delegation-first profile. Primary agents only orchestrate and read
documentation; specialized subagents do the repository work.

## Workflow

```text
user
 |
 +-- plan (primary) ----- reads docs + ADRs ----> explorer
 |                                                   |
 |                         numbered plan <-----------+
 v
build (primary, orchestrator) -- reads docs + ADRs
 |
 +--> explorer   facts the docs do not answer
 +--> worker     implement
 +--> tester     write and run tests
 |      | fail
 |      +--> debugger  root cause --> worker --> tester
 +--> reviewer   until no Critical/Major issues
 v
consolidated answer
```

## Agents

Models and reasoning effort are set in `opencode.json`; prompts and
permissions in `agents/<name>.md`.

| Agent | Mode | Model placeholder | Effort | Read | Write | Bash | Task |
|---|---|---|---|---|---|---|---|
| `build` | primary | `REPLACE_WITH_ORCHESTRATOR_MODEL` | high | docs and meta-files only | no | no | all subagents |
| `plan` | primary | `REPLACE_WITH_ORCHESTRATOR_MODEL` | high | docs and meta-files only | no | no | `explorer` |
| `explorer` | subagent | `REPLACE_WITH_FAST_MODEL` | low | all | no | read-only | no |
| `worker` | subagent | `REPLACE_WITH_CODING_MODEL` | medium | all | yes | yes, git writes ask | no |
| `tester` | subagent | `REPLACE_WITH_CODING_MODEL` | medium | all | test files only | yes, no git writes or installs | no |
| `debugger` | subagent | `REPLACE_WITH_CODING_MODEL` | high | all | no | yes, no git writes or installs | no |
| `reviewer` | subagent | `REPLACE_WITH_REVIEW_MODEL` | high | all | no | `git diff/log/show/status` | no |

"Docs and meta-files" means `AGENTS.md`, `README*`, `CONTRIBUTING*`,
`docs/**` (including `docs/adr/`), `opencode.json(c)` and `.opencode/**`.
OpenCode's built-in `general` and `explore` agents are disabled.

## Permissions

Permissions are layered: the root `permission` block in `opencode.json` sets
the defaults for every agent, and each agent's frontmatter appends overrides.
OpenCode evaluates the combined rules in order and the last matching rule wins.

Defaults: `.env` files unreadable, no edits, no web fetch, no subagents, no
skills, and `bash` allowed except a shared deny list (push, clean, dev servers,
containers, destructive file commands, privilege escalation).

## Skills

| Skill | Purpose | Allowed for |
|---|---|---|
| `adr` | write and read Architecture Decision Records | `build`, `plan`, `worker` |
| `code-review` | checklist and severity scale | `reviewer` |
| `skill-authoring` | how to add a skill to a profile | `worker` |

## MCP

`context7` (remote, library documentation) needs `CONTEXT7_API_KEY` in the
environment. Its tools are disabled globally and enabled for `build`, `plan`,
`explorer` and `worker`.

## Subagent output

Every subagent answers with fixed Markdown sections defined in its prompt and
summarized in `AGENTS.md`. Change both places together.
