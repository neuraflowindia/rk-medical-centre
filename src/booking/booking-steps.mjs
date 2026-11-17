// What the booking steps say and decide: words, doctors, days, time groups, step rules, the
// appointment card. No React, no markup, no clock of its own: everything is worked out from what
// the booking engine reports, so each decision can be tested without a browser.
// Used only by clinic-booking.jsx, so it travels in the lazy booking bundle.
import {doctors} from '../clinic/model.mjs';
import {doctorOrder} from '../clinic/care-catalogue.mjs';
import {doctorAvatars,closePortraits,clinicObjects} from '../clinic/client-media.mjs';
import {bookForSomeoneElseAnswer} from '../clinic/standins.mjs';
import {addressCard,actionLabels,doctorShortName,localPhone,pagePaths} from '../clinic/page-content/shared.mjs';
import {localDate,money,timeLabel} from '../../appointment-system/browser/display-formatting.mjs';

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
 backToStep:(step,label)=>`Back to step ${step}: ${label}`,
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
  gone:'That starting time is no longer free. Please choose another.'
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
  optional:'optional',
  verification:'Email verification'
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
  doctor:'Doctor',day:'Day',time:'Starting time',fee:'Fee',place:'Where',
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
  choose:'Choose a payment option',
  saving:'Saving your request…',
  final:'This books your visit straight away.',
  tick:'Tick the box above to confirm.'
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

/** The last button's words. */
export function confirmLabel({busy=false,method=''}={}){
 if(busy)return words.confirm.saving;
 return method==='at_clinic'||method==='online'?words.confirm[method]:words.confirm.choose;
}
/** The line under the last button: what pressing it does, or what it still waits for. */
export function confirmHint({method='',methodAvailable=false,ack=false}={}){
 if(!method||!methodAvailable)return '';
 return ack?words.confirm.final:words.confirm.tick;
}

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
  place:policy?.location?Object.freeze({name:policy.location.name,address:policy.location.address}):null
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
