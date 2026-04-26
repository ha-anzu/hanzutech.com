---
name: conceptual-integrity-design
description: Preserve a coherent design concept across a feature, module, product, or architecture. Use when the user mentions The Design of Design, Frederick Brooks, conceptual integrity, design tree, shared concept, design rationale, interface coherence, or resolving competing design directions before implementation.
---

# Conceptual Integrity Design

## Operating Rule

Keep the design governed by one coherent concept. Do not merge incompatible ideas just because each seems locally useful.

## Workflow

1. State the central design concept in one sentence.
2. List the design constraints and stakeholder forces.
3. Build a small design tree: core concept, accepted branches, rejected branches, open branches.
4. Test each branch against propriety: does this belong in the system?
5. Test each branch against orthogonality: can this decision vary independently?
6. Test each branch against consistency: does it fit the established model and language?
7. Record the rationale for non-obvious choices in code, tests, or a task note close to the work.

## Decision Rules

Prefer one clear concept over a compromise that makes every caller learn exceptions.

When two good designs conflict, choose the one that reduces the number of concepts users and maintainers must hold.

When the problem changes, revise the design concept explicitly instead of accreting patches.

## Output

Before implementation, produce:

1. The design concept.
2. The accepted interface shape.
3. Rejected alternatives and why they were rejected.
4. The validation path.
