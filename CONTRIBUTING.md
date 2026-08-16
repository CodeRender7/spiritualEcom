# Contributing to DivineKart

Thanks for your interest in contributing! This guide will help you get set up and submit quality contributions.

## Project overview

- **Monorepo**: pnpm + Turbo (`backend` = Medusa v2, `storefront` = Next.js)
- **Docs**: read [`CONTEXT.md`](CONTEXT.md) and `docs/agents/` before touching an area
- **Issue tracker**: feature specs live under `.scratch/<feature>/`

## Getting started

1. Install dependencies (hoisted node_modules is a Medusa requirement):

   ```bash
   pnpm install
   ```

2. Start the stack with Docker Compose:

   ```bash
   docker compose up --build -d
   ```

3. Or run in dev mode:

   ```bash
   pnpm turbo dev
   ```

4. Seed the database:

   ```bash
   pnpm seed
   ```

## How to help

- **Report bugs** — open an issue using the bug report template
- **Suggest features** — open an issue using the feature request template
- **Fix documentation** — docs live in the `README.md` and `docs/` folder
- **Submit code** — follow the pull request flow below

## Pull request flow

1. **Fork** the repo and create a branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** — keep them focused on one thing.

3. **Verify locally**:

   ```bash
   pnpm turbo typecheck
   pnpm turbo build
   ```

4. **Commit** with a clear message (see the semantic prefix convention below).

5. **Open a pull request** to `main` using the PR template. Draft PRs are auto-created for `feature-*` branches — fill them in.

## PR title convention

The Check PR Title workflow enforces semantic prefixes:

```
feat: add new checkout option
fix: resolve cart quantity bug
docs: update VPS setup guide
ci: add CodeQL workflow
refactor: simplify settings module
test: add cart e2e tests
chore: bump dependency versions
```

## Quality checklist

- [ ] `pnpm turbo typecheck` passes
- [ ] `pnpm turbo build` passes
- [ ] Code is focused and well-named
- [ ] No unrelated changes bundled in
- [ ] Commit messages follow the semantic prefix
- [ ] Documentation updated when behavior changes

## Code of conduct

Be respectful and constructive. Harassment of any kind will not be tolerated.

## Questions

Use [GitHub Discussions](https://github.com/CodeRender7/spiritualEcom/discussions) for questions before opening an issue.