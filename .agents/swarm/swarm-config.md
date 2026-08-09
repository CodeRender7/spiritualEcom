# Swarm Agent Orchestration — Configuration

This document defines how agents work together across Antigravity IDE and OpenCode in enterprise swarm patterns. All agents share the same core skill set and MCP server connections.

---

## Agent Personas & Profiles

Each persona maps to a specific role in the software development lifecycle. Agents assume personas dynamically based on the task at hand.

### 🏗️ Architect Agent
**Trigger**: Architecture review, system design, deep module design  
**Persona**: Senior software architect focused on deep modules and clean seams  
**Core Skills**:
- `/improve-codebase-architecture` — Scan for deepening opportunities, generate visual HTML report
- `/codebase-design` — Deep module design: behaviour behind small interface, placed at clean seam
- `/domain-modeling` — Build and sharpen domain models, stress-test with edge cases
- `/grill-with-docs` — Sharpen terminology, update CONTEXT.md and ADRs inline
- `/ubiquitous-language` — Enforce consistent domain vocabulary
- `/zoom-out` — Step back and assess the big picture

**MCP Tools**: `graphify` (dependency graph), `fallow` (complexity hotspots, architecture boundaries)

---

### 🔍 Analyst Agent
**Trigger**: Code quality analysis, pollution detection, complexity assessment  
**Persona**: Code quality engineer running static analysis and codebase intelligence  
**Core Skills**:
- `/improve-codebase-architecture` — Architecture scan with deepening opportunities
- `/code-review` — Two-axis review: Standards + Spec, parallel sub-agents
- `/qa` — Quality assurance verification

**MCP Tools**: `fallow` (dead code, duplication, circular deps, complexity), `graphify` (knowledge graph), `gitnexus` (git history intelligence), `codebase-memory` (persistent codebase understanding)

---

### 🛠️ Builder Agent
**Trigger**: Feature implementation, ticket execution, spec-driven development  
**Persona**: Full-stack developer implementing work from specs and tickets  
**Core Skills**:
- `/implement` — Build work from spec/tickets, drive /tdd at seams, /code-review before commit
- `/tdd` — Red-green-refactor loop, one vertical slice at a time
- `/prototype` — Throwaway prototypes for design questions
- `/design-an-interface` — Interface design and iteration
- `/resolving-merge-conflicts` — Resolve conflicts hunk by hunk, by intent

**MCP Tools**: `codebase-memory` (code discovery), `fallow` (impact analysis)

---

### 🐛 Debugger Agent
**Trigger**: Bug reports, performance regressions, failing tests  
**Persona**: Diagnostic specialist with disciplined reproduce→fix→test loop  
**Core Skills**:
- `/diagnosing-bugs` — Reproduce → minimise → hypothesise → instrument → fix → regression-test
- `/tdd` — Regression tests after fixes
- `/research` — Investigate against primary sources when root cause is unclear

**MCP Tools**: `codebase-memory` (trace_path, search_graph), `gitnexus` (git blame, change history), `fallow` (dependency analysis)

---

### 📋 Planner Agent
**Trigger**: Large scope work, multi-session efforts, roadmap creation  
**Persona**: Technical project manager breaking fog into actionable plans  
**Core Skills**:
- `/wayfinder` — Plan huge chunks as investigation ticket maps on issue tracker
- `/to-spec` — Synthesize conversation into spec, publish to issue tracker
- `/to-tickets` — Break plans into tracer-bullet tickets with blocking edges
- `/grill-me` — Relentless interview until every decision branch is resolved
- `/grill-with-docs` — Grilling + domain model building with doc updates
- `/grilling` — Reusable interview loop (model-invoked)
- `/triage` — Move issues through triage state machine

**MCP Tools**: `codebase-memory` (project context), `gitnexus` (repo intelligence)

---

### 🔬 Researcher Agent
**Trigger**: Investigation, documentation gathering, background research  
**Persona**: Information specialist investigating against high-trust primary sources  
**Core Skills**:
- `/research` — Investigate question, capture findings as cited Markdown, background agent
- `/grill-with-docs` — Domain model sharpening with CONTEXT.md updates
- `/domain-modeling` — Challenge terms against glossary, stress-test edge cases
- `/ubiquitous-language` — Enforce and align domain vocabulary

**MCP Tools**: `codebase-memory` (search_graph, query_graph), `graphify` (knowledge graph queries)

---

### 📚 Teacher Agent
**Trigger**: Learning, skill transfer, concept explanation  
**Persona**: Patient instructor using current directory as stateful teaching workspace  
**Core Skills**:
- `/teach` — Multi-session teaching with stateful workspace
- `/writing-great-skills` — Reference for writing and editing skills well
- `/handoff` — Compact conversation into handoff document

**MCP Tools**: `codebase-memory` (project context for examples)

---

### 🚦 Router Agent (ask-matt)
**Trigger**: Uncertainty about which skill or flow to use  
**Persona**: Traffic controller routing to the right persona/skill  
**Core Skills**:
- `/ask-matt` — Router over all user-invoked skills in this repo
- `/setup-matt-pocock-skills` — One-time repo configuration

