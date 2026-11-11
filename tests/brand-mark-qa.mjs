// Verify the Chosen Frame brand mark on all public Lightbox pages.
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";

const read = path => readFileSync(path);
const pages = ["index.html", "about.html", "creator.html", "features.html", "how-it-works.html", "widgets.html"];
const icons = [
  ["app-icons/chosen-frame-48.png", 48],
  ["app-icons/chosen-frame-96.png", 96],
  ["app-icons/chosen-frame-180.png", 180],
  ["app-icons/chosen-frame-192.png", 192],
  ["app-icons/chosen-frame-512.png", 512],
  ["app-icons/chosen-frame-maskable-512.png", 512],
  ["apple-touch-icon.png", 180]
];
for (const [path, size] of icons) {
  const content = read(path);
  assert.equal(content.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG signature " + path);
  assert.equal(content.readUInt32BE(16), size, "PNG width " + path);
  assert.equal(content.readUInt32BE(20), size, "PNG height " + path);
}
const ico = read("favicon.ico");
assert.equal(ico.readUInt16LE(0), 0, "ICO reserved");
assert.equal(ico.readUInt16LE(2), 1, "ICO type");
assert.ok(ico.readUInt16LE(4) >= 3, "ICO multi-resolution");
const svg = read("favicon.svg").toString("utf8");
assert.ok(svg.includes('aria-label="Lightbox Studio logo') && svg.includes("#D4301F") && !svg.includes("#C6FF00"), "Chosen Frame SVG mark");
const manifest = JSON.parse(read("manifest.webmanifest").toString("utf8"));
assert.deepEqual(manifest.icons.map(icon => icon.src), [
  "/app-icons/chosen-frame-192.png",
  "/app-icons/chosen-frame-512.png",
  "/app-icons/chosen-frame-maskable-512.png"
], "Manifest uses Chosen Frame assets");
for (const page of pages) {
  const html = read(page).toString("utf8");
  assert.ok(/href="\/favicon\.ico(?:\?[^\"]*)?"/.test(html), page + " declares ICO favicon");
  assert.ok(/href="\/app-icons\/chosen-frame-48\.png(?:\?[^\"]*)?"/.test(html), page + " declares PNG favicon");
  assert.ok(/href="\/favicon\.svg(?:\?[^\"]*)?"/.test(html), page + " declares SVG favicon");
  assert.ok(/href="\/apple-touch-icon\.png(?:\?[^\"]*)?"/.test(html), page + " declares Apple touch icon");
}
const robots = read("robots.txt").toString("utf8");
assert.ok(!robots.includes("Disallow: /favicon"), "Favicon crawl is not explicitly blocked");
for (const sheet of ["material-design.css", "light-table.css"]) assert.ok(!read(sheet).toString("utf8").includes("lit-spine"), sheet + " no longer points at the retired mark");
assert.ok(!/img\.studio-mark\{[^}]*hue-rotate/.test(read("light-table.css").toString("utf8")), "The mark is not recoloured in the header");
console.log("Brand mark QA passed: 6 pages, browser, Apple and install icons.");
