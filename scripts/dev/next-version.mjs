#!/usr/bin/env node
/**
 * Next-version computation (ticket 09) — parses conventional commits since the
 * last tag and computes the next SemVer bump.
 *
 *   major  on BREAKING CHANGE / feat!
 *   minor  on feat:
 *   patch  on fix: / deps: / security: / docs: / chore:
 *
 * Usage: node scripts/dev/next-version.mjs [--tag vX.Y.Z] [--tags-only]
 */
import { run } from "../../.agents/autonomous/lib/util.mjs";
import { fileURLToPath } from "node:url";

function bumpKind(msg) {
  const body = String(msg).toLowerCase();
  if (/breaking change|^feat!|^fix!|^refactor!|^chore!/m.test(body) || /^[a-z]+\([^)]*\)!:/m.test(body)) return "major";
  if (/^feat(\([^)]*\))?:/m.test(body)) return "minor";
  if (/^(fix|deps|security|docs|chore|refactor|perf|ci|style|test)(\([^)]*\))?:/m.test(body)) return "patch";
  return "patch"; // default: unclassified commits count as patches (safe)
}

export function computeNext(current, commits) {
  let [major, minor, patch] = String(current).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  let kind = "patch";
  for (const msg of commits) {
    const k = bumpKind(msg);
    if (k === "major") kind = "major";
    else if (kind !== "major" && k === "minor") kind = "minor";
  }
  if (kind === "major") return { version: `v${major + 1}.0.0`, bump: "major" };
  if (kind === "minor") return { version: `v${major}.${minor + 1}.0`, bump: "minor" };
  return { version: `v${major}.${minor}.${patch + 1}`, bump: "patch" };
}

async function main() {
  const args = process.argv.slice(2);
  const tagArg = args.find((a) => a.startsWith("--tag="))?.slice(6);
  const tagsOnly = args.includes("--tags-only");

  // Last tag (or v0.0.0 if none).
  const tags = await run("git", ["tag", "--sort=-v:refname", "--merged", "HEAD"], { shell: false });
  const lastTag = tagArg || tags.stdout.trim().split(/\r?\n/)[0] || "v0.0.0";
  if (tagsOnly) { console.log(lastTag); return; }

  // Conventional commits since the tag.
  const range = lastTag !== "v0.0.0" ? `${lastTag}..HEAD` : "HEAD";
  const log = await run("git", ["log", "--format=%s%n%b%n---", range], { shell: false });
  const commits = log.stdout
    .split("\n---\n")
    .map((c) => c.trim())
    .filter(Boolean);

  const next = computeNext(lastTag, commits);
  console.log(JSON.stringify({ current: lastTag, ...next, commits: commits.length }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) {
  main().catch((e) => { console.error(e); process.exit(1); });
}