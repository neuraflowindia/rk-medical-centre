// The Contact page as printed: the page contract in both booking states, every hook the message
// form's engine reads, the words against the data, and the page's own behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPage,renderedPage,renderedApp,attributeValues,count} from './support/page-contract.mjs';
import {contactPage,findUs,hours,weekRows,messageForm as words,privacyNotice} from '../../src/clinic/page-content/contact.mjs';
import {callRows,footer,timetable,bookingPaths} from '../../src/clinic/page-content/shared.mjs';
import {address,directions} from '../../src/clinic/model.mjs';
import {whatsappLink} from '../../src/clinic/standins.mjs';
import {lockUnboundControls} from '../../src/site/runtime/render.mjs';
import {text} from '../../src/site/lib/html.mjs';
import {addressWords} from '../../src/site/pages/contact/contact.mjs';
import {noticeWanted,bindNotice,bindContact} from '../../src/site/pages/contact/contact.behaviour.mjs';

const PATH='/contact';
const has=(html,words)=>html.includes(text(words));

test('Contact keeps the page contract in both booking states',()=>{
 for(const mode of ['on','off']){
  const page=checkPage(PATH,mode);
  assert.equal(count(page,/<section class="page-contact /g),4,'four sections, each starting at the page\'s root class');
  assert.match(page,/<h1[^>]*>Call, message <em>or&nbsp;visit\.<\/em><\/h1>/);
  assert.equal(count(page,/data-bar-lead/g),1,'the phone bar waits for the first screen');
  assert.doesNotMatch(page,/data-closing/,'the page is its own closing');
 }
});

test('first screen: both doctors by need with their digits, WhatsApp, and the changes line',()=>{
 const page=renderedPage(PATH,'on');
 for(const row of callRows()){
  assert.ok(has(page,row.name));assert.ok(has(page,row.need));assert.ok(has(page,row.digits));
  assert.ok(page.includes(`href="${row.href}"`),'a row dials: it never only scrolls');
 }
 assert.ok(attributeValues(page,'href').includes(whatsappLink()));
 assert.ok(has(page,contactPage.whatsapp.label));
 assert.ok(has(page,contactPage.changes));
 assert.match(page,/data-open-sign="closing"/);
 const order=['id="contact-title"','data-open-sign','data-call-row="sanjay"','data-call-row="parul"','wa.me','page-contact__actions'].map(mark=>page.indexOf(mark));
 assert.deepEqual([...order].sort((a,b)=>a-b),order,'heading, sign, the two rows, WhatsApp, then booking');
});

test('booking ON shows Book and Find your booking; OFF shows neither and says to call',()=>{
 const on=renderedApp(PATH,'on'),off=renderedApp(PATH,'off');
 assert.match(on,/<a href="\/booking" class="button button--main button--large page-contact__book">/);
 assert.ok(on.includes(`href="${bookingPaths.find}"`));
 assert.match(on,/<p class="page-contact__booking-off" data-booking-off-only hidden inert>/);
 assert.match(off,/<p class="page-contact__booking-off" data-booking-off-only>/);
 assert.ok(has(off,contactPage.bookingOff));
 assert.match(off,/<a data-booking-href="\/booking" class="button button--main button--large page-contact__book" hidden inert>/);
 assert.match(off,/<a class="text-link page-contact__find-booking" data-booking-href="\/booking-details" hidden inert>/);
 // The page never prints the page-entry control: while OFF it would lead back to this page.
 assert.doesNotMatch(renderedPage(PATH,'off'),/data-booking-entry/);
});

test('find us: the drawn map opens Google Maps, the frontage carries its caption, the address is whole',()=>{
 const page=renderedPage(PATH,'on');
 assert.doesNotMatch(page,/<iframe/,'no embedded map');
 assert.match(page,/<svg class="page-contact__map-art" viewBox="0 -30 680 430" role="img" aria-label="Drawn map\./);
 assert.equal(attributeValues(page,'href').filter(href=>href===directions).length,3,'the map (twice: once for the pointer only) and Get directions');
 assert.match(page,/<a class="page-contact__map-hit"[^>]*tabindex="-1" aria-hidden="true">/);
 for(const label of [findUs.locator.road,findUs.locator.west,findUs.locator.east,findUs.locator.pin,findUs.locator.open])assert.ok(has(page,label),label);
 assert.match(page,/src="\/client-photos\/frontage-from-ring-road-640\.webp"/);
 assert.ok(has(page,findUs.photo.caption));
 assert.ok(page.replaceAll('&nbsp;',' ').includes(`<address>${address}</address>`),'the whole address, as the clinic writes it');
 assert.equal(addressWords('1, A Road, Sector 18, Town, UP - 226016'),'1, A Road, Sector&nbsp;18, Town, UP&nbsp;-&nbsp;226016');
 assert.equal(addressWords('Plain <street>'),'Plain &lt;street&gt;');
 assert.ok(has(page,findUs.card.parking+'.'));
 assert.ok(has(page,findUs.locator.credit),'the map\'s data is credited beside it');
 assert.doesNotMatch(page,/clinic-gate|reception/,'the gate and reception photographs are never used');
});

test('hours: the one full timetable, seven rows, Sunday evening closed',()=>{
 const page=renderedPage(PATH,'on');
 const rows=[...page.matchAll(/<tr data-days="(\d)">.*?<\/tr>/g)];
 assert.deepEqual(rows.map(row=>row[1]),['1','2','3','4','5','6','0']);
 for(const [index,row] of weekRows().entries())assert.ok(rows[index][0].includes(`>${row.label}<`));
 assert.ok(rows[6][0].includes(`<td class="hours-table__none">${timetable.closed}</td>`));
 assert.equal(count(page,/data-today hidden/g),7,'today is marked by the browser, never by the build');
 assert.ok(has(page,hours.note.title));assert.ok(has(page,hours.note.text));
 assert.match(page,/<h2[^>]*id="hours-title"[^>]*>Open every day\. Sundays, <em>mornings&nbsp;only\.<\/em><\/h2>/);
});

test('the message form carries every hook the engine reads',()=>{
 const page=renderedPage(PATH,'on');
 const form=/<form class="message-form__sheet"[^>]*>/.exec(page)[0];
 assert.match(form,/data-contact-form/);assert.match(form,/novalidate/);assert.match(form,/method="post"/);assert.match(form,/data-needs-script/);
 assert.match(page,/<fieldset class="message-form__fields" data-contact-fields disabled>/);
 assert.match(page,/<input[^>]*name="name"[^>]*type="text"[^>]*required/);
 assert.match(page,/<input[^>]*name="email"[^>]*type="email"[^>]*required/);
 assert.match(page,/<input[^>]*name="phone"[^>]*type="tel"/);
 assert.doesNotMatch(/<input[^>]*name="phone"[^>]*>/.exec(page)[0],/required/);
 assert.match(page,/<textarea[^>]*name="message"[^>]*required[^>]*maxlength="4000"/);
 assert.match(page,/<input[^>]*name="code"[^>]*inputmode="numeric"[^>]*autocomplete="one-time-code"[^>]*maxlength="6"/);
 for(const key of ['name','email','phone','message'])assert.match(page,new RegExp(`id="contact-${key}-error" data-contact-error="${key}" hidden`));
 assert.match(page,/data-contact-status role="status" aria-live="polite"/);
 assert.match(page,/<p data-contact-error-summary role="alert" hidden>/);
 assert.match(page,/data-contact-verification hidden/);
 for(const hook of ['verify','resend','countdown'])assert.match(page,new RegExp(`data-contact-${hook}\\b`));
 for(const hook of ['check','retry','restart'])assert.match(page,new RegExp(`<button[^>]*data-contact-${hook}[^>]*hidden`),hook);
 assert.match(page,/<button class="text-link message-form__notice" type="button" aria-haspopup="dialog" data-collection-notice>/);
 // every screen is in the printed page, hidden until its moment
 for(const panel of ['received','closed','failed','blocked'])assert.match(page,new RegExp(`data-contact-panel="${panel}" hidden`));
 assert.match(page,/data-message-form data-state="opening"/);
 assert.deepEqual(attributeValues(page,'data-message-step'),['write','code','sent']);
 // only the optional field is marked
 assert.equal(count(page,/\(optional\)/g),1);assert.doesNotMatch(page,/\(required\)/);
 // a note for a browser without scripts, with ways to reach the clinic
 assert.match(page,/<div class="message-form__sheet message-form__plain" data-without-script>/);
 assert.ok(has(page,words.withoutScript));
});

test('in the built document the form cannot be used until its script takes over',()=>{
 const locked=lockUnboundControls(renderedPage(PATH,'on'));
 for(const control of locked.match(/<(?:input|textarea)\b[^>]*>/g))assert.match(control,/disabled data-unbound-control/);
 assert.match(/<button[^>]*type="submit"[^>]*>/.exec(locked)[0],/disabled data-unbound-control/);
});

test('the words of every screen are printed from the data',()=>{
 const page=renderedPage(PATH,'on');
 for(const sentence of [words.heading.replace(' a message.',''),words.urgent,words.stepsWhy,words.consent,words.send,words.status.opening,words.code.title,words.code.label,words.code.verify,
  words.code.resend,words.code.help,words.received.title,words.received.lead,words.received.text,words.received.restart,words.closed.title,words.closed.text,words.failed.title,
  words.failed.text,words.blocked.title,words.blocked.text,words.retry,words.check,...words.fields.map(field=>field.label),...words.fields.map(field=>field.hint).filter(Boolean),
  ...words.steps.flatMap(step=>[step.label,step.short])])assert.ok(has(page,sentence),sentence);
 // Call and WhatsApp stand ready for every screen on which a message cannot be written.
 assert.equal(count(page,/data-open-call="sanjay"/g),2);assert.equal(count(page,/data-open-call="parul"/g),2);
 assert.equal(attributeValues(page,'href').filter(href=>href===whatsappLink()).length,3);
});

test('the full privacy notice is on the page, closed, with every section',()=>{
 const page=renderedPage(PATH,'on');
 assert.match(page,/<details class="page-contact__notice" id="privacy-notice" data-privacy-notice>/);
 assert.doesNotMatch(/<details[^>]*>/.exec(page)[0],/\sopen\b/,'collapsed by default');
 assert.ok(has(page,privacyNotice.full.open));assert.ok(has(page,privacyNotice.full.updated));
 for(const section of privacyNotice.full.sections){
  assert.ok(page.includes(`<h3>${text(section.heading)}</h3>`),section.heading);
  for(const paragraph of section.paragraphs||[])assert.ok(has(page,paragraph));
  for(const list of section.lists||[]){assert.ok(has(page,list.lead));for(const item of list.items)assert.ok(page.includes(`<li>${text(item)}</li>`));}
 }
 assert.equal(privacyNotice.more.href,PATH+'#privacy-notice');
 assert.equal(privacyNotice.full.open,footer.detailsNotice);
});

test('entrances: nothing in the first screen moves in; the pin lands after its map',()=>{
 const page=renderedPage(PATH,'on');
 const first=page.slice(0,page.indexOf('id="find-us"'));
 assert.doesNotMatch(first,/data-enter/);
 assert.match(page,/<span class="page-contact__pin" data-enter="drop" data-enter-after="0\.35" aria-hidden="true">/);
 assert.equal(count(page,/data-ambient(?!="minor")/g),1,'one slow light on the page');
});

// ---------- the page's own behaviour ----------
function fakeNotice(id='privacy-notice'){
 const listeners={};
 return {id,open:false,listeners,addEventListener(type,handler){listeners[type]=handler;}};
}

test('the full notice opens when it is the place asked for',()=>{
 assert.equal(noticeWanted('#privacy-notice'),true);
 assert.equal(noticeWanted('#hours'),false);assert.equal(noticeWanted(''),false);assert.equal(noticeWanted(undefined),false);
 assert.equal(noticeWanted('#x','x'),true);
 const asked=fakeNotice();
 bindNotice(asked,{hash:'#privacy-notice'});
 assert.equal(asked.open,true,'reached at its place: open at once');
 const quiet=fakeNotice();let measured=0;
 bindNotice(quiet,{hash:'',motion:{remeasure(){measured++;}}});
 assert.equal(quiet.open,false);
 quiet.listeners.focus();assert.equal(quiet.open,true,'the router moved the focus to it');
 quiet.listeners.focus();assert.equal(quiet.open,true);
 quiet.listeners.toggle();assert.equal(measured,1,'the page\'s height changed: waiting entrances are measured again');
 const bare=fakeNotice();bindNotice(bare);bare.listeners.toggle();
 bindNotice(null);
});

test('bindContact wires the notice and the form, and passes over what is not there',async()=>{
 bindContact(null);
 const notice=fakeNotice();
 bindContact({querySelector:selector=>selector==='[data-privacy-notice]'?notice:null},{windowObject:{location:{hash:'#privacy-notice'}}});
 assert.equal(notice.open,true);
 const other=fakeNotice();
 bindContact({querySelector:selector=>selector==='[data-privacy-notice]'?other:null},{});
 assert.equal(other.open,false);
});
