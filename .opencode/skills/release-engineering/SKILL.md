# Release Engineering (SemVer + CHANGELOG + GitHub Releases)

Playbook for cutting releases (ticket 09). Run by the `release` persona.

## When to use
- Scheduled weekly sweep, or on-demand `pnpm agent:release`.

## Release procedure

1. **Compute version** — run `node scripts/dev/next-version.mjs`:
   - `major` on `BREAKING CHANGE` / `feat!`
   - `minor` on `feat:`
   - `patch` on `fix:` / `deps:` / `security:` / `docs:` / `chore:`
2. **Changelog** — Keep-a-Changelog at repo root `CHANGELOG.md`; categories Added/Changed/Fixed/Security; per-version section.
3. **Safety checks** (ticket 09): CI green on main, changelog complete.
4. **Cut** — `git tag vX.Y.Z`, `git push origin vX.Y.Z` (fires `docker-publish.yml` on `v*` tags), `gh release create vX.Y.Z --generate-notes`.
5. **No pre-releases** (`vX.Y.Z-rc.N`) — skip unless a staging env demands it.
6. **Security releases** (ticket 08) fast-track into the next patch; they still follow this procedure.

## Report
End with `STATUS: done` + the release plan (current → next version, bump, commit count).