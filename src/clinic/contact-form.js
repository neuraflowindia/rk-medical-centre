// The Contact message form's logic. The booking engine owns the exchange (start, the emailed
// six-digit code, resend, status); this file decides which screen the form shows at each moment
// and says everything in the site's own words (clinic/page-content/contact.mjs).
//
//   validateContact   reads and checks the four fields; an Indian number typed the ordinary way is accepted
//   engineAnswer      the engine's sentence → the engine's code → the site's sentence
//   formView          pure: everything the form shows, from the engine's state
//   bindContactForm   the wiring: listens, paints, and stops when `signal` aborts
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
 const codeScreen=CODE_SCREENS.includes(name);
 // "Try again" repeats what the engine was last asked, or asks again whether the form may be opened.
 // A form that is switched off offers Call and WhatsApp, not another try.
 const retry=name==='failed'||(!!state.retry&&name!=='received'&&name!=='closed'&&!(codeScreen&&SETTLED_ON_SCREEN.includes(answer?.code)));
 return Object.freeze({
  name,
  step:codeScreen?'code':name==='received'?'sent':INSTEAD_SCREENS.includes(name)?'':'write',
  status:words.status[name==='stalled'?'ready':name],
  alert:name==='blocked'?'':answer?.words||'',
  showFields:FIELD_SCREENS.includes(name),
  fieldsDisabled:name!=='ready',
  canSend:name==='ready',
  sendLabel:name==='sending'?words.sending:words.send,
  showCode:codeScreen,
  codeEntry:name==='code',
  codeTitle:name==='expired'?words.code.expiredTitle:name==='locked'?words.code.lockedTitle:words.code.title,
  codeText:name==='expired'?(left>0?words.code.expiredText:words.code.noneLeft):name==='locked'?(left>0?words.code.lockedText:words.code.noneLeft):words.code.sentTo(sentTo),
  codeInvalid:name==='code'&&answer?.code==='verification_incorrect',
  verifyDisabled:waiting||name!=='code',
  showResend:codeScreen&&left>0,
  resendDisabled:waiting||state.resendWait>0||left<=0,
  countdown:codeScreen&&left>0&&state.resendWait>0?words.code.countdown(state.resendWait):'',
  remaining:codeScreen?words.code.remaining(left):'',
  panel:name==='received'||INSTEAD_SCREENS.includes(name)?name:'',
  instead:INSTEAD_SCREENS.includes(name),
  showRetry:retry,
  retryLabel:words.retry,
  retryDisabled:waiting,
  showCheck:!retry&&name==='resuming',
  checkDisabled:waiting,
  showRestart:name==='received',
  restartDisabled:state.busy
 });
}

const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
const setHidden=(node,hidden)=>{if(node&&node.hidden!==hidden)node.hidden=hidden;};
const setDisabled=(node,disabled)=>{if(node&&node.disabled!==disabled)node.disabled=disabled;};

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
 setHidden(find('compose'),!view.showFields);setDisabled(find('send'),!view.canSend);setText(find('send-label'),view.sendLabel);
 setHidden(find('verification'),!view.showCode);
 setText(find('code-title'),view.codeTitle);setText(find('sent-to'),view.codeText);
 setHidden(find('code-entry'),!view.codeEntry);
 setDisabled(find('verify'),view.verifyDisabled);setDisabled(form.elements.code,view.verifyDisabled);
 setHidden(find('resend'),!view.showResend);setDisabled(find('resend'),view.resendDisabled);
 setText(find('countdown'),view.countdown);setText(find('remaining'),view.remaining);
 for(const panel of form.querySelectorAll('[data-contact-panel]'))setHidden(panel,panel.getAttribute('data-contact-panel')!==view.panel);
 setHidden(find('instead'),!view.instead);
 setHidden(find('retry'),!view.showRetry);setDisabled(find('retry'),view.retryDisabled);setText(find('retry-label'),view.retryLabel);
 setHidden(find('check'),!view.showCheck);setDisabled(find('check'),view.checkDisabled);
 setHidden(find('restart'),!view.showRestart);setDisabled(find('restart'),view.restartDisabled);
}

/** Where the focus goes when the form moves from one screen to another (pure): a hook name or ''. */
export function focusAfter(previous,next){
 if(previous===next||!previous)return '';
 if(next==='code'&&(previous==='sending'||previous==='expired'||previous==='locked'))return 'code';
 if(next==='received')return 'received';
 if((next==='expired'||next==='locked')&&previous==='code')return 'code-title';
 return '';
}

/** The engine for this installation. `__BOOKING_PROFILE__` is put in by the build (vite.config.js). */
function installedEngine(profile=__BOOKING_PROFILE__){
 return createEnquiryBrowser({version:1,installation_id:profile.installation_id,environment:profile.environment,channels:{contact:{legacy_receipts:[]}}});
}

