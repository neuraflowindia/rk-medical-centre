// Words for Meet the doctors and for both doctor profiles. No markup lives in this file; facts
// are imported, never retyped. (Skeleton: the page heads only. The Doctors builder fills in the rest.)
import {doctors} from '../model.mjs';
import {doctorShortName} from './shared.mjs';

export const doctorsPage=Object.freeze({
 runningHead:'The doctors',
 heading:`Meet ${doctorShortName('sanjay')} and ${doctors.parul.name}.`,
 emphasis:`${doctors.parul.name}.`
});

/** The head of one doctor's profile: `id` is "sanjay" or "parul". */
export function profilePage(id){
 if(!Object.hasOwn(doctors,id))throw new RangeError('Unknown doctor: '+id);
 return Object.freeze({runningHead:doctors[id].formal,heading:doctors[id].name,role:doctors[id].role});
}
