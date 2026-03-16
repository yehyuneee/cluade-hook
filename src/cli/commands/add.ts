import path from "node:path";
import { PresetRegistry } from "../../core/preset-registry.js";
import { mergePresets } from "../../core/config-merger.js";
import { generate } from "../../core/generator.js";
import { readHarnessState, writeHarnessState, loadAndMergePresets } from "./init.js";

export interface AddOptions {
  projectDir?: string;
  presetsDir?: string;
}

function getDefaultPresetsDir(): string {
  return path.resolve(import.meta.dirname, "../../../presets");
}

export async function addCommand(presetName: string, options: AddOptions = {}): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();
  const presetsDir = options.presetsDir ?? getDefaultPresetsDir();

  // Read existing state (throws if not initialized)
  const state = await readHarnessState(projectDir).catch(() => {
    throw new Error(
      "Harness not initialized. Run `oh-my-harness init` first.",
    );
  });

  // Discover presets
  const registry = new PresetRegistry();
  await registry.discover(presetsDir);

  // Verify preset exists
  if (!registry.has(presetName)) {
    throw new Error(`Preset not found: ${presetName}`);
  }

  // Add preset (deduplicate)
  const updatedPresets = Array.from(new Set([...state.presets, presetName]));

  // Load, resolve, merge
  const presetConfigs = await loadAndMergePresets(updatedPresets, registry);
  const config = mergePresets(presetConfigs);

  // Regenerate
  const result = await generate({ projectDir, config });

  // Save updated state
  await writeHarnessState(projectDir, {
    presets: updatedPresets,
    generatedAt: new Date().toISOString(),
  });

  console.log(`\noh-my-harness: added preset "${presetName}"`);
  console.log(`Active presets: ${updatedPresets.join(", ")}`);
  console.log("Regenerated files:");
  for (const f of result.files) {
    console.log(`  ${f}`);
  }
}
