import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../runtime/renderer-inject.js", import.meta.url), "utf8");
const themeGate = source.match(/^  const isYouMingHuaTheme .*;$/m)?.[0];
assert.ok(themeGate);
const follow = source.slice(source.indexOf("  const sendListeners ="), source.indexOf("  const cleanup ="));

function setup(id) {
  const document = new EventTarget();
  const navigation = new EventTarget();
  const composer = new EventTarget();
  const scroller = new EventTarget();
  const editor = { value: "draft" };
  const content = { isConnected: true, querySelectorAll: () => [], contains: () => true };
  let gap = 150;
  Object.assign(scroller, {
    clientHeight: 200, scrollHeight: 600, querySelector: () => content, closest: () => null,
  });
  Object.defineProperty(scroller, "scrollTop", {
    get() { return this.scrollHeight - this.clientHeight - gap; },
    set(v) { gap = Math.max(0, this.scrollHeight - this.clientHeight - v); },
  });
  let jumps = 0, jumpShown = false, frame, mutation, resize;
  const footer = {
    isConnected: true, closest: () => scroller,
    querySelector: () => jumpShown ? { click() { jumps++; gap = 0; } } : null,
  };
  Object.assign(composer, {
    isConnected: true, closest: (s) => s.includes("footer") ? footer : null,
    querySelector: (s) => s.includes("textarea") ? editor : {},
  });
  const target = { closest: (s) => s.includes("find-composer") ? composer : s.includes("inert") ? null : {} };
  class Observer {
    constructor(callback) { this.callback = callback; }
    observe(target) { (this.targets ??= []).push(target); this.active = true; }
    disconnect() { this.targets = []; this.active = false; }
  }
  const ctx = vm.createContext({
    document, window: { navigation }, THEME: { id },
    location: { href: "app://fixture/thread" },
    MutationObserver: class extends Observer { constructor(fn) { super(fn); mutation = this; } },
    ResizeObserver: class extends Observer { constructor(fn) { super(fn); resize = this; } },
    AbortController,
    setTimeout: () => 1, clearTimeout() {},
    requestAnimationFrame: (fn) => { frame = fn; return 1; },
    cancelAnimationFrame: () => { frame = null; },
  });
  vm.runInContext(themeGate + "\n" + follow + "globalThis.cleanup = () => { sendListeners.abort(); sendFollow?.abort(); };", ctx);
  const dispatch = (type, fields) => {
    const event = Object.assign(new Event(type), fields);
    Object.defineProperty(event, "target", { value: target });
    document.dispatchEvent(event);
  };
  const draw = () => { const fn = frame; frame = null; fn?.(); };
  return {
    editor, navigation, composer, scroller,
    enter: (fields) => dispatch("keydown", { key: "Enter", ...fields }),
    click: () => dispatch("click"),
    mutate: (addedNodes = []) => { if (mutation?.active) mutation.callback([{ addedNodes }]); draw(); },
    grow: () => { if (resize?.active) resize.callback(); draw(); },
    cleanup: ctx.cleanup,
    showJump: () => { jumpShown = true; },
    jumps: () => jumps,
    watching: () => Boolean(mutation?.active),
    resizedNodes: () => (resize?.targets || []).map((node) => node === content ? "content" : node === scroller ? "scroller" : "other"),
    gap: (value) => value === undefined ? gap : (gap = value),
  };
}

test("only bundled or legacy Camellia themes follow a confirmed native submission", () => {
  for (const id of ["preset-youminghua", "camellia-blush-auto", "other-theme"]) {
    const f = setup(id);
    for (const fields of [{ shiftKey: true }, { isComposing: true }]) {
      f.enter(fields);
      assert.equal(f.watching(), false);
    }
    f.enter();
    f.mutate();
    assert.equal(f.gap(), 150, "an unsubmitted draft must not move the conversation");
    assert.deepEqual(f.resizedNodes(), []);
    f.composer.dispatchEvent(new Event("beforeinput"));
    f.editor.value = "";
    f.mutate();
    assert.equal(f.gap(), 150, "editing after Enter must cancel the pending follow");
    f.editor.value = "new draft";
    f.click();
    f.editor.value = "";
    f.mutate();
    assert.equal(f.gap(), id === "other-theme" ? 150 : 0);
    assert.deepEqual(f.resizedNodes(), id === "other-theme" ? [] : ["content", "scroller"]);
    f.cleanup();
  }
});

test("stream growth follows, manual scrolling cancels, and the native jump takes over", () => {
  const f = setup("preset-youminghua");
  f.enter();
  f.mutate([{ matches: () => true }]);
  assert.equal(f.gap(), 0, "appending the user message confirms send");
  f.gap(50);
  f.grow();
  assert.equal(f.gap(), 0);
  f.scroller.dispatchEvent(Object.assign(new Event("wheel"), { deltaY: -1 }));
  assert.deepEqual(f.resizedNodes(), []);
  f.gap(120);
  f.grow();
  assert.equal(f.gap(), 120);

  f.enter();
  f.showJump();
  f.mutate([{ matches: () => true }]);
  assert.equal(f.jumps(), 1);
  f.gap(90);
  f.grow();
  assert.equal(f.gap(), 90, "the renderer must release follow once the native control runs");

  f.enter();
  f.navigation.dispatchEvent(new Event("navigate"));
  f.mutate([{ matches: () => true }]);
  assert.equal(f.jumps(), 1, "navigation cancels a pending send");
  f.cleanup();
  f.enter();
  assert.equal(f.watching(), false);
});
