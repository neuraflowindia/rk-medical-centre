// What the booking steps say and decide: words, doctors, days, time groups, step rules, the
// appointment card. No React, no markup, no clock of its own: everything is worked out from what
// the booking engine reports, so each decision can be tested without a browser.
// Used only by clinic-booking.jsx, so it travels in the lazy booking bundle.
import {doctors} from '../clinic/model.mjs';
import {doctorOrder} from '../clinic/care-catalogue.mjs';
import {doctorAvatars,closePortraits,clinicObjects} from '../clinic/client-media.mjs';
import {bookForSomeoneElseAnswer} from '../clinic/standins.mjs';
import {addressCard,actionLabels,clinicPlace,doctorShortName,localPhone,pagePaths} from '../clinic/page-content/shared.mjs';
import {dateRange,localDate,money,timeLabel} from '../../appointment-system/browser/display-formatting.mjs';
import {paymentAvailable} from '../../appointment-system/browser/booking/experience-contract.mjs';

const NBSP=' ';
/** Keep short pairs on one line, as the site's templates do: "Dr. Sanjay", "10:20 am", "94150 49410". */
export function keepTogether(value){
 return String(value)
  .replace(/\b(Dr|R|No|Reg)\. (?=\S)/gu,`$1.${NBSP}`)
  .replace(/(\d) (am|pm)\b/gu,`$1${NBSP}$2`)
  .replace(/\b(\d{5}) (\d{5})\b/gu,`$1${NBSP}$2`);
}

