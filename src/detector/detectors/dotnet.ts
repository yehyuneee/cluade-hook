import * as fs from "fs/promises";
import * as path from "path";
import type { Detector } from "../types.js";

export const dotnetDetector: Detector = {
  name: "dotnet",
  detect: async (projectDir: string) => {
    let entries: string[];
    try {
      entries = await fs.readdir(projectDir);
    } catch {
      return {};
    }

    const csprojFile = entries.find((e) => e.endsWith(".csproj"));
    const fsprojFile = entries.find((e) => e.endsWith(".fsproj"));
    const slnFile = entries.find((e) => e.endsWith(".sln"));

    if (!csprojFile && !fsprojFile && !slnFile) {
      return {};
    }

    const detectedFiles: string[] = [];
    const languages: string[] = [];

    if (csprojFile) {
      detectedFiles.push(csprojFile);
      languages.push("csharp");
    }
    if (fsprojFile) {
      detectedFiles.push(fsprojFile);
      languages.push("fsharp");
    }
    if (slnFile) {
      detectedFiles.push(slnFile);
    }

    return {
      ...(languages.length > 0 ? { languages } : {}),
      frameworks: ["dotnet"],
      packageManagers: ["nuget"],
      buildCommands: ["dotnet build"],
      testCommands: ["dotnet test"],
      lintCommands: ["dotnet format"],
      blockedPaths: ["bin/", "obj/"],
      detectedFiles,
    };
  },
};
