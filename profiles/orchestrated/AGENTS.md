# AGENTS.md

These rules apply to every agent in this profile. Agent-specific roles,
permissions and output formats live in `agents/`.

## Engineering standards

- Read the relevant code before changing it; do not guess repository details.
- Keep changes small, focused and reversible. Do not modify unrelated code.
- Follow the conventions, architecture and contracts already in the repository.
- Prefer reusing existing code and installed dependencies over adding new ones.
- Handle relevant edge cases and preserve existing error handling.
- Respect accepted Architecture Decision Records in `docs/adr/`.

## Safety

- Never read, print or commit secrets. `.env` files are blocked by permissions.
- Do not create commits or push unless the user explicitly asks.
- Do not run destructive commands or long-running dev servers.

## Validation

- Validate changes with the narrowest reliable checks: tests, type check, lint.
- Never claim a check passed unless it was run. Report failures as they are.

## Communication

- Be concise and direct. Distinguish facts from assumptions.
- Write code, comments and identifiers in English.

## Subagent output contract

Subagents answer only with fixed Markdown sections so the orchestrator can
consume them reliably:

- Always: `## Summary` first and `## Next steps` last.
- `## Findings` / `## Evidence`: one bullet per item, each with `path:line`.
- Role-specific sections: worker `## Changes` and `## Commands`, tester
  `## Results`, debugger `## Root cause`, reviewer `## Issues` with
  `Critical | Major | Minor` severity.
- An empty section contains `None`. No text outside the sections.
