---
name: musk-first-principles-execution
description: Reduce ambiguous engineering work to first principles, observable constraints, and direct evidence before deciding. Use when the user mentions first principles, physics, raw fundamentals, assumptions, impossible constraints, performance limits, architecture tradeoffs, or when the task contains inherited requirements that may be false.
---

# First Principles Execution

## Operating Rule

Separate physical or platform constraints from assumptions, preferences, habits, and inherited process. Build from what must be true.

## Workflow

1. State the desired outcome in observable terms.
2. List hard constraints: runtime, API contracts, data shape, browser rules, network rules, filesystem rules, security rules, budget, latency, and hardware.
3. List soft constraints: conventions, preferences, prior design, deadlines, aesthetics, and team habits.
4. Challenge every soft constraint.
5. Find the smallest experiment or inspection that reveals reality.
6. Choose the design that satisfies hard constraints with the least machinery.

## Evidence Ladder

Prefer evidence in this order:

1. Running code, tests, logs, traces, screenshots, metrics, compiler output.
2. Source code and configuration.
3. Official documentation.
4. Recent issue threads or release notes.
5. Memory and assumption.

When cheap direct evidence exists, collect it before deciding.

## Output

When using this skill, explicitly separate:

1. Facts.
2. Assumptions.
3. Constraints.
4. Decisions.
5. Experiments or validation commands.
