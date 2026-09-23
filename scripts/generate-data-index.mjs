import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const dataDir = path.join(root, "public", "data");
const output = path.join(dataDir, "index.json");

const files = fs
  .readdirSync(dataDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name !== "index.json")
  .sort();

fs.writeFileSync(output, JSON.stringify(files, null, 2) + "\n");

console.log(`Generated ${output}`);
console.log(`Found ${files.length} files`);
