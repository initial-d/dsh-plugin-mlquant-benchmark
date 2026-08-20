import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const patch = await readFile("cordis.patch.yml", "utf8");

assert.equal(pkg.dsh?.bundle?.patch, "./cordis.patch.yml");
assert.match(patch, /id:\s+mlquant-benchmark/);
assert.match(patch, /name:\s+dsh-plugin-mlquant-benchmark/);
assert.equal(pkg.peerDependencies?.["@deepseek-ai/dsh-tools"], "^0.1.0-rc.7");
