import test from 'node:test';import assert from 'node:assert/strict';
import {checkPage,renderedPage,renderedApp,attributeValues,count} from './support/page-contract.mjs';
import {doctors as renderDoctors} from '../../src/site/pages/doctors/doctors.mjs';
import {bindDoctors} from '../../src/site/pages/doctors/doctors.behaviour.mjs';
import {doctorsPage as words,meetCertificates,workPortrait} from '../../src/clinic/page-content/doctors.mjs';
import {doctors} from '../../src/clinic/model.mjs';
import {doctorOrder} from '../../src/clinic/care-catalogue.mjs';
import {clinicPhotos,doctorAvatars} from '../../src/clinic/client-media.mjs';
import {text} from '../../src/site/lib/html.mjs';
import {pageContext} from '../../src/site/runtime/render.mjs';
import {pageFor} from '../../src/site/runtime/registry.mjs';
import {registrationNumbers} from '../../src/clinic/standins.mjs';

const PATH='/meet-doctor';
/** The markup of one section, from its opening tag to the next section. */
const section=(html,name)=>{const from=html.indexOf(`page-doctors__${name}"`);assert.ok(from>=0,`section ${name}`);const to=html.indexOf('<section',from);return html.slice(from,to<0?undefined:to);};
const leaf=(html,id)=>{const from=html.indexOf(`<article class="page-doctors__leaf`,html.indexOf(`data-doctor="${id}" aria-labelledby="see-${id}"`)-80);return html.slice(from,html.indexOf('</article>',from));};

test('Meet the doctors keeps the page contract in both booking states',()=>{
 for(const mode of ['on','off'])checkPage(PATH,mode);
 assert.equal(pageFor(PATH).render,renderDoctors);
 assert.equal(bindDoctors(null,{}),undefined,'the page adds no behaviour of its own: the shared parts bind themselves');
});

test('three sections in order, then the shared closing: no reviews, no clinic photographs, no essentials strip',()=>{
 const html=renderedPage(PATH,'on');
 const order=[...html.matchAll(/<section class="([a-z-]+(?: [a-z-_]+)?)"/g)].map(match=>match[1]);
 assert.deepEqual(order,['page-doctors page-doctors__opening','page-doctors page-doctors__choose','page-doctors page-doctors__training','closing']);
 assert.equal(count(html,/<h1\b/g),1);assert.equal(count(html,/<h2\b/g),3);assert.equal(count(html,/<h3\b/g),2);
 assert.match(html,/id="who" aria-labelledby="who-title"/);assert.match(html,/id="training" aria-labelledby="training-title"/);
 assert.match(html,/<h2[^>]*id="who-title"/);assert.match(html,/<h2[^>]*id="training-title"/);
 assert.doesNotMatch(html,/data-review-shelf|review-card|data-essentials-strip|data-open-sign="strip"/);
 for(const place of ['frontage','waiting','entrance','gate','reception'])assert.ok(!html.includes(clinicPhotos[place]?.src||'/no-such-file'),`${place} photograph`);
 assert.doesNotMatch(html,/data-closing-doctor/,'the closing is the general one, with both doctors');
 assert.equal(count(html,/\sdata-closing(?![-\w])/g),1);
 assert.doesNotMatch(html,/data-bar-lead/,'no first-screen buttons: the phone bar is there from the start');
});

