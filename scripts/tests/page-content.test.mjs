import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as shared from '../../src/clinic/page-content/shared.mjs';
import * as home from '../../src/clinic/page-content/home.mjs';
import * as standins from '../../src/clinic/standins.mjs';
import {doctors,address,directions,homeHeadline,appointmentTimes} from '../../src/clinic/model.mjs';
import {topics,topicById} from '../../src/clinic/care-catalogue.mjs';
import {certificateCatalogue} from '../../src/clinic/certificate-catalogue.mjs';
import {clinicPhotos} from '../../src/clinic/client-media.mjs';
import {pageMetadata} from '../../src/clinic/page-metadata.mjs';
import {bookingDestination} from '../../src/clinic/booking-links.mjs';
import {clinicStatus,NEUTRAL} from '../../src/clinic/open-status.mjs';

const at=iso=>new Date(iso);
const plain=text=>text.replace(/ /g,' ');
/** Every string inside a value, however deeply nested. */
function strings(value,found=[]){
 if(typeof value==='string')found.push(value);
 else if(typeof value==='function')return found;
 else if(value&&typeof value==='object')for(const item of Object.values(value))strings(item,found);
 return found;
}

// ---- shared parts ----

test('the seven page addresses are exactly the ones the installation routes',()=>{
 const project=JSON.parse(readFileSync(new URL('../../appointment-settings/project.json',import.meta.url)));
 const routed=project.surfaces.filter(surface=>['general','enquiry'].includes(surface.class)).map(surface=>surface.path);
 assert.deepEqual(Object.values(shared.pagePaths),['/','/treatment','/about-clinic','/meet-doctor','/dr-sanjay-gupta','/dr-parul-gupta','/contact']);
 assert.deepEqual(Object.values(shared.pagePaths).sort(),[...routed].sort());
 assert.deepEqual(Object.values(shared.pagePaths).sort(),Object.keys(pageMetadata).sort());
 assert.equal(shared.pagePaths.sanjay,doctors.sanjay.path);assert.equal(shared.pagePaths.parul,doctors.parul.path);
 assert.deepEqual(shared.bookingPaths,{book:'/booking',find:'/booking-details',findAlias:'/booking-help'});
});

test('header links and the phone menu are in the agreed order',()=>{
 assert.deepEqual(shared.mainNavigation.map(item=>item.label),['Treatments','Doctors','About','Contact']);
 assert.deepEqual(shared.mainNavigation.map(item=>item.path),['/treatment','/meet-doctor','/about-clinic','/contact']);
 assert.deepEqual(shared.menuNavigation.map(item=>item.label),['Home','Treatments','Doctors','About','Contact','Book an appointment']);
 assert.deepEqual(shared.menuNavigation.filter(item=>item.bookingOnly).map(item=>item.path),['/booking']);
 assert.equal(shared.clinicName,'R. K. Medical Centre');assert.equal(shared.clinicPlace,'Indira Nagar, Lucknow');
 assert.equal(shared.navigationLabels.home,'R. K. Medical Centre home');
});

test('"Doctors" is the current link on both doctor profiles',()=>{
 assert.equal(shared.navigationCurrent('/treatment','/treatment'),true);
 assert.equal(shared.navigationCurrent('/meet-doctor','/dr-sanjay-gupta'),true);
 assert.equal(shared.navigationCurrent('/meet-doctor','/dr-parul-gupta'),true);
 assert.equal(shared.navigationCurrent('/meet-doctor','/contact'),false);
 assert.equal(shared.navigationCurrent('/contact','/dr-parul-gupta'),false);
});

test('names, numbers and needs are read from the clinic facts',()=>{
 assert.equal(shared.doctorShortName('sanjay'),'Dr. Sanjay');assert.equal(shared.doctorShortName('parul'),'Dr. Parul');
 assert.equal(shared.localPhone('sanjay'),'94150 49410');assert.equal(shared.localPhone('parul'),'98386 55095');
 assert.equal(shared.doctorNeed('sanjay'),'General health and diabetes');assert.equal(shared.doctorNeed('parul'),'Women\'s health and pregnancy');
 assert.equal(shared.bookWithLabel('parul'),'Book with Dr. Parul');assert.equal(shared.callDoctorLabel('sanjay'),'Call Dr. Sanjay');
 assert.equal(shared.callDoctorSpoken('sanjay'),'Call Dr. Sanjay Gupta at +91 94150 49410');
});