/** Every sentence the booking steps print themselves (the engine supplies its own error sentences). */
export const words=Object.freeze({
 formLabel:'Book an appointment',
 progressLabel:'Booking steps',
 stepCount:(step,total,label)=>`Step ${step} of ${total} · ${label}`,
 back:'Back',
 next:'Continue',
 change:'Change',
 doctor:Object.freeze({
  legend:'Doctor',
  prompt:'Choose a doctor to see the days and times.',
  unsure:'Not sure which doctor?',
  meet:'Meet the doctors',
  meetPath:pagePaths.doctors
 }),
 day:Object.freeze({
  legend:'Day',
  today:'Today',
  later:'Later date',
  dateField:'Appointment date',
  notOffered:'not available'
 }),
 time:Object.freeze({
  legend:'Starting time',
  sessions:Object.freeze({morning:'Morning',evening:'Evening'}),
  checking:'Checking available times…',
  noneLeft:day=>`No starting times are left on ${day}. Choose another day, or call the clinic.`,
  noneInSession:session=>`No ${session} times are left.`,
  noSession:(session,weekday)=>`No ${session} appointments on ${weekday}s.`,
  retry:'Check available times again',
  gone:'That starting time is no longer free. Please choose another.',
  // booking was paused while the visitor was in the steps; nobody took the time
  again:'Please choose your starting time again.'
 }),
 options:Object.freeze({
  checking:'Checking the doctors’ schedules…',
  failed:'We could not load the clinic’s appointment options.',
  retry:'Reload appointment options'
 }),
 missing:Object.freeze({doctor:'Choose a doctor',time:'Choose a starting time',checking:'Checking times…'}),
 details:Object.freeze({
  name:'Patient’s full name',
  // The stand-in answer to "Can I book for a parent or someone else?", without its leading "Yes."
  someoneElse:`Booking for a parent or someone else? ${bookForSomeoneElseAnswer.replace(/^Yes\.\s*/u,'')}`,
  phone:'Phone number',
  phoneHint:'10 digits. For a number outside India, start with + and the country code.',
  email:'Email address',
  emailHint:'Only if you would like a copy by email.',
  notes:'Anything the doctor should know?',
  optional:'optional'
 }),
 errors:Object.freeze({
  summary:'Check the details marked below.',
  name:'Enter the patient’s full name.',
  phoneMissing:'Enter a phone number.',
  phone:'Enter a 10-digit mobile number, or start with + and the country code.',
  emailMissing:'Enter an email address.',
  email:'Check this email address.'
 }),
 summary:Object.freeze({
  title:'Your visit',
  pending:'Not confirmed yet',
  day:'Day',time:'Starting time',fee:'Fee',place:'Where',
  empty:'Not chosen yet',
  checking:'Checking…',
  change:'Change doctor or time',
  atClinic:'pay at the clinic',
  online:'pay online'
 }),
 payment:Object.freeze({
  legend:'Payment',
  at_clinic:'Pay at the clinic',
  online:'Pay online',
  atClinicNote:fee=>`${fee} when you arrive.`,
  onlineNote:'Continue to secure payment after this step.',
  // The engine's own words for a method it reports as unavailable.
  unavailable:'Temporarily unavailable',
  chosenUnavailable:'This payment option is unavailable. Please choose another available option.',
  // Before the last press only the fact is said; the number to call is on the appointment card and in the header.
  later:'You can change or cancel later by calling the clinic.'
 }),
 confirm:Object.freeze({
  ack:'I have checked the doctor, day, starting time and my details.',
  at_clinic:'Confirm appointment',
  online:'Continue to payment',
  saving:'Saving your appointment…',
  // the line under the tick box: what the last press does, or the one thing it still waits for
  final:'This books your visit straight away.',
  tick:'Tick the box to confirm.',
  payFirst:'Choose a payment option first.',
  checking:'Checking the latest times…'
 }),
 // said beside the thing that is still missing when the step's main button is pressed too early
 ask:Object.freeze({
  time:'Choose a starting time to continue.',
  day:'Choose another day to continue.',
  payment:'Choose how you would like to pay.'
 }),
 contact:Object.freeze({
  change:'To change or cancel, call',
  help:'Call the clinic:'
 }),
 checking:Object.freeze({
  title:'Checking your booking',
  text:'We are checking the same request, so it cannot be booked twice.',
  check:'Check my booking',
  retry:'Retry the same request'
 }),
 receipt:Object.freeze({
  // The same five states the engine's own receipt names.
  titles:Object.freeze({confirmed:'Your appointment is confirmed',held:'Your time is reserved',expired:'This reservation has ended',
   cancelled:'This appointment was cancelled',payment_review:'Your payment is being checked'}),
  tags:Object.freeze({confirmed:'Confirmed',held:'Reserved',expired:'Ended',cancelled:'Cancelled',payment_review:'Being checked'}),
  directions:actionLabels.directionsShort,
  opensMaps:'(opens Google Maps)',
  bring:addressCard.bring,
  record:Object.freeze({show:'Show the full booking record',hide:'Hide the full booking record'}),
  refresh:'Refresh details',
  resume:'Continue payment',
  checkPayment:'Check payment status',
  another:'Book another appointment',
  anotherNote:'A second booking does not change this one.',
  atClinic:'pay at the clinic',
  online:'online payment'
 }),
});

/** The three steps: the engine's three stages, shown one at a time. */
export const STEPS=Object.freeze([
 Object.freeze({id:1,label:'Doctor and time',title:'Your doctor and starting time'}),
 Object.freeze({id:2,label:'Your details',title:'Your details'}),
 Object.freeze({id:3,label:'Check and confirm',title:'Check your visit and payment'})
]);

// ---------- doctors ----------

/** "sanjay" → "dr-sanjay-gupta" (the engine's name for that doctor's appointments); anything else → "". */
export function serviceFor(doctor){return doctorOrder.includes(doctor)?`dr-${doctor}-gupta`:'';}
/** The other way round; "" for a service the site does not know. */
export function doctorFor(service){return doctorOrder.find(id=>serviceFor(id)===service)||'';}
/** Each doctor's wash: the site's colour code for the two doctors. The name is always printed beside it. */
const TONES=Object.freeze({sanjay:'sage',parul:'rose'});

