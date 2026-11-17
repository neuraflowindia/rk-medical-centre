// Words for the Contact page, its message form and the site's privacy notice. No markup lives in
// this file; facts are imported, never retyped. Where a sentence depends on a fact (the hours
// heading, the numbers inside the notice), it is worked out from that fact here.
import {address,directions} from '../model.mjs';
import {addressCard,bookingEntry,callRows,callSheet,clinicName,essentials,footer,photoCaptions,timetable} from './shared.mjs';

// ---------- 1 · first screen: the directory card ----------
export const contactPage=Object.freeze({
 runningHead:'Contact',
 heading:'Call, message or visit.',
 emphasis:'or visit.',
 // The list of rows, named for assistive technology.
 directoryLabel:'Call or message the clinic',
 whatsapp:Object.freeze({label:callSheet.whatsapp.label,need:callSheet.whatsappNeed,href:callSheet.whatsapp.href,opens:callSheet.opensWhatsapp}),
 // The clinic's own policy line. This card is its one home on the site.
 changes:footer.changes,
 book:bookingEntry.page.on.label,
 findBooking:'Already booked? Find your booking',
 // Shown only while online booking is switched off.
 bookingOff:'Online booking is closed just now. Call either doctor to arrange your visit.'
});

// ---------- 2 · find us: the drawn map, the frontage, the address ----------
export const findUs=Object.freeze({
 runningHead:'Find us',
 heading:'Sector 18, on Ring Road.',
 emphasis:'on Ring Road.',
 // The drawn locator. Its labels name only what public maps show for the clinic's own map point:
 // Ring Road passes the clinic; Tedhi Pulia lies along it to the west, Munshi Pulia to the east.
 locator:Object.freeze({
  spoken:`Drawn map. ${clinicName} stands on the south side of Ring Road in Sector 18, Indira Nagar, between Tedhi Pulia to the west and Munshi Pulia to the east.`,
  road:'Ring Road',
  west:'Tedhi Pulia',
  east:'Munshi Pulia',
  north:'N',
  pin:clinicName,
  open:'Open in Google Maps',
  opens:essentials.place.opens,
  href:directions,
  // The drawing's roads and parks were traced from OpenStreetMap, whose licence asks for this credit
  // wherever a drawing made from its data is shown.
  credit:'Map data © OpenStreetMap contributors'
 }),
 photo:Object.freeze({id:'frontage',ratio:'16:9',caption:photoCaptions.frontage}),
 card:Object.freeze({
  name:clinicName,
  address,
  directions:addressCard.directions,
  opens:essentials.place.opens,
  parking:addressCard.parking
 })
});

