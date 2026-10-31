#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PATTERN = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const ENGINE_FILES = [
  ["macos/VERSION", "plain"],
  ["windows/VERSION", "plain"],
  ["macos/package.json", "package"],
  ["macos/scripts/common-macos.sh", "shell"],
  ["macos/scripts/injector.mjs", "javascript"],
  ["windows/scripts/injector.mjs", "javascript"],
];
const DISTRIBUTION_FILES = ["macos/DISTRIBUTION_VERSION", "windows/DISTRIBUTION_VERSION"];

function packageVersion(source, label) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`${label}: invalid JSON (${error.message})`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label}: expected a package object with one version property`);
  }
  // JSON.parse accepts duplicate keys. Count root-level version keys so a
  // second declaration cannot silently replace the version used by CI.
  let depth = 0;
  let count = 0;
  for (let i = 0; i < source.length; i += 1) {
    const character = source[i];
    if (character === '"') {
      const start = i;
      for (i += 1; i < source.length; i += 1) {
        if (source[i] === "\\") i += 1;
        else if (source[i] === '"') break;
      }
      if (depth === 1 && JSON.parse(source.slice(start, i + 1)) === "version" &&
          /^\s*:/.test(source.slice(i + 1))) count += 1;
    } else if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") depth -= 1;
  }
  if (count !== 1) throw new Error(`${label}: expected exactly one root version property; found ${count}`);
  return parsed.version;
}

function declaredVersion(source, kind, label) {
  const lines = source.split(/\r?\n/);
  const candidate = kind === "shell"
    ? /^[ \t]*(?:export[ \t]+)?SKIN_VERSION[ \t]*=/
    : /^[ \t]*(?:export[ \t]+)?(?:const|let|var)[ \t]+SKIN_VERSION\b/;
  const declarations = lines.filter(line => candidate.test(line));
  if (declarations.length !== 1) {
    throw new Error(`${label}: expected exactly one SKIN_VERSION declaration; found ${declarations.length}`);
  }
  const pattern = kind === "shell"
    ? /^[ \t]*(?:export[ \t]+)?SKIN_VERSION=(['"])([^'"]+)\1[ \t]*(?:#.*)?$/
    : /^[ \t]*(?:export[ \t]+)?const[ \t]+SKIN_VERSION[ \t]*=[ \t]*(['"])([^'"]+)\1;[ \t]*(?:\/\/.*)?$/;
  const match = declarations[0].match(pattern);
  if (!match) throw new Error(`${label}: SKIN_VERSION must be a single quoted version literal`);
  return match[2];
}

async function readVersion(repoRoot, relative, kind = "plain") {
  let source;
  try {
    source = await fs.readFile(path.join(repoRoot, relative), "utf8");
  } catch (error) {
    throw new Error(`${relative}: cannot read version source (${error.code ?? error.message})`);
  }
  const value = kind === "package" ? packageVersion(source, relative)
    : kind === "plain" ? source.trim() : declaredVersion(source, kind, relative);
  if (typeof value !== "string" || !VERSION_PATTERN.test(value)) {
    throw new Error(`${relative}: expected a three-part numeric version without leading zeroes; got ${JSON.stringify(value)}`);
  }
  return { file: relative, version: value };
}

function assertConsistent(entries, label) {
  const version = entries[0].version;
  if (entries.some(entry => entry.version !== version)) {
    throw new Error(`${label} versions differ: ${entries.map(entry => `${entry.file}=${entry.version}`).join(", ")}`);
  }
  return version;
}

export async function checkVersions(repoRoot) {
  const engine = [];
  for (const [relative, kind] of ENGINE_FILES) engine.push(await readVersion(repoRoot, relative, kind));
  const distribution = [];
  for (const relative of DISTRIBUTION_FILES) distribution.push(await readVersion(repoRoot, relative));
  return {
    engineVersion: assertConsistent(engine, "Engine"),
    distributionVersion: assertConsistent(distribution, "Distribution"),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  checkVersions(repoRoot).then(({ engineVersion, distributionVersion }) => {
    console.log(`Version sources agree: engine ${engineVersion}; distribution ${distributionVersion}.`);
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
