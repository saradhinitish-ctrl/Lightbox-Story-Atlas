// Builds projection-room-surfaces.css: a dark remap of every hard-coded colour
// in the light design layers, keeping each rule's selector (and so its
// specificity) and its !important flag. The original stylesheets are not
// modified; the generated file is loaded after them and before
// projection-room.css, whose hand-written rules have the final say.
//
// Run from the repository root:
//   (cd export-tools && npm install) && node tools/build-projection-room.mjs
import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'export-tools/package.json'));
const postcss = require('postcss');

// The light layers, in the order index.html loads them.
const SOURCES = [
  'styles.css', 'mobile-refinements.css', 'screenplay-polish.css', 'install-app.css',
  'studio-design.css', 'first-page.css', 'material-design.css',
];
// Never touched: the Story Cylinder, the opening titles (styled by hand), and the
// printed-script paper, which stays a lit page in the dark room.
const SKIP_SELECTOR = /lb-cylinder|lb-opener|script-page-preview|script-page-excerpt|screenplay-page-sheet|\.pdf-|print/;
// In styles.css only the light "paper studio" rules are remapped; its own
// dark palettes and unscoped base utilities are left to the variables.
const STYLES_SCOPE = /atlas-shell|welcome|vl-|modal|dialog|toast|dropdown|menu/;
const STYLES_SKIP = /\.dark\b|data-palette=(?!paper)|prefers-color-scheme/;

const T = {
  canvas: 'var(--pr-canvas)', panel: 'var(--pr-panel)', raised: 'var(--pr-raised)', hover: 'var(--pr-hover)',
  well: 'var(--pr-well)', line: 'var(--pr-line)', lineStrong: 'var(--pr-line-strong)',
  ink: 'var(--pr-ink)', secondary: 'var(--pr-secondary)', muted: 'var(--pr-muted)',
  amber: 'var(--pr-amber)', amberText: 'var(--pr-amber-text)', amberWash: 'var(--pr-amber-wash)',
  amberLine: 'var(--pr-amber-line)', onAmber: 'var(--pr-on-amber)', rose: 'var(--pr-rose)',
  roseWash: 'rgba(201,139,123,.1)', danger: 'var(--pr-danger)', dangerWash: 'rgba(238,116,102,.1)',
  success: 'var(--pr-success)', progress: 'var(--pr-progress)',
};

const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;

function parse(text) {
  if (text === 'white') return {r: 255, g: 255, b: 255, a: 1};
  if (text === 'black') return {r: 0, g: 0, b: 0, a: 1};
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
  const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; };
  const L = .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
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
  if (sat > .28 && d > .08) {
    if (hue >= 52 && hue < 150) family = 'lime';
    else if (hue >= 230 && hue < 335) family = 'violet';
    else if (hue >= 335 || hue < 16) family = 'red';
    else if (hue >= 16 && hue < 52) family = 'warm';
    else family = 'cool';
  }
  return {L, a, family, light};
}

function mapColor(text, role, ctx) {
  const c = describe(parse(text));
  if (role === 'shadow') {
    if (c.L > .6) return `rgba(255,240,215,${Math.min(.06, c.a * .08).toFixed(3)})`;
    if (c.family === 'lime') return 'rgba(242,163,58,.35)';
    if (c.family === 'violet') return 'rgba(0,0,0,.45)';
    return `rgba(0,0,0,${Math.min(.75, Math.max(.25, c.a * 2)).toFixed(2)})`;
  }
  if (c.family === 'lime') {
    // Pale lime tints were selection washes; saturated lime was the signal.
    if (role === 'bg') return c.light >= .78 ? T.amberWash : T.amber;
    if (role === 'border') return c.light >= .78 ? T.amberLine : T.amber;
    return T.amberText;
  }
  if (c.family === 'violet') {
    if (role === 'bg') return c.L > .5 ? T.roseWash : T.rose;
    if (role === 'border') return 'rgba(201,139,123,.4)';
    return c.L > .4 ? T.rose : 'var(--pr-progress)';
  }
  if (c.family === 'red') {
    if (role === 'bg') return c.L > .5 ? T.dangerWash : T.danger;
    if (role === 'border') return 'rgba(238,116,102,.45)';
    return T.danger;
  }
  if (c.family === 'warm' && c.L < .55 && c.L > .04) {
    if (role === 'bg') return T.amberWash;
    if (role === 'border') return T.amberLine;
    return T.amberText;
  }
  // Neutrals: invert the depth order. Light theme: the farther back, the
  // lighter. Projection Room: the farther back, the darker.
  if (role === 'bg') {
    if (c.a < .9) return c.L > .5 ? `rgba(20,18,15,${Math.max(c.a, .55).toFixed(2)})` : `rgba(6,5,4,${Math.max(c.a, .6).toFixed(2)})`;
    if (c.L >= .97) return T.canvas;
    if (c.L >= .90) return T.panel;
    if (c.L >= .74) return T.raised;
    if (c.L >= .5) return T.hover;
    if (c.L >= .2) return T.lineStrong;
    return T.raised;
  }
  if (role === 'border') {
    if (c.a < .5) return T.line;
    if (c.L >= .55) return T.line;
    return T.lineStrong;
  }
  // text
  if (ctx.onAccent) return T.onAmber;
  if (c.L < .05) return T.ink;
  if (c.L < .2) return T.secondary;
  if (c.L < .6) return T.muted;
  return T.ink;
}