test('booking links are ones the OFF build recognises and hides',()=>{
 assert.equal(shared.bookWithPath('sanjay'),'/booking?doctor=sanjay');
 assert.equal(shared.bookWithPath('parul','pregnancy'),'/booking?doctor=parul&topic=pregnancy');
 assert.equal(bookingDestination(shared.bookWithPath('sanjay','diabetes')),true);
});

test('the main booking control changes its words and address with the booking state',()=>{
 assert.deepEqual(shared.bookingEntryFor('header',true),{label:'Book an appointment',short:'Book',path:'/booking',spoken:'Book an appointment',hint:'Book an appointment online'});
 assert.equal(shared.bookingEntryFor('header',false).path,'/contact');
 assert.equal(shared.bookingEntryFor('header',false).spoken,'Book an appointment by calling the clinic');
 assert.equal(shared.bookingEntryFor('page',true).label,'Book an appointment');
 assert.deepEqual(shared.bookingEntryFor('page',false),{label:'Arrange a visit',path:'/contact',spoken:'Arrange a visit by calling the clinic',hint:'Call the clinic to arrange an appointment'});
 for(const place of ['header','page']){
  assert.equal(bookingDestination(shared.bookingEntryFor(place,true).path),true);
  assert.equal(bookingDestination(shared.bookingEntryFor(place,false).path),false,'the OFF address must survive the OFF build');
 }
 assert.throws(()=>shared.bookingEntryFor('footer',true),RangeError);
});

test('the live sign has three short states in India time',()=>{
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-16T05:30:00Z'))),{state:'open',label:'Open now',detail:'until 1:30 pm'});      // Mon 11:00
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-16T08:00:00Z'))),{state:'open',label:'Open now',detail:'until 1:30 pm'});      // Mon 1:30 pm, the last start
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-16T08:01:00Z'))),{state:'later',label:'Opens today',detail:'6:00 pm'});        // Mon 1:31 pm
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-16T02:30:00Z'))),{state:'later',label:'Opens today',detail:'10:00 am'});       // Mon 8:00 am
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-16T13:00:00Z'))),{state:'open',label:'Open now',detail:'until 8:30 pm'});      // Mon 6:30 pm
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-16T15:30:00Z'))),{state:'closed',label:'Closed now',detail:'opens Tue 10:00 am'}); // Mon 9:00 pm
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-14T16:00:00Z'))),{state:'closed',label:'Closed now',detail:'opens Sun 10:00 am'}); // Sat 9:30 pm
 assert.deepEqual(plainSign(shared.liveSign(at('2026-11-15T10:00:00Z'))),{state:'closed',label:'Closed now',detail:'opens Mon 10:00 am'}); // Sun 3:30 pm
 assert.equal(plain(shared.liveSignLine(shared.liveSign(at('2026-11-16T05:30:00Z')))),'Open now · until 1:30 pm');
 assert.equal(typeof shared.liveSign().state,'string','works with the present time too');
 function plainSign(sign){return {...sign,detail:plain(sign.detail)};}
});

test('the live sign never disagrees with the existing open-now sign',()=>{
 const start=Date.parse('2026-11-15T18:30:00Z'); // Monday 00:00 in India
 for(let minute=0;minute<7*24*60;minute+=5){
  const moment=new Date(start+minute*60000);
  assert.equal(shared.liveSign(moment).state==='open',clinicStatus(moment).open,moment.toISOString());
 }
});

