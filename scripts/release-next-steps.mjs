import { readFileSync } from "node:fs";
import { join } from "node:path";

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const version = packageJson.version;

console.log("");
console.log(`Prepared ${packageJson.name}@${version}.`);
console.log("");
console.log("Next step:");
console.log("  git push origin master --follow-tags");
console.log("");
console.log(`That pushes the release commit and v${version} tag so GitHub can publish npm.`);
