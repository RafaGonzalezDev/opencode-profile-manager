---
name: code-review
description: Use when reviewing a diff or a set of changed files for correctness, security, maintainability and design, and when classifying review issues by severity.
---

# Code Review

A checklist and a severity scale so every review in the team reads the same.

## Scope

Review what changed (`git diff`, `git show`) and the code it directly
touches. Do not review unrelated files.

## Checklist, in priority order

1. Correctness: logic errors, unhandled states, edge cases, broken callers.
2. Security: input validation at trust boundaries, secrets in code or logs,
   injection, authorization checks.
3. Data safety: destructive operations without guards, migrations without a
   rollback path.
4. Tests: new behavior and bug fixes are covered; tests assert behavior, not
   implementation details.
5. Design: responsibilities stay cohesive, no duplicated logic, no speculative
   abstractions, existing conventions are followed.
6. Maintainability: naming, comments that explain why, dead code.

## Severity

- Critical: wrong results, data loss, security exposure, or a broken build.
  Must be fixed before merging.
- Major: likely bug, missing test for changed behavior, or a design problem
  that will spread. Should be fixed before merging.
- Minor: readability or style issue with no behavioral impact.

## Rules

- Each issue cites `path:line` and explains the concrete consequence.
- Do not report style preferences that a formatter or linter already enforces.
- If nothing is wrong, say so; do not invent issues to fill the report.
