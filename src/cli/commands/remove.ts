import fs from "node:fs/promises";
import path from "node:path";
import { PresetRegistry } from "../../core/preset-registry.js";
import { mergePresets } from "../../core/config-merger.js";
import { generate } from "../../core/generator.js";
import { readHarnessState, writeHarnessState, loadAndMergePresets } from "./init.js";

export interface RemoveOptions {
  projectDir?: string;
  presetsDir?: string;
}

function getDefaultPresetsDir(): string {
  return path.resolve(import.meta.dirname, "../../../presets");
}

export async function removeCommand(
  presetName: string,
  options: RemoveOptions = {},
): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();
  const presetsDir = options.presetsDir ?? getDefaultPresetsDir();

  // Read existing state (throws if not initialized)
  const state = await readHarnessState(projectDir).catch(() => {
    throw new Error(
      "Harness not initialized. Run `oh-my-harness init` first.",
    );
  });

  // Verify preset is active
  if (!state.presets.includes(presetName)) {
    throw new Error(
      `Preset "${presetName}" is not active. Active presets: ${state.presets.join(", ")}`,
    );
  }

  // Remove preset
  const updatedPresets = state.presets.filter((p) => p !== presetName);

  // Discover presets
  const registry = new PresetRegistry();
  await registry.discover(presetsDir);

  // Clean up hook scripts that belong only to the removed preset
  await cleanupRemovedHooks(projectDir, presetName, updatedPresets, registry, presetsDir);

  if (updatedPresets.length === 0) {
    // Nothing left — just save empty state
    await writeHarnessState(projectDir, {
      presets: updatedPresets,
      generatedAt: new Date().toISOString(),
    });
    console.log(`\noh-my-harness: removed preset "${presetName}". No presets remaining.`);
    return;
  }

  // Load, resolve, merge remaining presets
  const presetConfigs = await loadAndMergePresets(updatedPresets, registry);
  const config = mergePresets(presetConfigs);

  // Regenerate
  const result = await generate({ projectDir, config });

  // Save updated state
  await writeHarnessState(projectDir, {
    presets: updatedPresets,
    generatedAt: new Date().toISOString(),
  });

  console.log(`\noh-my-harness: removed preset "${presetName}"`);
  console.log(`Active presets: ${updatedPresets.join(", ")}`);
  console.log("Regenerated files:");
  for (const f of result.files) {
    console.log(`  ${f}`);
  }
}

async function cleanupRemovedHooks(
  projectDir: string,
  removedPreset: string,
  remainingPresets: string[],
  registry: PresetRegistry,
  _presetsDir: string,
): Promise<void> {
  const hooksDir = path.join(projectDir, ".claude", "hooks");

  // Get hook ids from the removed preset
  const removedEntry = registry.get(removedPreset);
  if (!removedEntry) return;

  const removedHookIds = new Set<string>([
    ...(removedEntry.config.hooks?.preToolUse?.map((h) => h.id) ?? []),
    ...(removedEntry.config.hooks?.postToolUse?.map((h) => h.id) ?? []),
  ]);

  if (removedHookIds.size === 0) return;

  // Get hook ids still active from remaining presets
  const remainingHookIds = new Set<string>();
  for (const name of remainingPresets) {
    const entry = registry.get(name);
    if (!entry) continue;
    for (const h of entry.config.hooks?.preToolUse ?? []) remainingHookIds.add(h.id);
    for (const h of entry.config.hooks?.postToolUse ?? []) remainingHookIds.add(h.id);
  }

  // Delete scripts that are no longer needed
  for (const hookId of removedHookIds) {
    if (!remainingHookIds.has(hookId)) {
      const scriptPath = path.join(hooksDir, `${hookId}.sh`);
      try {
        await fs.unlink(scriptPath);
      } catch {
        // File may not exist — ignore
      }
    }
  }
}
