import * as fs from "fs/promises";
import * as path from "path";
import type { Detector } from "../types.js";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const javaDetector: Detector = {
  name: "java",
  detect: async (projectDir: string) => {
    const pomPath = path.join(projectDir, "pom.xml");
    const gradlePath = path.join(projectDir, "build.gradle");
    const gradleKtsPath = path.join(projectDir, "build.gradle.kts");

    const [hasPom, hasGradle, hasGradleKts] = await Promise.all([
      fileExists(pomPath),
      fileExists(gradlePath),
      fileExists(gradleKtsPath),
    ]);

    if (hasPom) {
      return {
        languages: ["java"],
        packageManagers: ["maven"],
        testCommands: ["mvn test"],
        buildCommands: ["mvn compile"],
        blockedPaths: ["target/"],
        detectedFiles: ["pom.xml"],
      };
    }

    if (hasGradleKts) {
      return {
        languages: ["java", "kotlin"],
        packageManagers: ["gradle"],
        testCommands: ["./gradlew test"],
        buildCommands: ["./gradlew build"],
        blockedPaths: ["build/", ".gradle/"],
        detectedFiles: ["build.gradle.kts"],
      };
    }

    if (hasGradle) {
      return {
        languages: ["java"],
        packageManagers: ["gradle"],
        testCommands: ["./gradlew test"],
        buildCommands: ["./gradlew build"],
        blockedPaths: ["build/", ".gradle/"],
        detectedFiles: ["build.gradle"],
      };
    }

    return {};
  },
};
