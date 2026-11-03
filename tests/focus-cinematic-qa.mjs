// Verify the approved Focus Cinematic identity on all public Lightbox pages.
import {readFileSync, existsSync} from "node:fs";
import assert from "node:assert/strict";

const read = path => readFileSync(path);
const pages = ["index.html", "about.html", "creator.html", "features.html", "how-it-works.html", "widgets.html"];
const icons = [
  ["app-icons/focus-cinematic-48.png", 48],
  ["app-icons/focus-cinematic-180.png", 180],
  ["app-icons/focus-cinematic-192.png", 192],
  ["app-icons/focus-cinematic-512.png", 512],
  ["app-icons/focus-cinematic-maskable-512.png", 512],
  ["apple-touch-icon.png", 180]
];
for(const [path,size] of icons){
  const content=read(path);
  assert.equal(content.subarray(0,8).toString("hex"),"89504e470d0a1a0a","PNG signature "+path);
  assert.equal(content.readUInt32BE(16),size,"PNG width "+path);
  assert.equal(content.readUInt32BE(20),size,"PNG height "+path);
}
const ico=read("favicon.ico");
assert.equal(ico.readUInt16LE(0),0,"ICO reserved");
assert.equal(ico.readUInt16LE(2),1,"ICO type");
assert.ok(ico.readUInt16LE(4)>=3,"ICO multi-resolution");
const svg=read("favicon.svg").toString("utf8");
assert.ok(svg.includes('id="focus"')&&svg.includes('#c7fa00'),"Approved cinematic focus star");
const manifest=JSON.parse(read("manifest.webmanifest").toString("utf8"));
assert.deepEqual(manifest.icons.map(icon=>icon.src),[
  "/app-icons/focus-cinematic-192.png",
  "/app-icons/focus-cinematic-512.png",
  "/app-icons/focus-cinematic-maskable-512.png"
],"Manifest no longer references old red/orange icons");
for(const page of pages){
  const html=read(page).toString("utf8");
  assert.ok(html.includes('href="/favicon.ico"'),page+" declares Google-friendly ICO favicon");
  assert.ok(html.includes('href="/app-icons/focus-cinematic-48.png"'),page+" declares PNG favicon");
  assert.ok(html.includes('href="/favicon.svg"'),page+" declares scalable favicon");
  assert.ok(html.includes('href="/apple-touch-icon.png"'),page+" declares iOS touch icon");
}
const robots=read("robots.txt").toString("utf8");
assert.ok(!robots.includes("Disallow: /favicon"),"Favicon crawl is not explicitly blocked");
console.log("Focus Cinematic icon QA passed: 6 pages, Google/browser favicon, Apple and all install sizes.");
