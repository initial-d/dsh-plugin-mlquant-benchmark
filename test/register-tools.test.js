import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { apply, inject, name } from "../src/index.js";

const registered = new Map();
const ctx = {
  tools: {
    register(tool) {
      registered.set(tool.name, tool);
      return () => registered.delete(tool.name);
    },
  },
};

assert.equal(name, "mlquant-benchmark");
assert.deepEqual(inject, ["tools"]);
apply(ctx);

assert.deepEqual([...registered.keys()].sort(), [
  "mlquant_benchmark_v1_cpu",
  "mlquant_draft_github_issue",
  "mlquant_read_benchmark_json",
  "mlquant_validate_benchmark_json",
]);

const tmp = await mkdtemp(path.join(os.tmpdir(), "mlquant-dsh-plugin-"));
try {
  await mkdir(path.join(tmp, "artifacts"));
  await writeFile(path.join(tmp, "artifacts", "benchmark-v1.json"), JSON.stringify({
    schema_version: 1,
    environment: {
      protocol: "v1",
      python: "3.14.4",
      platform: "TestOS",
      cpu: "TestCPU",
      pytorch: "2.11.0+cpu",
      cuda_available: false,
      logical_cpus: 8,
      n_dates: 750,
      n_stocks: 1000,
      window: 20,
      warmup: 3,
      repeat: 10,
      seed: 42,
      pytorch_threads: 1,
      pytorch_interop_threads: 1,
    },
    results: [
      { device: "cpu", case: "cs_rank(close)", mean_seconds: 0.02, std_seconds: 0.001, peak_cuda_memory: "-" },
      { device: "cpu", case: "ts_mean(close,20)", mean_seconds: 0.01, std_seconds: 0.001, peak_cuda_memory: "-" },
      { device: "cpu", case: "ts_rank(close,20)", mean_seconds: 0.03, std_seconds: 0.002, peak_cuda_memory: "-" },
      { device: "cpu", case: "ts_corr(close,returns,20)", mean_seconds: 0.04, std_seconds: 0.003, peak_cuda_memory: "-" },
      { device: "cpu", case: "ewma(close,0.05)", mean_seconds: 0.01, std_seconds: 0.001, peak_cuda_memory: "-" },
      { device: "cpu", case: "compute_legacy_set(6 factors)", mean_seconds: 0.07, std_seconds: 0.004, peak_cuda_memory: "-" },
    ],
  }, null, 2));

  const readTool = registered.get("mlquant_read_benchmark_json");
  const summary = await readTool.execute({ repoPath: tmp }, { signal: new AbortController().signal });
  assert.equal(summary.schemaVersion, 1);
  assert.match(summary.resultTable, /ts_mean/);

  const validateTool = registered.get("mlquant_validate_benchmark_json");
  const validation = await validateTool.execute({ repoPath: tmp }, { signal: new AbortController().signal });
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);

  const draftTool = registered.get("mlquant_draft_github_issue");
  const draft = await draftTool.execute({
    repoPath: tmp,
    commit: "abc123",
    harnessVersion: "dsh 0.1.0-rc.7",
  }, { signal: new AbortController().signal });
  assert.equal(draft.title, "[dsh-benchmark] protocol v1 CPU benchmark");
  assert.match(draft.body, /DeepSeek Harness benchmark report/);
  assert.match(draft.body, /abc123/);
  assert.doesNotMatch(draft.body, /API[_-]?KEY|Bearer\s+\S+/i);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
