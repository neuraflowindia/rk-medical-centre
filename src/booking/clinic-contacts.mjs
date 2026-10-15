import {doctors} from '../clinic/model.mjs';
export const clinicContacts=['sanjay','parul'].map(key=>({service:`dr-${key}-gupta`,label:doctors[key].name,phone:doctors[key].tel,display:doctors[key].phone}));
export const receiptContacts=clinicContacts.map(({label,phone})=>({label,phone}));