test('the opening is a double portrait: both doctors in the wider at-work crop, names beside them, nothing animating in',()=>{
 const html=section(renderedPage(PATH,'on'),'opening');
 assert.match(html,/<h1 class="section-head__title" id="doctors-title">Meet Dr\.&nbsp;Sanjay <em>and&nbsp;Dr\.&nbsp;Parul&nbsp;Gupta\.<\/em><\/h1>/);
 assert.ok(html.includes(`<span>${text(words.runningHead)}</span>`));
 const sitters=[...html.matchAll(/page-doctors__sitter--(\w+)" data-doctor="(\w+)"/g)].map(match=>match[2]);
 assert.deepEqual(sitters,doctorOrder,'Dr. Sanjay left, Dr. Parul right');
 for(const item of words.portraits){
  const photo=clinicPhotos[workPortrait(item.id)];
  assert.ok(html.includes(`src="${photo.src}"`),`${item.id}: the at-work portrait`);
  assert.ok(html.includes(`<strong>${text(item.name)}</strong><span>${text(item.role)}</span><em>${text(item.credit)}</em>`));
 }
 assert.equal(count(html,/<img\b/g),2);assert.equal(count(html,/photo-figure--arch photo-figure--4x5/g),2);
 assert.doesNotMatch(html,/loading="lazy"|data-enter/,'first-screen pictures load at once and nothing in the first screen enters');
 assert.equal(count(html,/data-ambient/g),1,'one light, owned by the stage');
 assert.equal(count(html,/page-doctors__shaft/g),2);
 assert.doesNotMatch(html,/<a\b[^>]*>\s*<figure|<button/,'portraits are not links and never enlarge');
 assert.ok(html.includes(`href="${words.jump.href}"`)&&html.includes(text(words.jump.label)));
});

test('the spread: one page per doctor with a plain list, the formal facts and the actions',()=>{
 const html=section(renderedPage(PATH,'on'),'choose');
 assert.equal(count(html,/<article\b/g),2);
 for(const item of words.choose.leaves){
  const page=leaf(html,item.id),doctor=doctors[item.id];
  assert.ok(page.includes(`page-doctors__leaf--${item.tone}`));
  assert.ok(page.includes(`<h3 class="page-doctors__leaf-title" id="see-${item.id}">${text(item.heading)}</h3>`));
  assert.ok(page.includes(`<p class="page-doctors__leaf-role">${text(item.role)}</p>`));
  assert.ok(page.includes(`src="${doctorAvatars[item.id].src}"`)&&/<img[^>]*alt=""/.test(page),'the small face is decorative');
  const listed=[...page.matchAll(/<li><svg[^>]*><use href="#i-check"\/><\/svg><span>([^<]*)<\/span><\/li>/g)].map(match=>match[1]);
  assert.deepEqual(listed,item.concerns.map(text));
  assert.doesNotMatch(page.slice(page.indexOf('<ul'),page.indexOf('</ul>')),/<a\b/,'the list is plain: information, not controls');
  assert.ok(page.includes(text(item.formalLine))&&page.includes(text(item.registration))&&page.includes(registrationNumbers[item.id]));
  assert.ok(page.includes(`href="/booking?doctor=${item.id}"`)&&page.includes(`Book with ${text(item.name.replace(/\s+\S+$/u,''))}`));
  assert.ok(page.includes(`href="tel:${doctor.tel}"`)&&page.includes(`data-open-call="${item.id}"`));
  assert.match(page,/button--second button--lead/);
  assert.ok(page.includes(`href="${doctor.path}"`)&&page.includes(`aria-label="${item.profile.spoken}"`));
  assert.equal(page.includes('tag--gold'),!!item.tag);
  if(item.tag)assert.ok(page.includes(text(item.tag)));
 }
 assert.equal(count(html,/data-enter="card"/g),1,'the sheet enters as one');
 assert.ok(html.includes(`href="${words.choose.more.href}"`)&&html.includes(text(words.choose.more.label))&&html.includes(text(words.choose.more.lead)));
});

test('booking OFF: no booking address, Book is hidden and inert, and Call becomes the named, filled action',()=>{
 const on=renderedApp(PATH,'on'),off=renderedApp(PATH,'off');
 assert.equal(count(section(on,'choose'),/href="\/booking\?doctor=/g),2);
 const page=section(off,'choose');
 assert.doesNotMatch(page,/\shref="\/booking/);
 const books=page.match(/<a\b[^>]*data-booking-href="\/booking\?doctor=\w+"[^>]*>/g)||[];
 assert.equal(books.length,2);
 for(const tag of books)assert.match(tag,/\shidden\b[^>]*\sinert\b|\sinert\b[^>]*\shidden\b/);
 for(const id of doctorOrder){
  const short=doctors[id].name.replace(/\s+\S+$/u,'');
  assert.ok(page.includes(`data-booking-on="Call" data-booking-off="Call ${short}">Call ${short}<`),`${id}: the OFF words`);
  assert.ok(section(on,'choose').includes(`data-booking-on="Call" data-booking-off="Call ${short}">Call<`),`${id}: the ON words`);
 }
});

test('training and honours: the sentence, four framed certificates that open the viewer, and the way to each doctor\'s five',()=>{
 const html=section(renderedPage(PATH,'on'),'training');
 assert.ok(html.includes(text(words.training.intro)));
 assert.match(html,/<h2[^>]*>Trained at <em>King&nbsp;George’s,&nbsp;Lucknow\.<\/em><\/h2>/);
 const shown=attributeValues(html,'data-view-certificate');
 assert.deepEqual(shown,meetCertificates().map(item=>item.id));
 assert.equal(count(html,/data-certificate-wall/g),1);
 assert.ok(html.includes(`aria-label="${text(words.training.wallLabel)}"`));
 for(const item of meetCertificates())assert.ok(html.includes(text(item.title))&&html.includes(text(doctors[item.doctor].name)),'each label says what it is and whose');
 for(const link of words.training.links)assert.ok(html.includes(`href="${link.href}"`)&&html.includes(`aria-label="${link.spoken}"`));
 assert.ok(html.includes(text(words.training.linksLead)));
});

test('the page is the same for the same input and does not depend on the clock',()=>{
 const early=renderDoctors(pageContext({path:PATH,mode:'on',now:new Date('2026-01-01T00:00:00Z')}));
 const late=renderDoctors(pageContext({path:PATH,mode:'on',now:new Date('2026-12-31T23:00:00Z')}));
 assert.equal(early,late);
 assert.notEqual(renderDoctors(pageContext({path:PATH,mode:'off',now:new Date('2026-01-01T00:00:00Z')})),early);
});
