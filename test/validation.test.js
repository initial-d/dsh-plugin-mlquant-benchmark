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

const tmp = await mkdtemp(path.join(os.tmpdir(), "mlquant-dsh-validation-"));
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
      repeat: 5,
      seed: 42,
      pytorch_threads: 1,
      pytorch_interop_threads: 1,
    },
    results: [{
      device: "cpu",
      case: "ts_mean(close,20)",
      mean_seconds: 0.01,
      std_seconds: 0.001,
      peak_cuda_memory: "-",
    }],
  }, null, 2));

  const validation = await registered.get("mlquant_validate_benchmark_json").execute(
    { repoPath: tmp },
    { signal: new AbortController().signal },
  );

  assert.equal(validation.valid, false);
  assert.match(validation.summary, /validation error/);
  assert.ok(validation.errors.some((line) => line.includes("environment.repeat")));
  assert.ok(validation.errors.some((line) => line.includes("results must contain 6 rows")));
  assert.ok(validation.errors.some((line) => line.includes("cs_rank(close)")));
} finally {
  await rm(tmp, { recursive: true, force: true });
}
