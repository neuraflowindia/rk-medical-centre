// The page around the booking screens (`/booking`, `/booking-details`), its panel, its words, the
// booking stylesheets, and the few things about the lazy booking bundle that can be checked
// without a browser (it is JSX: the browser smoke check exercises it).
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {doctors} from '../../src/clinic/model.mjs';
import {bookingPage,bookingDetailsPage,bookingUnavailableWords} from '../../src/clinic/page-content/booking.mjs';
import {bookingPaths,callRows} from '../../src/clinic/page-content/shared.mjs';
import {utilityMetadata} from '../../src/clinic/page-metadata.mjs';
import {booking,bookingHead,bookingUnavailable,bookingDoctors,PANEL_STATES} from '../../src/site/pages/booking/booking.mjs';
import {bindBooking} from '../../src/site/pages/booking/booking.behaviour.mjs';
import {bookingDetails} from '../../src/site/pages/booking-details/booking-details.mjs';
import {bindBookingDetails} from '../../src/site/pages/booking-details/booking-details.behaviour.mjs';
import {pages} from '../../src/site/runtime/registry.mjs';
import {styleProblems,stripComments} from './support/css-rules.mjs';
import {checkPage,renderedApp,renderedPage,count,attributeValues} from './support/page-contract.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const read=name=>readFileSync(root+name,'utf8');
const SCREENS=[['/booking',bookingPage],['/booking-details',bookingDetailsPage]];

test('both booking screens keep the page contract in both booking states',()=>{
 for(const [path] of SCREENS)for(const mode of ['on','off']){
  const page=checkPage(path,mode);
  assert.equal(count(page,/id="clinic-booking-root"/g),1,`${path}: one place for the booking screens`);
  assert.match(page,/^<section class="page-booking[ "]/,`${path}: the page's own root`);
 }
 assert.equal(pages['/booking'].chrome,'slim');assert.equal(pages['/booking-details'].chrome,'slim');
 assert.equal(pages['/booking'].island,'booking');assert.equal(pages['/booking-details'].island,'details');
});

test('the head: the page\'s one heading with one phrase in italics, and one link to the other screen',()=>{
 for(const [path,words] of SCREENS){
  const page=renderedPage(path);
  assert.ok(words.heading.endsWith(words.emphasis),'the phrase in italics closes the heading');
  const italic=phrase=>`<em>${phrase.replaceAll(' ','&nbsp;').replace('.','\\.')}</em>`;
  // the booking page's heading has a second reading for the moment a booking is made; "Find your booking" has one
  assert.match(page,new RegExp(words.done
   ?`<h1 class="page-booking__title"><span class="page-booking__title-now">[^<]*${italic(words.emphasis)}</span><span class="page-booking__title-done">[^<]*${italic(words.done.emphasis)}</span></h1>`
   :`<h1 class="page-booking__title">[^<]*${italic(words.emphasis)}</h1>`));
  assert.equal(count(page,/<em>/g),words.done?2:1,'one phrase in italics in each reading');
  const links=attributeValues(page,'href').filter(href=>href.startsWith('/'));
  assert.deepEqual(links,[words.link.path],`${path}: one link in the page itself`);
  assert.ok(page.includes(`aria-label="${words.link.spoken}"`));assert.ok(page.includes('>'+words.link.label+'<'));
  assert.ok(utilityMetadata[path].title.startsWith(words.heading.replace(/\.$/,'')),'the heading is the reviewed title, with its full stop');
 }
 assert.equal(bookingPage.link.path,bookingPaths.find);assert.equal(bookingDetailsPage.link.path,bookingPaths.book);
 // once a booking is made: "Your visit.", shown by the stylesheet when the booking screens mark the page
 assert.deepEqual(bookingPage.done,{heading:'Your visit.',emphasis:'visit.'});assert.equal(bookingDetailsPage.done,undefined);
 const sheet=read('src/site/pages/booking/booking.css');
 assert.match(sheet,/\.page-booking__title-done \{ display: none; \}/,'without the mark the page reads "Book your visit."');
 assert.match(sheet,/\.page-booking\[data-booking-screen="receipt"\] \.page-booking__title-now \{ display: none; \}/);
 assert.match(sheet,/\.page-booking\[data-booking-screen="receipt"\] \.page-booking__link \{ visibility: hidden; \}/);
 assert.match(read('src/booking/clinic-booking.jsx'),/page\.setAttribute\('data-booking-screen', screen\)/);
 assert.equal(bookingHead(bookingPage),renderedPage('/booking').match(/<div class="page-booking__head">.*?<\/div><\/div>/)[0]);
 // "Find your booking" carries both roots: it shares the head and the panel with the booking page
 assert.match(renderedPage('/booking-details'),/^<section class="page-booking page-booking-details">/);
 // booking is OFF: the head's link has no address and is hidden, like every other booking link
 for(const [path] of SCREENS)assert.match(renderedApp(path,'off'),/<a class="text-link page-booking__link"[^>]*data-booking-href="[^"]+"[^>]*hidden inert/);
 assert.deepEqual(bookingDoctors,['sanjay','parul']);
});

