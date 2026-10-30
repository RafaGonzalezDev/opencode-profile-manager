---
name: adr
description: Use when a change involves a significant architectural decision, when choosing between design alternatives, or when reading prior decisions in docs/adr/ before planning.
---

# Architecture Decision Records

An ADR records one significant decision, why it was taken, and what it costs.
ADRs live in `docs/adr/` and are the first thing planning and orchestration
agents read before proposing work.

## When to write one

Write an ADR when a decision:

- changes a module boundary, data model, public contract, or dependency
- is hard or expensive to reverse
- picks one option over realistic alternatives the team may revisit

Do not write ADRs for routine implementation choices.

## Files

- Path: `docs/adr/NNNN-short-kebab-title.md`, numbered sequentially from `0001`.
- Never rewrite an accepted ADR. Supersede it with a new one and update the old
  one's status to `Superseded by NNNN`.

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
The forces and constraints that make a decision necessary.

## Decision
What we will do, stated in one or two sentences.

## Alternatives considered
- Option: why it was not chosen.

## Consequences
What becomes easier, what becomes harder, and what must be done next.
```

## Reading ADRs

When planning, list the ADRs that constrain the request. If the request
conflicts with an accepted ADR, report the conflict instead of silently
working around it.
