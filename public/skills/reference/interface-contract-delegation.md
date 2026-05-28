---
name: interface-contract-delegation
description: Implement internal logic behind a user-designed module interface. Use when the user says they will design the interface, Codex is responsible for implementation, the internals are a gray box, the interface must remain stable, or the task separates interface design from delegated implementation.
---

# Interface Contract Delegation

## Operating Rule

Treat the user-designed interface as the contract. Implement behind it without changing names, signatures, semantics, or error behavior unless the user approves the change.

## Workflow

1. Restate the interface contract: functions, inputs, outputs, errors, side effects, and stability requirements.
2. Identify observable behaviors that must be true through that interface.
3. Implement internals as a gray box: inspectable, but not part of the contract.
4. Add tests at the interface boundary.
5. Keep internal helpers private or clearly non-contractual.
6. Report any pressure to change the interface before changing it.

## Delegation Rules

Optimize implementation freedom, not interface cleverness.

Preserve user-chosen names, domain terms, and conceptual shape.

If the existing code fights the interface, write an adapter behind the boundary before asking to redesign the contract.

## Done Criteria

The task is done when the interface stays stable, behavior is verified through the interface, and callers no longer need to know the internal design.
