import test from 'node:test';import assert from 'node:assert/strict';
import * as words from '../../src/clinic/page-content/doctors.mjs';
import {doctors,doctorFacts,locality} from '../../src/clinic/model.mjs';
import {doctorOrder} from '../../src/clinic/care-catalogue.mjs';
import {certificateCatalogue,certificatesFor} from '../../src/clinic/certificate-catalogue.mjs';
import {clinicPhotos,clinicObjects,doctorAvatars,archPortraits} from '../../src/clinic/client-media.mjs';
import {NEUTRAL} from '../../src/clinic/open-status.mjs';
import {registrationLine,registrationNumbers,STAND_IN_NOTE} from '../../src/clinic/standins.mjs';
import {hero,doctorChips,doctorsSection,homeCertificates} from '../../src/clinic/page-content/home.mjs';
import {pagePaths,degreesOf,doctorShortName,localPhone,actionLabels} from '../../src/clinic/page-content/shared.mjs';
import {pageMetadata} from '../../src/clinic/page-metadata.mjs';

const at=iso=>new Date(iso);
const plain=text=>text.replace(/ /g,' ');
const wordCount=text=>text.trim().split(/\s+/u).length;
/** Every string inside a value, however deeply nested. */
function strings(value,found=[]){
 if(typeof value==='string')found.push(value);
 else if(typeof value==='function')return found;
 else if(value&&typeof value==='object')for(const item of Object.values(value))strings(item,found);
 return found;
}
const everyWord=[...strings(words.doctorsPage),...doctorOrder.flatMap(id=>strings(words.profilePage(id))),...strings(words.proposedDescriptions),...strings(words.sessionWords)];

