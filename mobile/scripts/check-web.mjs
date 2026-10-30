import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.match(html, /rel="manifest"/);
assert.match(html, /<title[^>]*>Aile Ligi<\/title>/);
assert.match(html, /_expo\/static\/js\/web\//);
assert.doesNotMatch(html, /<h1>Aile Ligi Gizlilik Politikası<\/h1>/);
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.name, 'Aile Ligi');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.display, 'standalone');
assert.notEqual(manifest.prefer_related_applications, true);
for (const size of [192, 512]) {
  const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
  assert.ok(icon, `Missing ${size}px icon`);
  const png = readFileSync(resolve(root, icon.src.replace(/^\//, '')));
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
assert.ok(existsSync(resolve(root, 'welcome.html')));
assert.ok(existsSync(resolve(root, 'parent-sign-in.html')));
assert.ok(existsSync(resolve(root, 'aile-ligi-gizlilik-politikasi.html')));
console.log('Web output verified: app entry, install manifest, icons, auth routes, privacy page.');
