import test from 'node:test';import assert from 'node:assert/strict';
import {checkPage,renderedPage,renderedApp,attributeValues,count} from './support/page-contract.mjs';
import {profile,sessionLine} from '../../src/site/pages/profile/profile.mjs';
import {profilePage,workPortrait,roomPicture,nextSession} from '../../src/clinic/page-content/doctors.mjs';
import {doctors} from '../../src/clinic/model.mjs';
import {doctorOrder} from '../../src/clinic/care-catalogue.mjs';
import {certificatesFor} from '../../src/clinic/certificate-catalogue.mjs';
import {clinicPhotos,clinicObjects,archPortraits} from '../../src/clinic/client-media.mjs';
import {reviewsFor} from '../../src/clinic/review-list.mjs';
import {essentials,readAllReviewsLabel} from '../../src/clinic/page-content/shared.mjs';
import {text} from '../../src/site/lib/html.mjs';
import {pageContext} from '../../src/site/runtime/render.mjs';

const pathOf=id=>doctors[id].path;
const section=(html,name)=>{const from=html.indexOf(`page-profile__${name}`);assert.ok(from>=0,`section ${name}`);const to=html.indexOf('<section',from);return html.slice(from,to<0?undefined:to);};

test('both profiles keep the page contract in both booking states',()=>{
 for(const id of doctorOrder)for(const mode of ['on','off'])checkPage(pathOf(id),mode);
 assert.throws(()=>profile(pageContext({path:pathOf('sanjay'),mode:'on',now:new Date()}),'nobody'),/Unknown doctor/);
});

