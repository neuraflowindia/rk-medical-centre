// The single home of every STAND-IN on the website.
//
// A stand-in is a realistic value used while the clinic's confirmed fact is still awaited.
// Every value below is marked, used through this module only, and listed in `standInRegister`
// at the bottom, so replacing one is a single edit here. Nothing else on the site is a stand-in.
// No markup lives in this file.

/** The marker repeated above every value in this file. */
export const STAND_IN_NOTE='STAND-IN — replace with the clinic\'s confirmed fact';

// Dr. Sanjay Gupta's degrees are NOT a stand-in: the clinic confirmed "MBBS, DGO", and they are
// read from model.mjs. (One of his certificates shows MD (Medicine); the clinic will confirm the
// final wording.) Read either doctor's degrees through degreesOf() in page-content/shared.mjs.
// STAND-IN — replace with the clinic's confirmed fact
// Dr. Parul Gupta's degrees, as shown after the formal specialty.
export const doctorDegrees=Object.freeze({
 parul:'MBBS, MS (Obstetrics & Gynaecology)'
});

// STAND-IN — replace with the clinic's confirmed fact
// The medical council that holds both registrations.
export const registrationCouncil='UP Medical Council';

// STAND-IN — replace with the clinic's confirmed fact
// Each doctor's registration number with that council.
export const registrationNumbers=Object.freeze({
 sanjay:'38164',
 parul:'38209'
});

// STAND-IN — replace with the clinic's confirmed fact
// The clinic number that answers WhatsApp. It is one of the clinic's own listed numbers
// (a phone number is never invented); only "this number is on WhatsApp" awaits confirmation.
export const whatsappNumber='+91 94150 49410';

// STAND-IN — replace with the clinic's confirmed fact
// The message a visitor's WhatsApp opens with.
export const whatsappFirstMessage='Hello, I would like to ask about an appointment.';

// STAND-IN — replace with the clinic's confirmed fact
// Questions: "Can I walk in without an appointment?"
export const walkInAnswer='Yes. Booked patients are seen first.';

// STAND-IN — replace with the clinic's confirmed fact
// Questions: the payment half of "How much is a visit, and how do I pay?" (the fee itself is a real fact).
export const paymentAnswer='Cash or UPI at the clinic.';

// STAND-IN — replace with the clinic's confirmed fact
// Questions: "Can I book for a parent or someone else?"
export const bookForSomeoneElseAnswer='Yes. Enter the patient’s name and your own phone number.';

// STAND-IN — replace with the clinic's confirmed fact
// What "24-hour observation care" means in one sentence (Questions; reusable wherever it is explained).
export const observationCareSentence='A supervised room where a patient can stay under a doctor’s watch for a few hours, day or night.';

// STAND-IN — replace with the clinic's confirmed fact
// The parking line on the address card.
export const parkingLine='Parking outside the clinic';

/** "UP Medical Council Reg. No. 38164" for one doctor (`sanjay` or `parul`). */
export function registrationLine(id){
 if(!Object.hasOwn(registrationNumbers,id))throw new RangeError('Unknown doctor: '+id);
 return `${registrationCouncil} Reg. No. ${registrationNumbers[id]}`;
}

/** The WhatsApp number as digits only, with the country code: "919415049410". */
export function whatsappDigits(){return whatsappNumber.replace(/\D/g,'');}

/** The link that opens WhatsApp with the first message already written. */
export function whatsappLink(message=whatsappFirstMessage){
 return `https://wa.me/${whatsappDigits()}?text=${encodeURIComponent(message)}`;
}

/**
 * Every stand-in in one list, for the project's stand-in register and for tests.
 * `key` is the export name in this file; `where` says where a visitor meets it.
 */
export const standInRegister=Object.freeze([
 {key:'doctorDegrees.parul',label:'Dr. Parul Gupta’s degrees',value:doctorDegrees.parul,where:'Doctor cards, Meet the doctors, her profile'},
 {key:'registrationCouncil',label:'Registering medical council',value:registrationCouncil,where:'Profiles, Meet the doctors, footer'},
 {key:'registrationNumbers.sanjay',label:'Dr. Sanjay Gupta’s registration number',value:registrationNumbers.sanjay,where:'His profile, Meet the doctors, footer'},
 {key:'registrationNumbers.parul',label:'Dr. Parul Gupta’s registration number',value:registrationNumbers.parul,where:'Her profile, Meet the doctors, footer'},
 {key:'whatsappNumber',label:'Clinic number that answers WhatsApp',value:whatsappNumber,where:'Call sheet, call panel, Contact'},
 {key:'whatsappFirstMessage',label:'First WhatsApp message',value:whatsappFirstMessage,where:'Every WhatsApp link'},
 {key:'walkInAnswer',label:'Answer: can I walk in without an appointment?',value:walkInAnswer,where:'Home, Questions'},
 {key:'paymentAnswer',label:'Answer: how do I pay?',value:paymentAnswer,where:'Home, Questions'},
 {key:'bookForSomeoneElseAnswer',label:'Answer: can I book for a parent or someone else?',value:bookForSomeoneElseAnswer,where:'Home, Questions'},
 {key:'observationCareSentence',label:'What 24-hour observation care is',value:observationCareSentence,where:'Home, Questions'},
 {key:'parkingLine',label:'Parking line',value:parkingLine,where:'Home (Visiting us), Contact (Find us)'}
].map(Object.freeze));
