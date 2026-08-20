import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const readme = await readFile("README.md", "utf8");
const patch = await readFile("cordis.patch.yml", "utf8");

assert.equal(pkg.name, "dsh-plugin-mlquant-benchmark");
assert.equal(pkg.dsh?.bundle?.patch, "./cordis.patch.yml");
assert.ok(pkg.keywords.includes("dsh-plugin"));
assert.ok(pkg.keywords.includes("deepseek-harness"));
assert.match(patch, /name:\s+dsh-plugin-mlquant-benchmark/);

for (const toolName of [
  "mlquant_benchmark_v1_cpu",
  "mlquant_read_benchmark_json",
  "mlquant_draft_github_issue",
]) {
  assert.match(readme, new RegExp(toolName));
}

assert.match(readme, /not a trading-performance claim/i);

console.log("readiness checks passed");
