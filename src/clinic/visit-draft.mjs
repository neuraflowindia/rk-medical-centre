import {doctors} from './model.mjs';
import {topicById} from './care-catalogue.mjs';
export function createDraft(){return {name:'',email:'',phone:'',doctor:'',reason:'',date:'',time:'',message:''};}
export function chooseDoctor(draft,id){if(id===''){draft.doctor='';draft.reason='';draft.date='';draft.time='';return true;}if(!Object.hasOwn(doctors,id))return false;if(draft.doctor!==id){draft.doctor=id;draft.reason='';draft.date='';draft.time='';}return true;}
export function applyBookingQuery(draft,search){const p=new URLSearchParams(search),topic=topicById(p.get('topic'));if(topic){chooseDoctor(draft,topic.doctor);draft.reason=topic.id;}else chooseDoctor(draft,p.get('doctor'));return draft;}
export function updateDraft(draft,form){for(const [k,v] of new FormData(form))if(Object.hasOwn(draft,k)&&typeof v==='string')draft[k]=v;}
export function validateDraft(draft){const errors={};for(const k of ['name','phone'])if(!draft[k].trim())errors[k]='Enter your '+({name:'full name',phone:'phone number',email:'email address'}[k])+'.';if(!Object.hasOwn(doctors,draft.doctor))errors.doctor='Choose a doctor.';return errors;}
