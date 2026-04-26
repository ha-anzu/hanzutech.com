---
name: typescript-boundary-design
description: Design explicit TypeScript boundaries for APIs, modules, environment variables, external data, and reusable types. Use when the user mentions Matt Pocock, Total TypeScript, TypeScript architecture, type safety, runtime validation, public interfaces, branded types, generics, return types, `any`, or stable TS module contracts.
---

# TypeScript Boundary Design

## Operating Rule

Make boundaries explicit. TypeScript should document the public contract, while runtime validation protects data that TypeScript cannot prove.

## Boundary Workflow

1. Identify external inputs: HTTP, database, filesystem, environment, messages, user input, AI output, or third-party SDKs.
2. Validate external inputs at the boundary.
3. Convert validated data into internal domain types.
4. Keep public APIs explicit: inputs, outputs, errors, side effects.
5. Declare return types for exported top-level functions unless local style forbids it.
6. Use generics only when they preserve real caller information.
7. Avoid `any`; if unavoidable, isolate it at the boundary and narrow immediately.

## Type Design Rules

Use simple named types for domain concepts.

Use branded or opaque types for IDs and validated values when mixing them would be dangerous.

Prefer discriminated unions for state machines and result variants.

Do not use advanced type machinery to impress the compiler if a simpler runtime model would be clearer.

## Validation

Run the repo's TypeScript check after changes. If no check exists, identify the closest available compiler, lint, or test command.
