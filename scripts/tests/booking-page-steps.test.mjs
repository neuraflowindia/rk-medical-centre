// The booking steps' words and decisions (src/booking/booking-steps.mjs), tested against the
// booking engine itself: the sealed package's own coordinator is run on the preview's stand-in
// answers, so every rule is checked on states the engine really produces.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {doctors} from '../../src/clinic/model.mjs';
import {bookForSomeoneElseAnswer} from '../../src/clinic/standins.mjs';
import {addressCard} from '../../src/clinic/page-content/shared.mjs';
import {createBookingController} from '../../appointment-system/browser/booking/controller.mjs';
import {createReceiptStore} from '../../appointment-system/browser/booking/credentials.mjs';
import {paymentAvailable} from '../../appointment-system/browser/booking/experience-contract.mjs';
import {RequestError} from '../../appointment-system/browser/transport.mjs';
import {dateRange} from '../../appointment-system/browser/display-formatting.mjs';
import {createStubs,readSettings} from '../dev-preview.mjs';
import {words,STEPS,DETAIL_FIELDS,DAY_TILES,SESSIONS,SESSION_SPLIT,keepTogether,serviceFor,doctorFor,doctorChoice,usablePolicy,doctorChoices,sittingHours,
 addDays,weekdayOf,dayLong,dayShort,dayTiles,dayBeyondTiles,clinicMinutes,sessionsOn,slotGroups,waitsForAdmission,holdEdit,releaseEdits,screenFor,
 stepOneMissing,stepThreeMissing,askFor,mustChooseAgain,validPhone,tidyPhone,phoneCountry,detailProblems,paymentOrder,confirmLabel,confirmHint,visitSummary,barLines,
 tileMove,tileStop,readFault,askedDoctor,
 PDF_HELP_MS,PDF_CURSOR_GRACE_MS,PDF_STUCK_MS,PDF_BUTTON,PDF_BUSY,PDF_SENTENCE,pdfIdle,pdfPressed,pdfSeen,pdfTook,pdfLine,pdfHolding,pdfWaiting,pdfKeepsCursor,
 paymentNote,contactRows,receiptDoctor,appointmentCard,calendarObject,HISTORY_MARK,DRAFT_KEY,DRAFT_MINUTES,DRAFT_DETAILS,readMark,withMark,draftRecord,parseDraft,
 saveDraft,loadDraft,clearDraft,flowStart,restoreNext,furthestStep,arrival,retreat,advanceMark,waitingView,visitLine,WAIT_GRACE,liftAboveBar,blockedWords} from '../../src/booking/booking-steps.mjs';

const settings=readSettings();
const NOW=Date.parse('2026-11-16T05:30:00Z'); // Monday 16 November 2026, 11:00 am in India
const MONDAY='2026-11-16',SUNDAY='2026-11-22';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const everyString=value=>typeof value==='string'?[value]:typeof value==='function'?[String(value('x','y','z'))]:value&&typeof value==='object'?Object.values(value).flatMap(everyString):[];

/** The engine's coordinator on the preview's answers. `admitted` can be switched to play the booking-state check. */
async function engine({initialService='dr-sanjay-gupta'}={}){
 const stubs=createStubs({settings,clock:()=>NOW}),asked=[];
 const api=async(path,{body}={})=>{
  const [pathname,search='']=path.split('?');asked.push(path);
  const reply=stubs.answer({method:body===undefined?'GET':'POST',path:pathname,search:search?'?'+search:'',booking:'on',contact:'open',body});
  const data=JSON.parse(reply.body);
  if(reply.status!==200)throw new RequestError(data.code,{status:reply.status});
  return data;
 };
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const listeners=new Set();
 let snapshot={enabled:true,verified:true,checking:false,activation_epoch:stubs.epoch,foreground_revision:0};
 const product={getSnapshot:()=>snapshot,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);}};
 const controller=createBookingController({api,receipts:createReceiptStore({installation_id:'11111111-2222-4333-8444-555555555555',environment:'test'}),storage:()=>storage,
  product,payment:{load:async()=>{},open:()=>{}},initialService,clock:()=>NOW,interval:()=>1,clearInterval:()=>{},documentObject:{visibilityState:'visible'}});
 controller.start();await tick();
 const check=checking=>{snapshot={...snapshot,verified:!checking,checking};for(const listener of [...listeners])listener();};
 return {controller,state:()=>controller.getSnapshot(),asked,check};
}

