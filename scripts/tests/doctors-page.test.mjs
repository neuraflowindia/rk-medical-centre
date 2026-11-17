import test from 'node:test';import assert from 'node:assert/strict';
import {checkPage,renderedPage,renderedApp,attributeValues,count} from './support/page-contract.mjs';
import {doctors as renderDoctors,pairShape} from '../../src/site/pages/doctors/doctors.mjs';
import {bindDoctors} from '../../src/site/pages/doctors/doctors.behaviour.mjs';
import {doctorsPage as words,meetCertificates,workPortrait} from '../../src/clinic/page-content/doctors.mjs';
import {doctors} from '../../src/clinic/model.mjs';
import {doctorOrder} from '../../src/clinic/care-catalogue.mjs';
import {clinicPhotos,clinicObjects,doctorAvatars,plainCertificates} from '../../src/clinic/client-media.mjs';
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
  assert.ok(html.includes(`<strong>${text(item.name)}</strong> <span>${text(item.role)}</span> <em>${text(item.credit)}</em>`));
 }
 assert.equal(count(html,/photo-figure--arch photo-figure--4x5/g),2);
 const portraits=html.match(/<figure\b.*?<\/figure>/g);
 assert.equal(portraits.length,2);
 for(const figure of portraits)assert.match(figure,/<img[^>]*fetchpriority="high"/,'a portrait of the first screen loads at once');
 assert.doesNotMatch(html,/data-enter/,'nothing in the first screen enters');
 assert.doesNotMatch(html,/<a\b[^>]*>\s*<figure|<button/,'portraits are not links and never enlarge');
});

