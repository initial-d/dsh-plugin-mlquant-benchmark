# dsh-plugin-mlquant-benchmark

DeepSeek Harness tools for reproducing the
[`initial-d/ml-quant-trading`](https://github.com/initial-d/ml-quant-trading)
protocol v1 CPU benchmark.

The point is narrow: make a DSH agent able to run the existing benchmark, read
the machine-readable artifact, and draft an issue-ready report. This plugin does
not add a trading agent, does not call market data APIs, and does not configure
any model provider.

## Why this exists

`ml-quant-trading` is a good reproducibility target for agent harnesses:

- deterministic synthetic benchmark input;
- fixed protocol v1 command, seed, panel size, repetitions, and thread counts;
- JSON artifact suitable for automated checking;
- public issue template for DeepSeek Harness benchmark reports;
- explicit boundary that benchmark throughput is not trading performance.

Challenge: can DeepSeek Harness reproduce a quant benchmark end to end, preserve
the evidence bundle, and avoid turning runtime numbers into alpha claims?

## Tools

This package registers three DSH tools:

| Tool | Purpose |
| --- | --- |
| `mlquant_benchmark_v1_cpu` | Run the fixed protocol v1 CPU benchmark and write `artifacts/benchmark-v1.json`. |
| `mlquant_read_benchmark_json` | Read the JSON artifact and render a compact Markdown result table. |
| `mlquant_draft_github_issue` | Draft a DeepSeek Harness benchmark issue body from the JSON artifact. It does not post to GitHub. |

## Install

Install the package in a DeepSeek Harness profile or preset environment from
GitHub:

```bash
pnpm add github:initial-d/dsh-plugin-mlquant-benchmark
```

Then add the plugin to a Cordis composition:

```yaml
- id: mlquant-benchmark
  name: dsh-plugin-mlquant-benchmark
```

If you use a local checkout while developing:

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
Use the mlquant benchmark tools to run the protocol v1 CPU benchmark, read the
JSON artifact, and draft a DeepSeek Harness benchmark report. Keep the result as
an engineering reproducibility benchmark, not a trading-performance claim.
```

## Public report path

Post the drafted report through the main repository's dedicated template:

<https://github.com/initial-d/ml-quant-trading/issues/new?template=deepseek_harness_benchmark.yml>

Seed example:

<https://github.com/initial-d/ml-quant-trading/issues/61>

## Development

```bash
npm install
npm test
```

The test loads the plugin with a mock `ctx.tools.register`, verifies that the
three tools register, reads a sample artifact, and drafts an issue body.

## Non-goals

- No investment advice.
- No backtest-performance claim.
- No hidden model provider configuration.
- No posting to GitHub from the tool.
- No private data or API keys in artifacts.
