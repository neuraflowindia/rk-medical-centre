import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as standins from '../../src/clinic/standins.mjs';
import {doctors,doctorFacts} from '../../src/clinic/model.mjs';
import {degreesOf} from '../../src/clinic/page-content/shared.mjs';

const source=readFileSync(new URL('../../src/clinic/standins.mjs',import.meta.url),'utf8');
const marker='// '+standins.STAND_IN_NOTE;
const values=['doctorDegrees','registrationCouncil','registrationNumbers','whatsappNumber','whatsappFirstMessage','walkInAnswer',
 'paymentAnswer','bookForSomeoneElseAnswer','observationCareSentence','parkingLine'];

test('every stand-in value is exported under a clear name and carries the marker comment',()=>{
 const lines=source.split('\n');
 for(const name of values){
  assert.ok(Object.hasOwn(standins,name),name+' is exported');
  const at=lines.findIndex(line=>line.startsWith(`export const ${name}=`));
  assert.ok(at>0,name+' is declared on its own line');
  const above=lines.slice(Math.max(0,at-3),at);
  assert.ok(above.includes(marker),`${name} has the marker within the three lines above it`);
 }
 assert.equal(lines.filter(line=>line===marker).length,values.length,'the marker appears once per stand-in and nowhere else');
});

test('the values are the ones agreed in the concept brief',()=>{
 assert.deepEqual(standins.doctorDegrees,{parul:'MBBS, MS (Obstetrics & Gynaecology)'},'only Dr. Parul Gupta’s degrees await confirmation');
 assert.equal(doctorFacts.sanjay.degrees,'MBBS, DGO','Dr. Sanjay Gupta’s degrees are a confirmed fact, kept with the facts');
 assert.equal(degreesOf('sanjay'),'MBBS, DGO');assert.equal(degreesOf('parul'),standins.doctorDegrees.parul);
 assert.throws(()=>degreesOf('nobody'),RangeError);
 assert.doesNotMatch(standins.standInRegister.map(item=>item.key+item.value).join(' '),/sanjay.*MD \(Medicine\)|doctorDegrees\.sanjay/,'his degrees are not in the register');
 assert.equal(standins.registrationCouncil,'UP Medical Council');
 assert.deepEqual(standins.registrationNumbers,{sanjay:'38164',parul:'38209'});
 assert.equal(standins.whatsappFirstMessage,'Hello, I would like to ask about an appointment.');
 assert.equal(standins.walkInAnswer,'Yes. Booked patients are seen first.');
 assert.equal(standins.paymentAnswer,'Cash or UPI at the clinic.');
 assert.equal(standins.bookForSomeoneElseAnswer,'Yes. Enter the patient’s name and your own phone number.');
 assert.equal(standins.observationCareSentence,'A supervised room where a patient can stay under a doctor’s watch for a few hours, day or night.');
 assert.equal(standins.parkingLine,'Parking outside the clinic');
});

test('the WhatsApp number is one of the clinic\'s own listed numbers, never an invented one',()=>{
 assert.ok(Object.values(doctors).some(doctor=>doctor.phone===standins.whatsappNumber));
 assert.equal(standins.whatsappDigits(),'919415049410');
});

test('the WhatsApp link opens the chat with the first message written',()=>{
 const link=new URL(standins.whatsappLink());
 assert.equal(link.origin+link.pathname,'https://wa.me/919415049410');
 assert.equal(link.searchParams.get('text'),standins.whatsappFirstMessage);
 assert.equal(new URL(standins.whatsappLink('Is the clinic open & taking visits?')).searchParams.get('text'),'Is the clinic open & taking visits?');
});

test('a registration line names the council and the doctor\'s number',()=>{
 assert.equal(standins.registrationLine('sanjay'),'UP Medical Council Reg. No. 38164');
 assert.equal(standins.registrationLine('parul'),'UP Medical Council Reg. No. 38209');
 assert.throws(()=>standins.registrationLine('nobody'),RangeError);
});

test('the register lists every stand-in once, with the value actually in use',()=>{
 const register=standins.standInRegister;
 assert.equal(register.length,11);
 assert.equal(new Set(register.map(item=>item.key)).size,register.length);
 for(const item of register){
  const [name,part]=item.key.split('.');
  assert.ok(values.includes(name),item.key+' points at a stand-in export');
  assert.equal(item.value,part?standins[name][part]:standins[name]);
  assert.ok(item.label&&item.where);
 }
 assert.deepEqual([...new Set(register.map(item=>item.key.split('.')[0]))].sort(),[...values].sort(),'no stand-in is missing from the register');
});

test('stand-ins cannot be changed by accident and hold no markup',()=>{
 assert.ok(Object.isFrozen(standins.doctorDegrees)&&Object.isFrozen(standins.registrationNumbers)&&Object.isFrozen(standins.standInRegister));
 assert.throws(()=>{standins.doctorDegrees.parul='MBBS';},TypeError);assert.throws(()=>{standins.doctorDegrees.sanjay='MBBS';},TypeError);
 for(const item of standins.standInRegister)assert.doesNotMatch(item.value,/[<>]/);
});
