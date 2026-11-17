// The Contact message form's logic. The booking engine owns the exchange (start, the emailed
// six-digit code, resend, status); this file decides which screen the form shows at each moment
// and says everything in the site's own words (clinic/page-content/contact.mjs).
//
//   validateContact   reads and checks the four fields; an Indian number typed the ordinary way is accepted
//   engineAnswer      the engine's sentence → the engine's code → the site's sentence
//   formView          pure: everything the form shows, from the engine's state
//   focusTarget       pure: where the focus belongs on a screen (the next thing the visitor needs)
//   bindContactForm   the wiring: listens, paints, and stops when `signal` aborts
//
// The focus never falls to the page. A button that cannot be used just now is marked
// `aria-disabled` (it keeps its place in the keyboard's path and its handler does nothing); only
// the fields are truly switched off. After each thing the visitor does, and whenever the control
// they were on leaves the screen, the focus goes to `focusTarget`.
import {createEnquiryBrowser} from '../../appointment-system/browser/enquiry/index.mjs';
import {createEnquiryAPI} from '../../appointment-system/browser/enquiry/protocol.mjs';
import {messageFor} from '../../appointment-system/browser/enquiry/messages.mjs';
import {messageForm as words} from './page-content/contact.mjs';

const FIELDS=Object.freeze(['name','email','phone','message']);
/** What the engine accepts for a phone number: + and the country code, then the number. */
const ENGINE_PHONE=/^\+[1-9][0-9 ()-]{6,30}$/;

/**
 * A phone number as the engine wants it. A ten-digit Indian mobile number typed the ordinary way
 * ("94150 49410", "094150 49410", "91 94150 49410") gains +91; anything that already starts
 * with + is left as typed. An empty value stays empty (the phone number is optional).
 */
export function normalisePhone(value){
 const typed=String(value??'').trim();
 if(!typed||typed.startsWith('+'))return typed;
 const digits=typed.replace(/[\s().-]/g,'');
 if(!/^[0-9]+$/.test(digits))return typed;
 const local=digits.length===12&&digits.startsWith('91')?digits.slice(2):digits.length===11&&digits.startsWith('0')?digits.slice(1):digits;
 return local.length===10&&/^[6-9]/.test(local)?`+91${local}`:typed;
}

/** The four fields as the engine will receive them, and what is wrong with each (pure). */
export function checkContact(values,{emailValid=true}={}){
 const fields={name:String(values.name??'').trim(),email:String(values.email??'').trim(),phone:normalisePhone(values.phone),message:String(values.message??'').trim()};
 const errors={};
 if(fields.name.length<2||fields.name.length>100)errors.name=words.errors.name;
 if(!fields.email||fields.email.length>254||!emailValid||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))errors.email=words.errors.email;
 if(fields.phone&&!ENGINE_PHONE.test(fields.phone))errors.phone=words.errors.phone;
 if(fields.message.length<2)errors.message=words.errors.message;
 else if(fields.message.length>words.message.maxlength)errors.message=words.errors.messageLong;
 return {fields,errors,valid:Object.keys(errors).length===0};
}

/** Show (or clear) one field's error: the words, the icon's row and the field's own state. */
export function paintFieldError(form,key,message){
 const row=form.querySelector(`[data-contact-error="${key}"]`),control=form.elements[key];
 if(row){
  const text=row.querySelector('[data-error-text]')||row;
  if(text.textContent!==message)text.textContent=message;
  if(row.hidden===!!message)row.hidden=!message;
 }
 if(control){if(message)control.setAttribute('aria-invalid','true');else control.removeAttribute('aria-invalid');}
}

/**
 * Check the form. With errors: each is shown under its field, the first field in question takes
 * the focus, and null is returned. Without: the payload for the engine.
 */
export function validateContact(form){
 const values=Object.fromEntries(FIELDS.map(key=>[key,form.elements[key].value]));
 const {fields,errors,valid}=checkContact(values,{emailValid:form.elements.email.validity?.valid!==false});
 for(const key of FIELDS)paintFieldError(form,key,errors[key]||'');
 if(!valid){form.elements[FIELDS.find(key=>errors[key])].focus();return null;}
 return {...fields,subject:'Website enquiry',source:'contact',kind:'contact'};
}

const ENGINE_CODES=Object.freeze(Object.keys(words.engine).filter(code=>code!=='interrupted'));
const byEngineSentence=new Map(ENGINE_CODES.map(code=>[messageFor({code}),code]));
/**
 * The engine reports a failure as its own English sentence. Find which answer it was, and say it
 * in the site's words: {code, words}. An empty sentence gives null; an unknown one is "interrupted".
 */