const BG = /^(background|background-color|background-image)$/;
const BORDER = /^(border|border-(top|right|bottom|left|block|inline)(-(start|end))?(-color)?|border-color|outline|outline-color|column-rule(-color)?)$/;
const TEXT = /^(color|fill|stroke|caret-color|text-decoration-color|text-decoration|-webkit-text-fill-color|text-emphasis-color|accent-color)$/;
const SHADOW = /^(box-shadow|text-shadow|filter)$/;

function roleOf(prop) {
  if (BG.test(prop) || prop === 'background') return 'bg';
  if (BORDER.test(prop)) return 'border';
  if (TEXT.test(prop)) return 'text';
  if (SHADOW.test(prop)) return 'shadow';
  return null;
}

// ...nor inside the screenplay page, which stays paper.
const GUARD = ':not(:where(.lb-cylinder-v9 *, .script-page-zoom *, .script-page-preview *, .script-page-excerpt *))';
const PSEUDO_ELEMENT = /(::?(?:before|after|placeholder|selection|marker|backdrop|first-line|first-letter|file-selector-button|-webkit-[a-z-]+|-moz-[a-z-]+))+$/;
function guard(selector) {
  const s = selector.trim();
  if (/^(:root|html|body)$/.test(s)) return s;
  const m = s.match(PSEUDO_ELEMENT);
  return m ? s.slice(0, m.index) + GUARD + m[0] : s + GUARD;
}

const out = [];
let rulesOut = 0, declsOut = 0;
for (const file of SOURCES) {
  const css = await readFile(resolve(root, file), 'utf8');
  const ast = postcss.parse(css, {from: file});
  const generated = postcss.root();
  ast.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    if (SKIP_SELECTOR.test(rule.selector)) return;
    if (file === 'styles.css' && (!STYLES_SCOPE.test(rule.selector) || STYLES_SKIP.test(rule.selector))) return;
    // Does this rule paint an accent surface? Then its text sits on amber.
    const accentBg = rule.nodes.some(d => d.type === 'decl' && roleOf(d.prop) === 'bg' &&
      (d.value.match(COLOR) || []).some(t => { const c = describe(parse(t)); return c.family === 'lime' && c.light < .78 && c.L > .3; }));
    const decls = [];
    rule.each(d => {
      if (d.type !== 'decl') return;
      const role = roleOf(d.prop);
      if (!role || !COLOR.test(d.value)) { COLOR.lastIndex = 0; return; }
      COLOR.lastIndex = 0;
      if (/^var\(/.test(d.value.trim())) return;
      let value = d.value.replace(COLOR, t => mapColor(t, role, {onAccent: accentBg}));
      if (role === 'bg' && /url\(|var\(--lb-(fibre|crease)\)/.test(value)) {
        // Paper textures do not belong in the dark room.
        const colours = value.match(/var\(--pr-[a-z-]+\)|rgba\([^)]*\)/g) || [];
        decls.push(postcss.decl({prop: 'background-image', value: 'none', important: d.important}));
        if (d.prop !== 'background-image' && colours.length) decls.push(postcss.decl({prop: 'background-color', value: colours[colours.length - 1], important: d.important}));
        return;
      }
      decls.push(postcss.decl({prop: d.prop, value, important: d.important}));
    });
    if (!decls.length) return;
    // Zero-specificity guard: nothing generated here may reach inside the
    // Story Cylinder (its cards are clones of the Atlas cards)...
    const selectors = rule.selectors.map(guard);
    const clone = postcss.rule({selector: selectors.join(',\n')});
    decls.forEach(d => clone.append(d));
    declsOut += decls.length; rulesOut++;
    // Re-create the @media/@supports wrappers.
    let node = clone, p = rule.parent;
    while (p && p.type === 'atrule') {
      const at = postcss.atRule({name: p.name, params: p.params});
      at.append(node); node = at; p = p.parent;
    }
    generated.append(node);
  });
  out.push(`/* ---- from ${file} ---- */\n` + generated.toString());
}

const header = `/* GENERATED by tools/build-projection-room.mjs — do not edit by hand.
   Projection Room remap of hard-coded light-theme colours (${rulesOut} rules,
   ${declsOut} declarations). Hand-tuned rules live in projection-room.css. */\n`;
await writeFile(resolve(root, 'projection-room-surfaces.css'), header + out.join('\n') + '\n');
console.log(`projection-room-surfaces.css: ${rulesOut} rules, ${declsOut} declarations`);