/** What a doctor card prints for one of the engine's services. */
export function doctorChoice(service){
 const id=doctorFor(service.id);
 return Object.freeze({service:service.id,id,name:service.name,role:id?doctors[id].role:'',tone:TONES[id]||'plain',
  avatar:id?doctorAvatars[id]:null,short:id?doctorShortName(id):service.name});
}

/** Can the booking steps be drawn from this policy? (The clinic's kind of booking: a visit in person.) */
export function usablePolicy(data){
 const policy=data?.policy;
 return !!policy&&policy.version===2&&policy.meeting==='in_person'&&policy.display_duration===false;
}
/** The doctor cards, in the engine's order: only services the clinic has switched on. */
export function doctorChoices(data){
 return usablePolicy(data)?data.policy.services.filter(item=>item.enabled).map(doctorChoice):[];
}
/** The weekly sitting hours of the doctor behind a service, or null when they are not known. */
export function sittingHours(data,service){
 if(!usablePolicy(data))return null;
 const chosen=data.policy.services.find(item=>item.id===service);
 return data.policy.resources.find(item=>item.id===chosen?.resource_id)?.weekly_windows||null;
}

// ---------- days ----------

const isDay=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'));
const noon=iso=>new Date(iso+'T12:00:00Z');
const dayPart=(iso,options)=>new Intl.DateTimeFormat('en-IN',{timeZone:'UTC',...options}).format(noon(iso));
/** Move a calendar day by whole days. */
export function addDays(iso,days){const date=noon(iso);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
/** The weekday as the clinic's settings count it: Monday is 0, Sunday is 6. */
export function weekdayOf(iso){return (noon(iso).getUTCDay()+6)%7;}
/** "Tuesday 17 November" */
export function dayLong(iso){return isDay(iso)?`${dayPart(iso,{weekday:'long'})} ${dayPart(iso,{day:'numeric'})} ${dayPart(iso,{month:'long'})}`:'';}
/** "Tue 17 Nov" */
export function dayShort(iso){return isDay(iso)?`${dayPart(iso,{weekday:'short'})} ${dayPart(iso,{day:'numeric'})} ${dayPart(iso,{month:'short'})}`:'';}

/** How many day tiles are offered before "Later date". Two weeks: on wide screens each column is a weekday. */
export const DAY_TILES=14;
/**
 * The day tiles, starting at the clinic's own "today".
 *   first, last  the engine's booking window (ISO days)
 *   hours        the chosen doctor's weekly sitting hours, or null when not known (then no day is ruled out)
 * A tile is `available` when the day is inside the window and the doctor sits that weekday.
 */
export function dayTiles({first,last,hours=null,count=DAY_TILES}={}){
 if(!isDay(first))return [];
 return Array.from({length:count},(_,index)=>{
  const iso=addDays(first,index);
  const sits=hours===null||hours.some(window=>window.weekday===weekdayOf(iso));
  return Object.freeze({iso,label:index===0?words.day.today:dayPart(iso,{weekday:'short'}),number:dayPart(iso,{day:'numeric'}),
   month:dayPart(iso,{month:'short'}),spoken:dayLong(iso),available:sits&&(!isDay(last)||iso<=last)});
 });
}
/** Is the chosen day one of the tiles? If not, the date box stays open so the choice can be seen. */
export function dayBeyondTiles(tiles,iso){return isDay(iso)&&!tiles.some(tile=>tile.iso===iso);}

// ---------- starting times ----------

const minutesOf=text=>{const [hours,minutes]=String(text).split(':').map(Number);return hours*60+minutes;};
/** The clinic's morning session runs past noon (last start 1:30 pm); the evening one starts at 6 pm. */
export const SESSION_SPLIT=15*60;
export const SESSIONS=Object.freeze(['morning','evening']);
const sessionOf=minutes=>minutes<SESSION_SPLIT?'morning':'evening';
/** Minutes after midnight of a moment, on the clinic's clock. */
export function clinicMinutes(instant,timezone='Asia/Kolkata'){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hourCycle:'h23',hour:'numeric',minute:'numeric'})
  .formatToParts(new Date(instant)).map(part=>[part.type,Number(part.value)]));
 return parts.hour*60+parts.minute;
}
/** Which sessions the doctor holds on that day's weekday: {morning, evening}. */
export function sessionsOn(hours,iso){
 const held={morning:false,evening:false};
 if(!isDay(iso))return held;
 for(const window of hours||[])if(window.weekday===weekdayOf(iso))held[sessionOf(minutesOf(window.start))]=true;
 return held;
}
/**
 * The day's starting times in the clinic's two sessions. Each group carries its pills (the engine's
 * time with its label) and, when it has none, the sentence to print instead.
 */
