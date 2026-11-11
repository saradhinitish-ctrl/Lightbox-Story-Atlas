// Verify the Viewfinder identity on all public Lightbox pages.
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";

const read = path => readFileSync(path);
const pages = ["index.html", "about.html", "creator.html", "features.html", "how-it-works.html", "widgets.html"];
const icons = [
  ["app-icons/viewfinder-48.png", 48],
  ["app-icons/viewfinder-96.png", 96],
  ["app-icons/viewfinder-180.png", 180],
  ["app-icons/viewfinder-192.png", 192],
  ["app-icons/viewfinder-512.png", 512],
  ["app-icons/viewfinder-1024.png", 1024],
  ["app-icons/viewfinder-maskable-512.png", 512],
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
for (const path of ["favicon.svg", "app-icons/viewfinder-mark.svg", "app-icons/viewfinder.svg"]) {
  const svg = read(path).toString("utf8");
  assert.ok(svg.includes('aria-label="Lightbox viewfinder logo"'), path + " is the Viewfinder mark");
  assert.ok(svg.includes("#D4301F") && svg.includes("#EFEDE6") && svg.includes("#18181A"), path + " uses ink, paper and grease-pencil red");
}
const manifest = JSON.parse(read("manifest.webmanifest").toString("utf8"));
assert.deepEqual(manifest.icons.map(icon => icon.src), [
  "/app-icons/viewfinder-192.png",
  "/app-icons/viewfinder-512.png",
  "/app-icons/viewfinder-maskable-512.png"
], "Manifest uses Viewfinder assets");
assert.ok(read("material-design.css").toString("utf8").includes("content:url('./app-icons/viewfinder-mark.svg')"), "Studio header uses the Viewfinder mark");
assert.ok(!/studio-mark\{filter:hue-rotate/.test(read("light-table.css").toString("utf8")), "Studio mark is not recoloured");
for (const page of pages) {
  const html = read(page).toString("utf8");
  assert.ok(!html.includes("lit-spine"), page + " has no Lit Spine leftovers");
  assert.ok(/href="\/favicon\.ico(?:\?[^\"]*)?"/.test(html), page + " declares ICO favicon");
  assert.ok(/href="\/app-icons\/viewfinder-48\.png(?:\?[^\"]*)?"/.test(html), page + " declares PNG favicon");
  assert.ok(/href="\/favicon\.svg(?:\?[^\"]*)?"/.test(html), page + " declares SVG favicon");
  assert.ok(/href="\/apple-touch-icon\.png(?:\?[^\"]*)?"/.test(html), page + " declares Apple touch icon");
}
const robots = read("robots.txt").toString("utf8");
assert.ok(!robots.includes("Disallow: /favicon"), "Favicon crawl is not explicitly blocked");
console.log("Viewfinder icon QA passed: 6 pages, browser, Apple, install and studio icons.");
