// The doctor mini-card: one doctor in a compact row — avatar, name, plain specialty, and the two
// actions. Used wherever a page points to a doctor without repeating the Home card.
import {doctors} from '../../../clinic/model.mjs';
import {actionLabels} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,text} from '../../lib/html.mjs';
import {bookButton,callButton,textLink} from '../button/button.mjs';

/**
 *   id       'sanjay' or 'parul'
 *   actions  false leaves the buttons out (a strip that only names the doctor)
 *   profile  false leaves the "Full profile" link out
 */
export function doctorMiniCard(id,ctx,{actions=true,profile=true,className=''}={}){
 if(!Object.hasOwn(doctors,id))throw new RangeError('Unknown doctor: '+id);
 const doctor=doctors[id];
 return `<article${attrs({class:classes('doctor-mini-card',`doctor-mini-card--${id}`,className),'data-doctor':id})}>`
  +`<div class="doctor-mini-card__id"><h3 class="doctor-mini-card__name">${text(doctor.name)}</h3><p class="doctor-mini-card__role">${text(doctor.role)}</p>`
  +(profile?textLink({label:actionLabels.fullProfile,href:doctor.path,className:'doctor-mini-card__profile'}):'')+`</div>`
  +(actions?`<div class="doctor-mini-card__actions">${bookButton(ctx,{doctor:id,size:'compact'})}${callButton(ctx,{doctor:id,size:'compact',lead:true})}</div>`:'')
  +`</article>`;
}
