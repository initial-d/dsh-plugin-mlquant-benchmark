# Example Run

This is the intended shape of a DSH-assisted benchmark run against
`initial-d/ml-quant-trading`.

## Prompt

```text
Read AGENTS.md, docs/benchmarking.md, docs/deepseek_harness_recipe.md, and docs/reality_check.md.

Use the mlquant benchmark tools to run the protocol v1 CPU benchmark, validate
and read the generated JSON artifact, and draft a DeepSeek Harness benchmark
report. Keep the result as an engineering reproducibility benchmark, not a
trading-performance claim.
```

## Tool Sequence

1. `mlquant_benchmark_v1_cpu`
2. `mlquant_validate_benchmark_json`
3. `mlquant_read_benchmark_json`
4. `mlquant_draft_github_issue`

The validation step matters. It catches partial reports, missing environment
fields, wrong repeat counts, missing benchmark cases, and high-variance rows
before a report is submitted.

## Public Submission

Use the main repository template:

```text
https://github.com/initial-d/ml-quant-trading/issues/new?template=deepseek_harness_benchmark.yml
```

Seed report:

```text
https://github.com/initial-d/ml-quant-trading/issues/61
```

## Interpretation Boundary

The final report should say what happened, not what the numbers supposedly
prove:

- engineering throughput benchmark;
- exact command and commit;
- environment and thread settings;
- JSON artifact path;
- variance warnings and caveats;
- no trading-performance claim.
