---
name: ipbl
description: Repository-specific patterns and workflows for IPBL.
---

# IPBL Development Patterns

```markdown
# IPBL Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches best practices and conventions for contributing to the IPBL repository, a TypeScript React codebase. It covers file naming, code style, commit message conventions, and testing patterns to ensure consistency and maintainability across the project.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userProfile.tsx`, `dataFetcher.ts`

### Import Style
- Use **relative imports** for referencing modules within the project.
  - Example:
    ```typescript
    import { fetchData } from './dataFetcher';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In dataFetcher.ts
    export function fetchData() { ... }

    // In another file
    import { fetchData } from './dataFetcher';
    ```

### Commit Message Conventions
- Follow **conventional commits** with the prefix `fix`.
- Keep commit messages concise (average: 55 characters).
  - Example:
    ```
    fix: correct typo in userProfile component
    ```

## Workflows

- `graphify-source-archaeology`: Graphify evidence, graph relationships, source archaeology, and durable proof bundles.
- `live-source-repair`: live API behavior, bookmaker parsing, recorder freshness, and Vercel runtime verification.
- `vercel-verification`: browser-side and production deployment proof for the live viewer and API routes.
- `evidence-finalization`: phase manifests, supersession indexes, and closure packaging.
- `gen-planning`: operator intelligence, roadmap closure, and read-only phase packaging.

## Testing Patterns

- **Test File Pattern:** All test files follow the `*.test.*` naming convention.
  - Example: `userProfile.test.tsx`
- **Testing Framework:** Not specified; check project dependencies for details.
- **Test Example:**
  ```typescript
  // userProfile.test.tsx
  import { render } from '@testing-library/react';
  import { UserProfile } from './userProfile';

  test('renders user profile', () => {
    render(<UserProfile />);
    // add assertions here
  });
  ```

## Commands
| Command | Purpose |
|---------|---------|
| /fix-commit | Create a conventional commit with the `fix` prefix |
| /run-tests | Run all test files matching `*.test.*` |
| /new-component | Scaffold a new React component using camelCase file naming and named exports |
```

## Mellonelay Fabric A-Team Execution

When `.agenteam/execution-contract.yaml` is present, treat it as the execution boundary. Adopt the configured repository roles as logical sub-agents, create bounded role records with `createAgent`, and execute all shell, GitHub, Vercel, file, test, and build work through `vmRouter`. Do not use Codex CLI as the executor.
