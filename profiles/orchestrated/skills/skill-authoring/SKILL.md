---
name: skill-authoring
description: Use when creating or updating an OpenCode skill for a team profile, or when deciding whether guidance belongs in a skill, an agent prompt, or AGENTS.md.
---

# Skill Authoring

A skill is reusable guidance that an agent loads on demand. It lives in
`skills/<name>/SKILL.md` inside a profile and is installed into
`~/.config/opencode/skills/`.

## Where guidance belongs

- `AGENTS.md`: rules every agent follows on every task.
- Agent prompt (`agents/<name>.md`): the role, limits and output format of
  one agent.
- Skill: procedural knowledge needed only for some tasks, possibly by several
  agents.

## Structure

```text
skills/
  <name>/
    SKILL.md
```

Add extra files (references, scripts) only when the skill would otherwise
repeat the same content.

## Frontmatter

```yaml
---
name: <name>            # lowercase, hyphenated, same as the directory
description: Use when <concrete trigger>.
---
```

The `description` decides when an agent loads the skill: state the trigger,
not a summary.

## Giving agents access

Skills are denied by default in `opencode.json` (`permission.skill."*": deny`).
Allow a skill per agent in its frontmatter:

```yaml
permission:
  skill:
    '<name>': allow
```

## Checklist

1. One narrow purpose.
2. Trigger-oriented `description`.
3. Short, actionable body: steps, rules, templates.
4. Access granted only to the agents that need it.
5. Profile README updated to list the skill.
