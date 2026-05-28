---
name: musk-five-step-algorithm
description: Apply Elon Musk's five-step algorithm to software, process, product, automation, refactor, and performance tasks. Use when the user mentions Musk's algorithm, first principles, question requirements, delete, simplify, accelerate, automate, or when a task risks optimizing or automating unnecessary work.
---

# Musk Five Step Algorithm

## Operating Rule

Run the five steps in order. Do not optimize, accelerate, or automate something before proving it should exist.

## The Algorithm

1. Question every requirement.
2. Delete any part, process, feature, abstraction, dependency, step, or document that does not survive questioning.
3. Simplify and optimize what remains.
4. Accelerate the cycle time only after the design is simpler.
5. Automate last.

## Software Application

For each requirement, ask:

1. Who owns this requirement by name?
2. What observable user or system need does it satisfy?
3. What breaks if this does not exist?
4. Can the requirement be reduced, merged, delayed, or deleted?

For each implementation step, ask:

1. Can this code path disappear?
2. Can an existing module own this behavior?
3. Can configuration replace code?
4. Can a test prove the smaller design works?

## Deletion Standard

Delete more aggressively than feels comfortable, then add back only what evidence requires.

If nothing had to be added back, check whether deletion was timid.

## Automation Gate

Only automate after manual or test-driven execution proves the process is correct, simple, and repeated often enough to justify automation.
