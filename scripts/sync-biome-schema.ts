import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(
	readFileSync(new URL("../node_modules/@biomejs/biome/package.json", import.meta.url), "utf-8"),
);
const version: string = pkg.version;

const configPath = new URL("../biome.json", import.meta.url).pathname;
const config = readFileSync(configPath, "utf-8");
const updated = config.replace(
	/https:\/\/biomejs\.dev\/schemas\/[^"]+\/schema\.json/,
	`https://biomejs.dev/schemas/${version}/schema.json`,
);

if (updated !== config) {
	writeFileSync(configPath, updated, "utf-8");
	console.log(`biome.json schema updated to ${version}`);
}