export function bindContactForm(form,{signal,profile,browser,api=createEnquiryAPI()}={}){
 if(!form)return()=>{};
 const controller=(browser||installedEngine(profile)).controller('contact');
 const find=key=>form.querySelector(`[data-contact-${key}]`),code=form.elements.code;
 let policy='pending',alive=true,checking=false,submitted=false,sentTo='',shown='',codeShort=false;
 const dispose=()=>{if(!alive)return;alive=false;unsubscribe();stop();};
 function update(){
  if(!alive)return;
  const view=formView({policy,state:controller.getSnapshot(),submitted,sentTo});
  paintForm(form,view);
  // The code field is in question when it was sent short, or when the engine says it did not match
  // (those words are in the alert row; under the field only "enter all six digits" is said).
  paintFieldError(form,'code',codeShort&&view.codeEntry?words.errors.code:'');
  if(view.codeInvalid)code.setAttribute('aria-invalid','true');
  const target=focusAfter(shown,view.name);shown=view.name;
  if(target==='code')code.focus();
  else if(target)find(target==='received'?'received-title':target)?.focus();
 }
 const unsubscribe=controller.subscribe(update),stop=controller.start();
 /** Ask the engine whether messages are being taken. "Not being taken" is an answer, not a failure. */
 async function prepare(){
  if(checking||!alive)return;
  checking=true;
  try{await api.policy(signal);if(alive)policy='open';}
  catch(error){if(alive)policy=error?.code==='contact_unavailable'?'closed':'failed';}
  finally{checking=false;update();}
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(policy!=='open'||find('fields').disabled)return;
  const payload=validateContact(form);
  if(!payload)return;
  submitted=true;sentTo=payload.email;
  void controller.submit(payload);
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
 find('verify').addEventListener('click',async()=>{
  if(!/^[0-9]{6}$/.test(code.value)){codeShort=true;update();code.focus();return;}
  codeShort=false;
  const value=code.value;code.value='';
  await controller.verify(value);
 },{signal});
 find('resend').addEventListener('click',()=>{code.value='';codeShort=false;void controller.resend();},{signal});
 find('check').addEventListener('click',()=>void controller.check(),{signal});
 // "Try again" repeats what the engine was last asked; when the form itself could not be opened, it asks again.
 find('retry').addEventListener('click',()=>controller.getSnapshot().retry?void controller.retryRequest():void prepare(),{signal});
 find('restart').addEventListener('click',async()=>{
  if(await controller.restart()){form.reset();submitted=false;sentTo='';update();form.elements.name.focus();}
 },{signal});
 signal?.addEventListener('abort',dispose,{once:true});
 // Handlers now own these controls; the fieldset and update() keep them unavailable until the
 // engine's answer and the controller's state permit their use.
 form.querySelectorAll('[data-unbound-control]').forEach(control=>{control.disabled=false;control.removeAttribute('data-unbound-control');});
 update();void prepare();return dispose;
}

// The old page's form markup. It is read only by the old presentation layer (contact-page.js),
// which is no longer shown, and goes with it in the deletion commit before the merge.
export function contactFormMarkup(){return `<form class="form-panel" data-contact-form method="post" novalidate aria-label="Ask the clinic" aria-describedby="contact-collection">
<fieldset data-contact-fields disabled><legend class="sr-only">Your contact details and question</legend>${[['name','Full name','text','name',100],['email','Email address','email','email',254],['phone','Phone number','tel','tel',32]].map(([name,label,type,auto,max])=>`<label for="contact-${name}">${label} <span>(${name==='phone'?'optional':'required'})</span><input id="contact-${name}" name="${name}" type="${type}" autocomplete="${auto}" maxlength="${max}" ${name==='phone'?'':'required'} aria-describedby="contact-${name}-error${name==='phone'?' contact-phone-hint':''}"><span class="field-error" id="contact-${name}-error" data-contact-error="${name}"></span></label>`).join('')}<p id="contact-phone-hint" class="field-hint">If you leave a phone number, include the country code, such as +91.</p><label for="contact-message">Your question <span>(required)</span><textarea id="contact-message" name="message" rows="4" required minlength="2" maxlength="4000" aria-describedby="contact-message-error"></textarea><span class="field-error" id="contact-message-error" data-contact-error="message"></span></label><button class="button" type="submit">Send message <span aria-hidden="true">↗</span></button></fieldset>
<p id="contact-collection" class="field-hint">The clinic uses your details to answer your question. We will email a six-digit code to check your address. <button class="text-link" type="button" data-collection-notice>How your details are used</button></p>
<p data-contact-status role="status" aria-live="polite">Opening the message form…</p><p data-contact-error-summary role="alert" hidden></p>
<div data-contact-verification hidden><label for="contact-code">Six-digit email code<input id="contact-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="contact-code-help"></label><p id="contact-code-help">Enter the code sent to your email address.</p><button class="button" type="button" data-contact-verify>Check code</button><button class="text-link" type="button" data-contact-resend>Send another code</button><span data-contact-countdown></span></div>
<div class="actions"><button class="text-link" type="button" data-contact-check hidden>Check message status</button><button class="text-link" type="button" data-contact-retry hidden>Try again</button><button class="text-link" type="button" data-contact-restart hidden>Ask another question</button></div></form>`;}
