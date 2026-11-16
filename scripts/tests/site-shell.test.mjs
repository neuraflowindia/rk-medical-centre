import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPublicDocument,renderPublicBody} from '../../src/clinic/public-document.mjs';
import {pageMetadata} from '../../src/clinic/page-metadata.mjs';
import {knownPaths,publicPaths,islandPaths,pageFor,pages} from '../../src/site/runtime/registry.mjs';
import {renderApp,pageContext,applyBookingMode,lockUnboundControls} from '../../src/site/runtime/render.mjs';
import {checkApp,checkPage,checkPageMarkup,count,renderedApp,renderedPage,TEST_NOW} from './support/page-contract.mjs';

const shell=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const modes=['on','off'];

test('the shell keeps every marker the build and the runtime read (contract 2.1)',()=>{
 assert.equal(count(shell,/<html lang="en">/g),1,'the exact <html lang="en"> text');
 assert.equal(count(shell,/<\/head>/g),1);assert.equal(count(shell,/<\/body>/g),1);
 assert.equal(count(shell,/<title>[^<]+<\/title>/g),1);
 assert.equal(count(shell,/<meta name="description" content="[^"]+">/g),1,'name before content');
 assert.equal(count(shell,/<meta name="robots" content="[^"]+">/g),1,'name before content');
 assert.match(shell,/<a class="skip" href="#main">/);
 assert.match(shell,/<script type="module" src="\/src\/main\.jsx"><\/script>/);
 const between=/<div id="app">([\s\S]*?)(?=<dialog id="reader")/.exec(shell)[1];
 assert.equal(count(between,/<main id="main"/g),1);assert.equal(count(between,/<h1>/g),1);
 assert.match(between,/<\/main><\/div>\s*$/,'nothing to keep sits between #app and the reader');
 const dialogs=[...shell.matchAll(/<dialog id="([a-z-]+)"[\s\S]*?<\/dialog>/g)];
 assert.deepEqual(dialogs.map(match=>match[1]),['reader','menu','viewer','call-sheet'],'new dialogs come after the reader');
 for(const [markup,id] of dialogs){
  assert.match(markup,/\sdata-close\b/,`${id} has a close button`);
  assert.match(markup,new RegExp(`aria-labelledby="${id==='call-sheet'?'call':id}-title"`));
  assert.match(markup,new RegExp(`id="${id==='call-sheet'?'call':id}-title"`));
  assert.equal(count(markup,/<h1\b/g),0,'dialogs use <h2>');
 }
 for(const id of ['reader-content','menu-links','viewer-content','call-sheet-content'])assert.match(shell,new RegExp(`id="${id}"`));
 assert.doesNotMatch(shell,/visit-dialog|fonts\.googleapis/);
 assert.ok(shell.indexOf('<meta charset="utf-8">')<shell.indexOf('<title>'));
 assert.match(shell,/<meta name="theme-color"/,'the font preloads are placed before this line at build time');
});

test('the registry holds the seven public addresses and the two booking screens, and nothing else',()=>{
 assert.deepEqual(publicPaths,['/','/treatment','/about-clinic','/meet-doctor','/dr-sanjay-gupta','/dr-parul-gupta','/contact']);
 assert.deepEqual(publicPaths,Object.keys(pageMetadata),'the pages printed at build time are the pages with reviewed titles');
 assert.deepEqual(islandPaths,['/booking','/booking-details']);
 assert.deepEqual(knownPaths,[...publicPaths,...islandPaths]);
 for(const path of knownPaths){
  const page=pageFor(path);
  assert.equal(typeof page.render,'function');assert.equal(typeof page.bind,'function');
  assert.ok(['full','slim'].includes(page.chrome));assert.equal(page.chrome==='slim',!!page.island);
 }
 assert.equal(new Set(Object.values(pages).map(page=>page.id)).size,knownPaths.length);
 assert.throws(()=>pageFor('/nowhere'),/Not a page/);
 assert.ok(Object.isFrozen(pages)&&Object.isFrozen(pages['/']));
});

test('a page context is checked and frozen',()=>{
 const ctx=pageContext({path:'/',mode:'on',now:TEST_NOW,search:'?a=1'});
 assert.deepEqual({...ctx},{path:'/',mode:'on',now:TEST_NOW,search:'?a=1'});assert.ok(Object.isFrozen(ctx));
 assert.equal(pageContext({path:'/',mode:'off'}).search,'');
 assert.throws(()=>pageContext({path:'/',mode:'maybe'}),/booking state/);
 assert.throws(()=>pageContext({path:'/nowhere',mode:'on'}),/Not a page/);
 assert.throws(()=>pageContext({path:'/',mode:'on',now:new Date('nonsense')}),/valid time/);
 assert.throws(()=>pageContext({path:'/',mode:'on',now:'today'}),/valid time/);
});

for(const path of knownPaths){
 test(`${path} keeps the page contract in both booking states`,()=>{
  for(const mode of modes){
   const page=checkPage(path,mode);
   assert.equal(renderedPage(path,mode),page,'a template is pure: the same input gives the same text');
  }
 });
}

test('the booking screens get the quiet header and no phone action bar; the public pages get both',()=>{
 for(const path of knownPaths){
  const html=renderedApp(path,'on'),slim=pageFor(path).chrome==='slim';
  assert.equal(/data-action-bar/.test(html),!slim,path);
  assert.equal(/site-header--slim/.test(html),slim,path);
  assert.equal(/id="clinic-booking-root"/.test(html),slim,path);
  assert.match(html,/id="site-footer"/);assert.match(html,/id="footer-calls"/,'the script-less target of every Call control');
 }
});

test('markup is put into its booking state the same way for the build and the browser',()=>{
 const sample='<a href="/booking?doctor=sanjay">Book</a><a class="x" href="/contact">Contact</a><div data-booking-only>only on</div><p data-booking-off-only>only off</p><span data-booking-only hidden>kept</span>';
 const off=applyBookingMode(sample,'off'),on=applyBookingMode(sample,'on');
 assert.equal(off,'<a data-booking-href="/booking?doctor=sanjay" hidden inert>Book</a><a class="x" href="/contact">Contact</a><div data-booking-only hidden inert>only on</div><p data-booking-off-only>only off</p><span data-booking-only hidden>kept</span>');
 assert.equal(on,'<a href="/booking?doctor=sanjay">Book</a><a class="x" href="/contact">Contact</a><div data-booking-only>only on</div><p data-booking-off-only hidden inert>only off</p><span data-booking-only hidden>kept</span>');
 assert.equal(applyBookingMode(sample,'anything else'),off,'an unknown state is treated as OFF');
});

test('until scripts run, forms cannot post anywhere unexpected and their controls are locked',()=>{
 const locked=lockUnboundControls('<form class="a"><input name="n"><select name="s"></select><textarea name="t"></textarea><button type="submit">Send</button><button type="button">Other</button><input name="d" disabled></form><form method="get"></form>');
 assert.equal(locked,'<form method="post" class="a"><input disabled data-unbound-control name="n"><select disabled data-unbound-control name="s"></select><textarea disabled data-unbound-control name="t"></textarea><button type="submit" disabled data-unbound-control>Send</button><button type="button">Other</button><input name="d" disabled></form><form method="get"></form>');
});

for(const path of publicPaths){
 test(`the built document of ${path} is complete in both booking states (contract 2.2)`,()=>{
  for(const mode of modes){
   const html=renderPublicDocument({path,mode,booking:false,html:shell});
   assert.match(html,new RegExp(`<html lang="en" data-booking-state="${mode}">`));
   assert.match(html,new RegExp(`<div id="app" data-rendered-path="${path}" data-display-mode="${mode}">`));
   assert.equal(count(html,/<h1\b/g),1);assert.equal(count(html,/<main\b/g),1);
   assert.equal(count(html,/<script type="application\/ld\+json" data-site-graph>/g),1);
   assert.match(html,/<meta property="og:image" content="https:\/\/www\.rkmedicalcentre\.com\/clinic-assets\/rk-medical-centre-social\.png">/);
   assert.equal(count(html,/<dialog id="reader"/g),1);assert.ok(html.indexOf('</div><dialog id="reader"')>0||/<\/div>\s*<dialog id="reader"/.test(html));
   assert.doesNotMatch(html,/shell-fallback/,'the fallback is replaced by the page');
   for(const tag of html.match(/<(?:input|select|textarea)\b[^>]*>/g)||[])assert.match(tag,/\sdisabled\b/,`a control is usable before scripts: ${tag}`);
   for(const tag of html.match(/<form\b[^>]*>/g)||[])assert.match(tag,/\smethod="/);
   checkApp(/<div id="app"[^>]*>([\s\S]*)<\/div>\s*<dialog id="reader"/.exec(html)[1],{path,mode});
  }
 });
}

test('booking documents pass through untouched; unknown pages and a broken shell stop the build',()=>{
 assert.equal(renderPublicDocument({path:'/booking',mode:'on',booking:true,html:shell}),shell);
 assert.throws(()=>renderPublicDocument({path:'/nowhere',mode:'on',booking:false,html:shell}),/Not a public template/);
 assert.throws(()=>renderPublicBody('/booking'),/Not a public template/);
 assert.throws(()=>renderPublicDocument({path:'/',mode:'on',booking:false,html:shell.replace('<div id="app">','<div id="root">')}),/Public root replacement failed/);
 assert.throws(()=>renderPublicDocument({path:'/',mode:'on',booking:false,html:shell.replace('<html lang="en">','<html lang="en-IN">')}),/Public root replacement failed/);
 assert.match(renderPublicBody('/'),/href="\/contact"[^>]*data-header-appointment|data-header-appointment/,'printed in the OFF state unless told otherwise');
 assert.equal(renderPublicBody('/','on',TEST_NOW),renderApp(pageContext({path:'/',mode:'on',now:TEST_NOW})));
});

test('the page checks themselves catch what they are for',()=>{
 assert.throws(()=>checkPageMarkup('<h1>a</h1><h1>b</h1>',{path:'/x'}),/exactly one <h1>/);
 assert.throws(()=>checkPageMarkup('<h1>a</h1><main></main>',{path:'/x'}),/no <main>/);
 assert.throws(()=>checkPageMarkup('<h1>a</h1><a href="/somewhere-else">x</a>',{path:'/x'}),/not an address of this site/);
 assert.throws(()=>checkPageMarkup('<h1>a</h1><img src="/elsewhere/a.webp" alt="" width="1" height="1">',{path:'/x'}),/image folders/);
 assert.throws(()=>checkPageMarkup('<h1>a</h1><img src="/client-photos/no-such-file-1.webp" alt="" width="1" height="1">',{path:'/x'}),/does not exist/);
 assert.throws(()=>checkPageMarkup('<h1>a</h1><p style="color:red">x</p>',{path:'/x'}),/inline styles/);
 assert.throws(()=>checkPageMarkup('<h1>a</h1><p>STAND-IN</p>',{path:'/x'}),/stand-in marker/);
 assert.throws(()=>checkPageMarkup('<h1>undefined</h1>',{path:'/x'}),/missing/);
 assert.doesNotThrow(()=>checkPageMarkup('<h1>a</h1><p style="--i:2">x</p><a href="/treatment#diabetes">t</a><a href="tel:+91">c</a><a href="#place">p</a>',{path:'/x'}));
});
