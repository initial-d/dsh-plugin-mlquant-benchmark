import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { apply } from "../src/index.js";

const registered = new Map();
apply({
  tools: {
    register(tool) {
      registered.set(tool.name, tool);
      return () => registered.delete(tool.name);
    },
  },
});

const tmp = await mkdtemp(path.join(os.tmpdir(), "mlquant-dsh-issue-"));
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
      n_dates: 750,
      n_stocks: 1000,
      warmup: 3,
      repeat: 10,
      seed: 42,
      pytorch_threads: 1,
      pytorch_interop_threads: 1,
    },
    results: [{
      device: "cpu",
      case: "ts_corr(close,returns,20)",
      mean_seconds: 0.2,
      std_seconds: 0.08,
      peak_cuda_memory: "-",
    }],
  }, null, 2));

  const draft = await registered.get("mlquant_draft_github_issue").execute({
    repoPath: tmp,
    commit: "abc123",
    caveats: "Thermal state was not controlled.",
  }, { signal: new AbortController().signal });

  assert.deepEqual(draft.warnings, ["ts_corr(close,returns,20): std/mean 0.40"]);
  assert.match(draft.body, /Variance warnings/);
  assert.match(draft.body, /Thermal state was not controlled/);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
