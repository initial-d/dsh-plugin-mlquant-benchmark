# Changelog

All notable changes to this project are documented here.

## 0.1.0 - 2026-08-20

### Added

- DSH tool registration for the `ml-quant-trading` protocol v1 CPU benchmark.
- JSON artifact reader that renders the benchmark result table.
- JSON artifact validator for protocol v1 fields, expected cases, and caveats.
- GitHub issue body drafter for DeepSeek Harness benchmark reports.
- `dsh.bundle` manifest for `dsh plugin add` installation.
- GitHub Actions CI for readiness checks, tool tests, and package dry runs.

### Notes

- This package is a reproducibility helper, not a trading agent.
- The tools do not configure model providers, call market-data APIs, or post to
  GitHub automatically.
