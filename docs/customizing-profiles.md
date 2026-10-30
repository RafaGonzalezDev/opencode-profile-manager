# Customizing profiles

How to adapt the example profiles or create a new one. The
[`orchestrated`](../profiles/orchestrated/README.md) profile is the reference
for every concept below.

## Create a profile

1. Copy `profiles/vanilla/` (minimal) or `profiles/orchestrated/` (full
   example) to `profiles/<your-profile>/`.
2. Keep the required entries: `AGENTS.md`, `opencode.json`, `agents/`,
   `skills/`. Empty directories need a `.gitkeep`.
3. Update the profile `README.md`.
4. Run `npm run setup`; the new profile is listed automatically.

To test a profile without installing it, point OpenCode at a copy:

```bash
mkdir -p /tmp/profile-check/opencode
cp -r profiles/<your-profile>/. /tmp/profile-check/opencode/
XDG_CONFIG_HOME=/tmp/profile-check opencode debug agent build
```

`opencode debug agent <name>` prints the resolved model, options and the
ordered permission rules.

## Instructions

- `AGENTS.md` holds the rules every agent follows.
- The body of `agents/<name>.md` is that agent's prompt: role, hard rules,
  operating loop and output format.

## Agents and subagents

Create `agents/<name>.md`; the file name is the agent name.

```markdown
---
description: One line that tells primary agents when to use this agent
mode: subagent        # primary | subagent | all
permission:
  edit: deny
---

## Role
...
```

Primary agents can call a subagent only if their `permission.task` allows it:

```yaml
permission:
  task:
    '*': deny
    'my-subagent': allow
```

## Models and reasoning effort

Set them per agent in the profile's `opencode.json`, so the whole team changes
one file:

```json
"agent": {
  "worker": {
    "model": "github-copilot/REPLACE_WITH_CODING_MODEL",
    "reasoningEffort": "medium"
  }
}
```

- `model` uses `provider/model-id`. List the ids available to you with
  `opencode models github-copilot`.
- `reasoningEffort` is passed through to the provider as a model option
  (typical values: `low`, `medium`, `high`). Whether it has an effect depends
  on the model behind the provider; models without reasoning controls ignore it.
- A subagent without `model` inherits the model of the primary agent that
  called it.

## Permissions

Permissions are rules of `permission: action` or `permission: { pattern: action }`
with the actions `allow`, `ask` and `deny`.

- The root `permission` in `opencode.json` sets defaults for every agent.
- An agent's frontmatter `permission` is appended after the defaults.
- Rules are evaluated in order and the last matching rule wins, so an agent
  only declares what differs from the defaults.

Common keys: `read`, `edit`, `bash`, `list`, `glob`, `grep`, `webfetch`,
`task`, `skill`, `external_directory`, `doom_loop`.

Patterns:

```yaml
permission:
  read:
    '*': deny            # everything...
    'docs/**': allow     # ...except docs
  bash:
    'git diff*': allow
```

A rule that only uses `*` cannot be undone by an earlier pattern: put broad
rules first and exceptions after.

## Subagent output format

Define the response format at the end of each subagent prompt as fixed
Markdown sections, and summarize the contract in `AGENTS.md` so primary agents
know how to read it. Keep sections stable: the orchestrator's prompt refers to
them by name.

## Skills

1. Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter.
2. Grant access per agent:

   ```yaml
   permission:
     skill:
       '<name>': allow
   ```

The `orchestrated` profile denies all skills by default
(`permission.skill."*": deny`), which also blocks skills a developer may have
installed elsewhere. See its `skill-authoring` skill for a full guide.

## MCP servers

Declare servers in `opencode.json` and read secrets from the environment:

```json
"mcp": {
  "context7": {
    "type": "remote",
    "url": "https://mcp.context7.com/mcp",
    "headers": { "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}" }
  }
}
```

Local servers use `"type": "local"` and `"command": [...]`.

Restrict which agents can use a server's tools:

```json
"tools": { "context7*": false },
"agent": { "explorer": { "tools": { "context7*": true } } }
```

Add every new environment variable to the root `.env.example` with a comment
on where to get it.