test('the panel shown while the booking screens cannot be used: four states, the clinic\'s numbers, one way to try again',()=>{
 assert.deepEqual(PANEL_STATES,['opening','checking','unavailable','error']);
 for(const state of ['checking','unavailable','error']){
  const panel=bookingUnavailable({state});
  assert.match(panel,new RegExp(`^<div class="page-booking__panel" data-booking-unavailable data-state="${state}">`));
  assert.match(panel,new RegExp(`<h2 class="page-booking__status" role="status">${bookingUnavailableWords[state]}</h2>`));
  assert.ok(panel.includes(bookingUnavailableWords.help));
  assert.equal(count(panel,/data-booking-retry/g),1);assert.ok(panel.includes('>'+bookingUnavailableWords.retry+'<'));
  assert.equal(count(panel,/data-clinic-contacts/g),1);
  for(const row of callRows())assert.ok(panel.includes(`href="${row.href}"`),`${state}: ${row.name}'s number`);
  assert.doesNotMatch(panel,/<h1\b|STAND-IN|undefined/);
  assert.equal(panel.includes(bookingUnavailableWords.kept),false,'said only when booking stops in the middle of the steps');
  for(const src of attributeValues(panel,'src'))assert.ok(existsSync(root+'public'+src),src);
  assert.match(panel,/<img class="page-booking__object"[^>]* alt=""/,'the object is decoration');
 }
 // each state has its own mark, so the difference is never colour alone
 const marks=['checking','unavailable','error'].map(state=>/<use href="#i-([a-z]+)"/.exec(bookingUnavailable({state}))[1]);
 assert.deepEqual(marks,['clock','info','alert']);
 // the doctor already chosen: only that doctor's number
 const one=bookingUnavailable({state:'unavailable',doctor:'parul'});
 assert.ok(one.includes(`href="tel:${doctors.parul.tel}"`));assert.equal(one.includes(doctors.sanjay.tel),false);
 assert.equal(count(bookingUnavailable({doctor:'nobody'}),/data-call-row=/g),2,'an unknown doctor shows both');
 // booking stopped while someone was in the steps
 assert.ok(bookingUnavailable({state:'unavailable',doctor:'sanjay',kept:true}).includes(`<p class="page-booking__kept">${bookingUnavailableWords.kept}</p>`));
 // while the screens load: the words and the panel's shape, nothing to press
 const opening=bookingUnavailable({state:'opening'});
 assert.match(opening,/role="status">Opening appointment booking…<\/p>/);assert.equal(count(opening,/page-booking__ghost/g),3);
 assert.doesNotMatch(opening,/<button|<a |data-booking-unavailable/);
 assert.equal(bookingUnavailable(),bookingUnavailable({state:'unavailable'}));
 assert.throws(()=>bookingUnavailable({state:'closed'}),/Unknown booking panel state: closed/);
});

