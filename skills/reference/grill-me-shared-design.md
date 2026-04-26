---
name: grill-me-shared-design
description: Relentless pre-implementation design interview for software tasks. Use when the user says "Grill Me", asks to resolve a shared design concept before coding, wants the design tree walked, or wants dependencies, assumptions, interfaces, risks, and acceptance criteria clarified before implementation.
---

# Grill Me Shared Design

## Operating Rule

Do not write production code until the shared design concept is explicit enough that implementation choices are constrained.

Interview the user in short rounds. Ask the few highest-leverage questions first, then adapt based on answers. Be direct, but keep questions answerable.

## Design Tree

Walk this tree until every branch has either an answer, a deliberate deferral, or a named assumption:

1. Outcome: what observable result must exist when the task is done?
2. User and context: who uses it, where, and under what constraints?
3. Current system: what code, data, or workflow already owns this behavior?
4. Interface: what API, command, UI, file, or contract should callers see?
5. Domain language: what exact names and terms must be used?
6. Behavior: what are the normal path, edge cases, failure modes, and non-goals?
7. Dependencies: what libraries, services, files, permissions, tests, and environments are involved?
8. Validation: what test, screenshot, log, or command will prove the result?
9. Rollout: what can break, what must remain stable, and what can be removed?

## Question Discipline

Ask no more than five questions per round unless the user explicitly wants a long interview.

Prefer concrete alternatives over abstract prompts. For example, ask "Should this be a CLI flag, config field, or automatic behavior?" rather than "What architecture do you want?"

When answers conflict, state the conflict plainly and ask the user to choose.

## Exit Criteria

Before coding, summarize:

1. The shared design concept in one paragraph.
2. The stable interface or user-facing behavior.
3. The deferred decisions and assumptions.
4. The first validation step.
