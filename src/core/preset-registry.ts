import fs from "node:fs/promises";
import path from "node:path";
import { loadPreset } from "./preset-loader.js";
import type { PresetConfig } from "./preset-types.js";

export interface PresetEntry {
  name: string;
  dir: string;
  config: PresetConfig;
}

export class PresetRegistry {
  private presets = new Map<string, PresetEntry>();

  async discover(presetsDir: string): Promise<void> {
    const entries = await fs.readdir(presetsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const presetDir = path.join(presetsDir, entry.name);
      const yamlPath = path.join(presetDir, "preset.yaml");

      try {
        await fs.access(yamlPath);
      } catch {
        continue; // Skip directories without preset.yaml
      }

      const config = await loadPreset(presetDir);
      this.presets.set(config.name, { name: config.name, dir: presetDir, config });
    }
  }

  list(): PresetEntry[] {
    return Array.from(this.presets.values());
  }

  get(name: string): PresetEntry | undefined {
    return this.presets.get(name);
  }

  has(name: string): boolean {
    return this.presets.has(name);
  }

  search(tags: string[]): PresetEntry[] {
    const lowerTags = tags.map((t) => t.toLowerCase());
    return this.list().filter((entry) => {
      const presetTags = entry.config.tags?.map((t) => t.toLowerCase()) ?? [];
      return lowerTags.some((tag) => presetTags.includes(tag) || entry.name.toLowerCase().includes(tag));
    });
  }
}
