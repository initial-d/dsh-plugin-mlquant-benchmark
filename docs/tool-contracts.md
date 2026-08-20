# Tool Contracts

This plugin registers three tools. Their scope is deliberately narrow: run the
documented benchmark, read the generated JSON, and draft a report body.

## `mlquant_benchmark_v1_cpu`

Runs the `ml-quant-trading` protocol v1 CPU benchmark command:

```bash
python scripts/benchmark_tensor_factors.py --device cpu --n-dates 750 --n-stocks 1000 --window 20 --repeat 10 --warmup 3 --threads 1 --interop-threads 1 --seed 42 --json-out artifacts/benchmark-v1.json
```

Inputs:

- `repoPath`: checkout path; defaults to the current workspace.
- `python`: Python executable; defaults to `python`.
- `jsonOut`: artifact path relative to `repoPath`.

Output:

- command, working directory, JSON path, exit code, elapsed time, stdout, and
  stderr.

## `mlquant_read_benchmark_json`

Reads an existing benchmark JSON artifact and returns:

- schema version;
- environment object;
- raw result rows;
- Markdown result table;
- variance warnings for rows whose `std / mean >= 0.25`.

## `mlquant_draft_github_issue`

Builds a Markdown issue body from a benchmark JSON artifact. It does not use the
GitHub API and does not post anything.

The generated text keeps the interpretation boundary explicit:

- engineering reproducibility benchmark;
- not a trading-performance result;
- not a controlled hardware ranking unless environments are controlled.
