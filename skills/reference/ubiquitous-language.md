---
name: ubiquitous-language
description: Enforce exact domain terminology from a user-provided markdown glossary. Use when the user mentions Ubiquitous Language, domain terms, glossary, core domain terms, DDD naming, or asks Codex to use exact terms in code, comments, tests, planning, UI copy, or documentation.
---

# Ubiquitous Language

## Operating Rule

Treat the user's domain terms markdown file as the naming authority. Use those exact terms in code, comments, tests, filenames, planning, and user-facing copy whenever the concept appears.

## Workflow

1. Locate and read the domain terms markdown file before planning or editing.
2. Extract canonical terms, definitions, aliases, forbidden names, and relationships.
3. Build a short working glossary in your own notes before coding.
4. Rename newly introduced identifiers to match the canonical terms.
5. Preserve existing public APIs unless the user explicitly wants terminology migration.
6. If a concept is missing from the glossary, mark it as a candidate term and ask before inventing durable names.

## Enforcement

Prefer domain names over technical convenience names. For example, use `PaymentInstruction` if the glossary says that, not `PaymentRequest`, `TransferPayload`, or `MoneyThing`.

Do not casually translate terms into synonyms. Synonyms create hidden complexity.

Tests should read like domain statements and use the same terms as the glossary.

## Conflict Handling

If code already uses a different term, report the mismatch and choose one of these paths:

1. Keep the old public name and use the canonical term internally.
2. Add an adapter or alias at the boundary.
3. Rename the code through a scoped migration.

Do not mix terms for the same concept without calling it out.
