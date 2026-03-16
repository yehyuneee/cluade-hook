import { Command } from "commander";

export function createCli(): Command {
  const program = new Command();

  program
    .name("oh-my-harness")
    .description("AI code agent harness configuration tool")
    .version("0.1.0");

  program
    .command("init [description...]")
    .description("Initialize harness (NL description or --preset)")
    .option("-p, --preset <presets...>", "Use specific presets instead of NL")
    .option("-y, --yes", "Skip confirmation prompts")
    .action(async (description: string[], options) => {
      const { initCommand } = await import("./commands/init.js");
      await initCommand(description, options);
    });

  program
    .command("add <preset>")
    .description("Add a preset to existing harness")
    .action(async (preset: string) => {
      const { addCommand } = await import("./commands/add.js");
      await addCommand(preset);
    });

  program
    .command("remove <preset>")
    .description("Remove a preset from harness")
    .action(async (preset: string) => {
      const { removeCommand } = await import("./commands/remove.js");
      await removeCommand(preset);
    });

  program
    .command("doctor")
    .description("Validate harness configuration health")
    .action(async () => {
      const { doctorCommand } = await import("./commands/doctor.js");
      await doctorCommand();
    });

  return program;
}