export function slotGroups(slots,{timezone='Asia/Kolkata',hours=null,day=''}={}){
 const held=hours===null?{morning:true,evening:true}:sessionsOn(hours,day);
 const pills={morning:[],evening:[]};
 for(const slot of slots||[])pills[sessionOf(clinicMinutes(slot.starts_at,timezone))].push(Object.freeze({...slot,label:timeLabel(slot.starts_at,timezone)}));
 return SESSIONS.map(id=>Object.freeze({id,label:words.time.sessions[id],slots:Object.freeze(pills[id]),
  none:pills[id].length?'':held[id]?words.time.noneInSession(id):words.time.noSession(id,dayPart(day,{weekday:'long'}))}));
}

// ---------- a change that must wait for the booking-state check ----------

/**
 * The engine reads the day's times only while booking is admitted. A change of doctor or day made
 * during the short booking-state check is therefore held and handed over when the check ends, so
 * the times on screen always belong to the doctor and day on screen. Other edits never wait.
 */
export const waitsForAdmission=name=>name==='service'||name==='day';
/** Keep one waiting change per name; the latest wins. */
export function holdEdit(held,name,value){return Object.freeze({...(held||{}),[name]:value});}
/** The waiting changes in the order the engine must hear them: the doctor first, then the day. */
export function releaseEdits(held){
 return ['service','day'].filter(name=>held&&Object.hasOwn(held,name)).map(name=>[name,held[name]]);
}

// ---------- step rules ----------

/** Which screen the engine's state calls for. */
export function screenFor({viewAvailable,state}){
 if(!viewAvailable)return 'unavailable';
 if(state.receipt)return 'receipt';
 if(state.credential)return 'checking';
 if(state.phase==='blocked')return 'blocked';
 return 'form';
}
/** What step 1 still needs before "Continue": "" when it may go on, else "doctor", "time" or "checking". */
export function stepOneMissing({chosen,held=null,state,usable}){
 if(!usable||!chosen||!state.service)return 'doctor';
 if(held||state.slotsStatus==='loading')return 'checking';
 if(!state.day||!state.slot||!state.slotsFresh||!state.policyFresh)return 'time';
 return '';
}
/** A chosen time has gone (taken by someone else, or the day's times changed): the visitor must choose again. */
export function mustChooseAgain({step,state,usable}){
 return step>1&&usable&&state.policyFresh&&state.slotsStatus==='ready'&&!state.slot;
}

const EMAIL=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
/** A phone number the engine can read: ten digits for India, or + and a country code. */
export function validPhone(value){
 const raw=String(value).trim();
 if(!raw||!/^[+0-9 ()-]+$/u.test(raw))return false;
 const digits=raw.replace(/[\s()-]/gu,'');
 return digits.startsWith('+')?/^\+[1-9][0-9]{6,14}$/u.test(digits):/^[0-9]{10}$/u.test(digits);
}
/** The engine's own rule for which country a number belongs to: one that starts with + carries its code. */
export function phoneCountry(value){return String(value??'').trim().startsWith('+')?'other':'91';}
/**
 * What is wrong with the details, by field name: {} when step 2 may go on. The engine checks
 * again on the last press; this only catches what a visitor can put right at once.
 */