test('the words around the booking screens are complete and typed with proper marks',()=>{
 const all=[bookingPage,bookingDetailsPage,bookingUnavailableWords].flatMap(group=>Object.values(group)).flatMap(value=>typeof value==='string'?[value]:Object.values(value));
 assert.equal(all.length,19);
 for(const text of all){assert.ok(typeof text==='string'&&text.trim().length>0);assert.doesNotMatch(text,/['"]|STAND-IN|<|>/,text);}
 assert.deepEqual(Object.keys(bookingUnavailableWords).sort(),['checking','error','help','kept','opening','retry','unavailable']);
});

test('the pages\' own behaviour files import cleanly and do nothing by themselves',()=>{
 assert.equal(bindBooking(null),undefined);assert.equal(bindBooking({},{signal:new AbortController().signal}),undefined);
 assert.equal(bindBookingDetails(null),undefined);assert.equal(bindBookingDetails({},{}),undefined);
});

const SHEETS=['src/booking/clinic-booking.css','src/booking/vendor.css','src/site/pages/booking/booking.css','src/site/pages/booking-details/booking-details.css'];
test('the booking stylesheets follow the style rules and use only tokens that exist',()=>{
 const tokens=new Set([...read('src/site/styles/tokens.css').matchAll(/(--[a-z0-9-]+)\s*:/g)].map(match=>match[1]));
 for(const name of SHEETS){
  const css=read(name);
  assert.doesNotMatch(css,/style-rules:\s*pending/,`${name} is finished`);
  assert.deepEqual(styleProblems(css),[],name);
  const own=new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(match=>match[1]));
  const missing=[...new Set([...stripComments(css).matchAll(/var\((--[a-z0-9-]+)/g)].map(match=>match[1]))].filter(token=>!tokens.has(token)&&!own.has(token));
  assert.deepEqual(missing,[],`${name} uses a token that tokens.css does not define`);
 }
 // every rule of the steps' stylesheet is in the pages layer and starts at one of the booking bundle's own roots
 const steps=stripComments(read('src/booking/clinic-booking.css'));
 assert.match(steps.trimStart(),/^@layer pages \{/);
 assert.doesNotMatch(steps,/\.(site-header|site-footer|page-home|button--|call-row)\b[^{]*\{/,'no shared part is restyled');
 // nothing here is smaller than the smallest type size, and every pressable thing has the tap height
 assert.doesNotMatch(steps,/font-size\s*:/);
});

test('the package\'s own stylesheets sit in the vendor layer, and their forced declarations are the five that were designed around',()=>{
 const vendor=read('src/booking/vendor.css');
 const sheets=[...stripComments(vendor).matchAll(/@import\s+"([^"]+)"\s+layer\(vendor\);/g)].map(match=>match[1]);
 assert.deepEqual(sheets.map(name=>name.split('/').pop()),['booking-details-fields.css','date-time-fields.css','receipt-fields.css']);
 const forced=sheets.flatMap(name=>{
  const css=readFileSync(fileURLToPath(new URL(name,new URL('../../src/booking/vendor.css',import.meta.url))),'utf8');
  return [...css.matchAll(/([a-z-]+)\s*:\s*[^;{}]*!important/g)].map(match=>`${name.split('/').pop()}: ${match[1]}`);
 });
 assert.deepEqual(forced,['booking-details-fields.css: background','booking-details-fields.css: color','booking-details-fields.css: transition',
  'booking-details-fields.css: transform','receipt-fields.css: transition'],'the package changed what it forces: look at the booking screens again');
 // "Back to my bookings" is the forced see-through button: it is given its colour through the package's own variable
 assert.match(read('src/booking/clinic-booking.css'),/\.clinic-booking \.abs-lookup-back \{ --abs-fg: var\(--action\);/);
 assert.match(read('src/booking/shared-fields.jsx'),/^import '\.\/vendor\.css';$/m);
});

test('the two rows put away in the package\'s list of facts are still where the stylesheet finds them, and still say nothing new',()=>{
 // The rows have no names of their own, so the stylesheet hides the first ("Service") and the fourth ("Time zone") by their place.
 const source=read('appointment-system/browser/booking/receipt-fields.mjs');
 const list=source.slice(source.indexOf("h('dl',{className:'abs-receipt-facts'}"));
 const rows=[...list.matchAll(/fact\((?:r\.meeting_mode==='in_person'\?)?'([^']+)'/g)].map(match=>match[1]);
 assert.deepEqual(rows.slice(0,5),['Service','Doctor','Appointment','Time zone','Duration'],'the package changed the order of its facts: look at the hidden rows again');
 assert.match(list,/fact\('Service',r\.service_name\),isV2\(r\)\?fact\('Doctor',r\.resource_name\):null,/,'"Doctor" follows "Service" in the clinic\'s kind of receipt');
 const css=read('src/booking/clinic-booking.css');
 assert.match(css,/\.clinic-booking \.abs-receipt-facts > div:nth-child\(1\), \.clinic-booking \.abs-receipt-facts > div:nth-child\(4\) \{ display: none; \}/);
 // "Service" repeats "Doctor" only while every service carries its doctor's name; "Time zone" says nothing only while every visit is in person
 const settings=JSON.parse(read('appointment-settings/business-settings.json'));
 for(const service of settings.services.filter(item=>item.enabled))
  assert.equal(service.name,settings.resources.find(item=>item.id===service.resource_id).name,`${service.id}: a service with a name of its own must show its "Service" row again`);
 assert.equal(settings.meeting,'in_person');assert.equal(settings.display_duration,false,'a shown duration would move "Time zone" down a row');
});

test('the booking bundle stays lazy, keeps the hooks others read, and keeps the form usable during state checks',()=>{
 const island=read('src/booking/clinic-booking.jsx');
 // contract 2.6: reached only through a dynamic import
 assert.match(read('src/site/runtime/booking-island.mjs'),/import\('\.\.\/\.\.\/booking\/clinic-booking\.jsx'\)/);
 for(const name of ['src/main.jsx','src/site/runtime/start.mjs','src/site/runtime/registry.mjs','src/site/pages/booking/booking.mjs'])
  assert.doesNotMatch(read(name),/from\s+'[^']*clinic-booking\.jsx'/,`${name} must not import the booking bundle statically`);
 assert.match(island,/export const mountBooking=|export const mountBooking =/);assert.match(island,/export const mountBookingDetails ?=/);
 // the smoke check counts the doctors through this hook
 assert.match(island,/className=\{classes\('doctor-choices'/);assert.match(island,/<input type="radio" className="visually-hidden" name=\{id \+ 'doctor'\}/);
 // The defect of 17 November 2026: draft controls followed `available`, which the engine withdraws
 // for a moment every five seconds, so the form switched off, an open calendar closed and typing lost
 // its cursor. Draft controls follow `viewAvailable`; only booking, paying and re-reading need admission.
 assert.match(island,/const canEdit = [^;\n]*flow\.viewAvailable;/);assert.doesNotMatch(island,/const canEdit = [^;\n]*flow\.available/);
 assert.match(island,/const disabled = s\.busy \|\| !flow\.viewAvailable \|\| !!s\.credential;/);
 assert.match(island,/<DateField[^>]*\n?[^>]*available=\{flow\.viewAvailable\}/);
 assert.doesNotMatch(island,/disabled=\{[^}]*!flow\.available/,'no control is switched off by the state check');
 assert.match(island,/useHeldAction\(flow\.available && !s\.busy, flow\.viewAvailable\)/,'actions that need admission wait for it (and for the engine to be idle) instead');
 // after the last press and on the appointment card no button is switched off while the engine reads: a press is kept instead
 const after=island.slice(island.indexOf("if (screen === 'receipt')"),island.indexOf('const stepInfo ='));
 assert.ok(after.length>1500);assert.doesNotMatch(after,/disabled=/);
 // Back, Forward and refresh: the steps are history entries the flow marks itself, and what is kept
 // lives in the tab's own storage only (never in storage that outlasts the tab)
 assert.match(island,/window\.history\.pushState\(withMark\(window\.history\.state, mark\), ''\)/);
 assert.match(island,/window\.addEventListener\('popstate', onPop, true\)/,'before the site\'s router, so the page is not drawn again');
 assert.match(island,/if \(!mark\) return;/,'an entry outside the flow is left to the site\'s router');
 assert.equal(island.match(/sessionStorage/g).length,1);assert.doesNotMatch(island,/localStorage|indexedDB|document\.cookie/);
 assert.match(island,/if \(s\.credential \|\| s\.receipt\) \{ dropDraft\(\); return; \}/,'removed the moment the booking is sent');
 // no dead press: the main button is switched off only while step 2 is being sent
 assert.match(island,/data-booking-continue\n\s+disabled=\{step === 2 && disabled\}/);
 // words and decisions come from the tested module, not from the markup
 assert.match(island,/from '\.\/booking-steps\.mjs';/);
 assert.doesNotMatch(island,/NeuraFlow|Claude|agency/i);
});
