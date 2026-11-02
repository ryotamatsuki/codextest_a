const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('main.js','utf8');
test('JavaScript parser accepts source',()=>assert.doesNotThrow(()=>new Function(src)));
test('YouTube API-provided HTML content escapes',()=>{
  assert.match(src,/<li>\$\{escapeHTML\(item\)\}<\/li>/);
  assert.match(src,/\$\{escapeHTML\(video.title\)\}/);
  assert.match(src,/<span>\$\{escapeHTML\(label\)\}<\/span>/);
  assert.match(src,/safeVideoId\(video.id\)/);
  assert.doesNotMatch(src,/<li>\$\{item\}<\/li>/);
  assert.doesNotMatch(src,/>\\?\$\{video.title\}<\/a>/);
});
test('helper rejects malicious video IDs and escapes title markup',()=>{
  const code=src.slice(src.indexOf('const escapeHTML = '),src.indexOf('const apiKeyInput = '));
  const {esc,safe}=new Function(code+'return {esc:escapeHTML,safe:safeVideoId};')();
  assert.equal(esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(safe('" onmouseover="evil'),'');
  assert.equal(safe('Abc_1234567'),'Abc_1234567');
});
