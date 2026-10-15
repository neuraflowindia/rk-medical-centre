/** Additive v2 public facts. V1 callers keep their existing contract. */
const object=value=>value && typeof value==='object' && !Array.isArray(value);
const text=(value,max)=>typeof value==='string' && value.trim().length>0 && value.length<=max && !/[\u0000-\u001f\u007f]/.test(value);
export const resourceId=value=>typeof value==='string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
export const v2FactKeys=['facts_version','resource_id','resource_name','payment_method','amount_due_paise','location','display_duration'];
export const isV2=value=>value?.facts_version===2;
export function validLocation(value){
 if(!object(value) || Object.keys(value).sort().join(',')!=='address,maps_url,name' || !text(value.name,150) || !text(value.address,500) || !text(value.maps_url,2048))return false;
 try{const url=new URL(value.maps_url);return url.protocol==='https:' && !url.username && !url.password && (!url.port||url.port==='443');}catch{return false;}
}
export const sameLocation=(a,b)=>a===null&&b===null||validLocation(a)&&validLocation(b)&&['name','address','maps_url'].every(k=>a[k]===b[k]);
export const paymentMethods=p=>p?.version===2?p.payment_methods:['online'];
export const paymentAvailable=(data,method)=>data?.policy?.version===1?method==='online':data?.payment_availability?.[method]?.available===true;
export function validPaymentAvailability(data){
 const map=data.payment_availability,methods=data.policy.payment_methods;
 return object(map)&&Object.keys(map).sort().join(',')===[...methods].sort().join(',')&&methods.every(method=>{
  const value=map[method];return object(value)&&Object.keys(value).sort().join(',')==='available,reason'
   &&typeof value.available==='boolean'&&value.reason===(value.available?null:'temporarily_unavailable');
 });
}
export function validV2Policy(p){
 if(Object.hasOwn(p,'appointment_changes')&&!['legacy_notice','staff_discretion'].includes(p.appointment_changes))return false;
 if(!Array.isArray(p.resources) || !p.resources.length || p.resources.length>100 || new Set(p.resources.map(r=>r?.id)).size!==p.resources.length
  || !p.resources.every(r=>object(r)&&resourceId(r.id)&&text(r.name,150)&&Array.isArray(r.weekly_windows))
  || !Array.isArray(p.payment_methods)||!p.payment_methods.length||p.payment_methods.length>2||new Set(p.payment_methods).size!==p.payment_methods.length
  || !p.payment_methods.every(m=>['online','at_clinic'].includes(m))||typeof p.display_duration!=='boolean'
  || !(p.location===null||validLocation(p.location)) || (p.meeting==='in_person'&&!validLocation(p.location))
  || (p.payment_methods.includes('at_clinic')&&p.meeting!=='in_person'))return false;
 return p.services.every(s=>p.resources.some(r=>r.id===s.resource_id));
}
export function validV2Facts(r){
 if(!isV2(r))return !v2FactKeys.some(k=>Object.hasOwn(r,k));
 if(!['google_meet','internal','in_person'].includes(r.meeting_mode)||!v2FactKeys.every(k=>Object.hasOwn(r,k)) || !resourceId(r.resource_id)||!text(r.resource_name,150)
  || !['online','at_clinic'].includes(r.payment_method)||!Number.isSafeInteger(r.amount_due_paise)||r.amount_due_paise<0||r.amount_due_paise>r.amount_paise
  || typeof r.display_duration!=='boolean'||!(r.location===null||validLocation(r.location)))return false;
 if(r.meeting_mode==='in_person'&&(!validLocation(r.location)||r.meet_url!==null))return false;
 if(r.payment_method==='at_clinic')return r.meeting_mode==='in_person'&&['confirmed','cancelled'].includes(r.appointment_state)
  &&r.order_state==='not_required'&&r.payment_state==='due_at_clinic'&&r.captured_paise===0&&r.refunded_paise===0
  &&r.amount_due_paise===(r.appointment_state==='cancelled'?0:r.amount_paise);
 return r.order_state!=='not_required'&&r.payment_state!=='due_at_clinic';
}
export const showDuration=r=>!isV2(r)||r.display_duration;
export const locationLabel=r=>r.location?r.location.name+' — '+r.location.address:'';
