import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";

// Find all test files
function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

// Run tests for each file individually
function runTests() {
  const testFiles = findTestFiles(path.join(__dirname));
  console.log(`Found ${testFiles.length} test files`);

  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    console.log(`Running tests in ${path.relative(__dirname, file)}`);

    const result = spawnSync("npx", ["ts-node", file], {
      stdio: "inherit",
      encoding: "utf-8",
    });

    if (result.status === 0) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`Tests completed: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
