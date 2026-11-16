import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {styleProblems,walk,stripComments,BREAKPOINTS} from './support/css-rules.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const under=folder=>{
 const found=[];
 const visit=directory=>{for(const entry of readdirSync(directory,{withFileTypes:true})){const full=join(directory,entry.name);if(entry.isDirectory())visit(full);else if(entry.name.endsWith('.css'))found.push(relative(root,full).split(sep).join('/'));}};
 visit(join(root,folder));return found.sort();
};
const siteSheets=under('src/site');
const bookingSheets=readdirSync(join(root,'src/booking')).filter(name=>name.endsWith('.css')).map(name=>'src/booking/'+name).sort();
const read=name=>readFileSync(join(root,name),'utf8');
const optionsFor=name=>({tokens:name.endsWith('styles/tokens.css'),fonts:name.endsWith('styles/fonts.css'),index:name.endsWith('styles/index.css')});
/** A stylesheet still being rebuilt says so on its first line; its breaks are then listed, not failed. */
const pending=css=>/^\/\*\s*style-rules:\s*pending\b/.test(css);

test('the reader of stylesheets finds rules, layers and declarations',()=>{
 const {blocks,statements}=walk('@layer a, b;\n@layer a { .x { color: red; } @media (min-width: 768px) { .x > .y { margin: 0 } } }');
 assert.deepEqual(statements.map(item=>item.text),['@layer a, b']);
 assert.deepEqual(blocks.map(block=>block.prelude),['@layer a','.x','@media (min-width: 768px)','.x > .y']);
 assert.deepEqual(blocks[3].layers,['a']);assert.equal(blocks[1].declarations.trim(),'color: red;');
 assert.equal(stripComments('a /* b */ c'),'a         c');
 assert.throws(()=>walk('.a { '),/Unbalanced/);assert.throws(()=>walk('}'),/Unbalanced/);
});

test('each style rule is caught, and clean CSS passes',()=>{
 const clean='@layer components { .part { color: var(--ink); font: var(--type-body); border-radius: var(--radius-card); transition: transform var(--dur-hover) var(--ease-move); box-shadow: 0 1px 0 var(--line); }\n @media (min-width: 768px) { .part__x { margin: 0 auto; } }\n @media (max-width: 359px) { .part { padding: 0; } }\n @keyframes part-move { 0% { transform: none; } 100% { transform: translateX(10px); } } }';
 assert.deepEqual(styleProblems(clean),[]);
 const breaks={
  '!important':'@layer components { .a { color: var(--ink) !important; } }',
  'colour':'@layer components { .a { color: #123456; } }',
  'colour ':'@layer components { .a { background: rgba(0, 0, 0, .2); } }',
  'type size':'@layer components { .a { font-size: 15px; } }',
  'type size ':'@layer components { .a { font: 600 15px/1.2 var(--font-text); } }',
  'breakpoint':'@layer components { @media (min-width: 900px) { .a { margin: 0; } } }',
  'breakpoint ':'@layer components { @media (max-width: 767px) { .a { margin: 0; } } }',
  'write breakpoints':'@layer components { @media (width >= 768px) { .a { margin: 0; } } }',
  'outside a layer':'.a { margin: 0; }',
  'id selector':'@layer components { #main .a { margin: 0; } }',
  'radius':'@layer components { .a { border-radius: 12px; } }',
  'timing':'@layer components { .a { transition: opacity 200ms ease; } }',
  'layer order':'@layer a, b;\n@layer a { .a { margin: 0; } }',
  '@font-face':'@font-face { font-family: X; src: url(x.woff2); }',
  'statement outside':'@namespace svg url(x);'
 };
 for(const [name,css] of Object.entries(breaks))assert.ok(styleProblems(css).some(problem=>problem.includes(name.trim())),`${name} must be caught: ${JSON.stringify(styleProblems(css))}`);
 // What tokens.css, fonts.css and index.css may do that the others may not.
 assert.deepEqual(styleProblems('@layer tokens { :root { --x: #123456; --t: 200ms; --s: 15px; } @media (min-width: 1600px) { :root { --s: 16px; } } }',{tokens:true}),[]);
 assert.deepEqual(styleProblems('@font-face { font-family: X; src: url(x.woff2); }',{fonts:true}),[]);
 assert.deepEqual(styleProblems('@layer a, b;\n@import "./x.css";',{index:true}),[]);
 assert.deepEqual(styleProblems('@import "./x.css" layer(vendor);'),[]);
 // A selector may mention # inside an attribute value; zero durations and round shapes are not literals to forbid.
 assert.deepEqual(styleProblems('@layer components { .a[href^="#"] { transition-delay: 0s; border-radius: 50%; } }'),[]);
});