export function engineAnswer(sentence){
 if(!sentence)return null;
 const code=byEngineSentence.get(sentence)||'interrupted';
 return Object.freeze({code,words:words.engine[code]});
}

const CODE_SCREENS=Object.freeze(['code','expired','locked']);
const FIELD_SCREENS=Object.freeze(['opening','ready','sending','stalled']);
const INSTEAD_SCREENS=Object.freeze(['closed','failed','blocked']);
/** Answers on the code screen that the visitor settles there (type it again, ask for another): no "Try again". */
const SETTLED_ON_SCREEN=Object.freeze(['verification_incorrect','verification_changed','verification_expired','verification_limit','please_wait']);
/**
 * Everything the form shows, worked out from the facts (pure).
 *   policy     'pending' (not answered yet) · 'open' · 'closed' (the engine says messages are not
 *              being taken) · 'failed' (the form could not be opened for another reason)
 *   state      the engine controller's snapshot
 *   submitted  true once Send has been pressed on this page (the typed words are still in the fields)
 *   sentTo     the email address typed on this page, if any
 */
export function formView({policy='pending',state,submitted=false,sentTo=''}){
 const receipt=state.receipt||null,phase=receipt?.state||'',answer=engineAnswer(state.error);
 let name;
 if(state.blocked)name='blocked';
 else if(phase==='received')name='received';
 else if(phase==='locked')name='locked';
 else if(phase==='expired'||(phase==='awaiting_verification'&&state.expired))name='expired';
 else if(phase==='awaiting_verification')name='code';
 else if(state.started)name=submitted?(state.busy?'sending':'stalled'):'resuming';
 else if(policy==='closed')name='closed';
 else if(policy==='failed')name='failed';
 else if(policy!=='open')name='opening';
 else name=state.busy?'sending':'ready';

 const waiting=state.busy||state.waiting>0,left=receipt?receipt.sends_remaining:0;
 const codeScreen=CODE_SCREENS.includes(name),stalled=name==='stalled';
 // "Try again" repeats what the engine was last asked, or asks again whether the form may be opened.
 // A form that is switched off offers Call and WhatsApp, not another try. While a message waits
 // with its fields still showing (stalled), the sheet's main button itself reads "Try again".
 const retry=!stalled&&(name==='failed'||(!!state.retry&&name!=='received'&&name!=='closed'&&!(codeScreen&&SETTLED_ON_SCREEN.includes(answer?.code))));
 return Object.freeze({
  name,
  busy:!!state.busy,
  step:codeScreen?'code':name==='received'?'sent':INSTEAD_SCREENS.includes(name)?'':'write',
  status:words.status[name==='stalled'?'ready':name],
  alert:name==='blocked'?'':answer?.words||'',
  showFields:FIELD_SCREENS.includes(name),
  fieldsDisabled:name!=='ready',
  canSend:name==='ready'||(stalled&&!waiting),
  sendRetries:stalled,
  sendLabel:name==='sending'?words.sending:stalled?words.retry:words.send,
  showCode:codeScreen,
  codeEntry:name==='code',
  codeTitle:name==='expired'?words.code.expiredTitle:name==='locked'?words.code.lockedTitle:words.code.title,
  codeText:name==='expired'?(left>0?words.code.expiredText:words.code.noneLeft):name==='locked'?(left>0?words.code.lockedText:words.code.noneLeft):words.code.sentTo(sentTo),
  codeInvalid:name==='code'&&answer?.code==='verification_incorrect',
  verifyDisabled:waiting||name!=='code',
  showResend:codeScreen&&left>0,
  resendDisabled:waiting||state.resendWait>0||left<=0,
  countdown:codeScreen&&left>0&&state.resendWait>0?words.code.countdown(state.resendWait):'',
  // "No more codes" is already the screen's own sentence once a code has expired or been locked.
  remaining:codeScreen&&(left>0||name==='code')?words.code.remaining(left):'',
  panel:name==='received'||INSTEAD_SCREENS.includes(name)?name:'',
  instead:INSTEAD_SCREENS.includes(name),
  showRetry:retry,
  retryLabel:words.retry,
  retryDisabled:waiting,
  showCheck:!retry&&name==='resuming',
  checkDisabled:waiting,
  showRestart:name==='received',
  restartDisabled:waiting
 });
}

const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
const setHidden=(node,hidden)=>{if(node&&node.hidden!==hidden)node.hidden=hidden;};
const setDisabled=(node,disabled)=>{if(node&&node.disabled!==disabled)node.disabled=disabled;};
/**
 * Switch a button off, or back on, without taking it out of the keyboard's path: a button that
 * holds the focus keeps it while the engine is asked, so the focus never falls to the page.
 */
