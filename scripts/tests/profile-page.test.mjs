import test from 'node:test';import assert from 'node:assert/strict';
import {checkPage,renderedPage,renderedApp,attributeValues,count} from './support/page-contract.mjs';
import * as template from '../../src/site/pages/profile/profile.mjs';
import {profilePage,workPortrait,aboutPicture} from '../../src/clinic/page-content/doctors.mjs';
import {doctors} from '../../src/clinic/model.mjs';
import {doctorOrder} from '../../src/clinic/care-catalogue.mjs';
import {certificatesFor} from '../../src/clinic/certificate-catalogue.mjs';
import {clinicPhotos,clinicObjects,archPortraits,roomCrops} from '../../src/clinic/client-media.mjs';
import {reviewsFor} from '../../src/clinic/review-list.mjs';
import {essentials,readAllReviewsLabel} from '../../src/clinic/page-content/shared.mjs';
import {text} from '../../src/site/lib/html.mjs';
import {pageContext} from '../../src/site/runtime/render.mjs';

const {profile}=template;
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

test('the cover: the doctor\'s face, name and standing and both actions, all in the first section',()=>{
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
  // the credit reads across, after the frame, as one line: what the photograph shows and where
  assert.ok(html.includes(`</div><p class="page-profile__credit">${text(`${words.credit}, ${words.creditPlace}`)}</p></div>`));
  // actions: the lead for the phone bar, and the last thing in the cover's words
  const actions=html.slice(html.indexOf('data-bar-lead'),html.indexOf('page-profile__strip'));
  assert.ok(actions.includes(`href="/booking?doctor=${id}"`)&&actions.includes(text(words.book)));
  assert.ok(actions.includes(`href="${words.call.href}"`)&&actions.includes(text(words.call.label))&&actions.includes(`aria-label="${words.call.spoken}"`));
  assert.match(actions,/button--second button--lead/);assert.ok(actions.includes(`data-open-call="${id}"`));
  assert.match(actions,/\d{5}&nbsp;\d{5}/,'the digits never break across two lines');
  assert.match(actions,/<\/a><\/div><\/div><\/div><div class="wrap $/,'nothing follows the two buttons');
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

test('the clinic\'s live state has one home on a profile besides the header: the essentials strip',()=>{
 assert.deepEqual(Object.keys(template),['profile'],'the template has no session line to print');
 for(const id of doctorOrder)for(const mode of ['on','off']){
  const page=renderedPage(pathOf(id),mode);
  assert.doesNotMatch(page,/data-next-session|data-session-|page-profile__session|In clinic now|clinic session/i);
  // in the page's own markup the open sign is printed by the strip and by the closing, nowhere else
  const signs=attributeValues(page,'data-open-sign');
  assert.deepEqual(signs.filter(form=>form==='strip'),['strip']);
  assert.equal(page.indexOf('data-open-sign="strip"')>page.indexOf('data-essentials-strip'),true);
  assert.ok(signs.every(form=>form==='strip'||form==='closing'),`open signs on the page: ${signs}`);
 }
});

test('booking OFF: the cover keeps one filled action, Call with its digits, and no booking address',()=>{
 for(const id of doctorOrder){
  const off=renderedApp(pathOf(id),'off'),cover=section(off,'cover'),words=profilePage(id);
  assert.doesNotMatch(off,/\shref="\/booking/);
  assert.match(cover,/<a\b[^>]*data-booking-href="\/booking\?doctor=\w+"[^>]*\shidden\b[^>]*>|<a\b[^>]*\shidden\b[^>]*data-booking-href="\/booking\?doctor=\w+"[^>]*>/);
  assert.ok(cover.includes(text(words.call.label))&&cover.includes(`href="${words.call.href}"`),'Call keeps its digits while OFF');
 }
});

test('what the doctor sees patients for: a small index into Treatments, each row with its object, name and one line',()=>{
 for(const id of doctorOrder){
  const html=section(renderedPage(pathOf(id),'on'),'care'),words=profilePage(id).care;
  const rows=[...html.matchAll(/<li data-enter="card" style="--i:(\d)"><a class="page-profile__topic" href="([^"]+)"><span class="page-profile__topic-object" data-object="([^"]+)"><img class="page-profile__topic-art" src="([^"]+)"[^>]*alt=""[^>]*><\/span><span class="page-profile__topic-words"><span class="page-profile__topic-name">([^<]+)<\/span> <span class="page-profile__topic-deck">([^<]+)<\/span><\/span><span class="page-profile__topic-go" aria-hidden="true"><svg[^>]*><use href="#i-arrow"\/><\/svg><\/span><\/a><\/li>/g)]
   .map(match=>({order:Number(match[1]),href:match[2],object:match[3],src:match[4],title:match[5],deck:match[6]}));
  assert.deepEqual(rows,words.topics.map((topic,index)=>({order:index,href:topic.href,object:topic.object,src:clinicObjects[topic.object].src,title:text(topic.title),deck:text(topic.deck)})));
  assert.equal(count(html,/<li\b/g),words.topics.length,'every row is whole');
  assert.equal(count(html,/<img\b/g),words.topics.length,'one object per row and no lone object beside the list');
  assert.doesNotMatch(html,/<p\b(?![^>]*section-head)/,'a row carries one line; no paragraph explains a topic here');
  assert.ok(html.includes(`aria-label="${text(words.listLabel)}"`));
  assert.match(html,/<header class="section-head page-profile__care-head">/);
 }
 assert.equal(count(section(renderedPage(pathOf('sanjay'),'on'),'care'),/page-profile__topic-name/g),5);
 assert.equal(count(section(renderedPage(pathOf('parul'),'on'),'care'),/page-profile__topic-name/g),4);
});

test('about the doctor: the heading first, a framed picture with its caption, and the story',()=>{
 for(const id of doctorOrder){
  const html=section(renderedPage(pathOf(id),'on'),'about'),words=profilePage(id).about;
  assert.ok(html.indexOf('<h2')<html.indexOf('<img'),'the heading comes before the picture');
  assert.equal(count(html,/<img\b/g),1);assert.equal(count(html,/<figure\b/g),1);assert.equal(count(html,/<figcaption\b/g),1);
  assert.match(html,/<img[^>]*loading="lazy"/);
  assert.match(html,/<div class="page-profile__room" style="--room:\d+px"><span class="page-profile__room-plate" aria-hidden="true"><\/span><figure/,'one frame and one tone plate for both doctors');
  assert.ok(html.includes(`>${text(words.lede)}</p>`)&&html.includes(`>${text(words.body)}</p>`));
  assert.ok(html.includes(`href="${words.bring.href}"`)&&html.includes(text(words.bring.label)));
  assert.doesNotMatch(html,/<button|data-open-photo|aria-haspopup/,'the picture does not enlarge');
 }
 // Dr. Sanjay Gupta: a second photograph, in the shared frame, held to its own width.
 const his=section(renderedPage(pathOf('sanjay'),'on'),'about'),room=clinicPhotos[aboutPicture('sanjay').photo];
 assert.ok(his.includes(`src="${room.src}"`)&&his.includes('photo-figure--plain photo-figure--3x2'));
 assert.ok(his.includes(`<div class="page-profile__room" style="--room:${room.width}px">`));
 assert.ok(his.includes(`<figcaption class="photo-figure__caption">${text(profilePage('sanjay').about.caption)}</figcaption>`));
 // Dr. Parul Gupta: the paper-cut picture, in a frame of the same make, with its own caption.
 const hers=section(renderedPage(pathOf('parul'),'on'),'about'),art=aboutPicture('parul').art;
 assert.ok(hers.includes(`<figure class="page-profile__art" data-enter><div class="page-profile__art-frame"><img src="${art.src}"`));
 assert.ok(hers.includes(`<div class="page-profile__room" style="--room:${art.width}px">`));
 assert.ok(hers.includes(`alt="${text(art.alt)}"`)&&hers.includes(` width="${art.width}" height="${art.height}"`));
 for(const source of art.sources)assert.ok(hers.includes(`${source.src} ${source.width}w`));
 assert.ok(hers.includes(`<figcaption class="page-profile__art-caption">${text(profilePage('parul').about.caption)}</figcaption>`));
 assert.doesNotMatch(hers,/photo-figure/,'the shared frame\'s own markup is not copied');
 assert.equal(count(renderedPage(pathOf('parul'),'on'),/senior woman gynaecologist/g),1);
});

test('no photograph is shown twice on a profile: Dr. Parul Gupta\'s one photograph is on her cover only',()=>{
 for(const id of doctorOrder){
  const page=renderedPage(pathOf(id),'on');
  const photographs=[...new Set(attributeValues(page,'src').filter(src=>src.startsWith('/client-photos/')&&!src.includes('-avatar-')))];
  for(const src of photographs)assert.equal(count(page,new RegExp(`src="${src}"`,'g')),1,`${src} appears once`);
  assert.equal(count(page,new RegExp(`src="${clinicPhotos[workPortrait(id)].src}"`,'g')),1);
 }
 const parul=renderedPage(pathOf('parul'),'on'),sanjay=renderedPage(pathOf('sanjay'),'on');
 // every other picture of her on file is a crop of the cover's scene
 for(const other of [roomCrops.parul,'parul-room','parul-portrait','portrait-parul','desk-parul','close-parul'])assert.ok(!parul.includes(clinicPhotos[other].src),`${other} is the same scene as her cover`);
 assert.deepEqual(attributeValues(parul,'src').filter(src=>src.startsWith('/client-photos/')&&!src.includes('-avatar-')),[clinicPhotos[workPortrait('parul')].src]);
 // Dr. Sanjay Gupta's two photographs are two different scenes
 assert.deepEqual(attributeValues(sanjay,'src').filter(src=>src.startsWith('/client-photos/')&&!src.includes('-avatar-')),[clinicPhotos[workPortrait('sanjay')].src,clinicPhotos[roomCrops.sanjay].src]);
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
