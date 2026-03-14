# inrou (印籠)

Detect which AI coding agent wrote your code. No AI required.

Named after the Edo-period ornamental container ([印籠](https://en.wikipedia.org/wiki/Inr%C5%8D)) that identified clan, status, and identity — inrou identifies the AI agent behind your commits.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

## How It Works

inrou uses **deterministic heuristics and pattern matching** on git data to identify AI coding agents. No LLM calls, no API keys, no cloud services. Instant results.

Based on the methodology from ["Fingerprinting AI Coding Agents on GitHub"](https://arxiv.org/abs/2601.17406) (arXiv:2601.17406), which achieved 97.2% F1 identification across 33,580 PRs using 41 behavioral features.

### Supported Agents

- **Claude Code** — Anthropic's coding agent
- **GitHub Copilot** — GitHub's AI pair programmer
- **Codex** — OpenAI's Codex CLI
- **Devin** — Cognition's autonomous agent
- **Cursor** — Cursor IDE agent
- **Windsurf** — Codeium's coding agent
- **Aider** — CLI pair programming tool

## Install

```sh
npm install -g inrou
```

## Quick Start

```sh
# Scan current repo
inrou scan

# Scan specific repo with last 200 commits
inrou scan /path/to/repo -n 200

# See which agent wrote each section of a file
inrou blame src/index.ts

# Compare two repos
inrou compare /path/to/repo1 /path/to/repo2

# View repo fingerprint profile
inrou profile

# List all known agent signatures
inrou agents
```

## Commands

### `inrou scan [path]`

Scan a git repo and produce a fingerprint report.

```
inrou — Agent Fingerprint Analysis
Repository: /Users/dev/my-project
Commits analyzed: 87 (last 30 days)

Agent Attribution Summary
┌───────────────┬──────────────┬────────────┬───────────────────────────────────┐
│ Agent         │ Commits      │ Confidence │ Key Signals                       │
├───────────────┼──────────────┼────────────┼───────────────────────────────────┤
│ Claude Code   │ 34 (39%)     │ 0.82       │ conventional commits, co-authored │
│ Human         │ 31 (36%)     │ 0.91       │ irregular timing, style           │
│ Copilot       │ 15 (17%)     │ 0.67       │ single-line msgs, bursts          │
│ Unknown       │  7 (8%)      │ <0.30      │ insufficient signal               │
└───────────────┴──────────────┴────────────┴───────────────────────────────────┘
```

Options:
- `-n, --commits <number>` — Number of commits to analyze (default: 100)
- `--json` — Output as JSON

### `inrou blame <file>`

Like `git blame`, but shows which agent likely wrote each section.

### `inrou compare <repo1> <repo2>`

Compare fingerprint profiles between two repos side-by-side.

### `inrou profile [path]`

Show the fingerprint profile of the current repo with feature visualization.

### `inrou agents`

List all known agent signatures and their key identifying features.

## Feature Extraction

inrou extracts features across five categories:

**Commit Messages** — Message length, multiline ratio, conventional commit format, imperative mood, emoji usage, bullet lists, co-authored/signed-off trailers

**Change Patterns** — Files per commit, insertions/deletions, change concentration (Gini coefficient), single-file commit ratio, test file ratio

**Behavioral** — Commit frequency, burst patterns (commits within 1-minute windows), session duration

**Code Characteristics** — File type diversity (Shannon entropy), test coverage patterns

**Agent Signatures** — Direct matches against known agent commit templates, branch naming patterns, git trailers

## Philosophy

This tool is deliberately **AI-free**. The irony of using AI to detect AI is not lost on us. Instead, inrou relies on the fact that each coding agent has distinctive enough behavioral patterns that deterministic heuristics work well.

The key insight from the research: agents are creatures of habit. They use consistent commit message formats, branch naming conventions, and change patterns. These fingerprints are as distinctive as handwriting.

## Research

This tool implements feature extraction from:

> **Fingerprinting AI Coding Agents on GitHub**
> arXiv:2601.17406
> 33,580 PRs analyzed, 41 features extracted, 97.2% F1 identification

Key discriminators identified by the paper:
- **Multiline commit ratio** (44.7% feature importance)
- **Conditional density** in code (27.2% importance for Claude Code)
- **Change concentration Gini** (10.1% importance)

## Development

```sh
git clone https://github.com/kitsune-agent/inrou.git
cd inrou
npm install
npm run build
npm test
```

## License

MIT