test('the opening in depth: a tone plate behind each portrait, each doctor\'s own instrument in front, and two slow movers',()=>{
 const html=section(renderedPage(PATH,'on'),'opening');
 assert.equal(count(html,/<span class="page-doctors__plate" aria-hidden="true"><span class="page-doctors__shaft"><\/span><\/span>/g),2);
 // near: one paper-cut instrument per doctor, decorative, after the portrait in its frame, and never fetched before it is needed
 const instruments=html.match(/<img class="page-doctors__instrument"[^>]*>/g);
 assert.equal(instruments.length,2);
 words.portraits.forEach((item,index)=>{
  const object=clinicObjects[item.instrument];
  assert.ok(object,`${item.id}: the instrument is a known object`);
  assert.ok(instruments[index].includes(`src="${object.src}"`)&&/\salt=""/.test(instruments[index])&&/loading="lazy"/.test(instruments[index]));
 });
 assert.notEqual(words.portraits[0].instrument,words.portraits[1].instrument);
 assert.equal(count(html,/<img\b/g),4,'two portraits and two instruments, nothing else');
 // the light belongs to the stage; the two instruments' float to one marker (a light outranks a float, so a phone runs the light alone)
 assert.equal(count(html,/data-ambient(?!=)/g),1);assert.match(html,/class="wrap page-doctors__stage" data-ambient>/);
 assert.equal(count(html,/data-ambient="/g),1);assert.match(html,/<span class="page-doctors__alive" aria-hidden="true" data-ambient="float"><\/span>/);
 assert.ok(html.indexOf('page-doctors__alive')<html.indexOf('page-doctors__pair'),'the marker comes before the pair it starts');
 // the next step is a paper button that leads to the spread
 const jump=html.match(/<p class="page-doctors__jump">(.*?)<\/p>/)[1];
 assert.match(jump,/^<a href="#who" class="button button--second button--compact">/);
 assert.ok(jump.includes(text(words.jump.label))&&jump.includes('#i-down'));
});

test('the spread: one page per doctor with a plain list, the formal facts and the actions',()=>{
 const html=section(renderedPage(PATH,'on'),'choose');
 assert.equal(count(html,/<article\b/g),2);
 for(const item of words.choose.leaves){
  const page=leaf(html,item.id),doctor=doctors[item.id];
  assert.ok(page.includes(`page-doctors__leaf--${item.tone}`));
  assert.ok(page.includes(`<h3 class="page-doctors__leaf-title" id="see-${item.id}">${text(item.heading)}</h3><p class="page-doctors__leaf-role">${text(item.role)}</p>`),'the heading comes before the line under it');
  assert.ok(page.includes(`src="${doctorAvatars[item.id].src}"`)&&/<img[^>]*alt=""/.test(page),'the small face is decorative');
  const list=page.slice(page.indexOf('<ul'),page.indexOf('</ul>'));
  assert.deepEqual([...list.matchAll(/<li>([^<]*)<\/li>/g)].map(match=>match[1]),item.concerns.map(text));
  assert.doesNotMatch(list,/<a\b|<svg/,'the list is plain: information, not controls, and ruled only by hairlines');
  // degrees and registration, and nothing that names the field a third time
  assert.ok(page.includes(`<p class="page-doctors__facts"><span>${text(item.degrees)}</span> <span class="page-doctors__registration">${text(item.registration)}</span></p>`));
  assert.ok(page.includes(registrationNumbers[item.id])&&!page.includes(text(doctor.formal)));
  assert.ok(page.includes(`href="/booking?doctor=${item.id}"`)&&page.includes(`Book with ${text(item.name.replace(/\s+\S+$/u,''))}`));
  assert.ok(page.includes(`href="tel:${doctor.tel}"`)&&page.includes(`data-open-call="${item.id}"`));
  assert.match(page,/button--second button--lead/);
  assert.ok(page.includes(`href="${doctor.path}"`)&&page.includes(`aria-label="${item.profile.spoken}"`));
  assert.equal(page.includes('tag--gold'),!!item.tag);
  // the honour stands under the list, inside the list's own band
  if(item.tag)assert.match(page,new RegExp(`</ul><p class="tag tag--gold">.*?${text(item.tag)}</p></div><p class="page-doctors__facts">`));
  else assert.ok(page.includes('</ul></div><p class="page-doctors__facts">'));
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
 assert.match(html,/data-certificate-wall data-settle/,'the documents settle as the section arrives');
 assert.ok(html.includes(`aria-label="${text(words.training.wallLabel)}"`));
 for(const item of meetCertificates())assert.ok(html.includes(text(item.title))&&html.includes(text(doctors[item.doctor].name)),'each label says what it is and whose');
 for(const link of words.training.links)assert.ok(html.includes(`href="${link.href}"`)&&html.includes(`aria-label="${link.spoken}"`));
 assert.ok(html.includes(text(words.training.linksLead)));
 assert.ok(html.indexOf('data-certificate-wall')<html.indexOf('page-doctors__wall-links'),'the documents come before the two links, in the page as on screen');
});

test('each doctor\'s pair of documents is one row: the page prints what a row needs to fill its column',()=>{
 const html=section(renderedPage(PATH,'on'),'training'),shown=meetCertificates();
 const shape=item=>plainCertificates[item.id].width/plainCertificates[item.id].height;
 const first=shape(shown[0])+shape(shown[1]),second=shape(shown[2])+shape(shown[3]);
 assert.ok(Math.abs(pairShape(shown.slice(0,2))-first)<.001&&Math.abs(pairShape(shown.slice(2))-second)<.001);
 assert.ok(html.includes(`<div class="page-doctors__wall" style="--pair-a:${pairShape(shown.slice(0,2))};--pair-b:${pairShape(shown.slice(2))}">`));
 // each frame carries its own shape too, and the two agree
 const shapes=attributeValues(html,'style').filter(value=>value.includes('--ar:')).map(value=>Number(/--ar:([\d.]+)/.exec(value)[1]));
 assert.equal(shapes.length,4);
 assert.ok(Math.abs(shapes[0]+shapes[1]-pairShape(shown.slice(0,2)))<.005&&Math.abs(shapes[2]+shapes[3]-pairShape(shown.slice(2)))<.005);
 assert.equal(pairShape([]),0);
});

test('the page is the same for the same input and does not depend on the clock',()=>{
 const early=renderDoctors(pageContext({path:PATH,mode:'on',now:new Date('2026-01-01T00:00:00Z')}));
 const late=renderDoctors(pageContext({path:PATH,mode:'on',now:new Date('2026-12-31T23:00:00Z')}));
 assert.equal(early,late);
 assert.notEqual(renderDoctors(pageContext({path:PATH,mode:'off',now:new Date('2026-01-01T00:00:00Z')})),early);
});

test('the stylesheets of both pages use only tokens that exist',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=name=>readFileSync(new URL(`../../src/site/${name}`,import.meta.url),'utf8');
 const names=css=>new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(match=>match[1]));
 const tokens=names(read('styles/tokens.css'));
 // Not design tokens: --q is set by the motion styles on every entering part; --room is set by
 // the profile template on the room photograph's frame (the photograph's own width).
 // --pair-a and --pair-b are set by the Meet the doctors template on its wall (each pair's shapes);
 // --ar by the shared certificate frame (one document's shape).
 const fromMotion=new Set(['--q','--room','--pair-a','--pair-b','--ar']);
 for(const sheet of ['pages/doctors/doctors.css','pages/profile/profile.css']){
  const css=read(sheet),own=names(css);
  const used=[...new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map(match=>match[1]))];
  assert.ok(used.length>20,`${sheet} is styled through tokens`);
  assert.deepEqual(used.filter(name=>!tokens.has(name)&&!own.has(name)&&!fromMotion.has(name)),[],`${sheet} uses a token that does not exist`);
 }
 assert.match(read('motion/motion.css'),/--q:/,'the entrance progress still comes from the motion styles');
 // Meet the doctors floats its two instruments with the site's own float; the profile's paper-cut picture arrives as a photograph does.
 assert.match(read('motion/motion.css'),/@keyframes motion-float\b/);assert.match(read('pages/doctors/doctors.css'),/animation: motion-float var\(--loop-float\)/);
 assert.match(read('motion/motion.css'),/\[data-enter="photo"\] \.photo-figure__frame/);assert.match(read('pages/profile/profile.css'),/\.page-profile__art\[data-enter="photo"\] \.page-profile__art-frame/);
 assert.match(read('pages/profile/profile.mjs'),/style="--room:\$\{/,'the profile template still sets the room photograph\'s width');
});