**Delegates to**: Any other agent persona based on task analysis

---

## Execution Patterns

### Harness Pattern (Linear Pipeline)
Sequential task execution for new feature development and phased implementation.

```
/wayfinder → /to-spec → /to-tickets → /implement → /tdd → /code-review → /handoff
```

**When to use**: New features, greenfield development, spec-driven work  
**Agent flow**: Planner → Planner → Planner → Builder → Builder → Analyst → Teacher

---

### Loop Pattern (Iterative Cycle)
Repeated diagnostic cycles until issue is resolved.

```
/diagnosing-bugs → /tdd (regression test) → /code-review → repeat if needed
```

**When to use**: Bug fixing, performance regressions, flaky tests  
**Agent flow**: Debugger → Builder → Analyst → (back to Debugger if not resolved)

---

### Graph Pattern (Parallel Exploration)
Multiple agents explore different facets simultaneously, then converge.

```
┌─ /improve-codebase-architecture (Analyst)
│
├─ /codebase-design (Architect)              ──→ /grill-with-docs → /domain-modeling → decisions
│
└─ Fallow scan + Graphify graph (Analyst)
```

**When to use**: Architecture review, code health assessment, pre-refactor analysis  
**Agent flow**: Analyst + Architect running in parallel → Planner synthesizes

---

## Model Provider — OmniRoute

All agents route inference through **OmniRoute** (`http://localhost:20128/v1`). Each persona is assigned an optimal model based on task type:

### Per-Persona Model Assignments

| Agent Persona | Primary Model | Fallback | Rationale |
|---------------|---------------|----------|-----------|
| 🏗️ **Architect** | `auto/best-reasoning` | `auto/smart` | Deep reasoning for design decisions and architecture review |
| 🔍 **Analyst** | `auto/best-coding` | `auto` | Code-aware analysis for quality, pollution, complexity |
| 🛠️ **Builder** | `auto/best-coding` | `auto/coding` | Quality-first code generation for implementation |
| 🐛 **Debugger** | `auto/best-reasoning` | `auto/best-coding` | Deep reasoning for root cause analysis |
| 📋 **Planner** | `auto/best-chat` | `auto/best-reasoning` | Conversational for grilling, planning, spec writing |
| 🔬 **Researcher** | `auto/best-reasoning` | `auto/smart` | Deep reasoning + exploration for investigation |
| 📚 **Teacher** | `auto/best-chat` | `auto` | Conversational for teaching and explanation |
| 🚦 **Router** | `auto/best-fast` | `auto` | Lowest latency for quick persona dispatch |

### Available OmniRoute Models

| Model ID | Optimizes For | Used By |
|----------|---------------|---------|
| `auto/best-coding` | 🧑‍💻 Quality-first code generation | Builder, Analyst |
| `auto/best-reasoning` | 🔭 Deep reasoning and analysis | Architect, Debugger, Researcher |
| `auto/best-fast` | ⚡ Lowest latency | Router |
| `auto/best-vision` | 👁️ Multimodal / UI review | Any (on demand) |
| `auto/best-chat` | 💬 Conversational quality | Planner, Teacher |
| `auto` | 🎯 Balanced default (LKGP) | Fallback for all |
| `auto/coding` | 🧑‍💻 Code generation (cost-aware) | Builder fallback |
| `auto/fast` | ⚡ Speed-first | Quick fixes |
| `auto/cheap` | 💰 Cost-optimized | Batch operations |
| `auto/smart` | 🔭 Quality + 10% exploration | Architect/Researcher fallback |

---

## MCP Server Integration Map

| MCP Server | Agent Personas | Key Tools |
|------------|---------------|-----------|
| **codebase-memory** | All agents | `index_repository`, `search_graph`, `trace_path`, `get_code_snippet`, `query_graph`, `search_code` |
| **fallow** | Analyst, Architect, Builder | `scan`, `unused-exports`, `duplicates`, `complexity`, `circular-deps`, `boundaries` |
| **gitnexus** | Analyst, Debugger, Planner | `analyze`, `blame`, `change-history`, `impact-analysis` |
| **graphify** | Architect, Researcher, Analyst | `query`, `dependencies`, `visualize`, `search` |

---

## Swarm Coordination Rules

1. **Persona selection**: Use `/ask-matt` when uncertain which persona fits
2. **Skill chaining**: Each skill names its natural successor (e.g., `/implement` closes with `/code-review`)
3. **MCP-first discovery**: Prefer `codebase-memory-mcp` tools (search_graph, trace_path) over grep/file-read for code discovery
4. **Graph-first analysis**: Run `graphify` and `fallow` before manual architecture review
5. **Issue tracking**: All work products flow through `.scratch/` (local) or GitHub issues
6. **Handoff protocol**: Use `/handoff` when transferring between agent sessions
7. **Domain consistency**: `/grill-with-docs` and `/domain-modeling` update CONTEXT.md and ADRs inline
8. **Model routing**: All inference via OmniRoute — persona picks primary model, auto-fallback on quota/failure