export function setOff(node,off){
 if(!node)return;
 if(off){if(node.getAttribute('aria-disabled')!=='true')node.setAttribute('aria-disabled','true');}
 else if(node.hasAttribute('aria-disabled'))node.removeAttribute('aria-disabled');
}
/** Is this button switched off just now? A missing button counts as off. */
export const isOff=node=>!node||node.getAttribute('aria-disabled')==='true';

/** Put the form into a view. Writes only what changed, so nothing is announced twice. */
export function paintForm(form,view){
 const find=key=>form.querySelector(`[data-contact-${key}]`);
 const shell=form.closest?.('[data-message-form]')||form;
 if(shell.getAttribute('data-state')!==view.name)shell.setAttribute('data-state',view.name);
 for(const step of shell.querySelectorAll('[data-message-step]')){
  const current=step.getAttribute('data-message-step')===view.step;
  if(current)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');
 }
 setHidden(shell.querySelector('[data-message-steps]'),!view.step);
 setText(find('status'),view.status);
 setText(find('error-summary'),view.alert);setHidden(find('error-summary'),!view.alert);setHidden(find('alert'),!view.alert);
 setHidden(find('fields'),!view.showFields);setDisabled(find('fields'),view.fieldsDisabled);
 setHidden(find('compose'),!view.showFields);setOff(find('send'),!view.canSend);setText(find('send-label'),view.sendLabel);
 setHidden(find('verification'),!view.showCode);
 setText(find('code-title'),view.codeTitle);setText(find('sent-to'),view.codeText);
 setHidden(find('code-entry'),!view.codeEntry);
 // The code field takes digits whenever its screen is shown, also while the engine is being asked.
 setOff(find('verify'),view.verifyDisabled);setDisabled(form.elements.code,!view.codeEntry);
 setHidden(find('resend'),!view.showResend);setOff(find('resend'),view.resendDisabled);
 setText(find('countdown'),view.countdown);setText(find('remaining'),view.remaining);
 for(const panel of form.querySelectorAll('[data-contact-panel]'))setHidden(panel,panel.getAttribute('data-contact-panel')!==view.panel);
 setHidden(find('instead'),!view.instead);
 setHidden(find('retry'),!view.showRetry);setOff(find('retry'),view.retryDisabled);setText(find('retry-label'),view.retryLabel);
 setHidden(find('check'),!view.showCheck);setOff(find('check'),view.checkDisabled);
 setHidden(find('restart'),!view.showRestart);setOff(find('restart'),view.restartDisabled);
}

/**
 * Where the focus belongs on a screen (pure): the next thing the visitor needs. A name for
 * `focusNode`, or '' while there is nothing to move to yet (opening, sending).
 */
export function focusTarget(view){
 switch(view.name){
  case 'code':return view.showRetry?'retry':'code';
  case 'expired':case 'locked':return view.showRetry?'retry':'code-title';
  case 'stalled':return 'send';
  case 'ready':return view.alert?'alert':'name';
  case 'resuming':return view.showRetry?'retry':'check';
  case 'failed':return 'retry';
  case 'received':case 'closed':case 'blocked':return 'panel-title';
  default:return '';
 }
}

/** The element a focus target names, on this form and this screen (or null). */
export function focusNode(form,view){
 const target=focusTarget(view);
 if(!target)return null;
 if(target==='code'||target==='name')return form.elements[target]||null;
 if(target==='panel-title')return form.querySelector(`[data-contact-panel="${view.panel}"]`)?.querySelector('[data-contact-panel-title]')||null;
 return form.querySelector(`[data-contact-${target}]`);
}

/** Has this control left the visitor's reach: hidden, switched off, or inside the switched-off fields? */
export function controlGone(node){
 return !!(node.disabled||node.closest('[hidden]')||node.closest('[data-contact-fields]')?.disabled);
}

/** The engine for this installation. `__BOOKING_PROFILE__` is put in by the build (vite.config.js). */
function installedEngine(profile=__BOOKING_PROFILE__){
 return createEnquiryBrowser({version:1,installation_id:profile.installation_id,environment:profile.environment,channels:{contact:{legacy_receipts:[]}}});
}

