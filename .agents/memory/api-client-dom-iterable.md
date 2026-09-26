---
name: Generated API client DOM iterable requirement
description: TypeScript configuration needed when Orval-generated clients inspect Headers entries.
---

Generated React API clients can use `Headers.entries()`, which is not present in TypeScript's `dom` library alone. Composite client packages need both `dom` and `dom.iterable` in `compilerOptions.lib`.

**Why:** OpenAPI codegen can succeed while the follow-up workspace typecheck fails on the generated client if `dom.iterable` is omitted.

**How to apply:** When adding or regenerating a generated browser client, check its package TypeScript `lib` list before debugging the generated source.