test('the stylesheet list is complete: every stylesheet of the new layer is imported once, in layer order',()=>{
 const index=read('src/site/styles/index.css');
 const order=/@layer\s+([^;]+);/.exec(stripComments(index))[1].split(',').map(name=>name.trim());
 assert.deepEqual(order,['reset','tokens','vendor','base','components','pages','motion','state']);
 assert.ok(stripComments(index).trimStart().startsWith('@layer'),'the layer order comes first');
 const imported=[...stripComments(index).matchAll(/@import\s+"([^"]+)"/g)].map(match=>join('src/site/styles',match[1]).split(sep).join('/'));
 assert.equal(new Set(imported).size,imported.length,'no stylesheet is imported twice');
 assert.deepEqual([...imported].sort(),siteSheets.filter(name=>!name.endsWith('styles/index.css')));
 const at=name=>imported.findIndex(item=>item.includes(name));
 assert.ok(at('styles/tokens.css')<at('styles/base.css')&&at('styles/base.css')<at('/parts/')&&at('/motion/')<at('styles/state.css'));
 assert.ok(imported.filter(name=>name.includes('/parts/')).every(name=>imported.indexOf(name)<imported.findIndex(item=>item.includes('/pages/'))));
});

// The class roots each stylesheet may style. A part's folder name is always one; a few parts own more.
const extraRoots={
 button:['text-link','round-button','chip','chip-row','tab','tabs','tag'],
 'site-header':['lockup'],
 'photo-figure':['arch-frame'],
 'review-shelf':['review-card','review-reader'],
 'certificate-frame':['certificate-wall','certificate-viewer'],
 'action-bar':['call-row','call-rows'],
 contact:['message-form']
};
const rootsFor=(kind,folder)=>[kind==='pages'?`page-${folder}`:folder,...(extraRoots[folder]||[])];
/** Split a selector list on the commas that are not inside brackets. */
function selectorsOf(prelude){
 const list=[];let depth=0,buffer='';
 for(const char of prelude){
  if(char==='('||char==='[')depth++;else if(char===')'||char===']')depth--;
  if(char===','&&depth===0){list.push(buffer.trim());buffer='';}else buffer+=char;
 }
 if(buffer.trim())list.push(buffer.trim());
 return list;
}
/** A selector may begin with the page's state (html[data-…], html.dialog-open) and must then start at its own root. */
function startsAtRoot(selector,roots){
 const own=selector.replace(/^(?:html|:root)(?:\[[^\]]*\]|:not\([^)]*\)|\.[\w-]+)*\s+/,'');
 return roots.some(root=>new RegExp(`^\\.${root}(?:(?:__|--)[\\w-]+)*(?![\\w-])`).test(own));
}

test('parts sit in the components layer, pages in the pages layer, and each styles only its own root',()=>{
 assert.ok(startsAtRoot('.review-shelf__row > li',['review-shelf'])&&startsAtRoot('html[data-booking-state="off"] .button--lead',['button'])&&startsAtRoot('.page-home__hero .button',['page-home']));
 assert.ok(!startsAtRoot('.review-shelfish',['review-shelf'])&&!startsAtRoot('.button',['page-home'])&&!startsAtRoot('h2',['page-home'])&&!startsAtRoot('html .button',['page-home']));
 assert.deepEqual(selectorsOf('.a:is(.b, .c), .d[x="1,2"]'),['.a:is(.b, .c)','.d[x="1,2"]']);
 for(const name of siteSheets){
  const folder=/src\/site\/(parts|pages)\/([^/]+)\//.exec(name);
  if(!folder)continue;
  const {blocks}=walk(read(name)),layer=folder[1]==='parts'?'components':'pages',roots=rootsFor(folder[1],folder[2]);
  for(const block of blocks){
   if(block.depth===0){assert.equal(block.prelude,`@layer ${layer}`,`${name} line ${block.line}`);continue;}
   if(block.kind!=='rule'||block.parents.some(parent=>/^@keyframes\b/.test(parent)))continue;
   for(const selector of selectorsOf(block.prelude))assert.ok(startsAtRoot(selector,roots),`${name} line ${block.line}: "${selector}" must start with one of .${roots.join(', .')}`);
  }
 }
});

for(const name of [...siteSheets,...bookingSheets]){
 const css=read(name);
 test(`style rules: ${name}`,{todo:pending(css)?'this stylesheet is still being rebuilt':false},()=>{
  assert.deepEqual(styleProblems(css,optionsFor(name)),[]);
 });
}

test('the breakpoints are the four agreed ones',()=>{assert.deepEqual(BREAKPOINTS,[480,768,1024,1280]);});
