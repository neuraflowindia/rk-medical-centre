// Footer behaviour: "Pause motion", "How your details are used" and "Change privacy choices".
import {detailsNotice,footer,privacyChoices} from '../../../clinic/page-content/shared.mjs';
import {toggleFace} from '../../motion/motion.mjs';
import {iconId} from '../../icons/icons.mjs';
import {paragraphs} from '../../lib/html.mjs';
import {button} from '../button/button.mjs';

/** Show the motion control in a state: its words, its icon and whether it is pressed. */
export function paintMotionToggle(control,state,words=footer.motion){
 const face=toggleFace(state,words),label=control.querySelector('[data-motion-label]'),use=control.querySelector('use');
 if(control.getAttribute('aria-pressed')!==String(face.pressed))control.setAttribute('aria-pressed',String(face.pressed));
 if(label&&label.textContent!==face.label)label.textContent=face.label;
 if(use&&use.getAttribute('href')!=='#'+iconId(face.icon))use.setAttribute('href','#'+iconId(face.icon));
}

/** The notice opened by "How your details are used", as markup for the reader. */
export function detailsNoticeMarkup(){return paragraphs(detailsNotice.paragraphs);}
/** The privacy choices, as markup for the reader. */
export function privacyChoicesMarkup(){
 return paragraphs(privacyChoices.paragraphs)+`<p class="reader__actions">${button({label:privacyChoices.accept,variant:'second',attributes:{'data-privacy-accept':true}})}</p>`;
}

export function bindSiteFooter(root,{signal,services}={}){
 const scope=root.querySelector('[data-site-footer]');
 if(!scope||!services)return;
 const toggle=scope.querySelector('[data-motion-toggle]');
 if(toggle&&services.motion){
  paintMotionToggle(toggle,services.motion.state());
  toggle.addEventListener('click',()=>{services.motion.toggle();},{signal});
  services.motion.subscribe(state=>paintMotionToggle(toggle,state),{signal});
 }
 // "How your details are used" can sit anywhere on a page (the footer, a form's consent line).
 for(const opener of root.querySelectorAll('[data-collection-notice]')){
  opener.addEventListener('click',()=>services.reader.open({title:detailsNotice.title,html:detailsNoticeMarkup(),trigger:opener}),{signal});
 }
 for(const opener of root.querySelectorAll('[data-privacy]')){
  opener.addEventListener('click',()=>{
   services.reader.open({title:privacyChoices.title,html:privacyChoicesMarkup(),trigger:opener});
   services.reader.content()?.querySelector('[data-privacy-accept]')?.addEventListener('click',()=>{services.privacy?.choose(false);services.reader.close();},{once:true});
  },{signal});
 }
}
