// About the clinic: the page's words, its template in both booking states, and its own behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as words from '../../src/clinic/page-content/about.mjs';
import {about,walkSlide} from '../../src/site/pages/about/about.mjs';
import {bindAbout,openWalkViewer,stepIndex} from '../../src/site/pages/about/about.behaviour.mjs';
import {doctors,address,locality,directions} from '../../src/clinic/model.mjs';
import {doctorOrder} from '../../src/clinic/care-catalogue.mjs';
import {certificateCatalogue} from '../../src/clinic/certificate-catalogue.mjs';
import {clinicPhotos,clinicObjects} from '../../src/clinic/client-media.mjs';
import {observationCareSentence,STAND_IN_NOTE} from '../../src/clinic/standins.mjs';
import {pagePaths,practisingSince,clinicStandards} from '../../src/clinic/page-content/shared.mjs';
import {credentials,homeCertificates} from '../../src/clinic/page-content/home.mjs';
import {escapeHTML} from '../../src/clinic/model.mjs';
import {checkPage,renderedPage,attributeValues,count,TEST_NOW} from './support/page-contract.mjs';
import {pageContext} from '../../src/site/runtime/render.mjs';
import {issuerLine} from '../../src/clinic/page-content/shared.mjs';

const PATH='/about-clinic';
const {cover,story,standards,walk,doctorsSection}=words;
const plain=value=>value.replaceAll(' ',' ');
/** A page's markup as a visitor reads it: tags out, entities and no-break spaces back to plain characters. */
const readable=html=>html.replace(/<[^>]+>/g,' ').replaceAll('&nbsp;',' ').replaceAll('&amp;','&').replaceAll('&#39;','\'').replaceAll('&quot;','"').replace(/\s+/g,' ');
/** Every string inside a value, however deeply nested. */
function strings(value,found=[]){
 if(typeof value==='string')found.push(value);
 else if(value&&typeof value==='object')for(const item of Object.values(value))strings(item,found);
 return found;
}
const ownSections=html=>html.slice(0,html.indexOf('<section class="closing"'));

// ---- words ----

test('About words: the heading and the sentence under it are built from the clinic’s facts',()=>{
 const since=practisingSince();
 assert.equal(plain(cover.heading),`A family practice in ${locality} since ${since}.`);
 assert.ok(!cover.heading.includes(locality),'the locality’s name is held together with no-break spaces');
 assert.ok(cover.heading.endsWith(cover.emphasis),'the italic phrase closes the heading');
 for(const id of doctorOrder)assert.ok(plain(cover.lead).includes(doctors[id].name),`the sentence names ${doctors[id].name}`);
 assert.ok(!cover.lead.includes(doctors.sanjay.name),'a doctor’s name is held together with no-break spaces');
 // The road names the page uses are the address's own words.
 assert.ok(address.includes('Tedhi Pulia Ring Road')&&cover.lead.endsWith('on Ring Road.')&&cover.photo.caption.includes('Tedhi Pulia Ring Road'));
 assert.equal(cover.directions.href,directions);
 assert.ok(Object.hasOwn(clinicPhotos,cover.photo.photo)&&Object.hasOwn(clinicObjects,cover.object));
});

test('About words: the story is short, marked as a stand-in, and its heading carries the year',()=>{
 assert.equal(story.numeral,String(practisingSince()));
 assert.equal(words.storyHeading,`${practisingSince()} and the same two doctors ever since.`);
 assert.ok(story.heading.endsWith(story.emphasis));
 assert.ok(words.storyWordCount()<=90,'the story stays within 90 words');
 assert.equal(words.storyWordCount({opening:'one two',body:'three',pulled:'four five',handover:'six'}),6);
 // The marker sits directly above the story's words in the source.
 const source=readFileSync(new URL('../../src/clinic/page-content/about.mjs',import.meta.url),'utf8');
 const marker=source.indexOf('// '+STAND_IN_NOTE),block=source.indexOf('const storyWords=');
 assert.ok(marker>0&&block>marker&&block-marker<600,'the story’s words are marked as a stand-in');
 assert.ok(!story.pulled.includes('“')&&!story.pulled.includes('"'),'the pulled line is the clinic’s own sentence, not a quotation');
});