test('the live sign copes with other timetables',()=>{
 const wednesdayOnly={weekday:[],sunday:[]},moment=at('2026-11-16T05:30:00Z');
 assert.deepEqual(shared.liveSign(moment,wednesdayOnly),{state:'closed',label:'Closed now',detail:'call for timings'});
 const sundayOnly={weekday:[],sunday:[[600,810]]};
 assert.equal(plain(shared.liveSign(moment,sundayOnly).detail),'opens Sun 10:00 am');
 assert.deepEqual(shared.liveSignNeutral,{state:'pending',label:NEUTRAL.label,detail:NEUTRAL.detail});
});

test('the essentials strip gives the fee and the place; its first cell is the live sign',()=>{
 assert.equal(shared.feeLabel(),'₹800');
 assert.equal(shared.feeLabel({fee:null,fees:'Dr. A: ₹800; Dr. B: ₹900'}),'Dr. A: ₹800; Dr. B: ₹900','each fee is named if they ever differ');
 assert.deepEqual(shared.essentials.fee,{icon:'report',label:'Fee',value:'₹800'});
 assert.deepEqual(shared.essentials.place,{icon:'pin',label:'Tedhi Pulia, Ring Road',action:'Directions',href:directions});
 assert.deepEqual(Object.keys(shared.essentials),['open','fee','place']);
});

test('the week\'s hours are the published appointment times, as rows and as one line',()=>{
 assert.deepEqual(shared.weekHours,[
  {days:'Monday to Saturday',short:'Mon–Sat',hours:appointmentTimes.weekday},
  {days:'Sunday',short:'Sun',hours:'10:00 am–1:30 pm',note:'No evening appointments'}
 ]);
 assert.equal(shared.hoursLine,'Mon–Sat 10:00 am–1:30 pm and 6:00 pm–8:30 pm · Sun 10:00 am–1:30 pm');
 assert.ok(appointmentTimes.sunday.startsWith(shared.weekHours[1].hours));
 assert.deepEqual(shared.weekHoursFrom({weekday:'9:00 am–1:00 pm',sunday:'9:00 am–11:00 am.'})[1],{days:'Sunday',short:'Sun',hours:'9:00 am–11:00 am',note:''});
});

test('call rows, the call sheet and the action bar carry both doctors and WhatsApp',()=>{
 const rows=shared.callRows();
 assert.deepEqual(rows.map(row=>row.id),['sanjay','parul']);
 assert.deepEqual(rows[1],{id:'parul',name:'Dr. Parul Gupta',need:'Women\'s health and pregnancy',phone:'+91 98386 55095',digits:'98386 55095',href:'tel:+919838655095',spoken:'Call Dr. Parul Gupta at +91 98386 55095'});
 assert.equal(shared.closingCallLine(rows[0]),'Dr. Sanjay Gupta · 94150 49410');
 assert.equal(shared.callSheet.title,'Call the clinic');
 assert.deepEqual(shared.callSheet.whatsapp,{label:'WhatsApp the clinic',number:standins.whatsappNumber,href:standins.whatsappLink()});
 assert.deepEqual([shared.actionBar.call,shared.actionBar.book,shared.actionBar.directions],['Call','Book','Directions']);
});

test('the closing heading stays true at any hour and in either booking state',()=>{
 assert.equal(shared.closingHeading('open'),'See a doctor today.');
 assert.equal(shared.closingHeading('later',false),'See a doctor today.');
 assert.equal(shared.closingHeading('closed'),'Book your next visit.');
 assert.equal(shared.closingHeading('closed',true),'Book your next visit.');
 assert.equal(shared.closingHeading('closed',false),'Arrange your next visit.');
 assert.equal(shared.closingHeading('pending'),'Book your next visit.');
 assert.equal(shared.closing.book,'Book an appointment');
});

