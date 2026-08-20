# Install And Verify

Install the plugin into a DSH profile:

```bash
dsh plugin --profile web add github:initial-d/dsh-plugin-mlquant-benchmark
```

Open a workspace that contains `initial-d/ml-quant-trading`, then ask the agent
to list its available tools. The expected tool names are:

- `mlquant_benchmark_v1_cpu`
- `mlquant_read_benchmark_json`
- `mlquant_validate_benchmark_json`
- `mlquant_draft_github_issue`

If the tools do not appear:

1. Confirm the plugin package was installed in the same profile you are using.
2. Restart the DSH profile.
3. Check that `package.json` includes `dsh.bundle.patch`.
4. Check that `cordis.patch.yml` inserts `dsh-plugin-mlquant-benchmark`.

The plugin assumes the target repository already has its Python dependencies
installed. In the benchmark workspace, run:

```bash
python -m pip install -e '.[dev]'
```
