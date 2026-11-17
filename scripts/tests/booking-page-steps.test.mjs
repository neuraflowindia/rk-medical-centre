// The booking steps' words and decisions (src/booking/booking-steps.mjs), tested against the
// booking engine itself: the sealed package's own coordinator is run on the preview's stand-in
// answers, so every rule is checked on states the engine really produces.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
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
 stepOneMissing,mustChooseAgain,validPhone,phoneCountry,detailProblems,confirmLabel,confirmHint,visitSummary,barLines,paymentNote,contactRows,
 receiptDoctor,appointmentCard,calendarObject} from '../../src/booking/booking-steps.mjs';

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
 assert.equal(words.stepCount(2,3,STEPS[1].label),'Step 2 of 3 · Your details');
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
 assert.deepEqual(doctorChoice({id:'physiotherapy',name:'Physiotherapy'}),{service:'physiotherapy',id:'',name:'Physiotherapy',role:'',tone:'plain',avatar:null,short:'Physiotherapy'});
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
 for(const bad of ['','12345','98765432101','+0123456789','+91','nine eight','98765x3210','++919876543210'])assert.equal(validPhone(bad),false,bad);
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

test('the last button says what it does, and the line under it says what it waits for',()=>{
 assert.equal(confirmLabel({method:'at_clinic'}),'Confirm appointment');assert.equal(confirmLabel({method:'online'}),'Continue to payment');
 assert.equal(confirmLabel({method:''}),'Choose a payment option');assert.equal(confirmLabel(),'Choose a payment option');assert.equal(confirmLabel({method:'cheque'}),'Choose a payment option');
 assert.equal(confirmLabel({busy:true,method:'at_clinic'}),'Saving your request…');
 assert.equal(confirmHint({method:'at_clinic',methodAvailable:true,ack:true}),'This books your visit straight away.');
 assert.equal(confirmHint({method:'at_clinic',methodAvailable:true,ack:false}),'Tick the box above to confirm.');
 assert.equal(confirmHint({method:'online',methodAvailable:false,ack:true}),'');assert.equal(confirmHint(),'');
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
 assert.deepEqual(barLines(started,'time'),{top:'Dr. Sanjay',bottom:'Choose a starting time'});
 assert.deepEqual(barLines(started,'checking'),{top:'Dr. Sanjay',bottom:'Checking times…'});assert.deepEqual(barLines(started),{top:'Dr. Sanjay',bottom:'Choose a starting time'});
 // a time chosen
 controller.edit('slot',state().slots.find(slot=>slot.starts_at==='2026-11-16T12:30:00.000Z'));
 const timed=visitSummary({state:state(),usable});
 assert.equal(timed.time,'6:00 pm');assert.equal(timed.waiting,false);assert.equal(timed.fee,'₹800');
 assert.deepEqual(barLines(timed),{top:'Dr. Sanjay',bottom:'Mon 16 Nov · 6:00 pm'});
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
