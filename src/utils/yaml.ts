import yaml from "js-yaml";
import fs from "node:fs/promises";

export async function parseYamlFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return yaml.load(content) as T;
}

export function parseYaml<T>(content: string): T {
  return yaml.load(content) as T;
}

export function dumpYaml(data: unknown): string {
  return yaml.dump(data, { lineWidth: 120, noRefs: true });
}