test('About words: the three standards are the shared list (the one Home’s ledger reads), each with one plain line',()=>{
 assert.deepEqual(standards.rows.map(row=>row.id),['nabh','iso','observation']);
 for(const [index,row] of standards.rows.entries()){
  assert.equal(row.name,clinicStandards[index].name);assert.equal(row.kind,clinicStandards[index].kind);
  assert.ok(credentials.rows.some(item=>item.title===row.name),`Home’s ledger shows "${row.name}" too`);
  assert.ok(row.meaning.length>20&&row.meaning.length<=100&&row.meaning.endsWith('.'));
 }
 assert.equal(standards.rows[2].meaning,observationCareSentence);
 assert.deepEqual(standards.rows.map(row=>row.source),['derived','derived','stand-in']);
 assert.equal(standards.emphasis,undefined,'this heading stands upright');
 assert.equal(standards.objects.length,2);for(const name of standards.objects)assert.ok(Object.hasOwn(clinicObjects,name),`the still life names an object that exists: ${name}`);
});

test('About words: the walk has three steps in order, each with a photograph that exists',()=>{
 assert.deepEqual(walk.steps.map(step=>step.id),['arrive','doors','waiting']);
 // Step 1 shows the name board on the green wall once that crop exists; until then the gate, with the gate's own line.
 const first=words.arrival();
 assert.deepEqual(walk.steps.map(step=>step.photo),[first.photo,'walk-doors','waiting']);
 assert.equal(walk.steps[0].line,first.line);
 assert.ok(!walk.steps.some(step=>step.photo===cover.photo.photo),'the cover’s photograph is not shown again');
 assert.deepEqual(words.arrival({'walk-wall':{},'walk-gate':{}}),{photo:'walk-wall',line:'The clinic’s name is on the wall; the gate is to its left.'});
 assert.deepEqual(words.arrival({'walk-gate':{}}),{photo:'walk-gate',line:'The gate is under the blue board with both doctors’ names.'});
 for(const step of walk.steps){
  assert.ok(Object.hasOwn(clinicPhotos,step.photo),`${step.id} names a photograph`);
  assert.ok(step.title.length<=40&&step.line.endsWith('.'));
 }
 assert.ok(walk.heading.endsWith(walk.emphasis));
 // Never the gate photograph with the food cart, never the reception.
 for(const id of words.aboutPhotographs)assert.ok(!['clinic-gate','reception'].includes(id));
 assert.deepEqual(words.aboutPhotographs,[cover.photo.photo,...walk.steps.map(step=>step.photo)]);
 assert.equal(words.stepSpoken(2),'Step 2: ');
 assert.equal(words.viewPhotoLabel('The covered waiting area'),'View photograph: The covered waiting area');
 assert.equal(words.walkPosition(2,3),'2 of 3');
 assert.equal(words.walkViewerTitle(2,'Through the glass doors'),'2 · Through the glass doors');
});

test('About words: the doctors section names both doctors and teases two certificates Home does not show',()=>{
 assert.deepEqual(doctorsSection.cards,doctorOrder);
 assert.equal(doctorsSection.emphasis,undefined,'this heading stands upright');
 const teaser=doctorsSection.certificates;
 assert.equal(teaser.link,`All ${certificateCatalogue.length} certificates`);
 assert.equal(teaser.href,pagePaths.doctors);
 assert.deepEqual(teaser.shown.map(item=>item.doctor),doctorOrder);
 const onHome=new Set(homeCertificates().map(item=>item.id));
 for(const item of teaser.shown)assert.ok(!onHome.has(item.id)&&certificateCatalogue.includes(item));
 // If Home ever shows all of a doctor's certificates, the teaser falls back to that doctor's first.
 const two=[{id:'a',doctor:'sanjay'},{id:'b',doctor:'parul'}];
 assert.deepEqual(words.teaserCertificates(two,two).map(item=>item.id),['a','b']);
 assert.throws(()=>words.teaserCertificates([{id:'a',doctor:'sanjay'}],[]),/No certificate is recorded for Dr\. Parul Gupta/);
});