test('captions, the address card and the review shelf words',()=>{
 assert.equal(shared.photoCaptions.frontage,'Look for the green wall and the blue board with both doctors’ names.');
 assert.equal(shared.photoCaptions.waitingArea,'The covered waiting area inside the gate.');
 assert.equal(shared.addressCard.address,address);
 assert.equal(shared.addressCard.parking,standins.parkingLine);
 assert.equal(shared.addressCard.bring,'Bring your earlier reports and current medicines, and come ten minutes early.');
 assert.deepEqual(shared.addressCard.directions,{label:'Get directions',href:directions});
 assert.deepEqual(shared.reviewShelf.tabs,{all:'All',sanjay:'Dr. Sanjay',parul:'Dr. Parul'});
 assert.equal(shared.readAllReviewsLabel(26),'Read all 26 reviews');
 assert.equal(shared.reviewReaderTitle('Aditi Sen'),'Review from Aditi Sen');
 assert.equal(shared.ratingSpoken(4.5),'4.5 out of 5');assert.equal(shared.ratingSpoken(5),'5.0 out of 5');
});

test('the footer is complete: address, hours, phones, pages, registrations and the three controls',()=>{
 const footer=shared.footer;
 assert.equal(footer.name,'R. K. Medical Centre');assert.equal(footer.address,address);assert.equal(footer.hoursLine,shared.hoursLine);
 assert.deepEqual(footer.pages.map(page=>page.path),['/','/treatment','/meet-doctor','/about-clinic','/contact']);
 assert.deepEqual(footer.registrations.map(row=>row.line),[standins.registrationLine('sanjay'),standins.registrationLine('parul')]);
 assert.deepEqual(footer.registrations.map(row=>row.path),['/dr-sanjay-gupta','/dr-parul-gupta']);
 assert.equal(footer.detailsNotice,'How your details are used');assert.equal(footer.privacyChoices,'Change privacy choices');
 assert.deepEqual(footer.motion,{pause:'Pause motion',play:'Play motion'});
 assert.equal(shared.detailsNotice.paragraphs.length,3);
 assert.equal(shared.copyrightLine(2026),'© 2026 R. K. Medical Centre · Lucknow');
 assert.equal(shared.copyrightLine(),`© ${new Date().getFullYear()} R. K. Medical Centre · Lucknow`);
 assert.equal(shared.practisingSince(),1992);
 assert.equal(shared.practisingSince({sanjay:{since:1992},parul:{since:1995}}),null,'no shared year when the doctors differ');
});

// ---- Home ----

test('Home has seven sections whose grounds make every boundary visible',()=>{
 assert.deepEqual(home.homeSections.map(section=>section.id),['opening','doctors','credentials','reviews','visiting','questions','closing']);
 assert.deepEqual(home.homeSections.map(section=>section.ground),['light','tint','deep','light','tint','light','light']);
});

test('the main heading is the clinic\'s headline with its last three words set apart',()=>{
 assert.equal(`${home.hero.heading.plain} ${home.hero.heading.emphasis}`,homeHeadline);
 assert.equal(home.hero.heading.emphasis,'on your mind.');
 assert.equal(home.hero.lead,'A physician and a gynaecologist caring for Lucknow families since 1992.');
 assert.ok(home.hero.lead.length<=75,'the lead fits two lines on a phone');
 assert.deepEqual(home.hero.portraits.map(portrait=>[portrait.name,portrait.role]),[['Dr. Sanjay Gupta','Physician · Diabetes'],['Dr. Parul Gupta','Gynaecologist']]);
 for(const portrait of home.hero.portraits)assert.ok(Object.hasOwn(clinicPhotos,portrait.photo));
});