export function detailProblems(details,{requiredContacts=['phone']}={}){
 const problems={};
 if(Array.from(String(details.full_name||'').trim()).length<2)problems.full_name=words.errors.name;
 const phone=String(details.phone||'').trim();
 if(!phone){if(requiredContacts.includes('phone'))problems.phone=words.errors.phoneMissing;}
 else if(!validPhone(phone))problems.phone=words.errors.phone;
 const email=String(details.email||'').trim();
 if(!email){if(requiredContacts.includes('email'))problems.email=words.errors.emailMissing;}
 else if(!EMAIL.test(email))problems.email=words.errors.email;
 return Object.freeze(problems);
}
/** The detail fields in the order they are printed (and the order the cursor goes to the first problem). */
export const DETAIL_FIELDS=Object.freeze(['full_name','phone','email']);

/**
 * What the last step still needs before the last press: "" when it may go, else "checking" (the
 * engine is re-reading the options or the times), "payment" or "tick". Admission is not part of
 * it: a press made during a booking-state check is kept and handed over when the check ends.
 */
export function stepThreeMissing({usable,state,methodAvailable=false,held=null}){
 if(!usable||!state.policyFresh||!state.slotsFresh||!state.slot||!state.quote||held)return 'checking';
 if(!state.payment_method||!methodAvailable)return 'payment';
 return state.ack?'':'tick';
}
/** The payment options in the order they are listed: the ones that can be chosen first; otherwise the engine's order. */
export function paymentOrder(methods,isAvailable){
 const list=[...(methods||[])];
 return [...list.filter(method=>isAvailable(method)),...list.filter(method=>!isAvailable(method))];
}
/**
 * The last button's words. It always names what the press will do: with no option chosen yet,
 * that is the first option that can be chosen (`offered`, in listed order).
 */
export function confirmLabel({busy=false,method='',offered=[]}={}){
 if(busy)return words.confirm.saving;
 const named=[method,...offered].find(item=>item==='at_clinic'||item==='online');
 return words.confirm[named||'at_clinic'];
}
/** The line under the tick box: what the last press does, or the one thing it still waits for. */
export function confirmHint({missing=''}={}){
 return missing==='payment'?words.confirm.payFirst:missing==='tick'?words.confirm.tick:missing==='checking'?words.confirm.checking:words.confirm.final;
}
/**
 * Which part of the step the visitor is shown when the main button is pressed too early:
 * "doctor", "day" (no starting time can be chosen on the day shown), "time", "payment", "tick",
 * or "" when there is nothing to point at (the engine is still reading).
 */
export function askFor({step,missing='',timesShown=true}={}){
 if(step===1)return missing==='doctor'?'doctor':missing==='time'?(timesShown?'time':'day'):'';
 if(step===3)return missing==='payment'||missing==='tick'?missing:'';
 return '';
}

// ---------- Back, Forward and refresh ----------
//
// Each step is an entry in the browser's history, so Back means "the step before" and leaves the
// page only from step 1. What the visitor has chosen and typed is kept so that Back, Forward and a
// refresh bring it back:
//   - in the history entry: the step's number and how many entries of the flow lie before it.
//     Nothing personal;
//   - in the tab's own storage (sessionStorage, where the engine keeps its booking reference): one
//     record with the doctor, day, starting time, payment option and the four boxes of step 2: the
//     same details the page already holds while it is open, and nothing more. The tick is never
//     kept. The record is removed the moment the booking is sent, is not read once it is
//     DRAFT_MINUTES old, and goes with the tab.
// A fresh arrival (a link, a typed address) never reads the record: only an entry the flow itself
// marked does.

/** The name under which the flow marks its own history entries. */
export const HISTORY_MARK='rkBooking';
/** The name of the kept record in the tab's storage. */
export const DRAFT_KEY='rk-booking-draft-v1';
/** How long the kept record may be read after its last change. */
export const DRAFT_MINUTES=30;
/** The boxes of step 2: the only personal details kept. */
export const DRAFT_DETAILS=Object.freeze(['full_name','phone','email','notes']);
const DRAFT_LIMITS=Object.freeze({full_name:100,phone:32,email:254,notes:2000});
const isInstant=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));

