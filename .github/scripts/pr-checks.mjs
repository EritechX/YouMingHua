import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function scopesFor(paths) {
  let macos = false;
  let windows = false;
  for (const path of paths) {
    if (/\.md$/i.test(path) || path.startsWith("docs/")) {
      continue;
    // Workflow, tooling and runtime changes can affect both packages.
    } else if (/^(?:\.github|tools|runtime)\//.test(path)) {
      macos = windows = true;
    } else if (path.startsWith("macos/")) {
      macos = true;
    } else if (path.startsWith("windows/")) {
      windows = true;
    } else {
      // Unknown inputs (including root configuration) get full coverage.
      macos = windows = true;
    }
  }
  return { macos, windows };
}

export function assertChecks(needs) {
  if (needs.shared?.result !== "success") throw new Error("Shared checks did not pass");
  for (const platform of ["macos", "windows"]) {
    const required = needs.shared.outputs?.[platform];
    if (!["true", "false"].includes(required)) throw new Error(`Missing ${platform} scope`);
    const expected = required === "true" ? "success" : "skipped";
    if (needs[platform]?.result !== expected) {
      throw new Error(`${platform}: expected ${expected}, received ${needs[platform]?.result}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "scope") {
    const { PR_BASE_SHA: base, PR_HEAD_SHA: head, GITHUB_OUTPUT: output } = process.env;
    let scopes = { macos: true, windows: true };
    if (base || head) {
      if (![base, head].every(sha => /^[a-f0-9]{40}$/.test(sha ?? ""))) {
        throw new Error("Expected full PR base and head commit hashes");
      }
      const ancestor = execFileSync("git", ["merge-base", base, head], { encoding: "utf8" }).trim();
      const paths = execFileSync("git", ["diff", "--name-only", "--no-renames", "-z", ancestor, head], {
        encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
      }).split("\0").filter(Boolean);
      scopes = scopesFor(paths);
    }
    if (!output) throw new Error("GITHUB_OUTPUT is required");
    appendFileSync(output, `macos=${scopes.macos}\nwindows=${scopes.windows}\n`);
    console.log(JSON.stringify(scopes));
  } else if (process.argv[2] === "gate") {
    assertChecks(JSON.parse(process.env.CHECK_RESULTS ?? "{}"));
    console.log("All required PR checks passed");
  } else {
    throw new Error("Usage: node .github/scripts/pr-checks.mjs scope|gate");
  }
}
