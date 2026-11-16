// The Treatments page: its words against the clinic's data, and its markup in both booking states.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPage,renderedPage,renderedApp,attributeValues,count,TEST_NOW} from './support/page-contract.mjs';
import {treatmentsPage as words,treatmentGroups,treatmentRows,rowIds,groupIds,rowById,groupOfRow,rowAnchor,rowAddress,arrivalFor,showingLabel} from '../../src/clinic/page-content/treatments.mjs';
import {treatments,topicIds} from '../../src/site/pages/treatments/treatments.mjs';
import {pageContext} from '../../src/site/runtime/render.mjs';
import {doctors,doctorFacts} from '../../src/clinic/model.mjs';
import {topics,topicById,groups,aliases,doctorOrder} from '../../src/clinic/care-catalogue.mjs';
import {doctorChips,treatmentAnchor} from '../../src/clinic/page-content/home.mjs';
import {clinicObjects} from '../../src/clinic/client-media.mjs';
import {feeLabel,bookWithPath,bookWithLabel,callDoctorLabel,doctorShortName} from '../../src/clinic/page-content/shared.mjs';
import {text} from '../../src/site/lib/html.mjs';

const PATH='/treatment';
/** Every string inside a value, however deeply nested. */
function strings(value,found=[]){
 if(typeof value==='string')found.push(value);
 else if(value&&typeof value==='object')for(const item of Object.values(value))strings(item,found);
 return found;
}
const plain=html=>html.replace(/<[^>]+>/g,' ').replaceAll('&nbsp;',' ').replaceAll('&amp;','&').replaceAll('&#39;','\'').replace(/\s+/g,' ');
const section=(html,start,end)=>html.slice(html.indexOf(start),end?html.indexOf(end,html.indexOf(start)):undefined);
/** One row's own markup: from its <li> to the next row (or the end of its list). */
function topicMarkup(html,id){
 const from=html.indexOf(`<li class="page-treatments__topic" id="${id}"`);
 assert.ok(from>=0,`row ${id} is printed`);
 const next=html.indexOf('<li class="page-treatments__topic"',from+10),close=html.indexOf('</ul></section>',from);
 return html.slice(from,next>=0&&next<close?next:close);
}

// ---- words and data ----

test('the nine rows are Home\'s chips, in Home\'s order, so every chip lands on its own row',()=>{
 assert.deepEqual(rowIds,['diabetes','blood-pressure','thyroid','fever-infections','general-health','womens-health','pregnancy','after-childbirth','ultrasound']);
 const chips=doctorOrder.flatMap(id=>doctorChips(id));
 assert.deepEqual(rowIds,chips.map(chip=>chip.id));
 for(const chip of chips){
  const row=rowById(chip.id);
  assert.equal(rowAddress(row.id),treatmentAnchor(chip.id));assert.equal(chip.href,`${PATH}${rowAnchor(row.id)}`);
  assert.equal(row.object,chip.object,'a concern keeps its picture between Home and Treatments');
  assert.equal(row.topic,chip.topic);assert.equal(row.href,`#${row.id}`);
 }
 assert.equal(rowById('nothing'),null);assert.equal(groupOfRow('nothing'),null);
});

test('rows stand on the care catalogue: every topic has its row, and what to bring is the catalogue\'s own list',()=>{
 for(const topic of topics){
  const row=rowById(topic.id);
  assert.ok(row,`the catalogue topic ${topic.id} has a row`);
  assert.equal(row.topic,topic.id);assert.equal(row.doctor,topic.doctor);
  assert.deepEqual(row.bring,topic.bring);
 }
 for(const row of treatmentRows){
  const topic=topicById(row.topic);
  assert.ok(topic,`${row.id} belongs to a catalogue topic`);
  assert.equal(topic.doctor,row.doctor);assert.equal(row.bring.length,3);
  assert.ok(Object.isFrozen(row)&&Object.isFrozen(row.bring));
 }
 // The one row that is not a catalogue topic belongs to pregnancy care and is named as the clinic names it.
 const after=rowById('after-childbirth');
 assert.equal(after.topic,'pregnancy');assert.deepEqual(after.bring,topicById('pregnancy').bring);
 assert.ok(doctorFacts.parul.care.some(item=>item.text===after.title&&item.topic==='pregnancy'));
});