/** The flow's mark on a history entry: {step, depth}, or null when the entry is not one of the flow's. */
export function readMark(historyState){
 const mark=historyState&&typeof historyState==='object'?historyState[HISTORY_MARK]:null;
 return mark&&typeof mark==='object'&&STEPS.some(step=>step.id===mark.step)&&Number.isInteger(mark.depth)&&mark.depth>=0&&mark.depth<=99
  ?Object.freeze({step:mark.step,depth:mark.depth}):null;
}
/** The history state for an entry of the flow: whatever the site keeps there, plus the mark. */
export function withMark(historyState,mark){
 return {...(historyState&&typeof historyState==='object'?historyState:{}),[HISTORY_MARK]:{step:mark.step,depth:mark.depth}};
}
/** What is kept of an unfinished booking. `chosen` says the visitor chose the doctor (the engine starts with one of its own). */
export function draftRecord({state,chosen=false,now}){
 return Object.freeze({v:1,at:now,chosen:!!chosen,service:state.service||'',day:state.day||'',
  slot:state.slot?Object.freeze({starts_at:state.slot.starts_at,ends_at:state.slot.ends_at}):null,
  payment_method:state.payment_method||'',
  details:Object.freeze(Object.fromEntries(DRAFT_DETAILS.map(name=>[name,String(state.details?.[name]??'').slice(0,DRAFT_LIMITS[name])])))});
}
/** A kept record read back: null unless it is whole, of this version and not older than DRAFT_MINUTES. */
export function parseDraft(text,now){
 let value;
 try{value=JSON.parse(text);}catch{return null;}
 if(!value||typeof value!=='object'||value.v!==1||typeof value.at!=='number'||!(now-value.at>=0&&now-value.at<=DRAFT_MINUTES*60000))return null;
 if(typeof value.chosen!=='boolean'||typeof value.service!=='string'||value.service.length>80||!(value.day===''||isDay(value.day)))return null;
 if(!(value.slot===null||value.slot&&isInstant(value.slot.starts_at)&&isInstant(value.slot.ends_at)))return null;
 if(!['','at_clinic','online'].includes(value.payment_method)||!value.details||typeof value.details!=='object')return null;
 if(!DRAFT_DETAILS.every(name=>typeof value.details[name]==='string'&&value.details[name].length<=DRAFT_LIMITS[name]))return null;
 return Object.freeze({v:1,at:value.at,chosen:value.chosen,service:value.service,day:value.day,
  slot:value.slot?Object.freeze({starts_at:value.slot.starts_at,ends_at:value.slot.ends_at}):null,payment_method:value.payment_method,
  details:Object.freeze(Object.fromEntries(DRAFT_DETAILS.map(name=>[name,value.details[name]])))});
}
/** `storage` is a function that returns the tab's storage; a browser that refuses it simply keeps nothing. */
export function saveDraft(storage,record){
 try{storage().setItem(DRAFT_KEY,JSON.stringify(record));return true;}catch{return false;}
}
/** The kept record, or null. One that is too old or damaged is removed as it is found. */
export function loadDraft(storage,now){
 try{
  const store=storage(),text=store.getItem(DRAFT_KEY);
  if(text===null)return null;
  const record=parseDraft(text,now);
  if(!record)store.removeItem(DRAFT_KEY);
  return record;
 }catch{return null;}
}
export function clearDraft(storage){
 try{storage().removeItem(DRAFT_KEY);return true;}catch{return false;}
}
/**
 * How the steps begin on this history entry: at the entry's own step with the kept record when the
 * flow marked the entry earlier (Back, Forward, refresh), otherwise at step 1 with nothing read.
 */
