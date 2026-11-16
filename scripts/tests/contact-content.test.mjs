// The Contact page's words: they follow the facts, carry no markup, and the privacy notice
// holds everything a notice must hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {contactPage,findUs,hours,hoursHeading,weekRows,messageForm,privacyNotice,privacyContact,privacyAnswerTime,retentionPeriod,contactStandIns,proposedDescription} from '../../src/clinic/page-content/contact.mjs';
import {callRows,callSheet,footer,timetable,timetableFrom,photoCaptions,clinicName} from '../../src/clinic/page-content/shared.mjs';
import {address,directions,consultationSessions,doctors} from '../../src/clinic/model.mjs';
import {whatsappLink,parkingLine,STAND_IN_NOTE} from '../../src/clinic/standins.mjs';

const source=readFileSync(fileURLToPath(new URL('../../src/clinic/page-content/contact.mjs',import.meta.url)),'utf8');
/** Every string anywhere inside a value. */
function strings(value,found=[]){
 if(typeof value==='string')found.push(value);
 else if(typeof value==='function')found.push(String(value(3)),String(value('')),String(value(1)));
 else if(value&&typeof value==='object')for(const item of Object.values(value))strings(item,found);
 return found;
}

test('no markup and no stand-in marker in any word of the page',()=>{
 for(const words of strings({contactPage,findUs,hours,messageForm,privacyNotice,proposedDescription,heading:hoursHeading()})){
  assert.doesNotMatch(words,/<[a-z/]/i,`markup in: ${words.slice(0,60)}`);
  assert.doesNotMatch(words,/STAND-IN/);
  assert.doesNotMatch(words,/\bundefined\b|\[object|NaN/);
  assert.doesNotMatch(words,/'/,`a typewriter apostrophe in: ${words.slice(0,60)}`);
 }
});

test('the first screen takes its facts from the shared words',()=>{
 assert.equal(contactPage.heading,'Call, message or visit.');
 assert.ok(contactPage.heading.endsWith(contactPage.emphasis));
 assert.equal(contactPage.whatsapp.href,whatsappLink());
 assert.equal(contactPage.whatsapp.label,callSheet.whatsapp.label);
 assert.equal(contactPage.changes,footer.changes);
});

test('find us: the address, the map link and the parking line are the clinic\'s own',()=>{
 assert.equal(findUs.card.address,address);
 assert.equal(findUs.card.name,clinicName);
 assert.equal(findUs.card.directions.href,directions);
 assert.equal(findUs.locator.href,directions);
 assert.equal(findUs.card.parking,parkingLine);
 assert.equal(findUs.photo.caption,photoCaptions.frontage);
 assert.equal(findUs.photo.id,'frontage');
 assert.ok(findUs.heading.endsWith(findUs.emphasis));
 // The drawn map names only the road and the two directions along it.
 assert.deepEqual([findUs.locator.road,findUs.locator.west,findUs.locator.east],['Ring Road','Tedhi Pulia','Munshi Pulia']);
 assert.match(findUs.locator.spoken,/south side of Ring Road/);
});

test('the week is seven rows, Monday first, with the shared times',()=>{
 const rows=weekRows();
 assert.deepEqual(rows.map(row=>row.label),['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
 assert.deepEqual(rows.map(row=>row.days),[[1],[2],[3],[4],[5],[6],[0]]);
 const [weekday,sunday]=timetable.rows;
 for(const row of rows.slice(0,6)){assert.equal(row.morning,weekday.morning);assert.equal(row.evening,weekday.evening);}
 assert.equal(rows[6].morning,sunday.morning);
 assert.equal(rows[6].evening,null,'Sunday has no evening session');
 assert.match(rows[0].morning,/^10:00–1:30$/);
 // A day no shared row covers has no times at all.
 assert.deepEqual(weekRows([{days:[1],morning:'9:00–10:00',evening:null}]).map(row=>row.morning),['9:00–10:00',null,null,null,null,null,null]);
});

test('the hours heading says the week only while that is true',()=>{
 assert.deepEqual({...hoursHeading()},{heading:'Open every day. Sundays, mornings only.',emphasis:'mornings only.'});
 const plain={heading:'Appointment times.',emphasis:''};
 // Sunday gains an evening session: the sentence would be false.
 const withSundayEvening=weekRows(timetableFrom({weekday:consultationSessions.weekday,sunday:consultationSessions.weekday}));
 assert.deepEqual({...hoursHeading(withSundayEvening)},plain);
 // A weekday loses its evening.
 const noEvenings=weekRows(timetableFrom({weekday:consultationSessions.sunday,sunday:consultationSessions.sunday}));
 assert.deepEqual({...hoursHeading(noEvenings)},plain);
 // Sunday closed altogether.
 assert.deepEqual({...hoursHeading(weekRows(timetableFrom({weekday:consultationSessions.weekday,sunday:[]})))},plain);
 assert.equal(hours.caption,timetable.caption);
 assert.match(hours.note.text,/24 hours/);
});

test('the message form names the engine\'s four fields and marks only the optional one',()=>{
 assert.deepEqual(messageForm.fields.map(field=>[field.name,field.type,field.required]),[['name','text',true],['email','email',true],['phone','tel',false]]);
 assert.equal(messageForm.message.maxlength,4000);
 assert.deepEqual(messageForm.steps.map(step=>step.id),['write','code','sent']);
 for(const step of messageForm.steps)assert.ok(step.label&&step.short);
 for(const key of ['opening','ready','sending','resuming','code','expired','locked','received','closed','failed','blocked'])assert.equal(typeof messageForm.status[key],'string',key);
 assert.equal(messageForm.notice,footer.detailsNotice);
});

test('the code screen counts in plain words',()=>{
 const code=messageForm.code;
 assert.equal(code.countdown(42),'You can ask for another code in 42 seconds.');
 assert.equal(code.countdown(1),'You can ask for another code in 1 second.');
 assert.equal(code.remaining(2),'2 more codes can be sent.');
 assert.equal(code.remaining(1),'1 more code can be sent.');
 assert.equal(code.remaining(0),'No more codes can be sent for this message.');
 assert.match(code.sentTo('asha@example.com'),/to asha@example\.com\./);
 assert.match(code.sentTo(''),/to your email address\./);
});

test('every answer the engine can give has the site\'s own sentence',()=>{
 for(const code of ['contact_unavailable','invalid_request','verification_incorrect','verification_changed','verification_expired','verification_limit','please_wait',
  'access_unavailable','request_conflict','receipt_conflict','receipt_unavailable','storage_unavailable','invalid_response','interrupted']){
  assert.ok(messageForm.engine[code]?.length>20,code);
 }
});

test('the privacy notice holds what a notice must hold',()=>{
 const all=strings(privacyNotice.full).join('\n'),summary=privacyNotice.summary.join('\n');
 assert.equal(privacyNotice.title,footer.detailsNotice);
 assert.equal(privacyNotice.more.href,'/contact#'+privacyNotice.full.id);
 assert.ok(privacyNotice.summary.length>=5&&privacyNotice.summary.length<=6,'five or six plain lines for the dialog');
 // what is taken, for a message and for a booking
 for(const item of [/name/,/email address/,/six-digit code/,/phone number/,/message/])assert.match(summary,item);
 for(const item of [/patient’s name/,/doctor, day and time/,/note for the doctor/])assert.match(summary,item);
 for(const item of [/your name/,/six-digit code/,/the message you write/,/the patient’s name/,/the doctor, day and time you choose/])assert.match(all,item);
 // why, who sees them, the clinic's own records
 assert.match(all,/to answer you/);assert.match(all,/arrange and carry out your visit/);
 assert.match(all,/doctors and staff/);assert.match(all,/service companies that run this website, keep its records and send its emails/);
 assert.match(all,/copied into the clinic’s own records/);
 // rights, withdrawal, children, grievance and the Board
 assert.match(all,/correct or complete them, or to delete them/);assert.match(all,/take back your permission as easily as you gave it/);
 assert.match(all,/under 18/);assert.match(all,/parent or guardian/);
 assert.match(all,/Data Protection Board of India/);
 assert.ok(all.includes(retentionPeriod));assert.ok(all.includes(`within ${privacyAnswerTime}`));
 // both of the clinic's numbers, written out, in the notice and in the dialog's last line
 for(const row of callRows()){assert.ok(all.includes(row.digits));assert.ok(summary.includes(row.digits));}
 assert.ok(all.includes(address));
 // no agency, tool or vendor is named
 assert.doesNotMatch(all+summary,/vercel|neon|resend|supabase|google|claude|anthropic|neuraflow|openai/i);
 const headings=privacyNotice.full.sections.map(section=>section.heading);
 assert.deepEqual(headings,['Who is responsible','What we take, and why','Who sees your details','How long we keep them','Your choices','Children','Questions and complaints','Changes to this notice']);
});

test('the privacy contact is the clinic\'s listed numbers and address, never an invented person',()=>{
 const contact=privacyContact();
 assert.deepEqual(contact.phones.map(phone=>phone.href),Object.values(doctors).map(doctor=>`tel:${doctor.tel}`).sort((a,b)=>callRows().findIndex(row=>row.href===a)-callRows().findIndex(row=>row.href===b)));
 assert.equal(contact.post,`${clinicName}, ${address}`);
 assert.equal(privacyContact([]).phones.length,0);
});

test('every stand-in written for this page is marked in the source and listed',()=>{
 assert.deepEqual(contactStandIns.map(item=>item.key),['retentionPeriod','privacyAnswerTime','privacyContact','messageForm.received.text']);
 for(const item of contactStandIns)assert.ok(item.label&&item.value&&item.where);
 assert.equal(source.split(STAND_IN_NOTE).length-1,contactStandIns.length,'one marker above each stand-in');
});

test('the proposed page description is one sentence of at most 155 characters',()=>{
 assert.ok(proposedDescription.length<=155,String(proposedDescription.length));
 assert.equal(proposedDescription.split('. ').filter(part=>!/^(?:Dr|R|K)$/.test(part.split(' ').at(-1))).length,1);
 assert.match(proposedDescription,/R\. K\. Medical Centre/);
});
