# dsh-plugin-mlquant-benchmark

[![CI](https://github.com/initial-d/dsh-plugin-mlquant-benchmark/actions/workflows/ci.yml/badge.svg)](https://github.com/initial-d/dsh-plugin-mlquant-benchmark/actions/workflows/ci.yml)
[![Listed on Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com/#development--runtime)

DeepSeek Harness tools for reproducing the
[`initial-d/ml-quant-trading`](https://github.com/initial-d/ml-quant-trading)
protocol v1 CPU benchmark.

The point is narrow: make a DSH agent able to run the existing benchmark, read
the machine-readable artifact, validate it against the benchmark protocol, and
draft an issue-ready report. This plugin does not add a trading agent, does not
call market data APIs, and does not configure any model provider.

## Why this exists

`ml-quant-trading` is a good reproducibility target for agent harnesses:

- deterministic synthetic benchmark input;
- fixed protocol v1 command, seed, panel size, repetitions, and thread counts;
- JSON artifact suitable for automated checking;
- public issue template for DeepSeek Harness benchmark reports;
- explicit boundary that benchmark throughput is not trading performance.

Challenge: can DeepSeek Harness reproduce a quant benchmark end to end, preserve
the evidence bundle, and avoid turning runtime numbers into alpha claims?

Listed in
[`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
via [PR #2573](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/2573).

## Run-To-Report Path

1. Install the plugin from GitHub.
2. Open an `initial-d/ml-quant-trading` checkout in DSH.
3. Ask DSH to run, validate, summarize, and draft a benchmark report.
4. Submit the drafted report through the dedicated issue template.

That path is intentionally small: the plugin turns DSH attention into a
reproducible benchmark report, not an investment or leaderboard claim.

## Tools

This package registers four DSH tools:

| Tool | Purpose |
| --- | --- |
| `mlquant_benchmark_v1_cpu` | Run the fixed protocol v1 CPU benchmark and write `artifacts/benchmark-v1.json`. |
| `mlquant_read_benchmark_json` | Read the JSON artifact and render a compact Markdown result table. |
| `mlquant_validate_benchmark_json` | Check protocol v1 fields, expected cases, fixed parameters, and variance warnings. |
| `mlquant_draft_github_issue` | Draft a DeepSeek Harness benchmark issue body from the JSON artifact. It does not post to GitHub. |

## Install

Install the package in a DeepSeek Harness profile or preset environment:

```bash
dsh plugin --profile web add github:initial-d/dsh-plugin-mlquant-benchmark
```

The package declares a `dsh.bundle` manifest that inserts:

```yaml
- id: mlquant-benchmark
  name: dsh-plugin-mlquant-benchmark
```

If you use a local checkout while developing, add the same row manually:

```yaml
- id: mlquant-benchmark
  name: file:/path/to/dsh-plugin-mlquant-benchmark
```

This package is intentionally not published to npm yet. GitHub distribution is
enough for the first DSH-facing benchmark reports; npm can come later if there
is real usage.

## Suggested DSH prompt

```text
Read AGENTS.md, docs/benchmarking.md, and docs/reality_check.md.
Use the mlquant benchmark tools to run the protocol v1 CPU benchmark, validate
and read the JSON artifact, and draft a DeepSeek Harness benchmark report. Keep
the result as an engineering reproducibility benchmark, not a trading-performance
claim.
```

## Public report path

Post the drafted report through the main repository's dedicated template:

<https://github.com/initial-d/ml-quant-trading/issues/new?template=deepseek_harness_benchmark.yml>

Seed example:

<https://github.com/initial-d/ml-quant-trading/issues/61>

For context and agent-facing guardrails, read the main repository's
[`DeepSeek Harness Recipe`](https://github.com/initial-d/ml-quant-trading/blob/main/docs/deepseek_harness_recipe.md)
and
[`Quant Agent Reproducibility Target`](https://github.com/initial-d/ml-quant-trading/blob/main/docs/quant_agent_reproducibility_target.md).

## Development

```bash
npm install
npm test
```

The test loads the plugin with a mock `ctx.tools.register`, verifies that the
four tools register, reads and validates sample artifacts, and drafts an issue
body.

## Non-goals

- No investment advice.
- No backtest-performance claim.
- No hidden model provider configuration.
- No posting to GitHub from the tool.
- No private data or API keys in artifacts.