export function flowStart({mark=null,saved=null}={}){
 const returning=!!(mark&&saved);
 return Object.freeze({step:returning?mark.step:1,depth:mark?mark.depth:0,saved:returning?saved:null});
}
/**
 * Bringing the kept choices back, one engine edit at a time (the engine reads a day's times after
 * each change of doctor or day, and accepts only a starting time it is offering now).
 * Returns {edits, done, kept}: the edits to hand over next; `done` when nothing more will follow;
 * `kept` is false when the starting time could not be brought back (`gone` when it is no longer offered).
 */
export function restoreNext({saved,state,usable}){
 const wait=Object.freeze({edits:Object.freeze([]),done:false,kept:false,gone:false});
 const stop=(kept,gone=false)=>Object.freeze({edits:Object.freeze([]),done:true,kept,gone});
 if(!saved)return stop(true);
 if(!usable||!state.policyFresh)return state.loadingPolicy?wait:stop(false);
 const one=(name,value)=>Object.freeze({edits:Object.freeze([Object.freeze([name,value])]),done:false,kept:false,gone:false});
 if(!saved.chosen||!saved.service)return stop(!saved.slot);
 if(state.service!==saved.service)return state.policy.policy.services.some(item=>item.id===saved.service&&item.enabled)?one('service',saved.service):stop(false);
 if(saved.day&&state.day!==saved.day){
  const range=dateRange(state.policy);
  return saved.day>=range.first_date&&saved.day<=range.last_date?one('day',saved.day):stop(false,!!saved.slot);
 }
 if(!saved.slot)return stop(true);
 if(state.slotsStatus==='loading'||state.slotsStatus==='idle')return wait;
 if(state.slotsStatus!=='ready'||!state.slotsFresh)return stop(false);
 const slot=state.slots.find(item=>item.starts_at===saved.slot.starts_at&&item.ends_at===saved.slot.ends_at);
 if(!slot)return stop(false,true);
 if(state.slot?.starts_at!==slot.starts_at)return one('slot',slot);
 if(saved.payment_method&&state.payment_method!==saved.payment_method&&paymentAvailable(state.policy,saved.payment_method))return one('payment_method',saved.payment_method);
 return stop(true);
}
/** The furthest step that may be shown: 1 until step 1 is complete, 2 until the details pass, then 3. */
export function furthestStep({missing='',problems={}}={}){
 if(missing)return 1;
 return Object.keys(problems).length?2:3;
}
/**
 * The browser arrived on one of the flow's own entries (Back or Forward).
 *   mark, from  the entry arrived on and the entry left ({step, depth})
 *   steps       false when no step can be shown: the booking is being saved, is saved, or booking is paused
 *   allowed     the furthest step that may be shown now
 * Returns {step} to show; with {go: n} the browser must move again (this entry's step cannot be
 * shown, or a finished booking is being left); with {mark} this entry is re-labelled instead.
 */
export function arrival({mark,from,steps=true,allowed=3}){
 if(!steps)return Object.freeze(mark.depth<from.depth?{go:-(mark.depth+1)}:{});
 const step=Math.min(mark.step,allowed),short=mark.step-step;
 if(!short)return Object.freeze({step});
 return Object.freeze(short<=mark.depth?{step,go:-short}:{step,mark:Object.freeze({step,depth:mark.depth})});
}
/** Going back to an earlier step from inside the page: through the browser's own history when those entries are there. */
export function retreat({from,target}){
 const back=from.step-target;
 return Object.freeze(back>0&&back<=from.depth?{go:-back}:{mark:Object.freeze({step:target,depth:from.depth})});
}
/** Continue: the next step is a new entry, one deeper. */
export function advanceMark(from,target){return Object.freeze({step:target,depth:Math.min(from.depth+1,99)});}

// ---------- the summary ("Your visit") ----------

/**
 * What the summary prints, from the engine's state. `shown` carries a doctor or day the visitor
 * has just chosen that the engine has not been told yet (see holdEdit).
 */
