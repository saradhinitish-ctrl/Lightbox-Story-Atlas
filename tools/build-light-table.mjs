// Builds light-table-surfaces.css.
//
// The older design layers are already light, so their neutral colours (paper,
// ink, rules) are kept. This script only re-inks their *chromatic* colours:
// the acid-lime signal and its washes become grease-pencil red, and the old
// lavender/plum family becomes film-edge orange. Each generated rule keeps the
// original selector (and so its specificity) and its !important flag, with a
// zero-specificity guard so it can never reach inside the Story Cylinder or
// the screenplay page. The original stylesheets are not modified.
//
// Run from the repository root:
//   (cd export-tools && npm install) && node tools/build-light-table.mjs
import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'export-tools/package.json'));
const postcss = require('postcss');

// The design layers, in the order index.html loads them.
const SOURCES = [
  'styles.css', 'mobile-refinements.css', 'screenplay-polish.css', 'install-app.css',
  'studio-design.css', 'first-page.css', 'material-design.css',
];
const SKIP_SELECTOR = /lb-cylinder|lb-opener|script-page-preview|script-page-excerpt|\.pdf-|print/;
// styles.css also carries unused alternative palettes; only the live studio rules are re-inked.
const STYLES_SCOPE = /atlas-shell|welcome|vl-|modal|dialog|toast|dropdown|menu/;
const STYLES_SKIP = /\.dark\b|data-palette=(?!paper)|prefers-color-scheme/;

const GUARD = ':not(:where(.lb-cylinder-v9 *, .script-page-zoom *, .script-page-preview *, .script-page-excerpt *))';
const PSEUDO_ELEMENT = /(::?(?:before|after|placeholder|selection|marker|backdrop|first-line|first-letter|file-selector-button|-webkit-[a-z-]+|-moz-[a-z-]+))+$/;
function guard(selector) {
  const s = selector.trim();
  if (/^(:root|html|body)$/.test(s)) return s;
  const m = s.match(PSEUDO_ELEMENT);
  return m ? s.slice(0, m.index) + GUARD + m[0] : s + GUARD;
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
function parse(text) {
  if (text[0] === '#') {
    let h = text.slice(1);
    if (h.length <= 4) h = [...h].map(c => c + c).join('');
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return {r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1};
  }
  const v = text.replace(/rgba?\(|\)/g, '').split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  return {r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1};
}
function describe({r, g, b, a}) {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, d = mx - mn;
  const light = (mx + mn) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1));
  let hue = 0;
  if (d) {
    const R = r / 255, G = g / 255, B = b / 255;
    hue = mx === R ? 60 * (((G - B) / d) % 6) : mx === G ? 60 * ((B - R) / d + 2) : 60 * ((R - G) / d + 4);
    if (hue < 0) hue += 360;
  }
  let family = 'neutral';
  if (sat > .2 && d > .045) {
    if (hue >= 52 && hue < 160) family = 'lime';
    else if (hue >= 230 && hue < 335) family = 'violet';
  }
  return {a, family, light};
}

const INK = {
  lime: {solid: 'var(--lt-marker)', wash: 'var(--lt-marker-wash)', line: 'var(--lt-marker-line)', text: 'var(--lt-marker-ink)', glow: 'rgba(212,48,31,.22)'},
  violet: {solid: 'var(--lt-edge)', wash: 'var(--lt-edge-wash)', line: 'var(--lt-edge-line)', text: 'var(--lt-edge-ink)', glow: 'rgba(226,105,43,.22)'},
};
function mapColor(text, role, ctx) {
  const c = describe(parse(text));
  if (c.family === 'neutral') return text;
  const ink = INK[c.family];
  const pale = c.light >= .78;
  if (role === 'shadow') return pale ? 'rgba(212,48,31,.08)' : ink.glow;
  if (role === 'bg') return pale ? ink.wash : ink.solid;
  if (role === 'border') return pale ? ink.line : ink.solid;
  return ink.text;
}

const roleOf = prop =>
  /^(background|background-color|background-image)$/.test(prop) ? 'bg' :
  /^(border|border-(top|right|bottom|left|block|inline)(-(start|end))?(-color)?|border-color|outline|outline-color|column-rule(-color)?)$/.test(prop) ? 'border' :
  /^(color|fill|stroke|caret-color|text-decoration-color|text-decoration|-webkit-text-fill-color|accent-color)$/.test(prop) ? 'text' :
  /^(box-shadow|text-shadow|filter)$/.test(prop) ? 'shadow' : null;

const out = [];
let rulesOut = 0, declsOut = 0;
for (const file of SOURCES) {
  const ast = postcss.parse(await readFile(resolve(root, file), 'utf8'), {from: file});
  const generated = postcss.root();
  ast.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    if (SKIP_SELECTOR.test(rule.selector)) return;
    if (file === 'styles.css' && (!STYLES_SCOPE.test(rule.selector) || STYLES_SKIP.test(rule.selector))) return;
    // Text that sat on a solid lime surface now sits on red: make it white.
    const solidAccent = rule.nodes.some(d => d.type === 'decl' && roleOf(d.prop) === 'bg' &&
      (d.value.match(COLOR) || []).some(t => { const c = describe(parse(t)); return c.family === 'lime' && c.light < .78; }));
    const decls = [];
    rule.each(d => {
      if (d.type !== 'decl') return;
      const role = roleOf(d.prop);
      const colours = role ? d.value.match(COLOR) || [] : [];
      const chromatic = colours.some(t => describe(parse(t)).family !== 'neutral');
      if (role === 'text' && solidAccent && !/var\(/.test(d.value)) {
        decls.push(postcss.decl({prop: d.prop, value: d.value.replace(COLOR, '#fff'), important: d.important}));
        return;
      }
      if (!chromatic) return;
      decls.push(postcss.decl({prop: d.prop, value: d.value.replace(COLOR, t => mapColor(t, role)), important: d.important}));
    });
    if (!decls.length) return;
    const clone = postcss.rule({selector: rule.selectors.map(guard).join(',\n')});
    decls.forEach(d => clone.append(d));
    declsOut += decls.length; rulesOut++;
    let node = clone, p = rule.parent;
    while (p && p.type === 'atrule') {
      const at = postcss.atRule({name: p.name, params: p.params});
      at.append(node); node = at; p = p.parent;
    }
    generated.append(node);
  });
  out.push(`/* ---- from ${file} ---- */\n` + generated.toString());
}
const header = `/* GENERATED by tools/build-light-table.mjs — do not edit by hand.
   Light Table re-ink of the older layers' chromatic colours (${rulesOut} rules,
   ${declsOut} declarations). Hand-made design lives in light-table.css. */\n`;
await writeFile(resolve(root, 'light-table-surfaces.css'), header + out.join('\n') + '\n');
console.log(`light-table-surfaces.css: ${rulesOut} rules, ${declsOut} declarations`);