test('each doctor\'s chips are the agreed ones, with answers drawn from the care catalogue',()=>{
 assert.deepEqual(home.doctorChips('sanjay').map(chip=>chip.label),['Diabetes','Blood pressure','Thyroid','Fever & infections','General check-up']);
 assert.deepEqual(home.doctorChips('parul').map(chip=>chip.label),['Periods & PCOS','Pregnancy','After childbirth','Ultrasound']);
 const all=['sanjay','parul'].flatMap(id=>home.doctorChips(id).map(chip=>({...chip,doctor:id})));
 assert.equal(new Set(all.map(chip=>chip.id)).size,9,'nine chips, nine different places on the Treatments page');
 for(const chip of all){
  const topic=topicById(chip.topic);
  assert.equal(topic.doctor,chip.doctor,chip.label+' belongs to this doctor');
  assert.ok(chip.answer.length>0&&chip.answer.length<=140,chip.label+' answer is at most 140 characters');
  if(chip.id!=='after-childbirth')assert.equal(chip.answer,topic.short);
  assert.equal(chip.href,'/treatment#'+chip.id);assert.equal(chip.more.href,chip.href);assert.match(chip.more.label,/^More about /);
  assert.equal(chip.image,topic.image);
  assert.equal(chip.bookHref,`/booking?doctor=${chip.doctor}&topic=${chip.topic}`);assert.equal(bookingDestination(chip.bookHref),true);
 }
 const after=all.find(chip=>chip.id==='after-childbirth');
 assert.equal(after.answer,'Ask your questions about care after childbirth.');assert.equal(after.topic,'pregnancy');
 for(const id of ['sanjay','parul'])assert.equal(new Set(home.doctorChips(id).map(chip=>chip.answer)).size,home.doctorChips(id).length,'every chip changes the answer');
 assert.deepEqual(new Set(all.map(chip=>chip.topic)),new Set(topics.map(topic=>topic.id)),'every care topic is reachable from a chip');
 assert.throws(()=>home.doctorChips('nobody'),RangeError);
 assert.equal(home.treatmentAnchor('thyroid'),'/treatment#thyroid');
});

test('the doctor cards carry only what differs between the doctors',()=>{
 const section=home.doctorsSection,[sanjay,parul]=section.cards;
 assert.equal(section.runningHead,'The doctors');assert.equal(section.heading,'Two doctors. One family practice.');
 assert.equal(section.intro,'Both trained at King George’s Medical University and have practised in Lucknow since 1992.');
 assert.equal(section.chipPrompt,'What would you like help with?');
 assert.deepEqual(section.cards.map(card=>card.id),['sanjay','parul']);
 assert.equal(sanjay.formalLine,'Physician & Diabetology · MBBS, MD (Medicine)');
 assert.equal(parul.formalLine,'Obstetrics & Gynaecology · MBBS, MS (Obstetrics & Gynaecology)');
 assert.equal(sanjay.specialty,doctors.sanjay.role);assert.equal(sanjay.tag,null);assert.equal(parul.tag,'KGMU gold medalist');
 assert.deepEqual([sanjay.tone,parul.tone],['sage','rose']);
 assert.deepEqual(sanjay.book,{label:'Book with Dr. Sanjay',href:'/booking?doctor=sanjay'});
 assert.deepEqual(parul.call,{label:'Call',href:'tel:+919838655095',spoken:'Call Dr. Parul Gupta at +91 98386 55095'});
 assert.deepEqual(parul.profile,{label:'Full profile',href:'/dr-parul-gupta'});
 assert.equal(sanjay.chips.length,5);assert.equal(parul.chips.length,4);
 for(const card of section.cards){
  assert.ok(Object.hasOwn(clinicPhotos,card.photo));
  for(const text of strings(card)){
   assert.doesNotMatch(text,/38164|38209|Reg\. No\./,'no registration number on a Home card');
   assert.doesNotMatch(text,/1992|since/i,'no "since 1992" on a Home card');
  }
 }
});

test('credentials: one numeral, four ledger rows, four certificates',()=>{
 assert.equal(home.yearsNumeral(2026),'30+');assert.equal(home.yearsNumeral(2031),'30+');assert.equal(home.yearsNumeral(2032),'40+');
 assert.equal(home.yearsNumeral(1990),'0+');assert.equal(home.yearsNumeral(2026,2010),'10+');assert.match(home.yearsNumeral(),/^\d+\+$/);
 assert.equal(home.credentialsHeading(2026),'30+ years caring for Lucknow families');
 assert.equal(home.credentials.runningHead,'Credentials');
 assert.deepEqual(home.credentials.rows.map(row=>[row.title,row.detail]),[['KGMU gold medalist','Dr. Parul Gupta'],['NABH accredited',null],['ISO 9001:2015 certified',null],['24-hour observation care',null]]);
 assert.deepEqual(home.credentials.allCertificates,{label:'All certificates',href:'/meet-doctor'});
 const four=home.homeCertificates();
 assert.deepEqual(four.map(item=>item.doctor),['sanjay','parul','sanjay','parul']);
 for(const item of four){
  const record=certificateCatalogue.find(entry=>entry.id===item.id);
  assert.equal(item.title,record.title);assert.equal(item.issuer,record.issuer);assert.equal(item.variants,record.variants);
  assert.equal(item.doctorName,doctors[item.doctor].name);
 }
 assert.equal(home.homeCertificates(1).length,2);assert.equal(home.homeCertificates(9).length,certificateCatalogue.length);
});