export function visitSummary({state,usable,chosen=true,shown={},methodAvailable=false}){
 const policy=usable?state.policy.policy:null;
 const serviceId=shown.service??state.service,day=shown.day??state.day;
 const service=policy&&chosen?policy.services.find(item=>item.id===serviceId)||null:null;
 const waiting=Object.keys(shown).length>0||state.slotsStatus==='loading'||!!state.loadingPolicy;
 const settled=!!(policy&&service&&state.slot&&state.slotsFresh&&state.policyFresh&&Object.keys(shown).length===0);
 const amount=settled&&state.quote?state.quote.amount_paise:service?.pricing.amount_paise;
 return Object.freeze({
  doctor:service?doctorChoice(service):null,
  day:service&&day?dayLong(day):'',
  dayShort:service&&day?dayShort(day):'',
  time:settled?timeLabel(state.slot.starts_at,policy.timezone):'',
  waiting:!!service&&waiting&&!settled,
  fee:Number.isSafeInteger(amount)?money(amount):'',
  payment:methodAvailable&&state.payment_method==='at_clinic'?words.summary.atClinic:methodAvailable&&state.payment_method==='online'?words.summary.online:'',
  // `short` is the clinic's own two-word place, shown on phones (the full address is on the appointment card)
  place:policy?.location?Object.freeze({name:policy.location.name,address:policy.location.address,short:clinicPlace}):null
 });
}
/** The two short lines of the phone bar: who, then the day and time (or what is still missing). */
export function barLines(summary,missing=''){
 if(!summary.doctor)return Object.freeze({top:words.missing.doctor,bottom:''});
 const bottom=summary.time?[summary.dayShort,summary.time].filter(Boolean).join(' · '):words.missing[missing]||words.missing.time;
 return Object.freeze({top:summary.doctor.short,bottom});
}
/** "₹800 when you arrive." and the other payment rows' second lines. */
export function paymentNote(method,{available,fee=''}){
 if(!available)return words.payment.unavailable;
 return method==='at_clinic'?words.payment.atClinicNote(fee||'The fee'):words.payment.onlineNote;
}

// ---------- the appointment card ----------

/** The clinic's contact rows the island prints: one doctor if known, otherwise both. */
export function contactRows(service=''){
 const id=doctorFor(service);
 return (id?[id]:doctorOrder).map(key=>Object.freeze({id:key,name:doctors[key].name,digits:localPhone(key),href:`tel:${doctors[key].tel}`,
  spoken:`Call ${doctors[key].name} at ${doctors[key].phone}`}));
}
/** Which doctor a receipt is for: by the engine's resource id, else by the printed name. */
export function receiptDoctor(receipt){
 return doctorFor(receipt.resource_id)||doctorOrder.find(id=>doctors[id].name===(receipt.resource_name||receipt.service_name))||'';
}
/** Everything the appointment card prints, from the engine's receipt. */
export function appointmentCard(receipt){
 const id=receiptDoctor(receipt),state=receipt.appointment_state;
 const known=Object.hasOwn(words.receipt.titles,state);
 const live=state==='confirmed'||state==='held'||state==='payment_review';
 return Object.freeze({
  state,
  tag:known?words.receipt.tags[state]:'',
  title:known?words.receipt.titles[state]:'',
  doctor:Object.freeze({id,name:receipt.resource_name||receipt.service_name,role:id?doctors[id].role:'',portrait:id?closePortraits[id]:''}),
  day:dayLong(localDate(receipt.starts_at,receipt.timezone)),
  time:timeLabel(receipt.starts_at,receipt.timezone),
  instant:receipt.starts_at,
  place:receipt.location?Object.freeze({name:receipt.location.name,address:receipt.location.address,maps:receipt.location.maps_url}):null,
  pay:!live?'':receipt.payment_method==='at_clinic'?`${money(receipt.amount_due_paise)} · ${words.receipt.atClinic}`:`${money(receipt.amount_paise)} · ${words.receipt.online}`,
  bring:state==='confirmed'?words.receipt.bring:''
 });
}
/** The paper-cut desk calendar: the one object of the booking screens. Decorative. */
export const calendarObject=clinicObjects['desk-calendar'];