// ---------- 3 · hours: the one full timetable on the site ----------
const DAY_NAMES=Object.freeze(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
/**
 * The week as seven rows, Monday first, for the shared timetable. Each day takes its times from
 * the shared rows (which are worked out from the clinic's sessions), so the two can never differ.
 */
export function weekRows(rows=timetable.rows){
 return Object.freeze([1,2,3,4,5,6,0].map(day=>{
  const found=rows.find(row=>row.days.includes(day));
  return Object.freeze({label:DAY_NAMES[day],days:Object.freeze([day]),morning:found?.morning??null,evening:found?.evening??null});
 }));
}
/**
 * The section's heading says the week in six words, but only while those words are true:
 * every day has a session, and Sunday alone has no evening one. Otherwise it is a plain label.
 */
export function hoursHeading(rows=weekRows()){
 const sunday=rows.find(row=>row.days.includes(0)),others=rows.filter(row=>row!==sunday);
 const sundayMorningOnly=!!sunday&&!!sunday.morning&&!sunday.evening;
 const othersBoth=others.length===6&&others.every(row=>row.morning&&row.evening);
 return sundayMorningOnly&&othersBoth
  ?Object.freeze({heading:'Open every day. Sundays, mornings only.',emphasis:'mornings only.'})
  :Object.freeze({heading:'Appointment times.',emphasis:''});
}
export const hours=Object.freeze({
 runningHead:'Hours',
 caption:timetable.caption,
 note:Object.freeze({
  title:'24-hour observation care',
  text:'Observation care runs 24 hours, even when appointments are closed. Call the clinic before coming in.'
 })
});

// ---------- 4 · the message form ----------
const plural=(count,one,many)=>count===1?one:many;
/**
 * The message form: every label, hint, error and status sentence, and the words of each screen.
 * The fields are fixed by the booking engine: name, email (a six-digit code is emailed and must
 * be entered), phone (optional), message.
 */
export const messageForm=Object.freeze({
 runningHead:'Write to us',
 heading:'Send the clinic a message.',
 emphasis:'a message.',
 urgent:'For anything urgent, please call the clinic.',
 label:'Send the clinic a message',
 legend:'Your details and your message',
 stepsLabel:'How a message is sent',
 steps:Object.freeze([
  Object.freeze({id:'write',label:'Write your message',short:'Write'}),
  Object.freeze({id:'code',label:'Enter the code we email you',short:'Enter the code'}),
  Object.freeze({id:'sent',label:'Sent',short:'Sent'})
 ]),
 stepsWhy:'The code shows the email address is yours, so the clinic can reply.',
 fields:Object.freeze([
  Object.freeze({name:'name',label:'Full name',type:'text',autocomplete:'name',maxlength:100,required:true,hint:''}),
  Object.freeze({name:'email',label:'Email address',type:'email',autocomplete:'email',maxlength:254,required:true,inputmode:'email',hint:'A six-digit code is emailed here, to check it is yours.'}),
  Object.freeze({name:'phone',label:'Phone number',type:'tel',autocomplete:'tel',maxlength:32,required:false,inputmode:'tel',hint:'Ten digits, or + and the country code.'})
 ]),
 optional:'optional',
 message:Object.freeze({label:'Your message',maxlength:4000}),
 consent:'The clinic uses these details only to answer you.',
 notice:footer.detailsNotice,
 send:'Send message',
 sending:'Sending…',
 errors:Object.freeze({
  name:'Please enter your full name.',
  email:'Please enter a valid email address.',
  phone:'Please check the number: ten digits, or + and the country code.',
  message:'Please write your message.',
  messageLong:'Please keep your message under 4,000 characters.',
  code:'Please enter all six digits of the code.'
 }),
 // What the status line says, screen by screen (it is read out by assistive technology).
 status:Object.freeze({
  opening:'Opening the message form…',
  ready:'',
  sending:'Sending your message…',
  resuming:'Finding your message…',
  code:'Check your email for the six-digit code. Your message is sent once you enter it.',
  expired:'This code has expired.',
  locked:'This code can no longer be used.',
  received:'The clinic has received your message.',
  closed:'The message form is closed right now.',
  failed:'We could not open the message form.',
  blocked:'Your browser is not letting this page keep your place.'
 }),
 code:Object.freeze({
  title:'Check your email.',
  sentTo:email=>email?`We sent a six-digit code to ${email}. Enter it here to send your message.`:'We sent a six-digit code to your email address. Enter it here to send your message.',
  label:'Six-digit code',
  verify:'Confirm and send',
  resend:'Send another code',
  countdown:seconds=>`You can ask for another code in ${seconds} ${plural(seconds,'second','seconds')}.`,
  remaining:count=>count>0?`${count} more ${plural(count,'code','codes')} can be sent.`:'No more codes can be sent for this message.',
  help:'Nothing in your inbox? Look in spam or junk. Wrong address? Please call the clinic instead.',
  expiredTitle:'This code has expired.',
  expiredText:'Ask for another code and use the newest email.',
  lockedTitle:'This code can no longer be used.',
  lockedText:'Ask for another code if one is left, or call the clinic.',
  noneLeft:'No more codes can be sent. Please call the clinic.'
 }),
 received:Object.freeze({
  title:'Thank you.',
  lead:'Your message is with the clinic.',
  // STAND-IN — replace with the clinic's confirmed fact
  // How the clinic answers a written message (it holds an email address and, if given, a phone number).
  text:'The clinic will get back to you by email or phone.',
  restart:'Write another message'
 }),
 closed:Object.freeze({
  title:'Messages are closed right now.',
  text:'Please call or WhatsApp the clinic instead.'
 }),
 failed:Object.freeze({
  title:'We could not open the message form.',
  text:'Please try again, or call the clinic.'
 }),
 blocked:Object.freeze({
  title:'Your browser is not letting this page keep your place.',
  text:'Allow site storage for this page, or call the clinic.'
 }),
 withoutScript:'The message form cannot run in this browser as it is set up. Please call or WhatsApp the clinic.',
 check:'Check again',
 retry:'Try again',
 // The site's own words for each answer the engine can give, by the engine's code.
 engine:Object.freeze({
  contact_unavailable:'The message service is not answering right now. Please try again in a little while, or call the clinic.',
  invalid_request:'Please check your details and try again. If you gave a phone number, include the country code.',
  verification_incorrect:'That code did not match. Check the newest email and try again.',
  verification_changed:'A newer code was sent. Please use the code from the latest email.',
  verification_expired:'That code has expired. Ask for another code below.',
  verification_limit:'No more codes can be sent for this message. Please call the clinic.',
  please_wait:'Please wait a moment before trying again. Your message is safe.',
  access_unavailable:'We could not find this message again. Keep this page open and try again, or call the clinic.',
  request_conflict:'This does not match the message already waiting. Please check it first.',
  receipt_conflict:'Another message from this browser is still waiting. Please check it first.',
  receipt_unavailable:'This browser could not read your waiting message. Please call the clinic.',
  storage_unavailable:'Your browser is not letting this page keep your place. Allow site storage for this page, or call the clinic.',
  invalid_response:'We could not read the answer safely. Please try again.',
  interrupted:'The connection was interrupted. Your message may already be saved. Please try again.'
 })
});

// ---------- 5 · the privacy notice ----------
// Written from the Digital Personal Data Protection Act, 2023 (sections 5 to 9 and 11 to 14) and
// the Digital Personal Data Protection Rules, 2025 (rules 3, 9, 12 and 14), read on 17 November 2026.
// It describes what this website really collects and does. A lawyer proofreads it at the end of
// the project.

// STAND-IN — replace with the clinic's confirmed fact
// How long the clinic keeps messages and booking records.
export const retentionPeriod='We keep your details only for as long as they are needed for your care and as the law requires.';

// STAND-IN — replace with the clinic's confirmed fact
// How quickly the clinic answers a question or complaint about personal details (the law's outer limit is 90 days).
export const privacyAnswerTime='one month';

// STAND-IN — replace with the clinic's confirmed fact
// Who answers questions about personal details. Until the clinic names a person and an email
// address, the notice gives the clinic's two listed phone numbers and its postal address.
export function privacyContact(rows=callRows()){
 return Object.freeze({
  phones:Object.freeze(rows.map(row=>Object.freeze({name:row.name,digits:row.digits,href:row.href,spoken:row.spoken}))),
  post:`${clinicName}, ${address}`
 });
}

const contact=privacyContact();
const numbers=contact.phones.map(phone=>phone.digits).join(' or ');

export const privacyNotice=Object.freeze({
 title:footer.detailsNotice,
 // The short form, for the dialog opened by "How your details are used".
 summary:Object.freeze([
  'When you send a message, we take your name, your email address, your message and, if you give one, your phone number. We email a six-digit code to check the address is yours.',
  'When you book, we take the patient’s name, a phone number, the doctor, day and time you choose and, if you give them, an email address and a note for the doctor.',
  'We use these details only to answer you and to arrange and carry out your visit. We do not sell them or use them for advertising.',
  'They are seen by the clinic’s doctors and staff, and handled for the clinic by the service companies that run this website, keep its records and send its emails. Booking records are also kept in the clinic’s own records.',
  `You can ask to see, correct or delete your details, or take back your permission, at any time: call ${numbers}.`
 ]),
 more:Object.freeze({label:'Read the full notice',href:'/contact#privacy-notice'}),
 // The full notice, at the foot of the Contact page.
 full:Object.freeze({
  id:'privacy-notice',
  open:footer.detailsNotice,
  openNote:'The full notice',
  updated:'Last updated November 2026',
  sections:Object.freeze([
   Object.freeze({
    heading:'Who is responsible',
    paragraphs:Object.freeze([`${clinicName}, ${address}, decides how the details you give on this website are used.`])
   }),
   Object.freeze({
    heading:'What we take, and why',
    lists:Object.freeze([
     Object.freeze({lead:'When you send a message, to answer you:',items:Object.freeze(['your name','your email address, and the six-digit code we send to check it is yours','your phone number, if you give one','the message you write'])}),
     Object.freeze({lead:'When you book an appointment, to arrange and carry out your visit:',items:Object.freeze(['the patient’s name','a phone number','an email address, if you would like an email copy','the doctor, day and time you choose','anything you write for the doctor to know'])})
    ]),
    paragraphs:Object.freeze([
     'We ask only for what is needed, and we use it only for these purposes.',
     'This website does not measure your visits or show advertising. All it keeps on your own device are your choices here (privacy and motion) and a private reference to a message or booking you are in the middle of.'
    ])
   }),
   Object.freeze({
    heading:'Who sees your details',
    paragraphs:Object.freeze([
     'The clinic’s doctors and staff see them. They are also handled, only on the clinic’s behalf, by the service companies that run this website, keep its records and send its emails; some of them may keep records on computers outside India. If you choose to pay online, the payment company handles that payment.',
     'Booking records are also copied into the clinic’s own records. We do not sell your details or use them for advertising, and we pass them to anyone else only when the law requires it. Ask us, and we will tell you which companies handle your details.'
    ])
   }),
   Object.freeze({
    heading:'How long we keep them',
    paragraphs:Object.freeze([`${retentionPeriod} The law asks clinics to keep some records for a set time, so those may stay even after you ask us to delete the rest.`])
   }),
   Object.freeze({
    heading:'Your choices',
    paragraphs:Object.freeze([
     'You can ask us at any time to show you the details we hold about you, to correct or complete them, or to delete them. You can also take back your permission as easily as you gave it; what was done before stays as it was, and we may then be unable to answer you or keep your booking. You may name another person to make these choices for you if you ever cannot.',
     `To do any of this, call ${contact.phones.map(phone=>`${phone.digits} (${phone.name})`).join(' or ')}, or write to ${contact.post}. Tell us the name and the phone number or email address you used, so that we can find your record.`
    ])
   }),
   Object.freeze({
    heading:'Children',
    paragraphs:Object.freeze(['For anyone under 18, a parent or guardian should book or write, and give permission, on the child’s behalf. We use a child’s details only for that child’s care.'])
   }),
   Object.freeze({
    heading:'Questions and complaints',
    paragraphs:Object.freeze([`Please tell the clinic first, by phone or by post as above. We will answer within ${privacyAnswerTime}. If you are not satisfied with our answer, you may then complain to the Data Protection Board of India.`])
   }),
   Object.freeze({
    heading:'Changes to this notice',
    paragraphs:Object.freeze(['If we change how your details are used, we will update this notice here and change its date.'])
   })
  ])
 })
});

/** Every stand-in written in this file, for the project's stand-in register and for tests. */
export const contactStandIns=Object.freeze([
 Object.freeze({key:'retentionPeriod',label:'How long messages and booking records are kept',value:retentionPeriod,where:'Contact, the full privacy notice'}),
 Object.freeze({key:'privacyAnswerTime',label:'How quickly a privacy question or complaint is answered',value:privacyAnswerTime,where:'Contact, the full privacy notice'}),
 Object.freeze({key:'privacyContact',label:'Who answers privacy questions (a named person and an email address are awaited)',value:`${numbers}; ${contact.post}`,where:'Contact, the privacy notice and its summary'}),
 Object.freeze({key:'messageForm.received.text',label:'How the clinic answers a written message',value:messageForm.received.text,where:'Contact, the thank-you screen of the message form'})
]);

/** The page description proposed for search (the title stays as it is). */
export const proposedDescription='Call Dr. Sanjay Gupta or Dr. Parul Gupta, send a message, see clinic hours and find R. K. Medical Centre on Ring Road, Indira Nagar, Lucknow.';