export function bindContactForm(form,{signal,profile,browser,api=createEnquiryAPI()}={}){
 if(!form)return()=>{};
 const controller=(browser||installedEngine(profile)).controller('contact');
 const find=key=>form.querySelector(`[data-contact-${key}]`),code=form.elements.code;
 let policy='pending',alive=true,checking=false,submitted=false,sentTo='',codeShort=false,wants=false;
 const dispose=()=>{if(!alive)return;alive=false;unsubscribe();stop();};
 const viewNow=()=>formView({policy,state:controller.getSnapshot(),submitted,sentTo});
 /** What holds the focus, if it is inside this form. */
 const held=()=>{const node=form.ownerDocument?.activeElement;return node&&node.closest?.('[data-contact-form]')===form?node:null;};
 function update(){
  if(!alive)return;
  const before=held(),view=viewNow();
  paintForm(form,view);
  // The code field is in question when it was sent short, or when the engine says it did not match
  // (those words are in the alert row; under the field only "enter all six digits" is said).
  paintFieldError(form,'code',codeShort&&view.codeEntry?words.errors.code:'');
  if(view.codeInvalid)code.setAttribute('aria-invalid','true');
  // The focus follows the visitor: after something they did (`wants`), and when the control they
  // were on has just left the screen. It waits until the engine has answered.
  if(before&&controlGone(before))wants=true;
  if(!wants||view.busy)return;
  wants=false;
  const next=focusNode(form,view);
  if(next&&next!==held())next.focus();
 }
 const unsubscribe=controller.subscribe(update),stop=controller.start();
 /** One thing the visitor did. When it has run its course the focus goes to the next thing they need. */
 async function act(work){
  wants=true;
  try{await work();}finally{update();}
 }
 /** Ask the engine whether messages are being taken. "Not being taken" is an answer, not a failure. */
 async function prepare(){
  if(checking||!alive)return;
  checking=true;
  try{await api.policy(signal);if(alive)policy='open';}
  catch(error){if(alive)policy=error?.code==='contact_unavailable'?'closed':'failed';}
  finally{checking=false;update();}
 }
 /** "Confirm and send": by its button, or by Enter in the code field. A short code is stopped here. */
 function confirmCode(){
  if(!viewNow().codeEntry||isOff(find('verify')))return undefined;
  if(!/^[0-9]{6}$/.test(code.value)){codeShort=true;update();code.focus();return undefined;}
  codeShort=false;
  const value=code.value;code.value='';
  return act(()=>controller.verify(value));
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const view=viewNow();
  // On the code screen the form's own submit (Enter, or a phone keyboard's send key) checks the code.
  if(view.codeEntry)return void confirmCode();
  if(!view.canSend)return undefined;
  // A message that is still waiting: the main button reads "Try again" and repeats the request.
  if(view.sendRetries)return void act(()=>controller.retryRequest());
  const payload=validateContact(form);
  if(!payload)return undefined;
  submitted=true;sentTo=payload.email;
  // The fields are switched off while the message is sent: a field that holds the focus hands it to the button.
  if(held()?.closest('[data-contact-fields]'))find('send').focus();
  return void act(()=>controller.submit(payload));
 },{signal});
 // Enter in the code field always means "Confirm and send".
 code.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||event.isComposing)return;
  event.preventDefault();void confirmCode();
 },{signal});
 // An error under a field goes as soon as the field is corrected.
 form.addEventListener('input',event=>{
  const key=event.target?.name;
  if(key==='code'){if(codeShort&&/^[0-9]{6}$/.test(code.value)){codeShort=false;update();}return;}
  if(!FIELDS.includes(key)||form.elements[key].getAttribute('aria-invalid')!=='true')return;
  const values=Object.fromEntries(FIELDS.map(name=>[name,form.elements[name].value]));
  const {errors}=checkContact(values,{emailValid:form.elements.email.validity?.valid!==false});
  if(!errors[key])paintFieldError(form,key,'');
 },{signal});
 /** A button of the form: it does nothing while it is switched off. */
 const press=(key,work)=>find(key).addEventListener('click',()=>{if(!isOff(find(key)))void work();},{signal});
 press('verify',()=>confirmCode());
 press('resend',()=>{code.value='';codeShort=false;return act(()=>controller.resend());});
 press('check',()=>act(()=>controller.check()));
 // "Try again" repeats what the engine was last asked; when the form itself could not be opened, it asks again.
 press('retry',()=>act(()=>controller.getSnapshot().retry?controller.retryRequest():prepare()));
 press('restart',()=>act(async()=>{
  if(await controller.restart()){form.reset();submitted=false;sentTo='';}
 }));
 signal?.addEventListener('abort',dispose,{once:true});
 // Handlers now own these controls; the fieldset and update() keep them unavailable until the
 // engine's answer and the controller's state permit their use.
 form.querySelectorAll('[data-unbound-control]').forEach(control=>{control.disabled=false;control.removeAttribute('data-unbound-control');});
 update();void prepare();return dispose;
}
