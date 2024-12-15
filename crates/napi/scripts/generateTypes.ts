import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Lang } from "../index";
import { NodeTypeSchema } from "../types/node-types";
import {
  languageNodeTypesTagVersionOverrides,
  languagesCrateNames,
  languagesNodeTypesUrls,
} from "./constants";
import toml from "smol-toml";

const rootDir = path.resolve(__dirname, "..");

async function generateLangNodeTypes() {
  const languageCargoToml = await readFile(
    path.resolve(rootDir, "../language/Cargo.toml"),
    "utf8"
  );

  const parsedCargoToml = toml.parse(languageCargoToml) as {
    dependencies: Record<string, { version: string }>;
  };

  for (const [lang, urlTemplate] of Object.entries(languagesNodeTypesUrls)) {
    try {
      const treeSitterCrateName = languagesCrateNames[lang as Lang];
      const cargoVersion =
        parsedCargoToml.dependencies[treeSitterCrateName].version;
      const tag =
        languageNodeTypesTagVersionOverrides[lang as Lang] ??
        `v${cargoVersion}`;
      const url = urlTemplate.replace("{{TAG}}", tag);
      const nodeTypesResponse = await fetch(url);
      const nodeTypes = (await nodeTypesResponse.json()) as NodeTypeSchema[];

      const nodeTypeMap = Object.fromEntries(
        nodeTypes.map((node) => [node.type, node])
      );

      const fileContent =
        `// This file is auto-generated by ast-grep script` + '\n' +
        `type ${lang}Types = ${JSON.stringify(nodeTypeMap, null, 2)};` + '\n' +
        `export default ${lang}Types;`;
      await writeFile(
        path.join(rootDir, "types", `${lang}.d.ts`),
        fileContent,
      );
    } catch (e) {
      console.error(`Error while generating node types for ${lang}`);
      throw e
    }
  }
}

generateLangNodeTypes().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});