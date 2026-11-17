// Footer behaviour: "Pause motion", "How your details are used" and "Change privacy choices".
import {callRows,detailsNotice,footer,privacyChoices} from '../../../clinic/page-content/shared.mjs';
import * as contactWords from '../../../clinic/page-content/contact.mjs';
import {toggleFace} from '../../motion/motion.mjs';
import {iconId} from '../../icons/icons.mjs';
import {paragraphs,text} from '../../lib/html.mjs';
import {button,textLink} from '../button/button.mjs';

/** Show the motion control in a state: its words, its icon and whether it is pressed. */
export function paintMotionToggle(control,state,words=footer.motion){
 const face=toggleFace(state,words),label=control.querySelector('[data-motion-label]'),use=control.querySelector('use');
 if(control.getAttribute('aria-pressed')!==String(face.pressed))control.setAttribute('aria-pressed',String(face.pressed));
 if(label&&label.textContent!==face.label)label.textContent=face.label;
 if(use&&use.getAttribute('href')!=='#'+iconId(face.icon))use.setAttribute('href','#'+iconId(face.icon));
}

/**
 * The words of "How your details are used". The privacy notice has its home on the Contact page
 * (`privacyNotice` in its words): the dialog shows that notice's short form and the way to the
 * whole of it. Until those words exist, the dialog keeps the site's earlier three paragraphs.
 */
export function noticeWords(words=contactWords.privacyNotice){
 if(words&&Array.isArray(words.summary)&&words.summary.length)return {title:words.title||detailsNotice.title,paragraphs:words.summary,more:words.more||null};
 return {title:detailsNotice.title,paragraphs:detailsNotice.paragraphs,more:null};
}
/**
 * The clinic's phone numbers inside printed paragraphs become links that dial ("call 94150 49410"
 * is otherwise a number to copy by hand). `rows` are the call rows of the shared words.
 */
export function linkPhones(html,rows=callRows()){
 let output=html;
 for(const row of rows){
  const shown=text(row.digits);
  output=output.replaceAll(shown,`<a class="sheet__tel" href="${text(row.href)}" aria-label="${text(row.spoken)}">${shown}</a>`);
 }
 return output;
}
/** The notice opened by "How your details are used", as markup for the reader. */
export function detailsNoticeMarkup(words=noticeWords()){
 return linkPhones(paragraphs(words.paragraphs))+(words.more?`<p class="sheet__actions">${textLink({label:words.more.label,href:words.more.href})}</p>`:'');
}
/** The privacy choices, as markup for the reader. */
export function privacyChoicesMarkup(){
 return paragraphs(privacyChoices.paragraphs)+`<p class="sheet__actions">${button({label:privacyChoices.accept,variant:'second',attributes:{'data-privacy-accept':true}})}</p>`;
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
  opener.addEventListener('click',()=>{const words=noticeWords();services.reader.open({title:words.title,html:detailsNoticeMarkup(words),trigger:opener});},{signal});
 }
 for(const opener of root.querySelectorAll('[data-privacy]')){
  opener.addEventListener('click',()=>{
   services.reader.open({title:privacyChoices.title,html:privacyChoicesMarkup(),trigger:opener});
   services.reader.content()?.querySelector('[data-privacy-accept]')?.addEventListener('click',()=>{services.privacy?.choose(false);services.reader.close();},{once:true});
  },{signal});
 }
}