test('row names: the catalogue\'s titles, Home\'s chip label for women\'s health, the clinic\'s own line for after childbirth',()=>{
 for(const id of ['diabetes','blood-pressure','thyroid','fever-infections','general-health','pregnancy','ultrasound'])assert.equal(rowById(id).title,topicById(id).title);
 assert.equal(rowById('womens-health').title,doctorChips('parul').find(chip=>chip.id==='womens-health').label);
 assert.equal(rowById('womens-health').title,'Periods & PCOS');
 assert.equal(rowById('after-childbirth').title,'Care after childbirth');
 assert.equal(new Set(treatmentRows.map(row=>row.title)).size,9,'no two rows share a name');
});

test('two groups, each headed by its doctor, with that doctor\'s rows',()=>{
 assert.deepEqual(groupIds,['physician','women']);assert.deepEqual(groupIds,groups.map(group=>group.id));
 assert.deepEqual(treatmentGroups.map(group=>group.doctor),doctorOrder);
 assert.deepEqual(treatmentGroups.map(group=>group.rows.length),[5,4]);
 assert.deepEqual(treatmentGroups.map(group=>group.tone),['sage','rose']);
 for(const group of treatmentGroups){
  assert.equal(group.name,doctors[group.doctor].name);assert.equal(group.role,doctors[group.doctor].role);
  assert.ok(group.rows.every(row=>row.doctor===group.doctor&&groupOfRow(row.id)===group));
 }
 assert.equal(words.groups,treatmentGroups);
});

test('each row has its own paper-cut object: nine different ones, never a figure',()=>{
 const objects=treatmentRows.map(row=>row.object);
 assert.equal(new Set(objects).size,9);
 for(const name of objects){assert.ok(Object.hasOwn(clinicObjects,name),name);assert.match(clinicObjects[name].src,/^\/clinic-assets\/object-[a-z-]+-\d+\.webp$/);assert.doesNotMatch(name,/figure|woman|man|a27/);}
});

