#!/usr/bin/env node
/* Render the Lightbox brand mark, "The Chosen Frame", for the web and install icons.

   One frame of film lies lit on the table and has been circled in red grease
   pencil: the moment of choosing, which is what the app is for. The frame
   looks back; the ink dot is the full stop of "Lightbox." and the pupil of an eye.

   The ring is drawn here as a filled, pressure-varying stroke so the same
   outline serves the SVG, the PNGs and the Android vector drawable.

   Usage: node tools/render-brand-mark.mjs            writes every asset
          node tools/render-brand-mark.mjs --preview <dir>   writes previews only */
import {writeFileSync, mkdirSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHASSIS = "#18181A", MARKER = "#D4301F", INK = "#1C1B19";
const r1 = n => Math.round(n * 10) / 10;

/* Small deterministic generator, so the hand-drawn ring is the same every run. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/* The grease-pencil ring: one and a bit turns of a tilted ellipse that fails to
   meet itself, pressed harder through the middle of the stroke than at either end. */
function ringOutline({cx = 256, cy = 256, rx = 192, ry = 156, tilt = -14, weight = 1} = {}) {
  const rand = seeded(7);
  const wobble = Array.from({length: 9}, () => rand() - 0.5);
  const steps = 150, start = -2.55, sweep = Math.PI * 2 + 1.25;
  const t = tilt * Math.PI / 180, cosT = Math.cos(t), sinT = Math.sin(t);
  const centre = [], width = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, a = start + sweep * u;
    // Drift inward as the hand comes round, so the second pass lands inside the first.
    let k = 1.06 - 0.17 * u;
    wobble.forEach((w, n) => { k += w * 0.012 * Math.sin((n + 1) * 0.7 * a + n); });
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    centre.push([cx + x * cosT - y * sinT, cy + x * sinT + y * cosT]);
    const pressure = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.04)), 0.42);
    width.push(weight * (3 + 9.5 * pressure + 1.2 * Math.sin(a * 3 + 1)));
  }
  const left = [], right = [];
  centre.forEach(([x, y], i) => {
    const [ax, ay] = centre[Math.max(0, i - 1)], [bx, by] = centre[Math.min(steps, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
    left.push([x + nx * width[i], y + ny * width[i]]);
    right.push([x - nx * width[i], y - ny * width[i]]);
  });
  const pts = left.concat(right.reverse());
  return "M" + pts.map(([x, y]) => r1(x) + " " + r1(y)).join("L") + "Z";
}

const FRAME = {x: 138, y: 168, w: 236, h: 176, rx: 14, turn: -9};
const EYE = {cx: 286, cy: 250, r: 19};
/* Film perforations along both edges of the frame, punched through to the chassis. */
const PERFS = [0, 1, 2, 3, 4].flatMap(i => [FRAME.y + 13, FRAME.y + FRAME.h - 27].map(y => ({x: FRAME.x + 21 + i * 43.5, y, w: 22, h: 14, rx: 4})));

function markSvg({size = 512, tile = true, simple = false} = {}) {
  const ring = ringOutline({weight: simple ? 1.5 : 1});
  const f = FRAME;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" role="img" aria-label="Lightbox Studio logo: a lit frame of film circled in red grease pencil">
  <defs>
    <radialGradient id="lb-chassis" cx="50%" cy="52%" r="62%">
      <stop offset="0" stop-color="#303035"/>
      <stop offset=".55" stop-color="#1F1F22"/>
      <stop offset="1" stop-color="${CHASSIS}"/>
    </radialGradient>
    <radialGradient id="lb-bloom" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FFF1D2" stop-opacity=".5"/>
      <stop offset=".55" stop-color="#FFE3B0" stop-opacity=".13"/>
      <stop offset="1" stop-color="#FFE9C2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lb-lamp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#F8EDD6"/>
    </linearGradient>
  </defs>
  ${tile ? `<rect width="512" height="512" rx="112" fill="url(#lb-chassis)"/>` : `<rect width="512" height="512" fill="url(#lb-chassis)"/>`}
  <ellipse cx="256" cy="256" rx="236" ry="212" fill="url(#lb-bloom)"/>
  <g transform="rotate(${f.turn} 256 256)">
    <rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${f.rx}" fill="url(#lb-lamp)"/>
    ${simple ? "" : PERFS.map(h => `<rect x="${r1(h.x)}" y="${h.y}" width="${h.w}" height="${h.h}" rx="${h.rx}" fill="#232326"/>`).join("")}
    <circle cx="${EYE.cx}" cy="${EYE.cy}" r="${simple ? EYE.r + 5 : EYE.r}" fill="${INK}"/>
  </g>
  <path d="${ring}" fill="${MARKER}"/>
</svg>
`;
}

/* Android adaptive icon foreground: 108dp canvas, art kept inside the 66dp safe circle. */
function androidForeground() {
  const k = 0.158, o = 54 - 256 * k, f = FRAME;
  const ring = ringOutline().replace(/-?\d+(\.\d+)?/g, n => r1(Number(n) * k + o));
  const rect = (x, y, w, h, r) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z`;
  const s = n => r1(n * k), p = n => r1(n * k + o);
  const er = s(EYE.r), ex = p(EYE.cx), ey = p(EYE.cy);
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- The Chosen Frame. Generated by tools/render-brand-mark.mjs; edit the mark there. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
 android:width="108dp" android:height="108dp"
 android:viewportWidth="108" android:viewportHeight="108">
 <group android:pivotX="54" android:pivotY="54" android:rotation="${f.turn}">
  <path android:fillColor="#FDFBF4" android:pathData="${rect(p(f.x), p(f.y), s(f.w), s(f.h), s(f.rx))}"/>
  <path android:fillColor="${INK}" android:pathData="M${r1(ex - er)},${ey}a${er},${er} 0 1 0 ${r1(er * 2)},0a${er},${er} 0 1 0 -${r1(er * 2)},0z"/>
 </group>
 <path android:fillColor="${MARKER}" android:pathData="${ring}"/>
</vector>
`;
}

/* ICO container holding PNG images. */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({size, png}, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, at);
    head.writeUInt8(size >= 256 ? 0 : size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map(image => image.png)]);
}

const {chromium} = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg, size, {opaque = false} = {}) {
  await page.setViewportSize({width: size, height: size});
  await page.setContent(`<body style="margin:0;background:${opaque ? CHASSIS : "transparent"}">${svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body>`);
  return page.screenshot({omitBackground: !opaque, clip: {x: 0, y: 0, width: size, height: size}});
}
/* Below 64px the ring and pupil are drawn heavier so the mark still reads in a browser tab. */
const at = (size, options = {}) => png(markSvg({simple: size < 64, ...options}), size, options);

const preview = process.argv.indexOf("--preview");
if (preview > -1) {
  const dir = resolve(process.argv[preview + 1]);
  mkdirSync(dir, {recursive: true});
  for (const size of [16, 32, 48, 96, 192, 512]) writeFileSync(join(dir, `mark-${size}.png`), await at(size));
  writeFileSync(join(dir, "mark.svg"), markSvg());
} else {
  const icons = join(ROOT, "app-icons");
  mkdirSync(icons, {recursive: true});
  writeFileSync(join(ROOT, "favicon.svg"), markSvg());
  for (const size of [48, 96, 180, 192, 512]) writeFileSync(join(icons, `chosen-frame-${size}.png`), await at(size));
  // Maskable: full-bleed chassis with the art scaled into the safe zone.
  const inner = (await at(464, {tile: false, opaque: true})).toString("base64");
  await page.setViewportSize({width: 512, height: 512});
  await page.setContent(`<body style="margin:0;background:${CHASSIS}"><img src="data:image/png;base64,${inner}" style="position:absolute;left:24px;top:24px;width:464px;height:464px;-webkit-mask:radial-gradient(closest-side,#000 82%,transparent)"></body>`);
  writeFileSync(join(icons, "chosen-frame-maskable-512.png"), await page.screenshot());
  writeFileSync(join(ROOT, "apple-touch-icon.png"), await at(180, {tile: false, opaque: true}));
  const entries = [];
  for (const size of [16, 32, 48, 64]) entries.push({size, png: await at(size)});
  writeFileSync(join(ROOT, "favicon.ico"), ico(entries));
  writeFileSync(join(ROOT, "android-widgets/app/src/main/res/drawable/ic_launcher_foreground.xml"), androidForeground());
  console.log("Brand mark rendered: favicon.svg, favicon.ico, apple-touch-icon.png, app-icons/chosen-frame-*.png, Android launcher foreground.");
}
await browser.close();