test('About words: no markup, grounds that alternate, and a register of everything that awaits the clinic',()=>{
 for(const value of strings(words.aboutPage))assert.doesNotMatch(value,/[<>]/,`no markup in the words: ${value}`);
 const grounds=words.aboutSections.map(section=>section.ground);
 grounds.forEach((ground,index)=>{if(index)assert.notEqual(ground,grounds[index-1],'neighbouring sections never share a ground');});
 assert.deepEqual(words.aboutSections.map(section=>section.id),['cover','story','standards','walk','doctors','closing']);
 const page=readable(renderedPage(PATH,'on'));
 assert.deepEqual(words.aboutRegister.filter(item=>item.kind==='stand-in').map(item=>item.key),['story.opening','story.body','story.pulled','story.handover']);
 assert.equal(words.aboutRegister.filter(item=>item.kind==='derived').length,2+1+3);
 for(const item of words.aboutRegister){
  assert.ok(['stand-in','derived'].includes(item.kind)&&item.label.startsWith('About, '));
  assert.ok(page.includes(plain(item.value)),`the page shows: ${item.value}`);
 }
});

// ---- template ----

test('About keeps the page contract in both booking states',()=>{
 for(const mode of ['on','off'])checkPage(PATH,mode);
});

test('About prints its five sections in order, then the shared closing, with one main heading',()=>{
 const html=renderedPage(PATH,'on');
 assert.deepEqual([...html.matchAll(/<section class="[^"]*"[^>]* id="([a-z-]+)"/g)].map(match=>match[1]),['cover','story','standards','walk','doctors','closing']);
 assert.match(html,/<h1 class="section-head__title" id="about-title">A family practice in Indira&nbsp;Nagar <em>since&nbsp;1992\.<\/em><\/h1>/);
 for(const section of ['cover','story','standards','walk','doctors'])assert.match(html,new RegExp(`<section class="page-about page-about__${section}" id="${section}" aria-labelledby="[a-z-]+"`));
 // Each section is labelled by a heading that exists.
 for(const id of attributeValues(ownSections(html),'aria-labelledby'))assert.match(html,new RegExp(`<h[12][^>]* id="${id}"`));
 assert.equal(count(ownSections(html),/<h2\b/g),4);assert.equal(count(ownSections(html),/<h3\b/g),walk.steps.length+doctorOrder.length);
 // The italic phrase is kept for three headings: the page's own, the story and the walk.
 assert.deepEqual([...ownSections(html).matchAll(/<em>([^<]*)<\/em>/g)].map(match=>match[1].replaceAll('&nbsp;',' ')),[cover.emphasis,story.emphasis,walk.emphasis]);
 // The still life beside the ledger is decoration: hidden from assistive technology, pictures without words.
 const still=/<div class="page-about__still" aria-hidden="true"[^>]*>.*?<\/div>/s.exec(html)[0];
 assert.equal(count(still,/<img\b[^>]*alt=""/g),standards.objects.length);
 for(const name of standards.objects)assert.ok(still.includes(clinicObjects[name].src));
});

test('About’s own sections are the same in both booking states and print no booking address',()=>{
 const on=ownSections(renderedPage(PATH,'on')),off=ownSections(renderedPage(PATH,'off'));
 assert.equal(on,off);
 assert.doesNotMatch(on,/href="\/booking|data-booking-only|data-booking-entry/);
 // No first-screen buttons to wait for: the phone bar is there from the start.
 assert.doesNotMatch(renderedPage(PATH,'on'),/data-bar-lead/);
});

test('About’s first screen is still: the cover carries no entrance, and its photograph loads at once',()=>{
 const html=renderedPage(PATH,'on');
 const coverHtml=html.slice(0,html.indexOf('id="story"'));
 assert.doesNotMatch(coverHtml,/data-enter/);
 const picture=/<figure class="photo-figure[^"]*page-about__frontage"[^>]*>.*?<img[^>]*>/s.exec(coverHtml)[0];
 assert.match(picture,/fetchpriority="high"/);assert.doesNotMatch(picture,/loading="lazy"/);
 assert.match(picture,new RegExp(`src="${clinicPhotos[cover.photo.photo].src}"`));
 assert.match(coverHtml,/sizes="\(min-width: 768px\) 640px, 92vw"/,'the frontage is never asked for wider than 640 px');
 assert.equal(count(coverHtml,/data-ambient/g),1,'one slow light on the page');
 assert.equal(count(html,/data-ambient(?!="(?:minor|float)")/g),1,'the closing\'s floating handset and the open dot are not lights');
 // Call opens the call panel (with scripts off it leads to the footer's numbers); directions leave the site.
 assert.match(coverHtml,/<a href="#footer-calls"[^>]*data-open-call=""/);
 const way=new RegExp(`<a class="text-link" href="${directions.replaceAll('.','\\.')}" target="_blank" rel="noopener">`);
 assert.match(coverHtml,way);assert.match(coverHtml,/\(opens Google Maps\)/);
 assert.equal(count(coverHtml,/class="button button--main/g),0,'no filled button in the cover');
});

test('About prints every word from the content module, escaped',()=>{
 const page=readable(renderedPage(PATH,'on'));
 const shown=[cover.runningHead,cover.heading,cover.lead,cover.call,cover.directions.label,cover.photo.key,cover.photo.caption,
  story.runningHead,story.numeral,story.heading,story.opening,story.body,story.pulled,story.handover,
  standards.runningHead,standards.heading,...standards.rows.flatMap(row=>[row.name,row.kind,row.meaning]),
  walk.runningHead,walk.heading,...walk.steps.flatMap(step=>[step.title,step.line]),
  doctorsSection.runningHead,doctorsSection.heading,doctorsSection.certificates.label,doctorsSection.certificates.link,
  ...doctorsSection.certificates.shown.flatMap(item=>[item.title,issuerLine(item.issuer)])];
 for(const value of shown)assert.ok(page.includes(plain(value)),`the page shows: ${value}`);
 const html=renderedPage(PATH,'on');
 // Escaped as it is printed (the line holds an apostrophe).
 assert.ok(html.includes(escapeHTML(walk.steps[0].line)));
 for(const label of [walk.label,walk.previous,walk.next,doctorsSection.certificates.shownLabel])assert.ok(html.includes(`aria-label="${escapeHTML(label)}"`),label);
});

test('About’s ledger has three ruled rows, and the walk three numbered steps that open large',()=>{
 const html=renderedPage(PATH,'on');
 assert.deepEqual(attributeValues(html,'data-standard'),['nabh','iso','observation']);
 assert.equal(count(html,/<div class="page-about__standard"[^>]*data-enter="rule"/g),3);
 assert.match(html,/class="section-head section-head--on-deep"/);
 assert.deepEqual(attributeValues(html,'data-step'),['arrive','doors','waiting']);
 assert.deepEqual(attributeValues(html,'data-view-step'),['0','1','2']);
 const views=html.match(/<button[^>]*data-view-step="\d"[^>]*>/g);
 for(const [index,tag] of views.entries()){
  assert.match(tag,/data-needs-script/,'a view button is hidden without scripts');
  assert.match(tag,/aria-haspopup="dialog"/);
  assert.ok(tag.includes(`aria-label="${escapeHTML(words.viewPhotoLabel(walk.steps[index].title))}"`));
 }
 for(const [index,step] of walk.steps.entries()){
  assert.ok(html.includes(`<span class="visually-hidden">Step ${index+1}: </span>${escapeHTML(step.title)}</h3>`));
  assert.ok(html.includes(`src="${clinicPhotos[step.photo].src}"`));
 }
 assert.equal(count(html,/class="page-about__step-number" aria-hidden="true"/g),3);
 // A walk photograph is never asked for wider than its frame.
 const asked=[...html.matchAll(/sizes="([^"]*250px)"/g)].flatMap(match=>[...match[1].matchAll(/(\d+)px(?=,|$)/g)].map(size=>Number(size[1])));
 assert.equal(asked.length,3*walk.steps.length);assert.ok(Math.max(...asked)<=300,'a walk photograph is never asked for wider than 300 px');
 assert.equal(count(html,/data-still-shelf/g),1);
});

test('About names both doctors without buttons, and its certificates teaser leads to all of them',()=>{
 const html=ownSections(renderedPage(PATH,'on'));
 assert.deepEqual(attributeValues(html,'data-doctor'),doctorOrder);
 assert.doesNotMatch(html,/doctor-mini-card__actions/,'the closing below carries Book and Call');
 for(const id of doctorOrder)assert.ok(html.includes(`href="${doctors[id].path}"`),`a link to ${doctors[id].name}’s profile`);
 assert.match(html,/<a class="text-link" href="\/meet-doctor" data-open-certificates="">/);
 // Each teaser certificate is printed once: a frame that opens all the certificates at itself where
 // scripts run, and leads to its own picture where they do not (never a button that does nothing).
 const shown=doctorsSection.certificates.shown.map(item=>item.id);
 assert.deepEqual(attributeValues(html,'data-view-certificate'),shown);
 assert.equal(count(html,/<figure class="certificate-frame[^"]*"[^>]*><a class="certificate-frame__mat certificate-frame__mat--view" href="\/certificates\/[a-z0-9-]+\.webp" aria-label="View: [^"]+" data-view-certificate="[^"]+" data-view-set="all">/g),shown.length);
 assert.doesNotMatch(html,/<button class="certificate-frame__mat/);
 assert.equal(count(html,/<ul class="page-about__documents"[^>]*data-about-documents>/g),1);
});

test('a walk photograph in the viewer: the picture, its step’s words, and the way to its neighbours',()=>{
 for(const [index,step] of walk.steps.entries()){
  const slide=walkSlide(index);
  assert.ok(slide.includes(`data-viewer-step="${index}"`)&&slide.includes(`src="${clinicPhotos[step.photo].src}"`));
  assert.ok(readable(slide).includes(`${index+1} · ${step.title}`)&&readable(slide).includes(plain(step.line)));
  assert.ok(readable(slide).includes(`${index+1} of ${walk.steps.length}`));
  assert.match(slide,/<button[^>]*aria-label="Previous photograph"[^>]*data-viewer-previous>/);
  assert.match(slide,/<button[^>]*aria-label="Next photograph"[^>]*data-viewer-next>/);
  assert.match(slide,/aria-live="polite"/);
 }
 assert.throws(()=>walkSlide(3),/The walk has no step 3/);assert.throws(()=>walkSlide(-1),/no step/);
 assert.equal(typeof about(pageContext({path:PATH,mode:'off',now:TEST_NOW})),'string');
});

// ---- behaviour ----

/** Something that takes listeners, for tests: `fire(type, event)` calls them. */
function target(extra={}){
 const listeners=new Map();
 return {listeners,
  addEventListener(type,handler,options={}){
   if(options?.signal?.aborted)return;
   const entry={handler,options};
   if(!listeners.has(type))listeners.set(type,[]);
   listeners.get(type).push(entry);
   options?.signal?.addEventListener('abort',()=>this.removeEventListener(type,handler),{once:true});
  },
  removeEventListener(type,handler){listeners.set(type,(listeners.get(type)||[]).filter(entry=>entry.handler!==handler));},
  fire(type,event={}){for(const entry of [...(listeners.get(type)||[])]){entry.handler(event);if(entry.options?.once)this.removeEventListener(type,entry.handler);}},
  ...extra};
}
/** The shared viewer as the page sees it: drawing a slide makes two fresh arrows. */
function fakeViewer(){
 const page={activeElement:null};
 const node=target({ownerDocument:page});
 let arrows={};
 const button=name=>target({disabled:false,name,focus(){page.activeElement=this;}});
 const content={html:'',
  set innerHTML(value){this.html=value;arrows={'[data-viewer-previous]':button('previous'),'[data-viewer-next]':button('next')};},
  get innerHTML(){return this.html;},
  querySelector:selector=>selector==='button:not(:disabled)'?Object.values(arrows).find(arrow=>!arrow.disabled)||null:arrows[selector]||null};
 const viewer={opened:null,node:()=>node,content:()=>content,open(options){this.opened=options;content.innerHTML=options.html;}};
 return {viewer,node,page,html:()=>content.html,arrow:name=>content.querySelector(`[data-viewer-${name}]`),step:()=>Number(/data-viewer-step="(\d)"/.exec(content.html)[1])};
}

test('the walk’s one decision: which step a control names',()=>{
 assert.equal(stepIndex('2'),2);assert.equal(stepIndex('0'),0);assert.equal(stepIndex(1),1);
 for(const bad of ['3','-1','x','',null,undefined])assert.equal(stepIndex(bad),0,`${bad} falls back to the first step`);
 assert.equal(stepIndex('4',6),4);
});

test('a walk photograph opens in the shared viewer on its own step, and the arrows stop at either end',()=>{
 const fake=fakeViewer(),trigger={name:'button'},scope=new AbortController();
 openWalkViewer({viewer:fake.viewer},{index:'1',trigger,signal:scope.signal});
 assert.equal(fake.viewer.opened.title,walk.label);assert.equal(fake.viewer.opened.trigger,trigger);
 assert.equal(fake.step(),1);
 assert.equal(fake.arrow('previous').disabled,false);assert.equal(fake.arrow('next').disabled,false);
 // Next, pressed with the focus on it: the last step; its arrow is now flat, so the focus moves to Previous.
 fake.arrow('next').focus();fake.arrow('next').fire('click');
 assert.equal(fake.step(),2);assert.equal(fake.arrow('next').disabled,true);assert.equal(fake.page.activeElement,fake.arrow('previous'));
 // ← and → move too; ← at the first step and → at the last do nothing.
 const key=name=>({key:name,preventDefault(){}});
 fake.node.fire('keydown',key('ArrowRight'));assert.equal(fake.step(),2);
 fake.node.fire('keydown',key('ArrowLeft'));fake.node.fire('keydown',key('ArrowLeft'));assert.equal(fake.step(),0);
 assert.equal(fake.arrow('previous').disabled,true);
 fake.node.fire('keydown',key('ArrowLeft'));assert.equal(fake.step(),0);
 // Every slide is this page's own markup for that step.
 assert.equal(fake.viewer.content().html,walkSlide(0));
 // The viewer is left open while the page changes: the keys stop with the page.
 scope.abort();
 fake.node.fire('keydown',key('ArrowRight'));assert.equal(fake.step(),0);
});

test('the viewer walk is safe without a viewer and with a nonsense step',()=>{
 assert.doesNotThrow(()=>openWalkViewer(undefined));assert.doesNotThrow(()=>openWalkViewer({}));
 const fake=fakeViewer();
 openWalkViewer({viewer:fake.viewer},{index:'nonsense'});
 assert.equal(fake.step(),0);
 openWalkViewer({viewer:fake.viewer});
 assert.equal(fake.step(),0);
});

test('binding About: each view button, and its photograph, opens the viewer on that step',()=>{
 const fake=fakeViewer(),scope=new AbortController();
 const controls=[0,1,2].map(index=>{
  const frame=target(),photo={querySelector:selector=>selector==='.photo-figure__frame'?frame:null};
  return Object.assign(target({getAttribute:name=>name==='data-view-step'?String(index):null,closest:selector=>selector==='[data-step-photo]'?photo:null}),{frame});
 });
 // One button stands alone (no photograph wrapper): it still works.
 const lone=target({getAttribute:()=>'1',closest:()=>null});
 const root={querySelectorAll:selector=>selector==='[data-view-step]'?[...controls,lone]:[],querySelector:()=>null};
 bindAbout(root,{signal:scope.signal,services:{viewer:fake.viewer}});
 controls[2].fire('click');
 assert.equal(fake.step(),2);assert.equal(fake.viewer.opened.trigger,controls[2]);
 controls[0].frame.fire('click');
 assert.equal(fake.step(),0);assert.equal(fake.viewer.opened.trigger,controls[0],'focus returns to the button, the one keyboard stop');
 lone.fire('click');assert.equal(fake.step(),1);
 // Everything stops when the page changes.
 scope.abort();
 assert.equal((controls[1].listeners.get('click')||[]).length,0);assert.equal((controls[1].frame.listeners.get('click')||[]).length,0);
 // Without the viewer service, or without a page, nothing is bound.
 const idle=target({getAttribute:()=>'0',closest:()=>null});
 bindAbout({querySelectorAll:()=>[idle],querySelector:()=>null},{services:{}});
 assert.equal(idle.listeners.size,0);
 assert.doesNotThrow(()=>bindAbout(null,{services:{viewer:fake.viewer}}));assert.doesNotThrow(()=>bindAbout({querySelectorAll:()=>[],querySelector:()=>null}));
});

test('binding About leaves the framed certificates to the shared frame: no listener of its own on them',()=>{
 const documents=target(),scope=new AbortController();
 const root={querySelectorAll:()=>[],querySelector:selector=>selector==='[data-about-documents]'?documents:null};
 bindAbout(root,{signal:scope.signal,services:{viewer:fakeViewer().viewer}});
 assert.equal(documents.listeners.get('click')?.length||0,0);
 scope.abort();
});
