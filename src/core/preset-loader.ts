import path from "node:path";
import { parseYamlFile } from "../utils/yaml.js";
import { PresetConfigSchema, type PresetConfig } from "./preset-types.js";

export async function loadPreset(presetDir: string): Promise<PresetConfig> {
  const yamlPath = path.join(presetDir, "preset.yaml");
  const raw = await parseYamlFile<unknown>(yamlPath);
  const result = PresetConfigSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid preset at ${yamlPath}:\n${errors}`);
  }

  return result.data;
}

export async function loadPresetTemplate(presetDir: string, templatePath: string): Promise<string> {
  const fs = await import("node:fs/promises");
  const fullPath = path.join(presetDir, "templates", templatePath);
  return fs.readFile(fullPath, "utf-8");
}