test('no markup, no stand-in marker and no missing value in any word of these pages',()=>{
 assert.ok(everyWord.length>80);
 for(const item of everyWord){
  assert.doesNotMatch(item,/[<>]/,`markup in: ${item}`);
  assert.doesNotMatch(item,/STAND-IN|undefined|\[object|NaN/,`a marker or a missing value in: ${item}`);
  assert.ok(!item.includes(STAND_IN_NOTE));
  assert.doesNotMatch(item,/(^|\s)'|'(\s|$)|"/,`typewriter quotation marks in: ${item}`);
 }
});

test('short roles, honour tags and degrees are read from their one home',()=>{
 for(const id of doctorOrder){
  assert.equal(words.shortRole(id),hero.portraits.find(item=>item.id===id).role);
  const card=doctorsSection.cards.find(item=>item.id===id);
  assert.equal(words.honourTag(id),card.tag||null);
  assert.ok(degreesOf(id).startsWith(words.degreesLine(id)),'the degrees line is the recorded degrees, without a bracket that repeats the specialty');
  assert.doesNotMatch(words.degreesLine(id),new RegExp(doctors[id].formal.replace(/[&]/g,'\\$&')));
 }
 assert.equal(words.honourTag('sanjay'),null);assert.equal(words.honourTag('parul'),'KGMU gold medalist');
 assert.deepEqual(words.doctorTone,{sanjay:'sage',parul:'rose'});
 for(const read of [words.shortRole,words.honourTag,words.degreesLine,words.workPortrait,words.roomPicture,words.avatarOf,words.careTopics,words.profilePage])assert.throws(()=>read('nobody'),/Unknown doctor/);
});

test('photographs: the wider at-work portraits, the room pictures and the small faces all exist, and none is Home\'s tight crop',()=>{
 for(const id of doctorOrder){
  const portrait=clinicPhotos[words.workPortrait(id)],room=clinicPhotos[words.roomPicture(id)];
  assert.ok(portrait&&room,'both pictures have a record');
  assert.notEqual(words.workPortrait(id),archPortraits[id],'the profile and Meet the doctors never repeat Home\'s crop');
  assert.equal(portrait.width/portrait.height,4/5);assert.ok(portrait.width<=300,'an at-work portrait is never wider than 300 px');
  assert.equal(room.width/room.height,3/2);assert.ok(room.width<=444,'a room picture is never wider than 444 px');
  assert.ok(portrait.alt.includes(doctors[id].name)&&room.alt.includes(doctors[id].name));
  assert.equal(words.avatarOf(id),doctorAvatars[id]);
  assert.match(words.portraitCredit[id],/^In (his|her) consulting room$/);
 }
 assert.equal(words.portraitCredit.sanjay,'In his consulting room');assert.equal(words.portraitCredit.parul,'In her consulting room');
 assert.equal(words.portraitPlace,locality);
});

test('what each doctor sees patients for is the Home chips\' own list: same labels, same places on Treatments',()=>{
 for(const id of doctorOrder){
  const chips=doctorChips(id),topics=words.careTopics(id);
  assert.deepEqual(topics.map(topic=>topic.label),chips.map(chip=>chip.label));
  assert.deepEqual(topics.map(topic=>topic.href),chips.map(chip=>chip.href));
  assert.equal(new Set(topics.map(topic=>topic.href)).size,topics.length,'every row has its own destination');
  for(const topic of topics)assert.ok(topic.href.startsWith(pagePaths.treatments)&&topic.href.includes(topic.id));
 }
 assert.equal(words.careTopics('sanjay').length,5);assert.equal(words.careTopics('parul').length,4);
});

test('Meet the doctors: the heading names both doctors, a line each',()=>{
 const page=words.doctorsPage;
 assert.equal(page.heading,'Meet Dr. Sanjay and Dr. Parul Gupta.');
 assert.ok(page.heading.endsWith(page.emphasis)&&page.emphasis.includes(doctors.parul.name));
 assert.ok(page.heading.includes(doctorShortName('sanjay')));
 assert.deepEqual(page.portraits.map(item=>item.id),doctorOrder);
 for(const item of page.portraits){assert.equal(item.name,doctors[item.id].name);assert.equal(item.role,words.shortRole(item.id));assert.equal(item.credit,words.portraitCredit[item.id]);assert.equal(item.instrument,words.doctorInstrument[item.id]);}
 // each doctor's own instrument is one of the paper-cut objects, and the two differ
 assert.deepEqual(Object.keys(words.doctorInstrument),doctorOrder);
 for(const id of doctorOrder)assert.ok(Object.hasOwn(clinicObjects,words.doctorInstrument[id]),`${id}: a known object`);
 assert.notEqual(words.doctorInstrument.sanjay,words.doctorInstrument.parul);
 assert.equal(page.jump.href,'#'+page.choose.id);assert.equal(page.jump.label,page.choose.heading);
 assert.ok(Object.isFrozen(page)&&Object.isFrozen(page.choose)&&Object.isFrozen(page.choose.leaves)&&Object.isFrozen(page.training));
});

test('Meet the doctors: each page of the spread carries what differs between the doctors, from data',()=>{
 const {leaves,more}=words.doctorsPage.choose;
 assert.deepEqual(leaves.map(leaf=>leaf.id),doctorOrder);
 for(const leaf of leaves){
  const doctor=doctors[leaf.id];
  assert.equal(leaf.name,doctor.name);assert.equal(leaf.role,doctor.role);
  assert.equal(leaf.heading,`See ${doctorShortName(leaf.id)} for`);
  assert.deepEqual(leaf.concerns,doctorChips(leaf.id).map(chip=>chip.label));
  assert.equal(leaf.degrees,words.degreesLine(leaf.id));assert.ok(!leaf.degrees.includes(doctor.formal),'the field is not named a third time');
  assert.ok(!Object.hasOwn(leaf,'formalLine'));
  assert.equal(leaf.registration,registrationLine(leaf.id));assert.ok(leaf.registration.endsWith(registrationNumbers[leaf.id]));
  assert.equal(leaf.tone,words.doctorTone[leaf.id]);
  assert.deepEqual({label:leaf.profile.label,href:leaf.profile.href},{label:actionLabels.fullProfile,href:doctor.path});
  assert.ok(leaf.profile.spoken.includes(doctor.name));
 }
 assert.equal(leaves[0].tag,null);assert.equal(leaves[1].tag,'KGMU gold medalist');
 assert.equal(more.href,pagePaths.treatments);
});

test('Meet the doctors: one sentence on training and four certificates, two each, that Home does not show',()=>{
 const {training}=words.doctorsPage,list=words.meetCertificates();
 assert.ok(training.intro.includes(words.university)&&training.intro.includes(doctors.parul.name));
 assert.equal((training.intro.match(/[.!?](\s|$)/g)||[]).length-(training.intro.match(/Dr\. /g)||[]).length,1,'one sentence');
 assert.ok(training.heading.endsWith(training.emphasis));
 assert.equal(list.length,4);
 assert.deepEqual(list.map(item=>item.doctor),['sanjay','sanjay','parul','parul'],'each doctor\'s pair stands together');
 const onHome=new Set(homeCertificates().map(item=>item.id));
 for(const item of list){assert.ok(certificateCatalogue.includes(item));assert.ok(!onHome.has(item.id),`${item.id} is already on Home`);}
 assert.deepEqual(words.meetCertificates(0,1).map(item=>item.id),doctorOrder.map(id=>certificatesFor(id)[0].id));
 assert.deepEqual(training.links.map(link=>link.href),doctorOrder.map(id=>`${doctors[id].path}#certificates`));
 for(const link of training.links){assert.equal(link.label,doctorShortName(link.id));assert.ok(link.spoken.includes(doctors[link.id].name));}
});

test('the next clinic session follows the appointment starting times in India time',()=>{
 const session=iso=>{const found=words.nextSession(at(iso));return {...found,detail:plain(found.detail)};};
 // Monday 16 November 2026
 assert.deepEqual(session('2026-11-16T05:30:00Z'),{state:'open',label:'In clinic now',detail:'until 1:30 pm'});                 // 11:00
 assert.deepEqual(session('2026-11-16T04:30:00Z'),{state:'open',label:'In clinic now',detail:'until 1:30 pm'});                 // 10:00 sharp
 assert.deepEqual(session('2026-11-16T03:00:00Z'),{state:'later',label:'Next clinic session',detail:'today, 10:00 am'});        // 8:30
 assert.deepEqual(session('2026-11-16T09:30:00Z'),{state:'later',label:'Next clinic session',detail:'today, 6:00 pm'});         // 15:00
 assert.deepEqual(session('2026-11-16T13:00:00Z'),{state:'open',label:'In clinic now',detail:'until 8:30 pm'});                 // 18:30
 assert.deepEqual(session('2026-11-16T15:30:00Z'),{state:'closed',label:'Next clinic session',detail:'tomorrow, 10:00 am'});    // 21:00
 // Sunday has no evening session: Sunday afternoon points to Monday morning.
 assert.deepEqual(session('2026-11-15T08:30:00Z'),{state:'closed',label:'Next clinic session',detail:'tomorrow, 10:00 am'});    // Sunday 14:00
 // A week without a Sunday session names the day.
 const weekdaysOnly={weekday:[[600,810]],sunday:[]};
 assert.equal(plain(words.nextSession(at('2026-11-14T15:30:00Z'),weekdaysOnly).detail),'Monday, 10:00 am');                     // Saturday 21:00
 assert.deepEqual(words.nextSession(at('2026-11-16T05:30:00Z'),{weekday:[],sunday:[]}),{state:'closed',label:'Next clinic session',detail:'call for timings'});
 assert.deepEqual(words.nextSessionNeutral,{state:'pending',label:'Clinic sessions',detail:NEUTRAL.detail});
 assert.equal(typeof words.nextSession().state,'string','without a date it reads the clock');
});

test('a profile: cover words come from data, and Call carries the digits',()=>{
 for(const id of doctorOrder){
  const page=words.profilePage(id),doctor=doctors[id];
  assert.equal(page.heading,doctor.name);assert.equal(page.runningHead,doctor.formal);assert.equal(page.role,doctor.role);
  assert.equal(page.degrees,words.degreesLine(id));assert.equal(page.registration,registrationLine(id));
  assert.equal(page.tag,words.honourTag(id));assert.equal(page.tone,words.doctorTone[id]);
  assert.equal(page.credit,words.portraitCredit[id]);assert.equal(page.creditPlace,locality);
  assert.equal(page.book,`Book with ${doctorShortName(id)}`);
  assert.deepEqual({...page.call},{label:`Call ${localPhone(id)}`,href:`tel:${doctor.tel}`,spoken:`Call ${doctor.name} at ${doctor.phone}`});
  assert.equal(page.session,words.nextSessionNeutral);
  assert.ok(Object.isFrozen(page)&&Object.isFrozen(page.care)&&Object.isFrozen(page.about)&&Object.isFrozen(page.certificates)&&Object.isFrozen(page.reviews));
 }
});

test('a profile: the list, the story, the certificates and the reviews',()=>{
 for(const id of doctorOrder){
  const page=words.profilePage(id),doctor=doctors[id],she=id==='parul';
  assert.deepEqual(page.care.topics,words.careTopics(id));
  assert.ok(page.care.heading.endsWith(page.care.emphasis)&&page.care.heading.includes(she?'she':'he'));
  assert.ok(page.care.listLabel.includes(doctor.name));assert.equal(typeof page.care.object,'string');
  // About the doctor: 60 to 80 words, from facts the site holds.
  const story=`${page.about.lede} ${page.about.body}`,count=wordCount(story);
  assert.ok(count>=60&&count<=80,`${id}: ${count} words`);
  assert.ok(page.about.lede.startsWith(doctor.name));
  assert.ok(story.includes(words.university)&&story.includes(String(doctorFacts[id].since)));
  assert.ok(page.about.heading.endsWith(page.about.emphasis)&&page.about.heading.includes(String(doctorFacts[id].since)));
  assert.ok(page.about.caption.startsWith(doctor.name));
  assert.equal(page.about.bring.href,'/#visiting');
  // Certificates: that doctor's five, in catalogue order, without the owner line.
  assert.deepEqual(page.certificates.items.map(item=>item.id),certificatesFor(id).map(item=>item.id));
  assert.equal(page.certificates.items.length,5);
  for(const item of page.certificates.items){assert.equal(item.doctor,null);assert.ok(item.title&&item.issuer&&item.variants.length);}
  assert.ok(page.certificates.heading.endsWith(page.certificates.emphasis));
  assert.ok(page.certificates.shelfLabel.includes(doctor.name));
  assert.ok(page.reviews.heading.endsWith(page.reviews.emphasis)&&page.reviews.heading.includes(she?'her':'his'));
  assert.equal(page.reviews.shown,3);
 }
 const phrase=/senior woman gynaecologist/g;
 assert.equal((strings(words.profilePage('parul')).join(' ').match(phrase)||[]).length,1,'"a senior woman gynaecologist" is said once');
 assert.equal((strings(words.profilePage('sanjay')).join(' ').match(phrase)||[]).length,0);
 assert.equal((strings(words.doctorsPage).join(' ').match(phrase)||[]).length,0);
});

test('proposed page descriptions: one sentence each, at most 155 characters, for exactly these three pages',()=>{
 assert.deepEqual(Object.keys(words.proposedDescriptions).sort(),[pagePaths.doctors,pagePaths.sanjay,pagePaths.parul].sort());
 for(const [path,description] of Object.entries(words.proposedDescriptions)){
  assert.ok(Object.hasOwn(pageMetadata,path));
  assert.ok(description.length<=155,`${path}: ${description.length} characters`);
  assert.ok(description.length>=110,`${path}: too short to be useful`);
  assert.match(description,/[a-z]\.$/);
  assert.equal((description.replace(/Dr\. |R\. K\. /g,'').match(/\./g)||[]).length,1,`${path}: one sentence`);
 }
 assert.ok(words.proposedDescriptions[pagePaths.sanjay].includes(doctors.sanjay.name));
 assert.ok(words.proposedDescriptions[pagePaths.parul].includes(doctors.parul.name));
 assert.ok(words.proposedDescriptions[pagePaths.doctors].includes(doctors.sanjay.name)&&words.proposedDescriptions[pagePaths.doctors].includes(doctors.parul.name));
});