test('reviews and visiting us: headings, captions and the address card',()=>{
 assert.deepEqual(home.reviewsSection,{runningHead:'In patients’ words',heading:'In our patients’ words.'});
 assert.equal(home.visitingSection.runningHead,'Visiting us');assert.equal(home.visitingSection.heading,'Find us on Ring Road, Indira Nagar.');
 assert.deepEqual(home.visitingSection.photos.map(photo=>[photo.photo,photo.ratio]),[['street-frontage','16:9'],['waiting-area','4:5']]);
 for(const photo of home.visitingSection.photos){assert.ok(Object.hasOwn(clinicPhotos,photo.photo));assert.ok(photo.caption.length>20);}
 assert.equal(home.visitingSection.card,shared.addressCard);
});

test('the four questions, with stand-in answers taken from the stand-in file',()=>{
 const section=home.questionsSection;
 assert.equal(section.heading,'Before you come.');
 assert.deepEqual(section.rows.map(row=>row.question),['Can I walk in without an appointment?','How much is a visit, and how do I pay?','Can I book for a parent or someone else?','What is 24-hour observation care?']);
 assert.equal(new Set(section.rows.map(row=>row.id)).size,4);
 assert.equal(section.rows[0].answer,standins.walkInAnswer);
 assert.equal(section.rows[1].answer,'₹800 per consultation with either doctor. Cash or UPI at the clinic.');
 assert.ok(section.rows[1].answer.endsWith(standins.paymentAnswer));
 assert.equal(section.rows[2].answer,standins.bookForSomeoneElseAnswer);
 assert.equal(section.rows[3].answer,standins.observationCareSentence);
 assert.deepEqual(section.rows.map(row=>row.standIn),['all','part','all','all']);
});

test('one home per fact: the fee is written once in the Home words (the strip is a shared part)',()=>{
 const mentions=strings({...home,yearsNumeral:null}).filter(text=>text.includes('₹'));
 assert.deepEqual(mentions,[home.questionsSection.rows[1].answer]);
});

test('no markup and no typewriter quotes in any word a visitor reads',()=>{
 const addresses=/^(?:https?:|tel:|\/)/;
 for(const [name,module] of [['shared',shared],['home',home]]){
  for(const text of strings(module)){
   assert.doesNotMatch(text,/[<>]|&[a-z]+;/,`${name}: "${text}" holds markup`);
   if(!addresses.test(text))assert.doesNotMatch(text,/"/,`${name}: "${text}" has a straight double quote`);
  }
 }
 const visible=[...strings(home),...strings(shared)].filter(text=>!addresses.test(text));
 const straight=visible.filter(text=>text.includes('\''));
 // The clinic facts in model.mjs spell "Women's health and pregnancy care" with a straight apostrophe; nothing new may.
 for(const text of straight)assert.ok(strings(doctors).some(fact=>fact.includes('\'')&&text.includes(fact.replace(/\s+care$/u,''))),`"${text}" has a straight apostrophe`);
});

test('the words cannot be changed by accident',()=>{
 assert.throws(()=>{home.hero.lead='x';},TypeError);
 assert.throws(()=>{shared.footer.pages.push({});},TypeError);
 assert.throws(()=>{home.doctorsSection.cards[0].chips[0].label='x';},TypeError);
 assert.throws(()=>{shared.pagePaths.home='/home';},TypeError);
});