test('the words are complete, warm and typed with proper marks; the three steps are the engine\'s three stages',()=>{
 const all=everyString(words);
 assert.ok(all.length>70);
 for(const text of all){
  assert.ok(text.trim().length>0);
  assert.doesNotMatch(text,/STAND-IN|undefined|\[object/,text);
  assert.doesNotMatch(text,/['"]/,`typewriter marks in: ${text}`);
 }
 assert.deepEqual(STEPS.map(step=>step.id),[1,2,3]);
 // the stage headings the engine's own form has always carried
 assert.deepEqual(STEPS.map(step=>step.title),['Your doctor and starting time','Your details','Check your visit and payment']);
 assert.equal(words.stepCount(2,3),'Step 2 of 3');
 // the "someone else" line is the stand-in answer, without its leading "Yes."
 assert.ok(bookForSomeoneElseAnswer.startsWith('Yes. '));
 assert.equal(words.details.someoneElse,'Booking for a parent or someone else? '+bookForSomeoneElseAnswer.slice(5));
 assert.equal(words.receipt.bring,addressCard.bring,'what to bring has one home');
 // one title and one tag for each state the engine's receipt can be in
 const states=['confirmed','held','expired','cancelled','payment_review'];
 assert.deepEqual(Object.keys(words.receipt.titles).sort(),[...states].sort());assert.deepEqual(Object.keys(words.receipt.tags).sort(),[...states].sort());
 for(const method of settings.payment_methods)assert.ok(words.payment[method]&&words.confirm[method],`words for paying ${method}`);
 assert.equal(words.payment.unavailable,'Temporarily unavailable','the engine\'s own words for a method it cannot offer');
 assert.equal(words.time.noneLeft('Tuesday 17 November'),'No starting times are left on Tuesday 17 November. Choose another day, or call the clinic.');
 assert.equal(words.payment.atClinicNote('₹800'),'₹800 when you arrive.');
});

test('short pairs stay on one line',()=>{
 assert.equal(keepTogether('Dr. Sanjay Gupta'),'Dr. Sanjay Gupta');
 assert.equal(keepTogether('R. K. Medical Centre'),'R. K. Medical Centre');
 assert.equal(keepTogether('Wed 18 Nov · 10:20 am'),'Wed 18 Nov · 10:20 am');
 assert.equal(keepTogether('94150 49410'),'94150 49410');
 assert.equal(keepTogether(800),'800');
 assert.equal(keepTogether(settings.location.address).slice(-12),'UP\u00a0-\u2060\u00a0226016','the state and the PIN code stay together (no break after the hyphen either)');
});

test('doctors: the engine\'s services become the two doctor cards, each in its own wash',async()=>{
 const {state}=await engine();
 assert.equal(serviceFor('sanjay'),'dr-sanjay-gupta');assert.equal(serviceFor('parul'),'dr-parul-gupta');assert.equal(serviceFor('nobody'),'');assert.equal(serviceFor(undefined),'');
 assert.equal(doctorFor('dr-parul-gupta'),'parul');assert.equal(doctorFor('physiotherapy'),'');
 assert.equal(usablePolicy(state().policy),true);
 const cards=doctorChoices(state().policy);
 assert.deepEqual(cards.map(card=>[card.id,card.name,card.role,card.tone,card.short]),[
  ['sanjay','Dr. Sanjay Gupta',doctors.sanjay.role,'sage','Dr. Sanjay'],['parul','Dr. Parul Gupta',doctors.parul.role,'rose','Dr. Parul']]);
 for(const card of cards)assert.ok(existsSync(fileURLToPath(new URL('../../public'+card.avatar.src,import.meta.url))),card.avatar.src);
 // a service the site has no doctor for is still offered, plainly
 assert.deepEqual(doctorChoice({id:'physiotherapy',name:'Physiotherapy'}),{service:'physiotherapy',id:'',name:'Physiotherapy',role:'',need:'',tone:'plain',avatar:null,short:'Physiotherapy'});
 // the cards print each doctor's field in the site's short form, so it stays on one line on every phone
 assert.deepEqual(cards.map(card=>card.need),['General health and diabetes','Women’s health and pregnancy']);
 for(const card of cards)assert.ok(card.role.startsWith(card.need)&&card.need.length<=28);
 // a service the clinic has switched off is not offered
 const off=structuredClone(state().policy);off.policy.services[1].enabled=false;
 assert.deepEqual(doctorChoices(off).map(card=>card.id),['sanjay']);
 // a policy that is not a visit in person cannot be drawn by these steps
 for(const change of [{version:1},{meeting:'google_meet'},{display_duration:true}]){
  const other=structuredClone(state().policy);Object.assign(other.policy,change);
  assert.equal(usablePolicy(other),false);assert.deepEqual(doctorChoices(other),[]);assert.equal(sittingHours(other,'dr-sanjay-gupta'),null);
 }
 assert.equal(usablePolicy(null),false);assert.equal(usablePolicy({}),false);
 assert.equal(sittingHours(state().policy,'dr-sanjay-gupta').length,13,'six days of two sessions and Sunday morning');
 assert.equal(sittingHours(state().policy,'nobody'),null);
});

test('days: fourteen tiles from the clinic\'s today; a day outside the window or without sitting hours is flat',async()=>{
 const {state}=await engine(),range=dateRange(state().policy),hours=sittingHours(state().policy,'dr-sanjay-gupta');
 assert.equal(range.first_date,MONDAY);
 assert.equal(addDays(MONDAY,6),SUNDAY);assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.equal(addDays(MONDAY,-1),'2026-11-15');
 assert.equal(weekdayOf(MONDAY),0);assert.equal(weekdayOf(SUNDAY),6);
 assert.equal(dayLong(MONDAY),'Monday 16 November');assert.equal(dayShort(SUNDAY),'Sun 22 Nov');assert.equal(dayLong(''),'');assert.equal(dayShort('soon'),'');
 const tiles=dayTiles({first:range.first_date,last:range.last_date,hours});
 assert.equal(tiles.length,DAY_TILES);assert.equal(DAY_TILES,14);
 assert.deepEqual([tiles[0].iso,tiles[0].label,tiles[0].number,tiles[0].month,tiles[0].spoken],[MONDAY,'Today','16','Nov','Monday 16 November']);
 assert.deepEqual(tiles.slice(1,7).map(tile=>tile.label),['Tue','Wed','Thu','Fri','Sat','Sun']);
 assert.equal(tiles[13].iso,'2026-11-29');assert.ok(tiles.every(tile=>tile.available),'both doctors sit every day of the week');
 // the window ends: later tiles are flat
 assert.deepEqual(dayTiles({first:MONDAY,last:'2026-11-18',hours}).map(tile=>tile.available).slice(0,5),[true,true,true,false,false]);
 // a doctor who does not sit on Sundays
 const noSunday=hours.filter(window=>window.weekday!==6);
 assert.deepEqual(dayTiles({first:MONDAY,last:range.last_date,hours:noSunday}).filter(tile=>!tile.available).map(tile=>tile.iso),[SUNDAY,'2026-11-29']);
 // hours not known: no day is ruled out; no first day: no tiles
 assert.ok(dayTiles({first:MONDAY}).every(tile=>tile.available));assert.deepEqual(dayTiles({first:''}),[]);assert.deepEqual(dayTiles(),[]);
 assert.equal(dayTiles({first:MONDAY,count:3}).length,3);
 assert.equal(dayBeyondTiles(tiles,MONDAY),false);assert.equal(dayBeyondTiles(tiles,'2026-12-10'),true);assert.equal(dayBeyondTiles(tiles,''),false);
});

test('starting times: the clinic\'s two sessions, with a sentence where a session has none',async()=>{
 const {controller,state}=await engine(),hours=sittingHours(state().policy,'dr-sanjay-gupta');
 assert.deepEqual(SESSIONS,['morning','evening']);assert.equal(SESSION_SPLIT,900);
 assert.equal(clinicMinutes('2026-11-16T04:30:00Z'),600);assert.equal(clinicMinutes('2026-11-16T15:00:00Z'),1230);assert.equal(clinicMinutes('2026-11-16T04:30:00Z','UTC'),270);
 assert.deepEqual(sessionsOn(hours,MONDAY),{morning:true,evening:true});assert.deepEqual(sessionsOn(hours,SUNDAY),{morning:true,evening:false});
 assert.deepEqual(sessionsOn(null,MONDAY),{morning:false,evening:false});assert.deepEqual(sessionsOn(hours,''),{morning:false,evening:false});
 // today, 11:00 am: the morning's remaining times and the whole evening
 const today=slotGroups(state().slots,{timezone:'Asia/Kolkata',hours,day:state().day});
 assert.deepEqual(today.map(group=>[group.id,group.label]),[['morning','Morning'],['evening','Evening']]);
 assert.ok(today[0].slots.length>0&&today[1].slots.length>0);
 assert.match(today[0].slots[0].label,/^1[12]:\d\d (am|pm)$/);assert.match(today[1].slots[0].label,/^6:\d\d pm$/);
 assert.match(today[0].slots.at(-1).label,/^1:\d\d pm$/,'the morning session runs past noon, and its last times still count as morning');
 assert.equal(today.flatMap(group=>group.slots).length,state().slots.length,'every time the engine offers is shown once');
 assert.ok(today.every(group=>group.none===''));
 // Sunday: the engine offers no evening, and the page says why
 controller.edit('day',SUNDAY);await tick();
 const sunday=slotGroups(state().slots,{timezone:'Asia/Kolkata',hours,day:SUNDAY});
 assert.ok(sunday[0].slots.length>0);assert.deepEqual(sunday[1].slots,[]);assert.equal(sunday[1].none,'No evening appointments on Sundays.');
 // a session that is held but full
 const full=slotGroups(state().slots.filter(()=>false),{hours,day:MONDAY});
 assert.deepEqual(full.map(group=>group.none),['No morning times are left.','No evening times are left.']);
 // hours not known: nothing is said about the weekday
 assert.deepEqual(slotGroups(null).map(group=>[group.slots.length,group.none]),[[0,'No morning times are left.'],[0,'No evening times are left.']]);
});

test('a change of doctor or day made during the booking-state check is held, then handed over in order',async()=>{
 assert.equal(waitsForAdmission('service'),true);assert.equal(waitsForAdmission('day'),true);
 for(const name of ['slot','payment_method','questions'])assert.equal(waitsForAdmission(name),false);
 let held=holdEdit(null,'day','2026-11-18');held=holdEdit(held,'service','dr-parul-gupta');held=holdEdit(held,'day','2026-11-19');
 assert.deepEqual(releaseEdits(held),[['service','dr-parul-gupta'],['day','2026-11-19']]);
 assert.deepEqual(releaseEdits(null),[]);assert.deepEqual(releaseEdits(holdEdit(null,'day',SUNDAY)),[['day',SUNDAY]]);
 // Why it is held: told about a new day while the check is running, the engine keeps the old day's times on screen.
 const stale=await engine();
 const mondayTimes=stale.state().slots.map(slot=>slot.starts_at);
 stale.check(true);stale.controller.edit('day','2026-11-18');await tick();
 assert.equal(stale.state().day,'2026-11-18');assert.deepEqual(stale.state().slots.map(slot=>slot.starts_at),mondayTimes,'the engine did not read the new day');
 // Handed over after the check, the same change brings that day's own times.
 const kept=await engine();
 kept.check(true);const waiting=holdEdit(null,'day','2026-11-18');kept.check(false);
 for(const [name,value] of releaseEdits(waiting))kept.controller.edit(name,value);
 await tick();
 assert.equal(kept.state().slotsFresh,true);assert.ok(kept.state().slots.length>0);
 assert.ok(kept.state().slots.every(slot=>slot.starts_at.startsWith('2026-11-18')));
 assert.ok(kept.asked.some(path=>path.includes('day=2026-11-18')));
});

test('which screen, and when a step may go on',async()=>{
 const {controller,state}=await engine();
 assert.equal(screenFor({viewAvailable:false,state:state()}),'unavailable');
 assert.equal(screenFor({viewAvailable:true,state:state()}),'form');
 assert.equal(screenFor({viewAvailable:true,state:{...state(),phase:'blocked'}}),'blocked');
 assert.equal(screenFor({viewAvailable:true,state:{...state(),credential:{request_id:'x'}}}),'checking');
 assert.equal(screenFor({viewAvailable:true,state:{...state(),credential:{request_id:'x'},receipt:{}}}),'receipt');
 // step 1
 const usable=usablePolicy(state().policy);
 assert.equal(stepOneMissing({chosen:false,state:state(),usable}),'doctor','the engine\'s own first doctor is not the visitor\'s choice');
 assert.equal(stepOneMissing({chosen:true,state:state(),usable:false}),'doctor');
 assert.equal(stepOneMissing({chosen:true,state:{...state(),service:''},usable}),'doctor');
 assert.equal(stepOneMissing({chosen:true,state:state(),usable}),'time');
 assert.equal(stepOneMissing({chosen:true,state:{...state(),slotsStatus:'loading'},usable}),'checking');
 controller.edit('slot',state().slots[1]);
 assert.equal(stepOneMissing({chosen:true,state:state(),usable}),'');
 assert.equal(stepOneMissing({chosen:true,held:{day:SUNDAY},state:state(),usable}),'checking');
 assert.equal(stepOneMissing({chosen:true,state:{...state(),slotsFresh:false},usable}),'time');
 assert.equal(stepOneMissing({chosen:true,state:{...state(),policyFresh:false},usable}),'time');
 // the chosen time goes
 assert.equal(mustChooseAgain({step:2,state:state(),usable}),false);
 assert.equal(mustChooseAgain({step:3,state:{...state(),slot:null},usable}),true);
 assert.equal(mustChooseAgain({step:1,state:{...state(),slot:null},usable}),false,'already on step 1');
 assert.equal(mustChooseAgain({step:3,state:{...state(),slot:null,slotsStatus:'loading'},usable}),false,'still being read');
 assert.equal(mustChooseAgain({step:3,state:{...state(),slot:null,policyFresh:false},usable}),false);
 assert.equal(mustChooseAgain({step:3,state:{...state(),slot:null},usable:false}),false);
});

test('details: only what a visitor can put right at once is caught',()=>{
 for(const good of ['9876543210','98765 43210','(98765) 43-210','+919876543210','+44 20 7946 0958','+1 (415) 555-0132'])assert.equal(validPhone(good),true,good);
 for(const bad of ['','12345','98765432101','+0123456789','+91','nine eight','98765x3210','++919876543210','009876543210'])assert.equal(validPhone(bad),false,bad);
 // many people here type their mobile number with a 0 in front: the one 0 is taken off, the number is not refused
 assert.equal(tidyPhone('09876543210'),'9876543210');assert.equal(tidyPhone('098765 43210'),'98765 43210');assert.equal(tidyPhone(' 0 98765-43210'),'98765-43210');
 assert.equal(tidyPhone('(0)98765 43210'),'98765 43210');assert.equal(tidyPhone('0522 2345678'),'522 2345678','a landline with its city code');
 for(const same of ['9876543210','98765 43210','+919876543210','+44 20 7946 0958','009876543210','0123','',' 0'])assert.equal(tidyPhone(same),same,same);
 assert.equal(tidyPhone(undefined),'');assert.equal(tidyPhone(null),'');
 assert.equal(validPhone('09876543210'),true);assert.equal(validPhone('098765 43210'),true);
 assert.deepEqual(detailProblems({full_name:'Kamla Verma',phone:'09876543210'}),{});
 assert.equal(phoneCountry('+44 20 7946 0958'),'other');assert.equal(phoneCountry('  +91 98765 43210'),'other');assert.equal(phoneCountry('98765 43210'),'91');
 assert.equal(phoneCountry(''),'91');assert.equal(phoneCountry(undefined),'91');
 assert.deepEqual(DETAIL_FIELDS,['full_name','phone','email']);
 const good={full_name:'Kamla Verma',phone:'98765 43210',email:'',notes:''};
 assert.deepEqual(detailProblems(good),{});
 assert.deepEqual(detailProblems({...good,email:'kamla@example.com'}),{});
 assert.deepEqual(detailProblems({full_name:' K ',phone:'',email:'kamla@'}),{full_name:words.errors.name,phone:words.errors.phoneMissing,email:words.errors.email});
 assert.deepEqual(detailProblems({...good,phone:'12345'}),{phone:words.errors.phone});
 assert.deepEqual(detailProblems({}),{full_name:words.errors.name,phone:words.errors.phoneMissing});
 // the clinic's settings decide which contacts are required
 assert.deepEqual(detailProblems({...good,phone:''},{requiredContacts:[]}),{});
 assert.deepEqual(detailProblems(good,{requiredContacts:['phone','email']}),{email:words.errors.emailMissing});
 assert.deepEqual(detailProblems({...good,phone:'',email:'a@b.in'},{requiredContacts:['email']}),{});
});

test('the last button always names what the press will do, and the line under the tick box says what it waits for',()=>{
 assert.equal(confirmLabel({method:'at_clinic'}),'Confirm appointment');assert.equal(confirmLabel({method:'online'}),'Continue to payment');
 // nothing chosen yet: the first option that can be chosen names the button, so its words never change under the finger
 assert.equal(confirmLabel({method:'',offered:['at_clinic']}),'Confirm appointment');assert.equal(confirmLabel({offered:['online','at_clinic']}),'Continue to payment');
 assert.equal(confirmLabel(),'Confirm appointment');assert.equal(confirmLabel({method:'cheque',offered:['barter']}),'Confirm appointment');
 assert.equal(confirmLabel({busy:true,method:'at_clinic'}),'Saving your appointment…');
 assert.equal(confirmHint({missing:''}),'This books your visit straight away.');assert.equal(confirmHint(),'This books your visit straight away.');
 assert.equal(confirmHint({missing:'tick'}),'Tick the box to confirm.');
 assert.equal(confirmHint({missing:'payment'}),'Choose a payment option first.');
 assert.equal(confirmHint({missing:'checking'}),'Checking the latest times…');
});

test('the last step: what is still missing, in the order a visitor meets it',async()=>{
 const {controller,state}=await engine();
 const usable=usablePolicy(state().policy),available=method=>paymentAvailable(state().policy,method);
 const missing=(extra={})=>stepThreeMissing({usable,state:state(),methodAvailable:!!state().payment_method&&available(state().payment_method),...extra});
 assert.equal(missing(),'checking','no starting time: nothing can be confirmed');
 controller.edit('slot',state().slots[0]);
 assert.equal(missing(),'payment','the engine starts with no payment option chosen');
 // a tick made before the payment option is chosen is cleared by the engine when the option is chosen: the box waits
 controller.acknowledge(true);assert.equal(state().ack,true);
 controller.edit('payment_method','at_clinic');assert.equal(state().ack,false);
 assert.equal(missing(),'tick');
 controller.acknowledge(true);assert.equal(missing(),'');
 // a change of doctor or day that is being held, stale options, an option the engine cannot offer
 assert.equal(missing({held:{day:SUNDAY}}),'checking');
 assert.equal(stepThreeMissing({usable,state:{...state(),policyFresh:false},methodAvailable:true}),'checking');
 assert.equal(stepThreeMissing({usable,state:{...state(),slotsFresh:false},methodAvailable:true}),'checking');
 assert.equal(stepThreeMissing({usable,state:{...state(),quote:null},methodAvailable:true}),'checking');
 assert.equal(stepThreeMissing({usable:false,state:state(),methodAvailable:true}),'checking');
 assert.equal(stepThreeMissing({usable,state:{...state(),payment_method:'online'},methodAvailable:false}),'payment');
 assert.equal(stepThreeMissing({usable,state:state()}),'payment','availability must be said');
 // the options are listed with the ones that can be chosen first, otherwise in the engine's order
 assert.deepEqual(settings.payment_methods,['online','at_clinic']);
 assert.deepEqual(paymentOrder(state().policy.policy.payment_methods,available),['at_clinic','online']);
 assert.deepEqual(paymentOrder(['online','at_clinic'],()=>true),['online','at_clinic']);assert.deepEqual(paymentOrder(['online','at_clinic'],()=>false),['online','at_clinic']);
 assert.deepEqual(paymentOrder(undefined,()=>true),[]);
});

test('a main button pressed too early points at the one thing that is missing',()=>{
 assert.equal(askFor({step:1,missing:'doctor'}),'doctor');
 assert.equal(askFor({step:1,missing:'time'}),'time');
 assert.equal(askFor({step:1,missing:'time',timesShown:false}),'day','no time can be chosen on the day shown: another day is the way on');
 assert.equal(askFor({step:1,missing:'checking'}),'','nothing to point at while the engine reads');
 assert.equal(askFor({step:1,missing:''}),'');
 assert.equal(askFor({step:3,missing:'payment'}),'payment');assert.equal(askFor({step:3,missing:'tick'}),'tick');
 assert.equal(askFor({step:3,missing:'checking'}),'');assert.equal(askFor({step:3,missing:''}),'');
 assert.equal(askFor({step:2,missing:'time'}),'','step 2 marks its own boxes');assert.equal(askFor(),'');
 for(const what of ['time','day','payment'])assert.match(words.ask[what],/^Choose .+\.$/);
});

test('the summary follows the engine: who, when, how much, where',async()=>{
 const {controller,state}=await engine();
 const usable=usablePolicy(state().policy);
 // before the visitor has chosen a doctor
 const blank=visitSummary({state:state(),usable,chosen:false});
 assert.equal(blank.doctor,null);assert.equal(blank.day,'');assert.equal(blank.time,'');assert.equal(blank.fee,'');assert.equal(blank.waiting,false);
 assert.deepEqual(blank.place,{name:settings.location.name,address:settings.location.address});
 assert.deepEqual(barLines(blank),{top:'Choose a doctor',bottom:''});
 // doctor chosen, no time yet
 const started=visitSummary({state:state(),usable});
 assert.equal(started.doctor.name,'Dr. Sanjay Gupta');assert.equal(started.day,'Monday 16 November');assert.equal(started.dayShort,'Mon 16 Nov');
 assert.equal(started.time,'');assert.equal(started.fee,'₹800');assert.equal(started.payment,'');
 // the day is named as soon as it is chosen, before a starting time is
 assert.deepEqual(barLines(started,'time'),{top:'Dr. Sanjay',bottom:'Mon 16 Nov · choose a time'});
 assert.deepEqual(barLines(started,'checking'),{top:'Dr. Sanjay',bottom:'Mon 16 Nov · Checking times…'});assert.deepEqual(barLines(started),{top:'Dr. Sanjay',bottom:'Mon 16 Nov · choose a time'});
 assert.deepEqual(barLines({...started,dayShort:''},'time'),{top:'Dr. Sanjay',bottom:'Choose a starting time'});
 // a time chosen
 controller.edit('slot',state().slots.find(slot=>slot.starts_at==='2026-11-16T12:30:00.000Z'));
 const timed=visitSummary({state:state(),usable});
 assert.equal(timed.time,'6:00 pm');assert.equal(timed.waiting,false);assert.equal(timed.fee,'₹800');
 assert.deepEqual(barLines(timed),{top:'Dr. Sanjay',bottom:'Mon 16 Nov · 6:00 pm'});
 // whose visit it is: the last step shows what the tick box asks the visitor to check
 controller.details('full_name','  Kamla Devi Srivastava ');controller.details('phone',' 98765 43210');
 assert.deepEqual(visitSummary({state:state(),usable}).patient,{name:'Kamla Devi Srivastava',phone:'98765 43210',email:''});
 controller.details('email','kamla@example.com ');assert.equal(visitSummary({state:state(),usable}).patient.email,'kamla@example.com');
 assert.deepEqual(visitSummary({state:{...state(),details:undefined},usable}).patient,{name:'',phone:'',email:''});
 assert.match(words.confirm.ack,/my details/);assert.equal(words.summary.details,'Your details');
 // the visit in one line, for the moment it is being saved
 assert.equal(visitLine(timed),'Dr. Sanjay Gupta · Monday 16 November · 6:00 pm');assert.equal(visitLine(started),'');assert.equal(visitLine(blank),'');
 // payment words appear only for a method the engine can offer
 controller.edit('payment_method','at_clinic');
 assert.equal(paymentAvailable(state().policy,'at_clinic'),true);assert.equal(paymentAvailable(state().policy,'online'),false);
 assert.equal(visitSummary({state:state(),usable,methodAvailable:true}).payment,'pay at the clinic');
 assert.equal(visitSummary({state:state(),usable,methodAvailable:false}).payment,'');
 assert.equal(visitSummary({state:{...state(),payment_method:'online'},usable,methodAvailable:true}).payment,'pay online');
 // a change that is being held: the new doctor and day show at once, the time waits
 const moving=visitSummary({state:state(),usable,shown:{service:'dr-parul-gupta',day:SUNDAY}});
 assert.equal(moving.doctor.id,'parul');assert.equal(moving.day,'Sunday 22 November');assert.equal(moving.time,'');assert.equal(moving.waiting,true);
 // while the day's times are being read
 assert.equal(visitSummary({state:{...state(),slotsStatus:'loading',slotsFresh:false},usable}).waiting,true);
 // nothing to draw from
 const none=visitSummary({state:{...state(),policy:null},usable:false});
 assert.deepEqual([none.doctor,none.day,none.time,none.fee,none.place],[null,'','','',null]);
 // the payment rows' second lines
 assert.equal(paymentNote('at_clinic',{available:true,fee:'₹800'}),'₹800 when you arrive.');assert.equal(paymentNote('at_clinic',{available:true}),'The fee when you arrive.');
 assert.equal(paymentNote('online',{available:true}),'Continue to secure payment after this step.');
 assert.equal(paymentNote('online',{available:false}),'Temporarily unavailable');assert.equal(paymentNote('at_clinic',{available:false}),'Temporarily unavailable');
});

test('the appointment card is drawn from the engine\'s own receipt',async()=>{
 const {controller,state}=await engine({initialService:'dr-parul-gupta'});
 controller.edit('slot',state().slots.find(slot=>slot.starts_at==='2026-11-16T12:30:00.000Z'));
 controller.details('full_name','Kamla Verma');controller.details('phone','9876543210');
 controller.edit('payment_method','at_clinic');controller.acknowledge(true);
 await controller.checkout();await tick();
 const receipt=state().receipt;
 assert.equal(receipt.appointment_state,'confirmed');assert.equal(screenFor({viewAvailable:true,state:state()}),'receipt');
 const card=appointmentCard(receipt);
 assert.deepEqual([card.state,card.tag,card.title],['confirmed','Confirmed','Your appointment is confirmed']);
 assert.deepEqual(card.doctor,{id:'parul',name:'Dr. Parul Gupta',role:doctors.parul.role,portrait:'close-parul'});
 assert.equal(card.day,'Monday 16 November');assert.equal(card.time,'6:00 pm');assert.equal(card.instant,receipt.starts_at);
 assert.deepEqual(card.place,{name:settings.location.name,address:settings.location.address,maps:settings.location.maps_url});
 assert.equal(card.pay,'₹800 · pay at the clinic');assert.equal(card.bring,addressCard.bring);
 assert.equal(receiptDoctor(receipt),'parul');assert.equal(receiptDoctor({resource_id:'x',resource_name:'Dr. Sanjay Gupta'}),'sanjay');
 assert.equal(receiptDoctor({service_name:'Dr. Parul Gupta'}),'parul');assert.equal(receiptDoctor({service_name:'Physiotherapy'}),'');
 // cancelled: nothing to pay, nothing to bring
 const cancelled=appointmentCard({...receipt,appointment_state:'cancelled',amount_due_paise:0});
 assert.deepEqual([cancelled.tag,cancelled.title,cancelled.pay,cancelled.bring],['Cancelled','This appointment was cancelled','','']);
 // paid online, still being checked
 const online=appointmentCard({...receipt,appointment_state:'payment_review',payment_method:'online'});
 assert.deepEqual([online.tag,online.pay,online.bring],['Being checked','₹800 · online payment','']);
 assert.equal(appointmentCard({...receipt,appointment_state:'held'}).tag,'Reserved');assert.equal(appointmentCard({...receipt,appointment_state:'expired'}).pay,'');
 // a state this page has no words for prints none, and a receipt without a place or a known doctor still draws
 const odd=appointmentCard({...receipt,appointment_state:'moved',location:null,resource_id:'x',resource_name:'Physiotherapy'});
 assert.deepEqual([odd.tag,odd.title,odd.place,odd.doctor.id,odd.doctor.role,odd.doctor.portrait,odd.doctor.name],['','',null,'','','','Physiotherapy']);
 assert.equal(appointmentCard({...receipt,resource_name:undefined,service_name:'Dr. Parul Gupta'}).doctor.name,'Dr. Parul Gupta');
 // who to call: the booking's doctor, or both
 assert.deepEqual(contactRows('dr-parul-gupta').map(row=>[row.id,row.name,row.digits,row.href]),[['parul','Dr. Parul Gupta','98386 55095','tel:+919838655095']]);
 assert.deepEqual(contactRows().map(row=>row.id),['sanjay','parul']);assert.deepEqual(contactRows('physiotherapy').map(row=>row.id),['sanjay','parul']);
 assert.equal(contactRows('dr-sanjay-gupta')[0].spoken,'Call Dr. Sanjay Gupta at +91 94150 49410');
 // the one paper-cut object of these screens
 assert.ok(existsSync(fileURLToPath(new URL('../../public'+calendarObject.src,import.meta.url))));assert.equal(calendarObject.alt,'');
});

// ---------- Back, Forward and refresh ----------

const WEDNESDAY='2026-11-18';
/** A tab's storage, as the browser gives it. */
function tabStorage(){
 const values=new Map();
 return {values,storage:()=>({getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,String(value));},removeItem:key=>{values.delete(key);}})};
}
/** A booking taken as far as the last step, and the record kept of it. */
async function keptBooking(){
 const {controller,state}=await engine({initialService:'dr-parul-gupta'});
 controller.edit('day',WEDNESDAY);await tick();
 const slot=state().slots[3];
 controller.edit('slot',slot);
 controller.details('full_name','Kamla Devi Srivastava');controller.details('phone','98765 43210');controller.details('email','kamla@example.com');controller.details('notes','Takes insulin.');
 controller.edit('payment_method','at_clinic');controller.acknowledge(true);
 return {state:state(),slot,record:draftRecord({state:state(),chosen:true,now:NOW})};
}

test('what is kept of an unfinished booking: the choices and the four boxes of step 2, nothing else, for half an hour',async()=>{
 const {state,slot,record}=await keptBooking();
 assert.deepEqual(record,{v:1,at:NOW,chosen:true,service:'dr-parul-gupta',day:WEDNESDAY,slot:{starts_at:slot.starts_at,ends_at:slot.ends_at},payment_method:'at_clinic',
  details:{full_name:'Kamla Devi Srivastava',phone:'98765 43210',email:'kamla@example.com',notes:'Takes insulin.'}});
 assert.deepEqual(DRAFT_DETAILS,['full_name','phone','email','notes'],'the boxes of step 2: no more personal detail than the page already holds');
 assert.equal(state.ack,true);assert.equal(Object.hasOwn(record,'ack'),false,'the tick is never kept');
 assert.equal(JSON.stringify(record).includes('country'),false);assert.equal(JSON.stringify(record).includes('birth'),false);
 assert.equal(DRAFT_MINUTES,30);
 // nothing chosen, nothing typed
 const blank=draftRecord({state:{service:'',day:'',slot:null,payment_method:'',details:undefined},now:5});
 assert.deepEqual(blank,{v:1,at:5,chosen:false,service:'',day:'',slot:null,payment_method:'',details:{full_name:'',phone:'',email:'',notes:''}});
 assert.equal(draftRecord({state:{...state,details:{...state.details,notes:'x'.repeat(2500)}},now:NOW}).details.notes.length,2000,'no longer than the box allows');

 // kept in the tab's storage, read back whole
 const tab=tabStorage();
 assert.equal(loadDraft(tab.storage,NOW),null);
 assert.equal(saveDraft(tab.storage,record),true);assert.deepEqual([...tab.values.keys()],[DRAFT_KEY]);
 assert.deepEqual(loadDraft(tab.storage,NOW+60000),record);
 assert.deepEqual(loadDraft(tab.storage,NOW+DRAFT_MINUTES*60000),record,'half an hour: still read');
 // older than that: not read, and removed as it is found
 assert.equal(loadDraft(tab.storage,NOW+DRAFT_MINUTES*60000+1),null);assert.equal(tab.values.size,0);
 saveDraft(tab.storage,record);assert.equal(clearDraft(tab.storage),true);assert.equal(tab.values.size,0);
 // a record from the future (a clock that moved), a damaged one, another version: not read
 const text=JSON.stringify(record);
 assert.equal(parseDraft(text,NOW-1),null);assert.equal(parseDraft('{',NOW),null);assert.equal(parseDraft('null',NOW),null);assert.equal(parseDraft('"x"',NOW),null);
 const broken=change=>parseDraft(JSON.stringify({...record,...change}),NOW);
 for(const change of [{v:2},{at:'now'},{chosen:'yes'},{service:7},{service:'x'.repeat(81)},{day:'18 November'},{slot:{starts_at:slot.starts_at}},{slot:{starts_at:'soon',ends_at:slot.ends_at}},
  {payment_method:'cheque'},{details:null},{details:{...record.details,phone:5}},{details:{...record.details,full_name:'x'.repeat(101)}},{details:{full_name:'A'}}])
  assert.equal(broken(change),null,JSON.stringify(change).slice(0,60));
 assert.deepEqual(broken({day:'',slot:null,payment_method:''}),{...record,day:'',slot:null,payment_method:''});
 assert.deepEqual(parseDraft(JSON.stringify({...record,extra:'x',details:{...record.details,birth_place:'Lucknow'}}),NOW),record,'anything else in the record is left behind');
 tab.values.set(DRAFT_KEY,'{');assert.equal(loadDraft(tab.storage,NOW),null);assert.equal(tab.values.size,0,'a damaged record is removed');
 // a browser that refuses storage keeps nothing and breaks nothing
 const refused=()=>{throw new Error('denied');};
 assert.equal(saveDraft(refused,record),false);assert.equal(loadDraft(refused,NOW),null);assert.equal(clearDraft(refused),false);
});

test('the flow marks its own history entries; only a marked entry reads what was kept',async()=>{
 const {record}=await keptBooking();
 assert.equal(readMark(null),null);assert.equal(readMark({key:4}),null);assert.equal(readMark('x'),null);
 for(const bad of [{step:0,depth:0},{step:4,depth:0},{step:2,depth:-1},{step:2,depth:1.5},{step:2,depth:100},{step:'2',depth:1},'2',null])assert.equal(readMark({[HISTORY_MARK]:bad}),null,JSON.stringify(bad));
 assert.deepEqual(readMark({key:4,[HISTORY_MARK]:{step:2,depth:1,extra:true}}),{step:2,depth:1});
 // the site's own state (its scroll key) is kept beside the mark
 assert.deepEqual(withMark({key:4},{step:3,depth:2}),{key:4,[HISTORY_MARK]:{step:3,depth:2}});
 assert.deepEqual(withMark(null,{step:1,depth:0}),{[HISTORY_MARK]:{step:1,depth:0}});
 assert.deepEqual(withMark({key:4,[HISTORY_MARK]:{step:3,depth:2}},{step:1,depth:2}),{key:4,[HISTORY_MARK]:{step:1,depth:2}});
 assert.doesNotMatch(JSON.stringify(withMark({key:4},{step:2,depth:1})),/Kamla|98765|example/,'nothing personal in the history entry');
 // a fresh arrival (a link, a typed address): step 1, nothing read
 const clean={step:1,depth:0,saved:null,live:false,go:0,relabel:null,short:''};
 assert.deepEqual(flowStart(),clean);
 assert.deepEqual(flowStart({mark:null,saved:record}),clean);
 // a refresh on a marked entry: its step, with what was kept in the tab
 assert.deepEqual(flowStart({mark:{step:3,depth:2},saved:record}),{...clean,step:3,depth:2,saved:record});
 // a marked entry whose record has gone (too old, or the booking was sent): step 1; the entries before it are still there
 assert.deepEqual(flowStart({mark:{step:3,depth:2},saved:null}),{...clean,depth:2});
});

test('Back and Forward while the page stays open: the steps start again on the entry with the engine exactly as it stood',async()=>{
 const {controller,state}=await engine({initialService:'dr-parul-gupta'});
 const live=(here,extra={})=>({state:state(),here,chosen:true,...extra});
 const begun={saved:null,live:true,go:0,relabel:null,short:''};
 // step 1 not finished: only step 1 can be shown
 assert.deepEqual(flowStart({mark:{step:1,depth:0},live:live({step:1,depth:0})}),{...begun,step:1,depth:0});
 // Forward onto step 2 with no starting time: the browser moves back, and the page says what is missing
 assert.deepEqual(flowStart({mark:{step:2,depth:1},live:live({step:1,depth:0})}),{...begun,step:1,depth:1,go:-1,short:'time'});
 assert.equal(flowStart({mark:{step:2,depth:1},live:live({step:1,depth:0},{chosen:false})}).short,'doctor');
 assert.deepEqual(flowStart({mark:{step:3,depth:0},live:live({step:1,depth:0})}),{...begun,step:1,depth:0,relabel:{step:1,depth:0},short:'time'});
 // a time chosen, details not typed: step 2 is the furthest
 controller.edit('slot',state().slots[2]);
 assert.deepEqual(flowStart({mark:{step:2,depth:1},live:live({step:3,depth:2})}),{...begun,step:2,depth:1});
 assert.deepEqual(flowStart({mark:{step:3,depth:2},live:live({step:2,depth:1})}),{...begun,step:2,depth:2,go:-1,short:'details'});
 // everything there: Back from step 3 shows step 2, Back again step 1, Forward returns; a saved record is not read
 controller.details('full_name','Kamla Devi Srivastava');controller.details('phone','98765 43210');
 assert.deepEqual(flowStart({mark:{step:2,depth:1},live:live({step:3,depth:2}),saved:{anything:true}}),{...begun,step:2,depth:1});
 assert.deepEqual(flowStart({mark:{step:1,depth:0},live:live({step:2,depth:1})}),{...begun,step:1,depth:0});
 assert.deepEqual(flowStart({mark:{step:3,depth:2},live:live({step:2,depth:1})}),{...begun,step:3,depth:2});
 // the booking has been sent: there are no steps to go back into. Back leaves the booking page; Forward changes nothing
 controller.edit('payment_method','at_clinic');controller.acknowledge(true);
 await controller.checkout();await tick();
 assert.equal(state().receipt.appointment_state,'confirmed');
 assert.deepEqual(flowStart({mark:{step:2,depth:1},live:live({step:3,depth:2})}),{...begun,step:2,depth:1,go:-2});
 assert.deepEqual(flowStart({mark:{step:1,depth:0},live:live({step:3,depth:2})}),{...begun,step:1,depth:0,go:-1});
 assert.deepEqual(flowStart({mark:{step:3,depth:2},live:live({step:3,depth:2})}),{...begun,step:3,depth:2});
});

test('the kept choices are handed back to the engine one edit at a time, and only as far as it still offers them',async()=>{
 const {record}=await keptBooking();
 // after a refresh the engine starts again: its own first doctor, today, no time, no payment option
 const again=await engine({initialService:'dr-sanjay-gupta'});
 const usable=()=>usablePolicy(again.state().policy);
 const handed=[];
 for(let turn=0;turn<12;turn++){
  const next=restoreNext({saved:record,state:again.state(),usable:usable()});
  for(const [name,value] of next.edits){handed.push(name);again.controller.edit(name,value);}
  if(next.done){assert.deepEqual([next.kept,next.gone],[true,false]);break;}
  await tick();
 }
 assert.deepEqual(handed,['service','day','slot','payment_method'],'the doctor, then the day, then the time the engine offers, then the payment option');
 const state=again.state();
 assert.deepEqual([state.service,state.day,state.slot.starts_at,state.payment_method],[record.service,record.day,record.slot.starts_at,'at_clinic']);
 assert.equal(state.ack,false,'the tick is the visitor\'s to make again');
 assert.deepEqual(restoreNext({saved:record,state,usable:true}),{edits:[],done:true,kept:true,gone:false});

 // nothing kept: nothing to do
 assert.deepEqual(restoreNext({saved:null,state,usable:true}),{edits:[],done:true,kept:true,gone:false});
 // the options are still being read: wait; they could not be read: stop
 assert.deepEqual(restoreNext({saved:record,state:{...state,policyFresh:false,loadingPolicy:true},usable:true}),{edits:[],done:false,kept:false,gone:false});
 assert.deepEqual(restoreNext({saved:record,state:{...state,policy:null,loadingPolicy:true},usable:false}),{edits:[],done:false,kept:false,gone:false});
 assert.deepEqual(restoreNext({saved:record,state:{...state,policyFresh:false,loadingPolicy:false},usable:true}),{edits:[],done:true,kept:false,gone:false});
 // the visitor had not chosen a doctor yet
 assert.deepEqual(restoreNext({saved:{...record,chosen:false,slot:null},state,usable:true}),{edits:[],done:true,kept:true,gone:false});
 assert.equal(restoreNext({saved:{...record,chosen:false},state,usable:true}).kept,false);
 // a doctor the clinic no longer offers online
 assert.deepEqual(restoreNext({saved:{...record,service:'dr-nobody'},state,usable:true}),{edits:[],done:true,kept:false,gone:false});
 // a day outside the booking window
 assert.deepEqual(restoreNext({saved:{...record,day:'2027-03-01'},state,usable:true}),{edits:[],done:true,kept:false,gone:true});
 assert.deepEqual(restoreNext({saved:{...record,day:'2026-11-01'},state,usable:true}),{edits:[],done:true,kept:false,gone:true});
 // doctor and day chosen, no time yet
 assert.deepEqual(restoreNext({saved:{...record,slot:null},state,usable:true}),{edits:[],done:true,kept:true,gone:false});
 // the day's times are being read: wait; they could not be read: stop
 assert.equal(restoreNext({saved:record,state:{...state,slot:null,slotsStatus:'loading',slotsFresh:false},usable:true}).done,false);
 assert.equal(restoreNext({saved:record,state:{...state,slot:null,slotsStatus:'idle',slotsFresh:false},usable:true}).done,false);
 assert.deepEqual(restoreNext({saved:record,state:{...state,slot:null,slotsStatus:'error',slotsFresh:false},usable:true}),{edits:[],done:true,kept:false,gone:false});
 // the time is no longer offered (someone else took it)
 assert.deepEqual(restoreNext({saved:{...record,slot:{starts_at:'2026-11-18T03:00:00.000Z',ends_at:'2026-11-18T03:20:00.000Z'}},state:{...state,slot:null},usable:true}),{edits:[],done:true,kept:false,gone:true});
 // a payment option the engine cannot offer is not handed back
 assert.deepEqual(restoreNext({saved:{...record,payment_method:'online'},state:{...state,payment_method:''},usable:true}),{edits:[],done:true,kept:true,gone:false});
 assert.deepEqual(restoreNext({saved:{...record,payment_method:''},state:{...state,payment_method:''},usable:true}),{edits:[],done:true,kept:true,gone:false});
});

test('Back and Forward move between the steps; a step that cannot be shown is never shown',()=>{
 // the furthest step that may be shown
 assert.equal(furthestStep({missing:'doctor'}),1);assert.equal(furthestStep({missing:'time',problems:{}}),1);assert.equal(furthestStep({missing:'checking'}),1);
 assert.equal(furthestStep({missing:'',problems:{phone:'Enter a phone number.'}}),2);assert.equal(furthestStep({missing:'',problems:{}}),3);assert.equal(furthestStep(),3);
 // Continue: one entry deeper
 assert.deepEqual(advanceMark({step:1,depth:0},2),{step:2,depth:1});assert.deepEqual(advanceMark({step:2,depth:1},3),{step:3,depth:2});
 assert.equal(advanceMark({step:2,depth:99},3).depth,99);
 // the page's own "Back" and "Change" travel through the browser's history when those entries are there
 assert.deepEqual(retreat({from:{step:3,depth:2},target:2}),{go:-1});assert.deepEqual(retreat({from:{step:3,depth:2},target:1}),{go:-2});
 // … and re-label the entry when they are not (a refresh restored step 3 on an entry with nothing of the flow before it)
 assert.deepEqual(retreat({from:{step:3,depth:0},target:1}),{mark:{step:1,depth:0}});assert.deepEqual(retreat({from:{step:3,depth:1},target:1}),{mark:{step:1,depth:1}});
 assert.deepEqual(retreat({from:{step:1,depth:2},target:1}),{mark:{step:1,depth:2}});
 // the browser's Back from step 3 arrives on the entry of step 2
 assert.deepEqual(arrival({mark:{step:2,depth:1},from:{step:3,depth:2}}),{step:2});
 assert.deepEqual(arrival({mark:{step:1,depth:0},from:{step:2,depth:1},allowed:3}),{step:1});
 // Forward onto a step that is not ready: the browser moves back to the step that is
 assert.deepEqual(arrival({mark:{step:2,depth:1},from:{step:1,depth:0},allowed:1}),{step:1,go:-1});
 assert.deepEqual(arrival({mark:{step:3,depth:2},from:{step:2,depth:1},allowed:2}),{step:2,go:-1});
 assert.deepEqual(arrival({mark:{step:3,depth:2},from:{step:1,depth:0},allowed:1}),{step:1,go:-2});
 // … or, with no entries of the flow before it, the entry is re-labelled
 assert.deepEqual(arrival({mark:{step:3,depth:0},from:{step:1,depth:0},allowed:1}),{step:1,mark:{step:1,depth:0}});
 assert.deepEqual(arrival({mark:{step:3,depth:1},from:{step:1,depth:0},allowed:1}),{step:1,mark:{step:1,depth:1}});
 // once the booking is being saved or is saved there are no steps to go back into: Back leaves the booking page
 assert.deepEqual(arrival({mark:{step:2,depth:1},from:{step:3,depth:2},steps:false}),{go:-2});
 assert.deepEqual(arrival({mark:{step:1,depth:0},from:{step:3,depth:2},steps:false}),{go:-1});
 assert.deepEqual(arrival({mark:{step:3,depth:2},from:{step:2,depth:1},steps:false}),{},'Forward onto it changes nothing');
 assert.equal(words.time.again,'Please choose your starting time again.');
});

test('after the last press: a quiet waiting state while the request travels; the ways to ask again only when no answer came',()=>{
 assert.equal(waitingView({wait:'save'}),'saving');assert.equal(waitingView({wait:'open'}),'opening');assert.equal(waitingView({wait:'check'}),'checking');
 assert.equal(waitingView({wait:''}),'stalled');assert.equal(waitingView(),'stalled');
 // the engine has said something: its sentence and the two buttons are shown, whatever was being waited for
 assert.equal(waitingView({wait:'save',error:'We could not complete that check.'}),'stalled');
 for(const view of ['saving','opening','checking','stalled']){assert.ok(words.waiting[view].title.length>10);assert.ok(words.waiting[view].text.length>10);}
 for(const view of ['saving','opening','checking'])assert.match(words.waiting[view].title,/…$/,'a waiting title says it is still going');
 assert.match(words.waiting.saving.text,/Nothing more is needed from you/);
 assert.doesNotMatch(words.waiting.stalled.title,/…/);assert.match(words.waiting.stalled.text,/cannot be booked twice/);
 assert.equal(words.waiting.check,'Check my booking');assert.equal(words.waiting.retry,'Retry the same request');
 assert.ok(WAIT_GRACE>=2000&&WAIT_GRACE<=6000);
});

test('a control that takes the cursor under the bar is lifted clear of it',()=>{
 const bar={top:768,left:0,right:390};
 // the notes box at 686 to 798 on a phone: 30 px under the bar, lifted with 16 px of air
 assert.equal(liftAboveBar({box:{top:686,bottom:798,left:20,right:370},bar}),46);
 assert.equal(liftAboveBar({box:{top:686,bottom:798,left:20,right:370},bar,air:0}),30);
 // clear of it already, or only just: the air is kept
 assert.equal(liftAboveBar({box:{top:500,bottom:556,left:20,right:370},bar}),0);assert.equal(liftAboveBar({box:{top:700,bottom:760,left:20,right:370},bar}),8);
 // a control beside the bar (the summary's links on laptops) is not under it
 assert.equal(liftAboveBar({box:{top:700,bottom:800,left:948,right:1340},bar:{top:680,left:100,right:900}}),0);
 // no bar held at the foot of the screen, nothing measured
 assert.equal(liftAboveBar({box:{top:700,bottom:800,left:0,right:10},bar:null}),0);assert.equal(liftAboveBar(),0);
});

test('the day tiles are one stop for the Tab key; the arrow keys move between the days that can be chosen',()=>{
 // Dr. Sanjay does not sit on Sundays in this made-up week: that tile cannot take the cursor
 const tiles=dayTiles({first:MONDAY,last:'2026-12-17',hours:[0,1,2,3,4,5].map(weekday=>({weekday,start:'10:00',end:'13:30'}))});
 assert.equal(tiles.length,DAY_TILES);assert.equal(tiles[6].iso,SUNDAY);assert.equal(tiles[6].available,false);
 assert.equal(tileStop(tiles,'2026-11-18'),'2026-11-18','the chosen day takes the Tab key');
 assert.equal(tileStop(tiles,SUNDAY),MONDAY,'a day that cannot be chosen never does');assert.equal(tileStop(tiles,'2026-12-05'),MONDAY,'nor a day beyond the tiles');
 assert.equal(tileStop(tiles,''),MONDAY);assert.equal(tileStop([],MONDAY),'');
 assert.equal(tileMove(tiles,MONDAY,'ArrowRight'),'2026-11-17');assert.equal(tileMove(tiles,'2026-11-17','ArrowLeft'),MONDAY);
 assert.equal(tileMove(tiles,MONDAY,'ArrowDown'),'2026-11-17');assert.equal(tileMove(tiles,'2026-11-17','ArrowUp'),MONDAY);
 assert.equal(tileMove(tiles,'2026-11-21','ArrowRight'),'2026-11-23','Sunday is stepped over');assert.equal(tileMove(tiles,'2026-11-23','ArrowLeft'),'2026-11-21');
 assert.equal(tileMove(tiles,MONDAY,'ArrowLeft'),'','the first day stays');assert.equal(tileMove(tiles,'2026-11-28','ArrowRight'),'','so does the last (the fourteenth tile is a Sunday)');
 assert.equal(tileMove(tiles,'2026-11-20','Home'),MONDAY);assert.equal(tileMove(tiles,'2026-11-20','End'),'2026-11-28');
 assert.equal(tileMove(tiles,MONDAY,'Home'),'');assert.equal(tileMove(tiles,'2026-11-28','End'),'');
 assert.equal(tileMove(tiles,MONDAY,'Enter'),'');assert.equal(tileMove(tiles,MONDAY,'a'),'');
 assert.equal(tileMove(tiles,'','ArrowRight'),MONDAY,'from "Later date" the arrows enter the days');
 assert.equal(tileMove([],MONDAY,'ArrowRight'),'');
 assert.equal(words.day.more,'More days');assert.equal(words.day.earlier,'Earlier days');assert.equal(words.stepDone,'done');
});

test('a reading that fails on step 1 has one notice of the page\'s own; an address that names a doctor gets that doctor',async()=>{
 const {state}=await engine();
 const usable=usablePolicy(state().policy);
 assert.equal(readFault({step:1,usable,chosen:true,state:state()}),'');
 // the doctors and their hours could not be read: nothing can be chosen
 assert.equal(readFault({step:1,usable:false,chosen:false,state:{...state(),policy:null,loadingPolicy:false}}),'options');
 assert.equal(readFault({step:1,usable:false,chosen:false,state:{...state(),policy:null,loadingPolicy:true}}),'','still reading');
 // the chosen day's times could not be read
 const failed={...state(),slotsStatus:'error',slotsFresh:false};
 assert.equal(readFault({step:1,usable,chosen:true,state:failed}),'times');
 assert.equal(readFault({step:1,usable,chosen:false,state:failed}),'','no doctor chosen: no times are shown');
 assert.equal(readFault({step:1,usable,chosen:true,held:{day:SUNDAY},state:failed}),'','a new day is about to be read');
 assert.equal(readFault({step:2,usable,chosen:true,state:failed}),'');assert.equal(readFault({step:3,usable:false,state:failed}),'');
 assert.match(words.time.failed,/call the clinic/);assert.doesNotMatch(words.time.failed,/pay/i,'the engine\'s sentence about payments is wrong for this moment');
 // `?doctor=` wins over the doctor a topic belongs to; anything that is not one of the clinic's doctors changes nothing
 assert.equal(askedDoctor('?doctor=parul&topic=diabetes','sanjay'),'parul');assert.equal(askedDoctor('?topic=diabetes','sanjay'),'sanjay');
 assert.equal(askedDoctor('?doctor=PARUL','sanjay'),'sanjay');assert.equal(askedDoctor('?doctor=dr-parul-gupta',''),'');assert.equal(askedDoctor('',''),'');
 assert.equal(askedDoctor(undefined,'parul'),'parul');assert.equal(askedDoctor('?doctor=sanjay'),'sanjay');
});

test('a browser the engine will not take a booking in: the page says why and keeps saying it',async()=>{
 // the browser keeps no site data: the engine cannot read what it keeps in the tab and will not start
 const refused=()=>{throw new Error('Access is denied for this document.');};
 const product={getSnapshot:()=>({enabled:true,verified:true,checking:false,activation_epoch:1,foreground_revision:0}),subscribe:()=>()=>{}};
 const controller=createBookingController({api:async()=>{throw new RequestError('temporarily_unavailable');},receipts:createReceiptStore({installation_id:'11111111-2222-4333-8444-555555555555',environment:'test'}),
  storage:refused,product,payment:{load:async()=>{},open:()=>{}},clock:()=>NOW,interval:()=>1,clearInterval:()=>{},documentObject:{visibilityState:'visible'}});
 const began=controller.getSnapshot();
 assert.equal(began.phase,'blocked');assert.ok(began.error.length>20,'the engine says something once');
 assert.equal(screenFor({viewAvailable:true,state:began}),'blocked');
 assert.deepEqual(blockedWords({storageRefused:true,sentence:began.error}),{title:'Online booking cannot be used in this browser',text:words.blocked.storage});
 assert.match(words.blocked.storage,/call the clinic/);assert.match(words.blocked.storage,/allow cookies and site data/);
 // a saved booking that cannot be read, in a browser that does keep site data: the engine's own sentence stays on screen
 assert.deepEqual(blockedWords({sentence:'Your saved booking could not be read.'}),{title:'Your saved booking could not be opened',text:'Your saved booking could not be read.'});
 assert.deepEqual(blockedWords(),{title:'Your saved booking could not be opened',text:'Please call the clinic before booking again.'});
});

test('the appointment PDF: one press gives the file, and the page never points to buttons that are gone',()=>{
 const none={href:'',busy:false,ready:true},making={href:'',busy:true,ready:false},offered=href=>({href,busy:false,ready:true});
 // nothing asked: the page does nothing and says nothing, whatever the package shows
 assert.deepEqual(pdfSeen(pdfIdle,offered('blob:a'),10),{state:pdfIdle,act:''});
 assert.equal(pdfLine(pdfIdle,offered('blob:a')),'');assert.equal(pdfHolding(pdfIdle,10),false);assert.equal(pdfKeepsCursor(pdfIdle,10),false);assert.equal(pdfWaiting(pdfIdle),false);
 assert.equal(pdfTook(pdfIdle,'saved'),pdfIdle,'a link pressed without the page having been asked is the package\'s own business');
 assert.ok(Object.isFrozen(pdfIdle));

 // the ordinary press: the package makes the file, offers its link, the page presses it at once, and only once
 let state=pdfPressed(1000);
 assert.deepEqual({...state},{...pdfIdle,asked:true,armedUntil:1000+PDF_HELP_MS});assert.equal(PDF_HELP_MS,5000);
 assert.equal(pdfLine(state,none),'','nothing is said before there is something to say');
 let seen=pdfSeen(state,making,1010);assert.equal(seen.act,'');assert.equal(seen.state.began,true);
 assert.equal(pdfSeen(seen.state,making,1020).state,seen.state,'the same view again changes nothing');
 assert.equal(pdfWaiting(seen.state),true,'the package\'s sentence is covered before it arrives');
 seen=pdfSeen(seen.state,offered('blob:a'),1400);assert.equal(seen.act,'download');assert.equal(seen.state.offered,true);assert.equal(seen.state.auto,true);
 assert.equal(pdfWaiting(seen.state),false,'from here the sentence is covered for what it says, and the package\'s other sentences are left alone');
 assert.equal(pdfLine(seen.state,offered('blob:a')),'ready','until the press on the link has gone through, the page promises nothing');
 state=pdfTook(seen.state,'saved');
 assert.equal(pdfSeen(state,offered('blob:a'),1410).act,'','the link is not pressed twice');
 assert.equal(pdfLine(state,offered('blob:a')),'done');
 // the package takes its links away at its next check: the page's line stays true, and the same
 assert.equal(pdfSeen(state,none,1700).act,'');assert.equal(pdfLine(state,none),'done');
 assert.equal(words.pdf.done,'Your PDF has been downloaded. You can download it again whenever you need it.');
 assert.doesNotMatch(Object.values(words.pdf).join(' '),/\bcop(?:y|ies)\b/i,'"copy" is the package\'s word for an emailed copy, in the line beside these');
 assert.doesNotMatch(Object.values(words.pdf).join(' '),/Use Download PDF or Open PDF/,'none of the page\'s lines is the package\'s sentence');

 // a second press while the first link is still on screen: only the new link counts
 state=pdfPressed(3000,'blob:a');assert.equal(state.stale,'blob:a');
 assert.equal(pdfSeen(state,offered('blob:a'),3010).act,'');assert.equal(pdfSeen(state,offered('blob:a'),3010).state.offered,false);
 seen=pdfSeen(pdfSeen(state,making,3020).state,offered('blob:b'),3300);assert.equal(seen.act,'download');

 // the routine check cut the first try short: the page asks once more, and hides the package's "could not be prepared" until then
 state=pdfPressed(0);assert.equal(pdfHolding(state,10),true);
 state=pdfSeen(state,making,10).state;
 seen=pdfSeen(state,{href:'',busy:false,ready:false},300);assert.equal(seen.act,'','not while the package still has its button switched off');
 seen=pdfSeen(seen.state,none,420);assert.equal(seen.act,'retry');assert.equal(seen.state.retried,true);assert.equal(seen.state.began,false);
 assert.equal(pdfHolding(seen.state,430),false,'a second failure is the package\'s to tell');
 const again=pdfSeen(pdfSeen(seen.state,making,440).state,none,700);assert.equal(again.act,'','and it is asked once, not for ever');
 assert.equal(pdfLine(again.state,none),'');
 seen=pdfSeen(pdfSeen(seen.state,making,440).state,offered('blob:c'),900);assert.equal(seen.act,'download','the second try gives the file');
 // a press the package did not take up (nothing was ever being made) is not repeated
 assert.equal(pdfSeen(pdfPressed(0),none,50).act,'');

 // too slow for the page to act (a browser no longer counts the press as the visitor's): the links are theirs to press
 state=pdfSeen(pdfPressed(0),making,10).state;
 seen=pdfSeen(state,offered('blob:d'),PDF_HELP_MS+1);assert.equal(seen.act,'');assert.equal(seen.state.offered,true);
 assert.equal(pdfLine(seen.state,offered('blob:d')),'ready');assert.match(words.pdf.ready,/^Your PDF is ready\. Press Download PDF or Open PDF\.$/);
 assert.equal(pdfLine(pdfTook(seen.state,'opened'),offered('blob:d')),'opened');
 assert.equal(pdfLine(pdfTook(pdfTook(seen.state,'saved'),'opened'),none),'done','once saved, it stays saved');
 assert.equal(pdfLine(pdfTook(pdfTook(seen.state,'opened'),'saved'),none),'done');
 assert.equal(pdfTook(seen.state,'something else'),seen.state);
 assert.equal(pdfLine(seen.state,none),'closed','the links went before they were pressed: the page says so, and how to get the file');
 assert.match(words.pdf.closed,/not downloaded/);assert.match(words.pdf.closed,/Press Download appointment PDF again/,'by then the package\'s button carries exactly this name');
 assert.equal(pdfHolding(pdfPressed(0),PDF_HELP_MS+1),false);
 assert.equal(pdfSeen(state,none,PDF_HELP_MS+1).act,'','no second try after the five seconds');
 // the page's own press of the link, when the package refuses it, is not counted and not repeated
 seen=pdfSeen(pdfPressed(0),offered('blob:e'),100);assert.equal(seen.act,'download');
 assert.equal(pdfSeen(seen.state,offered('blob:e'),110).act,'');assert.equal(pdfLine(seen.state,none),'closed');

 // the cursor is given back to the pressed button for the five seconds and a moment, never after
 state=pdfPressed(2000);
 assert.equal(pdfKeepsCursor(state,2000+PDF_HELP_MS+PDF_CURSOR_GRACE_MS),true);assert.equal(pdfKeepsCursor(state,2001+PDF_HELP_MS+PDF_CURSOR_GRACE_MS),false);
 assert.ok(PDF_CURSOR_GRACE_MS>0&&PDF_CURSOR_GRACE_MS<=2000);

 // "Find your booking": the package's check fell inside the making and left its buttons off for good.
 // The page says so once the five seconds are over, never sooner, and never on the appointment card.
 const dead={href:'',busy:false,ready:false,dead:true},off={href:'',busy:false,ready:false,dead:false};
 state=pdfSeen(pdfPressed(0),{...making,dead:true},10).state;
 assert.equal(state.deadSince,null,'while the file is being made the buttons are off for a reason');
 state=pdfSeen(state,dead,400).state;assert.equal(state.deadSince,400);assert.equal(pdfSeen(state,dead,450).act,'','nothing can be pressed');
 assert.equal(pdfSeen(state,dead,500).state,state,'looking again changes nothing');
 assert.equal(pdfLine(state,dead,400+PDF_STUCK_MS),'','a routine check may still be on its way');assert.equal(pdfLine(state,dead),'');
 assert.equal(pdfLine(state,dead,401+PDF_STUCK_MS),'stuck');assert.equal(PDF_STUCK_MS,4000);
 assert.equal(pdfLine(state,{...dead,busy:true},401+PDF_STUCK_MS),'','still being made');
 // the buttons came back (it was only a routine check): the count starts again, and the page asks once more as usual
 seen=pdfSeen(state,none,900);assert.equal(seen.state.deadSince,null);assert.equal(seen.act,'retry');
 assert.equal(pdfLine(seen.state,none,99999),'');
 seen=pdfSeen(pdfSeen(seen.state,{...making,dead:true},950).state,dead,1200);assert.equal(seen.state.deadSince,1200);
 assert.equal(pdfLine(seen.state,dead,1201+PDF_STUCK_MS),'stuck','the second try can end the same way');
 // with "Refresh details" still usable the package explains itself (its note about details it could not read)
 assert.equal(pdfLine(pdfSeen(pdfSeen(pdfPressed(0),making,10).state,off,400).state,off,99999),'');
 assert.equal(pdfLine(pdfSeen(pdfPressed(0),dead,10).state,dead,99999),'','a press the package never took up');
 assert.match(words.pdf.stuck,/Press Back to my bookings, open the booking again and press Download appointment PDF\.$/);

 // every line the page can show has words, typed with proper marks
 for(const key of ['done','opened','ready','closed','stuck'])assert.ok(words.pdf[key].length>20&&/\.$/.test(words.pdf[key])&&!/'|"|\.\.\./.test(words.pdf[key]),key);
});

test('the package still shows its PDF action the way the page reads it',()=>{
 // The page finds the package's PDF button by its words, its link by its class and the "download"
 // attribute, and covers its sentence by its first words. A new version of the package that changes
 // any of these must be looked at again (and may no longer need the help at all).
 const read=name=>readFileSync(fileURLToPath(new URL('../../appointment-system/browser/booking/'+name,import.meta.url)),'utf8');
 const labels=source=>[...source.matchAll(/'((?:Download appointment|Refresh|Preparing) PDF[^']*)'/g)].map(match=>match[1]);
 const receipt=read('receipt-fields.mjs'),found=read('booking-details-fields.mjs');
 assert.deepEqual(labels(receipt),['Preparing PDF…','Refresh PDF','Download appointment PDF']);
 assert.deepEqual(labels(found),['Preparing PDF…','Download appointment PDF']);
 for(const label of [...labels(receipt),...labels(found)]){assert.match(label,PDF_BUTTON);assert.equal(PDF_BUSY.test(label),label==='Preparing PDF…');}
 for(const other of ['Email appointment details','Refresh details','Back to my bookings','Retry the same email request'])assert.doesNotMatch(other,PDF_BUTTON,other);
 assert.match(found,/h\('button',\{type:'button',className:'abs-lookup-back',onClick:controller\.back\},'Back to my bookings'\)/,'the way out the page names');
 assert.match(found,/h\('button',\{type:'button',disabled:!enabled\|\|state\.busy\|\|file\.busy,onClick:refresh\},'Refresh details'\)/);
 assert.doesNotMatch(receipt,/abs-lookup-back/,'the appointment card has no such button, so the page never speaks of it there');
 for(const source of [receipt,found]){
  assert.match(source,/className:'abs-receipt-actions'/);
  assert.match(source,/h\('a',\{\.\.\.linkProps,className:'abs-download'\},'Download PDF'\)/);
  assert.match(source,/linkProps=\{href:[a-z]+\.pdfURL,download:[a-z]+\.filename,/,'the saving link carries "download"; the opening link does not');
  assert.match(source,/h\('p',\{role:'status'\},/);assert.match(source,/role:'alert'/);
 }
 assert.match(receipt,/className:'abs-action-error'/);
 for(const name of ['receipt-actions.mjs','booking-details-pdf.mjs']){
  const sentence=read(name).match(/message:'(Your PDF is ready[^']*)'/);
  assert.ok(sentence,name);assert.match(sentence[1],PDF_SENTENCE);assert.equal(sentence[1],'Your PDF is ready. Use Download PDF or Open PDF.');
  assert.match(read(name),/expiry=set(?:Timer|Timeout)\((?:\(\)=>revoke\(\)|revoke),5000\)/,'the links still last five seconds at most: the reason the page presses for the visitor');
 }
 // the package's other sentences in the same place are never covered
 for(const other of ['Your email-copy request is saved.','Your email-copy request is saved. Check booking status for the latest delivery update.'])assert.doesNotMatch(other,PDF_SENTENCE);
});
