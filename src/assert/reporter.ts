import chalk from "chalk";
import type { AssertResult } from "../types.js";

export type ReportFormat = "pretty" | "json";

export function reportAssert(result: AssertResult, format: ReportFormat): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const totalTests = result.results.length;
  const passedTests = result.results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log();
  console.log(chalk.bold(`Suite: ${result.suiteName}`));
  console.log();

  for (const test of result.results) {
    const badge = test.passed
      ? chalk.green.bold("  PASS ")
      : chalk.red.bold("  FAIL ");
    console.log(`${badge} ${test.test_id}`);

    for (const f of test.findings) {
      const icon =
        f.severity === "error"
          ? chalk.red("✖")
          : chalk.yellow("⚠");
      console.log(`    ${icon}  ${f.message}  ${chalk.dim(`(${f.rule})`)}`);
    }
  }

  console.log();
  if (result.passed) {
    console.log(
      chalk.green.bold(`  PASSED  ${passedTests}/${totalTests} tests`),
    );
  } else {
    console.log(
      chalk.red.bold(
        `  FAILED  ${failedTests}/${totalTests} tests failed`,
      ),
    );
  }
  console.log(`  Suite: ${result.suitePath}`);
  console.log();
}
