import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
const delegate = await fs.readFile(new URL("../menubar-app/Sources/CodexDreamSkinMenuBar/AppDelegate.swift", import.meta.url), "utf8");
const script = await fs.readFile(new URL("../scripts/check-update-macos.sh", import.meta.url), "utf8");
test("custom app does not schedule automatic upstream updates", () => {
  const launch = delegate.slice(delegate.indexOf("func applicationDidFinishLaunching"), delegate.indexOf("func applicationWillTerminate"));
  assert.doesNotMatch(launch, /performBackgroundUpdateCheck|requestAuthorization|24 \* 60 \* 60/);
});
test("manual update action explains the unconfigured custom release channel", () => {
  const action = delegate.slice(delegate.indexOf("@objc private func checkForUpdates"), delegate.indexOf("private func postUpdateAvailableNotification"));
  assert.match(action, /更新渠道尚未配置/);
  assert.doesNotMatch(action, /ScriptRunner\.run|NSWorkspace/);
  assert.match(script, /VERSION=.*ROOT\/DISTRIBUTION_VERSION/);
});
test("custom deployment tracks the distribution revision independently of engine version", () => {
  const check = delegate.slice(delegate.indexOf("private func engineNeedsInstall()"), delegate.indexOf("private func version(at"));
  assert.match(check, /DISTRIBUTION_VERSION/);
  assert.match(check, /bundledBuild == installedBuild/);
});
