import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const fontkit=createRequire(import.meta.url)('@pdf-lib/fontkit');
const folder=fileURLToPath(new URL('../../src/site/fonts/',import.meta.url));
const files=readdirSync(folder).filter(name=>name.endsWith('.woff2')).sort();
const css=readFileSync(new URL('../../src/site/styles/fonts.css',import.meta.url),'utf8');
const config=readFileSync(new URL('../../vite.config.js',import.meta.url),'utf8');

// Signs every face must hold: the rupee sign (the fee is one of the five answers), and the
// punctuation the site's words use.
const everyFace={'₹':0x20B9,'·':0xB7,'–':0x2013,'’':0x2019,'‘':0x2018,'“':0x201C,'”':0x201D,'…':0x2026,'©':0xA9,'no-break space':0xA0};
// Arrows are part of the text face only; in headings and buttons they are drawn as icons.
const textFace={'→':0x2192,'↗':0x2197};

test('the three faces are self-hosted, named family-style-weights, each with its licence text',()=>{
 assert.deepEqual(files,['figtree-roman-400-600.woff2','newsreader-italic-400-500.woff2','newsreader-roman-400-600.woff2']);
 for(const name of files)assert.match(name,/^[a-z]+-(roman|italic)-\d{3}-\d{3}\.woff2$/);
 for(const licence of ['figtree-licence.txt','newsreader-licence.txt'])assert.match(readFileSync(folder+licence,'utf8'),/SIL Open Font License, Version 1\.1/);
});

for(const name of files){
 test(`${name} holds the rupee sign and the site's punctuation`,()=>{
  const font=fontkit.create(readFileSync(folder+name));
  for(const [sign,code] of Object.entries(everyFace))assert.ok(font.hasGlyphForCodePoint(code),`${name} lacks ${sign}`);
  for(let code=0x20;code<0x7F;code++)assert.ok(font.hasGlyphForCodePoint(code),`${name} lacks ${String.fromCodePoint(code)}`);
  if(name.startsWith('figtree'))for(const [sign,code] of Object.entries(textFace))assert.ok(font.hasGlyphForCodePoint(code),`${name} lacks ${sign}`);
  const [,from,to]=/-(\d{3})-(\d{3})\.woff2$/.exec(name),axis=font.variationAxes.wght;
  assert.deepEqual([axis.min,axis.max],[Number(from),Number(to)],'the file name states the weights the file holds');
  if(name.startsWith('newsreader'))assert.ok(font.variationAxes.opsz,'the display face keeps its optical sizes');
 });
}

test('fonts.css names each file once with its real weights; the three faces of a first screen are preloaded',()=>{
 for(const name of files){
  const [,from,to]=/-(\d{3})-(\d{3})\.woff2$/.exec(name);
  const rule=css.split('@font-face').find(block=>block.includes(name));
  assert.ok(rule,`${name} is not used in fonts.css`);
  assert.match(rule,new RegExp(`font-weight:\\s*${from} ${to}`));
  assert.match(rule,/font-display:\s*swap/);
  assert.match(rule,name.includes('italic')?/font-style:\s*italic/:/font-style:\s*normal/);
 }
 assert.match(css,/"Newsreader Fallback"[^}]*size-adjust/);assert.match(css,/"Figtree Fallback"[^}]*size-adjust/);
 const preloaded=/const preloadedFonts=\[([^\]]*)\]/.exec(config)[1].split(',').map(item=>item.trim().replace(/'/g,''));
 // every page's main heading carries one italic phrase, so the italic face is wanted as early as the upright one
 assert.deepEqual(preloaded,['newsreader-roman-400-600.woff2','newsreader-italic-400-500.woff2','figtree-roman-400-600.woff2']);
 assert.doesNotMatch(readFileSync(new URL('../../index.html',import.meta.url),'utf8'),/fonts\.googleapis|fonts\.gstatic/);
});
