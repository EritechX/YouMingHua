import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
for (const platform of ["macos", "windows"]) {
const source = fs.readFileSync(new URL(`../${platform}/assets/renderer-inject.js`, import.meta.url), 'utf8');
const theme = JSON.parse(fs.readFileSync(new URL(`../${platform}/presets/preset-youminghua/theme.json`, import.meta.url), 'utf8'));
const helper = source.slice(source.indexOf('  const parseRgb ='), source.indexOf('  const detectShellAppearance ='));
const detect = source.slice(source.indexOf('  const detectShellAppearance ='), source.indexOf('  const makeAdaptivePalette ='));
const resolve = source.slice(source.indexOf('  const resolvedShell ='), source.indexOf('  // Paired palettes'));
const apply = source.slice(source.indexOf('  const YOUMINGHUA_PALETTES ='), source.indexOf('  const applyArtMetadata ='));
assert(apply.includes('const applyTheme'));
const values = new Map();
let nativeMode = 'light';
const root = {
  getAttribute: name => name === 'data-theme' ? nativeMode : null,
  classList: { contains: () => false },
  style: { removeProperty: name => values.delete(name) },
  removeAttribute() {},
};
const context = vm.createContext({
  THEME: { ...theme, explicitColorKeys: [], colorMode: 'adaptive' },
  document: { documentElement: root },
  window: { matchMedia: () => ({ matches: nativeMode === 'dark' }) },
  artAnalysis: null,
  makeAdaptivePalette: () => ({ background: '#111111', text: '#eeeeee', panel: '#222222' }),
  setStyleProperty: (_, key, value) => values.set(key, value),
  setAttribute() {},
  cssString: value => JSON.stringify(value),
  root,
});
vm.runInContext(helper + detect + resolve + apply + '\nglobalThis.refresh = () => applyTheme(root, resolvedShell());', context);
for (const [mode, bg, text] of [
  ['light', '#F7EEF2', '#443B46'],
  ['dark', '#24252C', '#E5E1E7'],
  ['light', '#F7EEF2', '#443B46'],
]) {
  nativeMode = mode;
  context.refresh();
  assert.equal(values.get('--ds-bg'), bg);
  assert.equal(values.get('--ds-text'), text);
  assert.equal(values.get('--ds-on-accent'), 'rgb(0 0 0)');
  assert.equal(Number(values.get('--ds-upload-panel-alpha')), mode === 'dark' ? 230 / 255 : .7);
  console.log(`${mode}: palette, text, button icon and panel alpha verified`);
}
context.THEME = { id: 'unrelated', appearance: 'dark', colors: { background: '#123456' }, colorMode: 'explicit' };
context.refresh();
assert.equal(values.get('--ds-bg'), '#123456');
console.log('Unrelated theme retains its own palette.');
assert(source.includes('mediaQuery.addEventListener("change", mediaHandler)'));
assert(source.includes('attributeFilter: ["class", "data-theme", "data-appearance", "data-color-mode"]'));
console.log('Existing appearance-change listeners retained.');

}