test('six sections in order, then this doctor\'s own closing',()=>{
 for(const id of doctorOrder){
  const html=renderedPage(pathOf(id),'on'),words=profilePage(id);
  const order=[...html.matchAll(/<section class="((?:page-profile page-profile__\w+)|closing)/g)].map(match=>match[1].split('__').pop());
  assert.deepEqual(order,['cover','care','about','gallery','reviews','closing']);
  assert.deepEqual(attributeValues(html,'id').filter(value=>['care','about','certificates','reviews','closing'].includes(value)),['care','about','certificates','reviews','closing']);
  assert.equal(count(html,/<h1\b/g),1);
  assert.ok(html.includes(`data-closing data-closing-doctor="${id}"`));
  for(const part of ['care','about','certificates','reviews'])assert.match(html,new RegExp(`<h2[^>]*id="${part}-title"`));
  assert.equal(count(html,new RegExp(`page-profile--${words.tone}`,'g')),3,'the doctor\'s tone is set on the cover, the list and the story');
  // Removed from the profile: preparation lists, clinic photographs, the week's hours.
  for(const place of ['frontage','waiting','entrance','gate','reception'])assert.ok(!html.includes(clinicPhotos[place]?.src||'/no-such-file'));
  assert.doesNotMatch(html,/hours-table|Before your visit|Previous reports/);
 }
});

test('the cover: the doctor\'s face, name and standing, both actions, and the session line, all in the first section',()=>{
 for(const id of doctorOrder){
  const html=section(renderedPage(pathOf(id),'on'),'cover'),words=profilePage(id),doctor=doctors[id];
  const portrait=clinicPhotos[workPortrait(id)];
  assert.ok(html.indexOf(`src="${portrait.src}"`)>=0&&html.indexOf(`src="${portrait.src}"`)<html.indexOf('<h1'),'the face comes first, above the name');
  assert.ok(!html.includes(clinicPhotos[archPortraits[id]].src),'never Home\'s tight crop');
  assert.match(html,/<img[^>]*fetchpriority="high"/);assert.doesNotMatch(html.slice(0,html.indexOf('essentials-strip')),/loading="lazy"|data-enter/);
  assert.ok(html.includes(`<h1 class="page-profile__name" id="profile-title">${text(doctor.name)}</h1>`));
  assert.ok(html.includes(`<p class="page-profile__kicker"><span>${text(doctor.formal)}</span></p>`));
  assert.ok(html.includes(`<p class="page-profile__role">${text(doctor.role)}</p>`));
  assert.ok(html.includes(`<span>${text(words.degrees)}</span> <span class="page-profile__registration">${text(words.registration)}</span>`));
  assert.ok(html.includes(`>${text(words.credit)}<span class="wide-only">, ${text(words.creditPlace)}</span>`));
  // actions: the lead for the phone bar
  const actions=html.slice(html.indexOf('data-bar-lead'),html.indexOf('data-next-session'));
  assert.ok(actions.includes(`href="/booking?doctor=${id}"`)&&actions.includes(text(words.book)));
  assert.ok(actions.includes(`href="${words.call.href}"`)&&actions.includes(text(words.call.label))&&actions.includes(`aria-label="${words.call.spoken}"`));
  assert.match(actions,/button--second button--lead/);assert.ok(actions.includes(`data-open-call="${id}"`));
  assert.match(actions,/\d{5}&nbsp;\d{5}/,'the digits never break across two lines');
  // the session line starts neutral
  assert.match(html,/data-next-session data-state="pending" data-nosnippet/);
  assert.ok(html.includes(`data-session-label>${text(words.session.label)}<`)&&html.includes(`data-session-detail>${text(words.session.detail)}<`));
  // the shared strip sits inside the cover, across its lower edge
  assert.equal(count(html,/data-essentials-strip/g),1);assert.ok(html.includes(text(essentials.fee.value)));
  assert.equal(count(html,/data-ambient(?!="minor")/g),1,'one light, inside the plate');
  assert.equal(html.includes('page-profile__honour'),!!words.tag);
  assert.equal(html.includes('page-profile__sitter--tagged'),!!words.tag);
 }
 const parul=section(renderedPage(pathOf('parul'),'on'),'cover');
 assert.equal(count(parul,/KGMU gold medalist/g),1);
 assert.doesNotMatch(section(renderedPage(pathOf('sanjay'),'on'),'cover'),/gold medalist|tag--gold/);
});

test('the session line prints any answer it is given',()=>{
 const open=nextSession(new Date('2026-11-16T05:30:00Z')),line=sessionLine(open);
 assert.match(line,/^<p class="page-profile__session" data-next-session data-state="open" data-nosnippet>/);
 assert.ok(line.includes('data-session-label>In clinic now<')&&line.includes('data-session-detail>until 1:30&nbsp;pm<'));
 assert.match(line,/<use href="#i-clock"\/>/);
});

test('booking OFF: the cover keeps one filled action, Call with its digits, and no booking address',()=>{
 for(const id of doctorOrder){
  const off=renderedApp(pathOf(id),'off'),cover=section(off,'cover'),words=profilePage(id);
  assert.doesNotMatch(off,/\shref="\/booking/);
  assert.match(cover,/<a\b[^>]*data-booking-href="\/booking\?doctor=\w+"[^>]*\shidden\b[^>]*>|<a\b[^>]*\shidden\b[^>]*data-booking-href="\/booking\?doctor=\w+"[^>]*>/);
  assert.ok(cover.includes(text(words.call.label))&&cover.includes(`href="${words.call.href}"`),'Call keeps its digits while OFF');
 }
});

test('what the doctor sees patients for: raised rows into Treatments, one destination each, nothing re-explained',()=>{
 for(const id of doctorOrder){
  const html=section(renderedPage(pathOf(id),'on'),'care'),words=profilePage(id).care;
  const rows=[...html.matchAll(/<a class="page-profile__topic" href="([^"]+)"><span class="page-profile__topic-name">([^<]+)<\/span>/g)].map(match=>({href:match[1],label:match[2]}));
  assert.deepEqual(rows,words.topics.map(topic=>({href:topic.href,label:text(topic.label)})));
  assert.equal(count(html,/<li data-enter="card" style="--i:\d"/g),words.topics.length);
  assert.doesNotMatch(html,/<p\b(?![^>]*section-head)/,'no paragraph explains a topic here');
  assert.ok(html.includes(`aria-label="${text(words.listLabel)}"`));
  assert.ok(html.includes(`src="${clinicObjects[words.object].src}"`)&&/<img[^>]*alt=""[^>]*>/.test(html),'the object is an accent: decorative');
 }
 assert.equal(count(section(renderedPage(pathOf('sanjay'),'on'),'care'),/page-profile__topic-name/g),5);
 assert.equal(count(section(renderedPage(pathOf('parul'),'on'),'care'),/page-profile__topic-name/g),4);
});

test('about the doctor: the heading first, the room photograph with its caption, and the story',()=>{
 for(const id of doctorOrder){
  const html=section(renderedPage(pathOf(id),'on'),'about'),words=profilePage(id).about,room=clinicPhotos[roomPicture(id)];
  assert.ok(html.indexOf('<h2')<html.indexOf('<img'),'the heading comes before the picture');
  assert.ok(html.includes(`src="${room.src}"`)&&html.includes('photo-figure--plain photo-figure--3x2'));
  assert.ok(html.includes(`<figcaption class="photo-figure__caption">${text(words.caption)}</figcaption>`));
  assert.match(html,/<img[^>]*loading="lazy"/);
  assert.ok(html.includes(`>${text(words.lede)}</p>`)&&html.includes(`>${text(words.body)}</p>`));
  assert.ok(html.includes(`href="${words.bring.href}"`)&&html.includes(text(words.bring.label)));
  assert.doesNotMatch(html,/<button|data-open-photo|aria-haspopup/,'the photograph does not enlarge');
 }
 assert.equal(count(renderedPage(pathOf('parul'),'on'),/senior woman gynaecologist/g),1);
});

test('certificates: this doctor\'s five on the deep ground, each opening the viewer, on a shelf the visitor moves',()=>{
 for(const id of doctorOrder){
  const html=section(renderedPage(pathOf(id),'on'),'gallery'),words=profilePage(id).certificates;
  assert.deepEqual(attributeValues(html,'data-view-certificate'),certificatesFor(id).map(item=>item.id));
  assert.equal(count(html,/certificate-frame--on-deep/g),5);assert.equal(count(html,/certificate-frame--large/g),5);
  assert.equal(count(html,/data-still-shelf/g),1);assert.match(html,/section-head--on-deep/);
  assert.ok(html.includes(`aria-label="${text(words.shelfLabel)}"`)&&html.includes(`aria-label="${text(words.previous)}"`)&&html.includes(`aria-label="${text(words.next)}"`));
  assert.equal(count(html,/<div class="page-profile__hung" data-enter="card" style="--i:\d">/g),5);
  for(const label of html.match(/<figcaption[^>]*>.*?<\/figcaption>/g))assert.ok(!label.includes(text(doctors[id].name)),'the label does not repeat whose page this is');
  assert.match(html,/<p class="page-profile__hint" data-needs-script>/);
  const other=doctorOrder.find(item=>item!==id);
  for(const item of certificatesFor(other))assert.ok(!html.includes(`data-view-certificate="${item.id}"`));
 }
});

test('reviews: the shared shelf with this doctor\'s reviews only, three shown, and the way to all of them',()=>{
 for(const id of doctorOrder){
  const html=section(renderedPage(pathOf(id),'on'),'reviews'),own=reviewsFor(id);
  assert.ok(html.includes(`data-review-shelf="${id}"`)&&html.includes('data-review-limit="3"')&&html.includes(`id="reviews-${id}"`));
  const shown=(html.match(/<li class="review-card[^>]*>/g)||[]).filter(tag=>!/\shidden\b/.test(tag));
  assert.equal(shown.length,3);
  assert.equal(count(html,/review-card--lead/g),1,'one pull-quote leads');
  const ids=attributeValues(html,'data-review');
  assert.deepEqual([...ids].sort(),own.map(review=>review.id).sort(),'every review of this doctor is printed once, and no one else\'s');
  assert.ok(html.includes(text(readAllReviewsLabel(own.length))));
  assert.doesNotMatch(html,/role="tablist"/,'no tabs on a profile');
 }
});
