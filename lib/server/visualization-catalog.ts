import fs from "node:fs";
import path from "node:path";

export const VISUALIZATION_CATALOG_ARTIFACT_PATH = "artifacts/visualization/visualization-catalog.json";

export type VisualizationCatalog = {
  schema: "ipbl.visualization-catalog.v1";
  phase: 13;
  status: "materialized";
  readOnly: true;
  sources: {
    graphify: {
      graphJson: string;
      graphJsonExists: boolean;
      graphReport: string;
      graphReportExists: boolean;
    };
    obsidian: {
      directory: string;
      directoryExists: boolean;
      fileCount: number;
    };
    codeReviewGraph: {
      database: string;
      databaseExists: boolean;
    };
  };
  targets: {
    graphistry: {
      status: "planned";
      exportPath: string;
    };
    gephi: {
      status: "planned";
      exportPath: string;
    };
    neo4j: {
      status: "optional";
      exportPath: string;
    };
  };
};

function resolveRepoPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

function countFiles(directory: string): number {
  if (!fs.existsSync(directory)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      total += countFiles(fullPath);
    } else if (entry.isFile()) {
      total += 1;
    }
  }
  return total;
}

export function buildVisualizationCatalog(): VisualizationCatalog {
  const graphJson = resolveRepoPath("graphify-out", "graph.json");
  const graphReport = resolveRepoPath("graphify-out", "GRAPH_REPORT.md");
  const obsidianDirectory = resolveRepoPath("graphify-out", "obsidian");
  const codeReviewDatabase = resolveRepoPath(".code-review-graph", "graph.db");

  return {
    schema: "ipbl.visualization-catalog.v1",
    phase: 13,
    status: "materialized",
    readOnly: true,
    sources: {
      graphify: {
        graphJson: "graphify-out/graph.json",
        graphJsonExists: fs.existsSync(graphJson),
        graphReport: "graphify-out/GRAPH_REPORT.md",
        graphReportExists: fs.existsSync(graphReport),
      },
      obsidian: {
        directory: "graphify-out/obsidian",
        directoryExists: fs.existsSync(obsidianDirectory),
        fileCount: countFiles(obsidianDirectory),
      },
      codeReviewGraph: {
        database: ".code-review-graph/graph.db",
        databaseExists: fs.existsSync(codeReviewDatabase),
      },
    },
    targets: {
      graphistry: {
        status: "planned",
        exportPath: "graphify-out/graphistry",
      },
      gephi: {
        status: "planned",
        exportPath: "graphify-out/gephi",
      },
      neo4j: {
        status: "optional",
        exportPath: "graphify-out/neo4j",
      },
    },
  };
}