test('the page\'s own lines are short, plain, properly punctuated and free of markup',()=>{
 for(const row of treatmentRows){
  assert.ok(row.deck.length<=44,`${row.id}: the deck is one short line (${row.deck.length})`);
  assert.ok(row.what.length<=150&&row.when.length<=110,`${row.id}: the labelled lines stay short`);
  for(const line of [row.deck,row.what,row.when])assert.match(line,/^[A-Z].*\.$/,`${row.id}: "${line}" is a sentence`);
 }
 // (The doctors' names and roles are the model's own words; they are checked where they are written.)
 const {groups:unused,...ownWords}=words;
 for(const line of strings({page:ownWords,rows:treatmentRows})){
  assert.doesNotMatch(line,/[<>]/,`markup in "${line}"`);
  assert.doesNotMatch(line,/['"]/,`typewriter quotes in "${line}"`);
  assert.doesNotMatch(line,/\b(?:cure|guarantee|best|painless|100%)\b/i,`a claim in "${line}"`);
 }
 assert.equal(words.heading,'What we can help with.');assert.ok(words.heading.endsWith(words.emphasis));
 assert.ok(words.doctors.heading.endsWith(words.doctors.emphasis));
 assert.equal(words.fee,`${feeLabel()} per consultation`);assert.match(words.fee,/^₹800 /);
 assert.deepEqual(Object.values(words.labels),['What it is','When to come','What to bring']);
 assert.equal(showingLabel('Diabetes care'),'Showing Diabetes care');
});

test('an address names a row or a group: the page\'s own places, and every older form of link',()=>{
 const none={row:null,group:null};
 assert.deepEqual(arrivalFor(),none);assert.deepEqual(arrivalFor({search:'',hash:''}),none);
 for(const row of treatmentRows){
  const expected={row:row.id,group:groupOfRow(row.id).id};
  assert.deepEqual(arrivalFor({hash:`#${row.id}`}),expected);
  assert.deepEqual(arrivalFor({search:`?topic=${row.id}`}),expected);
 }
 assert.deepEqual(arrivalFor({hash:'#women'}),{row:null,group:'women'});
 assert.deepEqual(arrivalFor({hash:'#physician'}),{row:null,group:'physician'});
 assert.deepEqual(arrivalFor({search:'?area=women'}),{row:null,group:'women'});
 assert.deepEqual(arrivalFor({search:'?area=elsewhere'}),none);
 for(const [service,topic] of Object.entries(aliases))assert.deepEqual(arrivalFor({search:`?service=${service}`}),{row:topic,group:groupOfRow(topic).id});
 assert.deepEqual(arrivalFor({search:'?service=toString'}),none);
 assert.deepEqual(arrivalFor({search:'?topic=unknown'}),none);
 assert.deepEqual(arrivalFor({search:'?topic=unknown&service=ultrasound'}),{row:'ultrasound',group:'women'});
 // The place in the address wins over an older query; a place that is not this page's is ignored.
 assert.deepEqual(arrivalFor({search:'?topic=thyroid',hash:'#pregnancy'}),{row:'pregnancy',group:'women'});
 assert.deepEqual(arrivalFor({search:'?topic=thyroid',hash:'#closing'}),{row:'thyroid',group:'physician'});
 assert.deepEqual(arrivalFor({hash:'#%E0%A4%A'}),none);
 assert.deepEqual(arrivalFor({hash:'thyroid'}),{row:'thyroid',group:'physician'});
 assert.deepEqual(arrivalFor({search:null,hash:null}),none);
});

// ---- markup ----

test('Treatments keeps the page contract in both booking states',()=>{
 for(const mode of ['on','off'])checkPage(PATH,mode);
});

test('the page is a title page, the index, the two doctors and the closing, with headings in order',()=>{
 const html=renderedPage(PATH,'on');
 assert.match(html,/^<div class="page-treatments page-treatments__contents">/);
 assert.match(html,/<h1 class="section-head__title" id="treatments-title">What we can <em>help&nbsp;with\.<\/em><\/h1>/);
 assert.equal(count(html,/section-head__running/g),1,'one running head on the page');
 const levels=[...html.matchAll(/<h([1-6])\b/g)].map(match=>Number(match[1]));
 assert.deepEqual(levels,[1,2,3,3,3,3,3,2,3,3,3,3,2,3,3,2]);
 assert.ok(html.indexOf('page-treatments__head')<html.indexOf('page-treatments__index')&&html.indexOf('page-treatments__index')<html.indexOf('page-treatments__doctors')&&html.indexOf('page-treatments__doctors')<html.indexOf('class="closing"'));
 assert.match(html,/<section class="page-treatments__index" aria-label="Choose a concern" data-topics>/);
 for(const group of treatmentGroups){
  assert.match(html,new RegExp(`<section class="page-treatments__group page-treatments__group--${group.tone}" id="${group.id}" aria-labelledby="group-${group.id}" data-topic-group="${group.id}">`));
  assert.ok(html.includes(`<span class="page-treatments__byline-name">${text(group.name)}</span> <span class="page-treatments__byline-role">${text(group.role)}</span>`));
 }
});

test('the guide row is the first-screen action: it opens the call sheet and, without scripts, leads to the footer\'s numbers',()=>{
 const html=renderedPage(PATH,'on'),tag=/<a class="page-treatments__guide"[^>]*>/.exec(html)[0];
 assert.match(tag,/href="#footer-calls"/);assert.match(tag,/\sdata-open-call(?=[\s>])/);assert.match(tag,/\sdata-bar-lead(?=[\s>])/);assert.match(tag,/aria-haspopup="dialog"/);
 assert.doesNotMatch(tag,/aria-label/,'its visible words are its name');
 assert.ok(plain(section(html,'<a class="page-treatments__guide"','</a>')).includes('Not sure? Call and we will guide you.'));
 assert.match(renderedApp(PATH,'on'),/id="footer-calls"/);
 assert.equal(count(html,/data-bar-lead/g),1);
});

test('every row is a link to its own place with its panel directly after it, carrying the row\'s words',()=>{
 const html=renderedPage(PATH,'on');
 assert.equal(count(html,/<li class="page-treatments__topic"/g),9);
 assert.deepEqual(attributeValues(html,'data-topic'),rowIds);
 for(const row of treatmentRows){
  const ids=topicIds(row.id),own=topicMarkup(html,row.id),words_=plain(own);
  assert.match(own,new RegExp(`^<li class="page-treatments__topic" id="${ids.item}" data-topic="${row.id}"><a class="page-treatments__row" href="#${row.id}" aria-controls="${ids.panel}" data-topic-row>`));
  assert.ok(own.includes(`<h3 class="page-treatments__row-title" id="${ids.title}">${text(row.title)}</h3><span class="page-treatments__row-deck">${text(row.deck)}</span>`));
  assert.ok(own.includes(`<div class="page-treatments__panel" id="${ids.panel}" role="region" aria-labelledby="${ids.title}" data-topic-panel>`));
  assert.ok(own.indexOf('</a>')<own.indexOf('page-treatments__panel-place'),'the panel follows its row');
  for(const line of [row.title,row.deck,row.what,row.when,...row.bring,'What it is','When to come','What to bring',doctors[row.doctor].name,'₹800 per consultation'])assert.ok(words_.includes(line),`${row.id}: "${line}"`);
  assert.equal(count(own,/<dt>/g),3);assert.equal(count(own,/<ul class="page-treatments__bring">/g),1);assert.equal(count(own,/#i-check/g),3);
  // the object: small in the row and large in the panel, the same file, always decorative
  const src=clinicObjects[row.object].src;
  assert.deepEqual(attributeValues(own,'src').filter(value=>value.includes('/clinic-assets/')),[src,src]);
  assert.ok(own.includes(`<span class="page-treatments__object" data-object="${row.object}" data-enter>`),'the object settles on entrance; the row itself stays put');
  assert.match(own,/<p class="page-treatments__panel-title" aria-hidden="true">/,'the larger name is for the eye only: no second heading');
  assert.doesNotMatch(own,/aria-expanded/,'the script says what is open; the page does not guess');
 }
 for(const tag of html.match(/<img\b[^>]*>/g))assert.match(tag,/\salt=""/,'every picture on this page is decorative');
 assert.doesNotMatch(html,/a27|figure-|woman-|man-/);
});

test('booking ON: every open row offers Book with its doctor, for its topic, and Call',()=>{
 const html=renderedPage(PATH,'on');
 for(const row of treatmentRows){
  const own=topicMarkup(html,row.id);
  assert.deepEqual(attributeValues(own,'href').filter(href=>href.startsWith('/booking')),[bookWithPath(row.doctor,row.topic)]);
  assert.ok(plain(own).includes(bookWithLabel(row.doctor)));
  const call=/<a[^>]*data-open-call="[^"]*"[^>]*>/.exec(own)[0];
  assert.match(call,new RegExp(`href="tel:\\${doctors[row.doctor].tel}"`));assert.match(call,new RegExp(`data-open-call="${row.doctor}"`));
  assert.ok(own.includes(`data-booking-on="Call" data-booking-off="${callDoctorLabel(row.doctor)}"`),'Call names the doctor while booking is off');
 }
 assert.equal(attributeValues(html,'href').filter(href=>href.startsWith('/booking?doctor=')).length,9);
});

test('booking OFF: no booking address is left, and Call names the doctor',()=>{
 const app=renderedApp(PATH,'off'),page=section(app,'<div class="page-treatments page-treatments__contents">','<section class="closing"');
 assert.doesNotMatch(page,/\shref="\/booking/);
 assert.equal(count(page,/data-booking-href="\/booking\?doctor=/g),9);
 for(const tag of page.match(/<a\b[^>]*data-booking-href[^>]*>/g))assert.match(tag,/\shidden\b[^>]*\sinert\b/);
 for(const id of doctorOrder)assert.ok(plain(page).includes(`Call ${doctorShortName(id)}`));
 assert.equal(count(page,/href="tel:/g),9,'each row keeps its Call');
});

test('the two doctors are shown once more for anything not listed, without buttons',()=>{
 const html=renderedPage(PATH,'on'),part=section(html,'<section class="page-treatments page-treatments__doctors"','<section class="closing"');
 assert.match(part,/<h2 class="section-head__title" id="treatments-doctors-title" data-enter>Something else <em>on&nbsp;your&nbsp;mind\?<\/em><\/h2>/);
 assert.equal(count(part,/<article class="doctor-mini-card/g),2);
 assert.deepEqual(attributeValues(part,'href').filter(href=>!href.startsWith('#i-')),doctorOrder.map(id=>doctors[id].path));
 assert.doesNotMatch(part,/class="button|href="tel:|\/booking/);
 assert.deepEqual(attributeValues(part,'data-doctor'),doctorOrder);
});

test('an older link that names a topic is drawn with that row open; anything else is drawn closed',()=>{
 const draw=search=>treatments(pageContext({path:PATH,mode:'on',now:TEST_NOW,search}));
 const open=html=>(html.match(/<li class="page-treatments__topic" id="[^"]+" data-topic="[^"]+" data-open>/g)||[]).map(tag=>/id="([^"]+)"/.exec(tag)[1]);
 assert.deepEqual(open(draw('')),[]);
 assert.deepEqual(open(draw('?topic=thyroid')),['thyroid']);
 assert.deepEqual(open(draw('?service=gynecology')),['womens-health']);
 assert.deepEqual(open(draw('?topic=after-childbirth')),['after-childbirth']);
 assert.deepEqual(open(draw('?area=women')),[]);assert.deepEqual(open(draw('?topic=<script>')),[]);
 assert.equal(draw('').length,renderedPage(PATH,'on').length);
});

test('nothing that moves on entrance wraps a panel (a moved wrapper would capture the laptop panel\'s place)',()=>{
 const html=renderedPage(PATH,'on'),index=section(html,'<section class="page-treatments__index"','<section class="page-treatments page-treatments__doctors"');
 assert.equal(count(index,/data-enter/g),11,'the two bylines and the nine objects enter; nothing else in the index does');
 assert.doesNotMatch(index,/<(?:li|ul|section|div|a)\b[^>]*data-enter/,'rows, lists and groups never move: the rhythm of the list stays even');
 assert.equal(count(html,/class="page-treatments__arch" data-ambient/g),9,'one slow light per panel; only the one that is shown runs');
});

test('the stylesheet styles only what the page prints, and knows the three ways a row opens',()=>{
 const css=readFileSync(new URL('../../src/site/pages/treatments/treatments.css',import.meta.url),'utf8');
 const html=renderedPage(PATH,'on'),printed=new Set(attributeValues(html,'class').flatMap(value=>value.split(/\s+/)));
 const styled=new Set([...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/\.(page-treatments[\w-]*)/g)].map(match=>match[1]));
 for(const name of styled)assert.ok(printed.has(name),`.${name} is styled but never printed`);
 // (A group's or a slot's colour family may be the default one: `--sage` needs no rule of its own.)
 for(const name of printed)if(name.startsWith('page-treatments__')&&!name.endsWith('--sage'))assert.ok(styled.has(name),`.${name} is printed but has no style`);
 assert.match(css,/\.page-treatments__topic\[data-open\]/);
 assert.match(css,/\.page-treatments__index:not\(\[data-topics-bound\]\) \.page-treatments__topic:target/);
 assert.match(css,/:not\(:has\(\.page-treatments__topic\[data-open\], \.page-treatments__topic:target\)\) \.page-treatments__group:first-child \.page-treatments__topic:first-child/);
 for(const object of new Set([...css.matchAll(/\[data-object="([^"]+)"\]/g)].map(match=>match[1])))assert.ok(treatmentRows.some(row=>row.object===object),`${object} is not a row's object`);
});
