// The message form's logic: what is accepted, which screen is shown, and the wiring. The wiring
// is driven against the real template (read into small stand-in elements) and a pretend engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalisePhone,checkContact,validateContact,engineAnswer,formView,paintForm,paintFieldError,focusTarget,focusNode,controlGone,setOff,isOff,bindContactForm,contactFormMarkup} from '../../src/clinic/contact-form.js';
import {messageForm as words} from '../../src/clinic/page-content/contact.mjs';
import {messageFor} from '../../appointment-system/browser/enquiry/messages.mjs';
import {messageForm} from '../../src/site/pages/contact/message-form.mjs';
import {pageContext} from '../../src/site/runtime/render.mjs';

// ---------- small stand-in elements, built from real markup ----------
const VOID=new Set(['input','img','br','use','path','hr']);
function matcher(selector){
 const tests=selector.split(',').map(part=>{
  const found=/^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(part.trim());
  if(!found)throw new Error('The stand-in elements only know [name] and [name="value"]: '+selector);
  return node=>node.hasAttribute(found[1])&&(found[2]===undefined||node.getAttribute(found[1])===found[2]);
 });
 return node=>tests.some(match=>match(node));
}
const FOCUSABLE=new Set(['input','textarea','button','a','summary']);
function element(tag,attributes,focusLog,doc){
 const listeners=[];
 return {tag,attributes,children:[],parent:null,textContent:'',value:'',ownerDocument:doc,
  get hidden(){return Object.hasOwn(attributes,'hidden');},
  set hidden(on){if(on)attributes.hidden='';else delete attributes.hidden;},
  get disabled(){return Object.hasOwn(attributes,'disabled');},
  set disabled(on){if(on)attributes.disabled='';else delete attributes.disabled;},
  get name(){return attributes.name;},
  validity:{valid:true},
  getAttribute(name){return Object.hasOwn(attributes,name)?attributes[name]:null;},
  setAttribute(name,value){attributes[name]=String(value);},
  removeAttribute(name){delete attributes[name];},
  hasAttribute(name){return Object.hasOwn(attributes,name);},
  addEventListener(type,handler,{signal}={}){
   const entry={type,handler};listeners.push(entry);
   signal?.addEventListener('abort',()=>listeners.splice(listeners.indexOf(entry),1),{once:true});
  },
  listeners:type=>listeners.filter(entry=>entry.type===type).length,
  async dispatch(type,event={}){
   const full={preventDefault(){full.defaultPrevented=true;},target:this,...event};
   for(const entry of listeners.filter(item=>item.type===type))await entry.handler(full);
   return full;
  },
  // As in a browser: only something that can take the focus, is switched on and is on screen takes it.
  focus(){
   if(!FOCUSABLE.has(tag)&&!Object.hasOwn(attributes,'tabindex'))return;
   for(let node=this;node;node=node.parent)if(node.hidden||(node.disabled&&(node===this||node.tag==='fieldset')))return;
   doc.activeElement=this;focusLog.push(this);
  },
  all(){return this.children.flatMap(child=>[child,...child.all()]);},
  querySelector(selector){const match=matcher(selector);return this.all().find(match)||null;},
  querySelectorAll(selector){const match=matcher(selector);return this.all().filter(match);},
  closest(selector){const match=matcher(selector);for(let node=this;node;node=node.parent)if(match(node))return node;return null;},
  reset(){for(const control of this.all().filter(node=>node.tag==='input'||node.tag==='textarea'))control.value='';this.wasReset=true;}
 };
}
/** Read markup into stand-in elements. Returns the root's first element. */
function build(html,focusLog=[],doc={activeElement:null}){
 const root=element('root',{},focusLog,doc);let current=root;
 for(const token of html.match(/<[^>]+>|[^<]+/g)){
  if(token.startsWith('</')){current=current.parent;continue;}
  if(!token.startsWith('<')){if(!current.children.length)current.textContent+=token;continue;}
  const [,tag,rest]=/^<([a-z0-9]+)([^>]*?)\/?>$/i.exec(token);
  const attributes={};
  for(const [,name,value] of rest.matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attributes[name]=value??'';
  const node=element(tag.toLowerCase(),attributes,focusLog,doc);
  node.parent=current;current.children.push(node);
  if(!VOID.has(node.tag))current=node;
 }
 return root.children[0];
}
/** The real message form as stand-in elements: {shell, form, focusLog}. */
function realForm(){
 const focusLog=[],doc={activeElement:null},shell=build(messageForm(pageContext({path:'/contact',mode:'on',now:new Date('2026-11-16T05:30:00Z')})),focusLog,doc);
 const form=shell.querySelector('[data-contact-form]');
 form.elements=Object.fromEntries(form.all().filter(node=>(node.tag==='input'||node.tag==='textarea')&&node.name).map(node=>[node.name,node]));
 return {shell,form,focusLog,doc};
}
const IDLE=Object.freeze({receipt:null,busy:false,error:'',started:false,blocked:false,retry:null,waiting:0,resendWait:0,expired:false});
/** A pretend engine controller: the test sets its state and sees what was asked of it. */
function pretendEngine(initial={}){
 let state={...IDLE,...initial};const listeners=new Set(),calls=[],asked=[];
 const set=change=>{state={...state,...change};for(const listener of [...listeners])listener();};
 // Like the real engine, each request is answered later: its promise settles when the test calls answer().
 const ask=call=>{calls.push(call);return new Promise(resolve=>asked.push(resolve));};
 const controller={
  getSnapshot:()=>state,
  subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);calls.push('unsubscribe');};},
  start(){calls.push('start');return()=>calls.push('stop');},
  submit:payload=>ask(['submit',payload]),
  check:()=>ask('check'),
  verify:code=>ask(['verify',code]),
  resend:()=>ask('resend'),
  retryRequest:()=>ask('retryRequest'),
  // "Write another message": when the engine agrees, the finished message is let go.
  restart(){calls.push('restart');if(controller.restartAnswer)set({receipt:null,started:false,retry:null,error:''});return Promise.resolve(controller.restartAnswer);},
  restartAnswer:true
 };
 return {controller,calls,browser:{controller:()=>controller},set,listeners,
  /** The engine has answered: its state changes, it is idle again, and whoever asked is told. */
  async answer(change={}){set({...change,busy:false});for(const resolve of asked.splice(0))resolve();await settle();}};
}
const receipt=(state,more={})=>({code:'ok',request_id:'r',state,generation:1,sends_remaining:2,verification_delivery:'accepted',
 server_now:'2026-11-16T05:30:00Z',code_expires_at:'2026-11-16T05:40:00Z',resend_after:'2026-11-16T05:31:00Z',...more});
const policyOpen={policy:async()=>({version:1,receipt_key_id:'k'})};
const policyClosed={policy:async()=>{const error=new Error('contact_unavailable');error.code='contact_unavailable';throw error;}};
const policyBroken={policy:async()=>{throw new Error('offline');}};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function bound({api=policyOpen,initial={}}={}){
 const parts=realForm(),engine=pretendEngine(initial),abort=new AbortController();
 const dispose=bindContactForm(parts.form,{signal:abort.signal,browser:engine.browser,api});
 await settle();
 return {...parts,engine,abort,dispose,state:()=>parts.shell.getAttribute('data-state'),find:key=>parts.form.querySelector(`[data-contact-${key}]`)};
}
function fill(form,values){for(const [key,value] of Object.entries(values))form.elements[key].value=value;}
const good={name:'Asha Verma',email:'asha@example.com',phone:'94150 49410',message:'Is the clinic open on Diwali?'};

// ---------- what is accepted ----------
test('an Indian number typed the ordinary way gains +91; anything else is left as typed',()=>{
 assert.equal(normalisePhone('94150 49410'),'+919415049410');
 assert.equal(normalisePhone('094150-49410'),'+919415049410');
 assert.equal(normalisePhone('91 94150 49410'),'+919415049410');
 assert.equal(normalisePhone('(98386) 55095'),'+919838655095');
 assert.equal(normalisePhone('+44 20 7946 0958'),'+44 20 7946 0958');
 assert.equal(normalisePhone(''),'');assert.equal(normalisePhone(null),'');assert.equal(normalisePhone('  '),'');
 assert.equal(normalisePhone('12345'),'12345','too short to be completed');
 assert.equal(normalisePhone('2345678901'),'2345678901','not an Indian mobile number');
 assert.equal(normalisePhone('call me'),'call me');
});

test('the four fields are checked, and each fault has its own words',()=>{
 assert.deepEqual(checkContact(good),{fields:{name:'Asha Verma',email:'asha@example.com',phone:'+919415049410',message:good.message},errors:{},valid:true});
 assert.equal(checkContact({...good,phone:''}).valid,true,'the phone number is optional');
 const empty=checkContact({});
 assert.deepEqual(empty.errors,{name:words.errors.name,email:words.errors.email,message:words.errors.message});
 assert.equal(checkContact({...good,name:'A'}).errors.name,words.errors.name);
 assert.equal(checkContact({...good,name:'A'.repeat(101)}).errors.name,words.errors.name);
 assert.equal(checkContact({...good,email:'asha@example'}).errors.email,words.errors.email);
 assert.equal(checkContact({...good,email:'a@b.co'},{emailValid:false}).errors.email,words.errors.email,'the browser\'s own check counts');
 assert.equal(checkContact({...good,email:'a'.repeat(250)+'@b.co'}).errors.email,words.errors.email);
 assert.equal(checkContact({...good,phone:'12345'}).errors.phone,words.errors.phone);
 assert.equal(checkContact({...good,phone:'+91'}).errors.phone,words.errors.phone);
 assert.equal(checkContact({...good,message:'x'}).errors.message,words.errors.message);
 assert.equal(checkContact({...good,message:'x'.repeat(4001)}).errors.message,words.errors.messageLong);
});

test('validateContact shows each fault under its field, moves to the first, and builds the engine\'s payload',()=>{
 const {form,focusLog}=realForm();
 form.querySelector('[data-contact-fields]').disabled=false; // the fields are open, as they are once messages are taken
 fill(form,{name:'',email:'nope',phone:'12',message:''});
 assert.equal(validateContact(form),null);
 for(const key of ['name','email','phone','message']){
  const row=form.querySelector(`[data-contact-error="${key}"]`);
  assert.equal(row.hidden,false,key);assert.ok(row.querySelector('[data-error-text]').textContent.length>10);
  assert.equal(form.elements[key].getAttribute('aria-invalid'),'true');
 }
 assert.equal(focusLog.at(-1),form.elements.name);
 fill(form,good);
 assert.deepEqual(validateContact(form),{name:'Asha Verma',email:'asha@example.com',phone:'+919415049410',message:good.message,subject:'Website enquiry',source:'contact',kind:'contact'});
 for(const key of ['name','email','phone','message']){
  assert.equal(form.querySelector(`[data-contact-error="${key}"]`).hidden,true);
  assert.equal(form.elements[key].hasAttribute('aria-invalid'),false);
 }
 // A row without the inner text holder still shows its words; a missing row or field is passed over.
 const bare=build('<form><p data-contact-error="x" hidden></p></form>');bare.elements={};
 paintFieldError(bare,'x','Wrong');assert.equal(bare.querySelector('[data-contact-error="x"]').textContent,'Wrong');
 paintFieldError(bare,'y','Wrong');
});

// ---------- the engine's answers ----------
test('the engine\'s sentences are recognised and said in the site\'s own words',()=>{
 assert.equal(engineAnswer(''),null);
 for(const code of ['contact_unavailable','invalid_request','verification_incorrect','verification_changed','verification_expired','verification_limit','please_wait',
  'access_unavailable','request_conflict','receipt_conflict','receipt_unavailable','storage_unavailable','invalid_response']){
  assert.deepEqual({...engineAnswer(messageFor({code}))},{code,words:words.engine[code]},code);
 }
 assert.deepEqual({...engineAnswer(messageFor({code:'something_new'}))},{code:'interrupted',words:words.engine.interrupted});
});

// ---------- which screen ----------
test('the screen follows the engine\'s state (pure)',()=>{
 const view=(state,more={})=>formView({policy:'open',state:{...IDLE,...state},...more});
 assert.equal(formView({state:IDLE}).name,'opening');
 assert.equal(formView({policy:'pending',state:IDLE}).canSend,false);
 const ready=view({});
 assert.deepEqual([ready.name,ready.step,ready.showFields,ready.fieldsDisabled,ready.canSend,ready.sendLabel,ready.status],['ready','write',true,false,true,words.send,'']);
 const sending=view({busy:true});
 assert.deepEqual([sending.name,sending.fieldsDisabled,sending.canSend,sending.sendLabel,sending.status],['sending',true,false,words.sending,words.status.sending]);
 assert.deepEqual([ready.busy,sending.busy],[false,true]);
 assert.equal(view({busy:true,started:true},{submitted:true}).name,'sending');
 const stalled=view({started:true,retry:'start',error:messageFor({code:'contact_unavailable'})},{submitted:true});
 // A message still waiting with its fields showing: the main button itself reads "Try again", in Send's place.
 assert.deepEqual([stalled.name,stalled.showFields,stalled.fieldsDisabled,stalled.showRetry,stalled.canSend,stalled.sendRetries,stalled.sendLabel,stalled.alert,stalled.showCheck],
  ['stalled',true,true,false,true,true,words.retry,words.engine.contact_unavailable,false]);
 assert.equal(view({started:true,retry:'start',waiting:9},{submitted:true}).canSend,false,'not while the engine asks for a wait');
 assert.equal(ready.sendRetries,false);
 const resuming=view({started:true});
 assert.deepEqual([resuming.name,resuming.showFields,resuming.showCheck,resuming.status],['resuming',false,true,words.status.resuming]);
 assert.equal(view({started:true,busy:true}).checkDisabled,true);

 const code=view({started:true,receipt:receipt('awaiting_verification'),resendWait:42},{sentTo:'asha@example.com'});
 assert.deepEqual([code.name,code.step,code.showFields,code.showCode,code.codeEntry,code.verifyDisabled,code.showResend,code.resendDisabled],['code','code',false,true,true,false,true,true]);
 assert.equal(code.codeTitle,words.code.title);assert.equal(code.codeText,words.code.sentTo('asha@example.com'));
 assert.equal(code.countdown,words.code.countdown(42));assert.equal(code.remaining,words.code.remaining(2));
 assert.equal(view({started:true,receipt:receipt('awaiting_verification')}).resendDisabled,false);
 assert.equal(view({started:true,receipt:receipt('awaiting_verification'),waiting:5}).verifyDisabled,true);
 const none=view({started:true,receipt:receipt('awaiting_verification',{generation:3,sends_remaining:0})});
 assert.deepEqual([none.showResend,none.countdown,none.remaining],[false,'',words.code.remaining(0)]);
 const wrong=view({started:true,receipt:receipt('awaiting_verification'),error:messageFor({code:'verification_incorrect'}),retry:'status'});
 assert.deepEqual([wrong.name,wrong.codeInvalid,wrong.alert,wrong.showRetry],['code',true,words.engine.verification_incorrect,false]);
 // A lost connection on the code screen does offer "Try again".
 assert.equal(view({started:true,receipt:receipt('awaiting_verification'),error:messageFor({code:'nothing_known'}),retry:'status'}).showRetry,true);

 const expired=view({started:true,receipt:receipt('awaiting_verification'),expired:true});
 assert.deepEqual([expired.name,expired.codeEntry,expired.codeTitle,expired.codeText,expired.showResend,expired.showCheck],['expired',false,words.code.expiredTitle,words.code.expiredText,true,false]);
 assert.equal(view({started:true,receipt:receipt('expired',{sends_remaining:0,generation:3})}).codeText,words.code.noneLeft);
 const locked=view({started:true,receipt:receipt('locked')});
 assert.deepEqual([locked.name,locked.codeTitle,locked.codeText,locked.status],['locked',words.code.lockedTitle,words.code.lockedText,words.status.locked]);
 assert.equal(view({started:true,receipt:receipt('locked',{sends_remaining:0,generation:3})}).codeText,words.code.noneLeft);

 const received=view({started:true,receipt:receipt('received'),retry:'status'});
 assert.deepEqual([received.name,received.step,received.panel,received.showRestart,received.showRetry,received.showCode],['received','sent','received',true,false,false]);

 const closed=formView({policy:'closed',state:IDLE});
 assert.deepEqual([closed.name,closed.step,closed.panel,closed.instead,closed.showFields,closed.showRetry,closed.showCheck],['closed','','closed',true,false,false,false]);
 const failed=formView({policy:'failed',state:IDLE});
 assert.deepEqual([failed.name,failed.panel,failed.instead,failed.showRetry,failed.retryLabel],['failed','failed',true,true,words.retry]);
 const blocked=formView({policy:'open',state:{...IDLE,blocked:true,error:messageFor({code:'storage_unavailable'})}});
 assert.deepEqual([blocked.name,blocked.panel,blocked.instead,blocked.alert,blocked.showRetry],['blocked','blocked',true,'',false]);
 // A message already waiting is shown even while new messages are closed.
 assert.equal(formView({policy:'closed',state:{...IDLE,started:true,receipt:receipt('awaiting_verification')}}).name,'code');
});

test('where the focus belongs on each screen: the next thing the visitor needs (pure)',()=>{
 const view=(state,more={})=>formView({policy:'open',state:{...IDLE,...state},...more});
 assert.equal(focusTarget(formView({state:IDLE})),'','opening: nothing to move to yet');
 assert.equal(focusTarget(view({busy:true})),'','sending: the focus waits on the button');
 assert.equal(focusTarget(view({})),'name');
 assert.equal(focusTarget(view({error:messageFor({code:'invalid_request'})})),'alert','the engine sent the details back: the error');
 assert.equal(focusTarget(view({started:true,retry:'start',error:messageFor({code:'contact_unavailable'})},{submitted:true})),'send','stalled: the button that tries again');
 const waiting=receipt('awaiting_verification');
 assert.equal(focusTarget(view({started:true,receipt:waiting})),'code');
 assert.equal(focusTarget(view({started:true,receipt:waiting,error:messageFor({code:'verification_incorrect'}),retry:'status'})),'code','a wrong code: the code field again');
 assert.equal(focusTarget(view({started:true,receipt:waiting,waiting:20,error:messageFor({code:'please_wait'})})),'code');
 assert.equal(focusTarget(view({started:true,receipt:waiting,error:messageFor({code:'nothing_known'}),retry:'status'})),'retry','a lost connection: Try again');
 assert.equal(focusTarget(view({started:true,receipt:waiting,expired:true})),'code-title');
 assert.equal(focusTarget(view({started:true,receipt:receipt('locked')})),'code-title');
 assert.equal(focusTarget(view({started:true,receipt:receipt('locked'),error:messageFor({code:'nothing_known'}),retry:'resend'})),'retry');
 assert.equal(focusTarget(view({started:true,receipt:receipt('received')})),'panel-title','the confirmation');
 assert.equal(focusTarget(view({started:true})),'check');
 assert.equal(focusTarget(view({started:true,retry:'status',error:messageFor({code:'nothing_known'})})),'retry');
 assert.equal(focusTarget(formView({policy:'failed',state:IDLE})),'retry');
 assert.equal(focusTarget(formView({policy:'closed',state:IDLE})),'panel-title');
 assert.equal(focusTarget(formView({policy:'open',state:{...IDLE,blocked:true}})),'panel-title');
});

test('every focus target is a real, reachable element of the printed form',()=>{
 const {form,focusLog}=realForm();
 const view=(state,more={})=>formView({policy:'open',state:{...IDLE,...state},...more});
 const cases=[
  [view({}),form.elements.name],
  [view({error:messageFor({code:'invalid_request'})}),form.querySelector('[data-contact-alert]')],
  [view({started:true,retry:'start',error:messageFor({code:'contact_unavailable'})},{submitted:true}),form.querySelector('[data-contact-send]')],
  [view({started:true,receipt:receipt('awaiting_verification')}),form.elements.code],
  [view({started:true,receipt:receipt('awaiting_verification'),error:messageFor({code:'nothing_known'}),retry:'status'}),form.querySelector('[data-contact-retry]')],
  [view({started:true,receipt:receipt('awaiting_verification'),expired:true}),form.querySelector('[data-contact-code-title]')],
  [view({started:true,receipt:receipt('received')}),form.querySelector('[data-contact-panel="received"]').querySelector('[data-contact-panel-title]')],
  [view({started:true}),form.querySelector('[data-contact-check]')],
  [formView({policy:'failed',state:IDLE}),form.querySelector('[data-contact-retry]')],
  [formView({policy:'closed',state:IDLE}),form.querySelector('[data-contact-panel="closed"]').querySelector('[data-contact-panel-title]')],
  [formView({policy:'open',state:{...IDLE,blocked:true}}),form.querySelector('[data-contact-panel="blocked"]').querySelector('[data-contact-panel-title]')]
 ];
 for(const [shown,node] of cases){
  paintForm(form,shown);
  assert.ok(node,shown.name);assert.equal(focusNode(form,shown),node,shown.name);
  node.focus();assert.equal(focusLog.at(-1),node,`${shown.name}: its target can take the focus`);
 }
 assert.equal(focusNode(form,formView({state:IDLE})),null);
 // A control has gone when it is hidden, switched off, or inside the switched-off fields.
 paintForm(form,view({busy:true}));
 assert.equal(controlGone(form.elements.name),true);assert.equal(controlGone(form.querySelector('[data-contact-send]')),false,'a button that is only switched off keeps its place');
 paintForm(form,view({started:true,receipt:receipt('awaiting_verification')}));
 assert.equal(controlGone(form.querySelector('[data-contact-send]')),true);assert.equal(controlGone(form.elements.code),false);
 paintForm(form,view({started:true,receipt:receipt('received')}));
 assert.equal(controlGone(form.elements.code),true);
});

test('a button is switched off without leaving the keyboard\'s path',()=>{
 const node=build('<button data-x></button>');
 assert.equal(isOff(node),false);
 setOff(node,true);setOff(node,true);
 assert.equal(node.getAttribute('aria-disabled'),'true');assert.equal(node.disabled,false);assert.equal(isOff(node),true);
 setOff(node,false);setOff(node,false);
 assert.equal(node.hasAttribute('aria-disabled'),false);
 setOff(null,true);assert.equal(isOff(null),true);
});

// ---------- the wiring, against the real template ----------
test('the printed form is honest before scripts run: flat fields, no usable Send, every other screen hidden',()=>{
 const {shell,form}=realForm();
 assert.equal(shell.getAttribute('data-state'),'opening');
 assert.equal(form.querySelector('[data-contact-fields]').disabled,true);
 for(const hook of ['verification','alert','instead'])assert.equal(form.querySelector(`[data-contact-${hook}]`).hidden,true,hook);
 for(const panel of form.querySelectorAll('[data-contact-panel]'))assert.equal(panel.hidden,true);
 for(const hook of ['retry','check','restart','error-summary'])assert.equal(form.querySelector(`[data-contact-${hook}]`).hidden,true,hook);
});

test('opening, then ready: the fields open when the engine says messages are taken',async()=>{
 const form=realForm(),engine=pretendEngine();let allow;
 const api={policy:()=>new Promise(resolve=>{allow=()=>resolve({version:1,receipt_key_id:'k'});})};
 // The built document locks every control until scripts run; the form's own script releases them.
 for(const control of [...Object.values(form.form.elements),form.form.querySelector('[data-contact-send]')]){control.disabled=true;control.setAttribute('data-unbound-control','');}
 bindContactForm(form.form,{browser:engine.browser,api});
 assert.equal(form.shell.getAttribute('data-state'),'opening');
 assert.equal(form.form.querySelectorAll('[data-unbound-control]').length,0);
 assert.equal(form.form.elements.name.disabled,false,'released; the disabled fieldset still holds it');
 assert.equal(form.form.querySelector('[data-contact-fields]').disabled,true);
 assert.equal(isOff(form.form.querySelector('[data-contact-send]')),true);
 assert.equal(form.form.querySelector('[data-contact-status]').textContent,words.status.opening);
 assert.deepEqual(engine.calls,['start']);
 allow();await settle();
 assert.equal(form.shell.getAttribute('data-state'),'ready');
 assert.equal(form.form.querySelector('[data-contact-fields]').disabled,false);
 assert.equal(isOff(form.form.querySelector('[data-contact-send]')),false);
 assert.equal(form.focusLog.length,0,'the page opening never moves the focus');
 assert.equal(form.form.querySelector('[data-contact-status]').textContent,'');
 assert.equal(form.shell.querySelector('[data-message-step="write"]').getAttribute('aria-current'),'step');
 assert.equal(form.shell.querySelector('[data-message-step="code"]').hasAttribute('aria-current'),false);
});

test('Send: faults stop it and are shown; a good message goes to the engine once',async()=>{
 const page=await bound();
 const blocked=await page.form.dispatch('submit');
 assert.equal(blocked.defaultPrevented,true);
 assert.equal(page.engine.calls.filter(call=>call[0]==='submit').length,0);
 assert.equal(page.form.querySelector('[data-contact-error="name"]').hidden,false);
 assert.equal(page.focusLog.at(-1),page.form.elements.name);
 // Correcting a field clears its own error at once; another field's error stays.
 page.form.elements.name.value='Asha Verma';
 await page.form.dispatch('input',{target:page.form.elements.name});
 assert.equal(page.form.querySelector('[data-contact-error="name"]').hidden,true);
 assert.equal(page.form.querySelector('[data-contact-error="email"]').hidden,false);
 page.form.elements.email.value='still wrong';
 await page.form.dispatch('input',{target:page.form.elements.email});
 assert.equal(page.form.querySelector('[data-contact-error="email"]').hidden,false);
 await page.form.dispatch('input',{target:page.form.elements.phone});
 await page.form.dispatch('input',{target:{name:'other'}});
 fill(page.form,good);
 await page.form.dispatch('submit');
 const sent=page.engine.calls.filter(call=>call[0]==='submit');
 assert.equal(sent.length,1);assert.equal(sent[0][1].phone,'+919415049410');assert.equal(sent[0][1].kind,'contact');
});

test('sending, the code, a wrong code, another code, then received: the focus follows each step',async()=>{
 const page=await bound();
 fill(page.form,good);
 // Enter pressed inside a field: the field is about to be switched off, so the button takes the focus.
 page.form.elements.message.focus();
 await page.form.dispatch('submit');
 assert.equal(page.doc.activeElement,page.find('send'));
 page.engine.set({busy:true});
 assert.equal(page.state(),'sending');
 assert.equal(isOff(page.find('send')),true);assert.equal(page.find('send').disabled,false,'switched off, but still in the keyboard\'s path');
 assert.equal(page.find('send-label').textContent,words.sending);
 assert.equal(page.find('fields').disabled,true);assert.equal(page.find('status').textContent,words.status.sending);
 assert.equal(page.doc.activeElement,page.find('send'),'the focus waits on "Sending…"');
 // Send pressed again while sending does nothing.
 await page.form.dispatch('submit');
 assert.equal(page.engine.calls.filter(call=>call[0]==='submit').length,1);

 // The engine's answer arrives while it is still busy; the focus moves once it is idle.
 page.engine.set({started:true,receipt:receipt('awaiting_verification'),resendWait:60});
 assert.equal(page.state(),'code');
 await page.engine.answer();
 assert.equal(page.find('fields').hidden,true);assert.equal(page.find('compose').hidden,true);
 assert.equal(page.find('verification').hidden,false);assert.equal(page.find('code-entry').hidden,false);
 assert.equal(page.find('sent-to').textContent,words.code.sentTo('asha@example.com'));
 assert.equal(page.find('countdown').textContent,words.code.countdown(60));
 assert.equal(page.find('remaining').textContent,words.code.remaining(2));
 assert.equal(isOff(page.find('resend')),true);
 assert.equal(page.doc.activeElement,page.form.elements.code,'after Send the code field holds the focus');
 assert.equal(page.shell.querySelector('[data-message-step="code"]').getAttribute('aria-current'),'step');

 // A short code is stopped here, with words under the field; the focus stays in the field.
 page.form.elements.code.value='123';
 await page.find('verify').dispatch('click');
 assert.equal(page.form.querySelector('[data-contact-error="code"]').hidden,false);
 assert.equal(page.form.elements.code.getAttribute('aria-invalid'),'true');
 assert.equal(page.engine.calls.filter(call=>call[0]==='verify').length,0);
 assert.equal(page.doc.activeElement,page.form.elements.code);
 page.form.elements.code.value='12345';await page.form.dispatch('input',{target:page.form.elements.code});
 assert.equal(page.form.querySelector('[data-contact-error="code"]').hidden,false);
 page.form.elements.code.value='123456';await page.form.dispatch('input',{target:page.form.elements.code});
 assert.equal(page.form.querySelector('[data-contact-error="code"]').hidden,true);

 // Confirm by the button (the focus is on it); the engine says the code did not match.
 page.find('verify').focus();
 await page.find('verify').dispatch('click');
 assert.deepEqual(page.engine.calls.filter(call=>call[0]==='verify'),[['verify','123456']]);
 assert.equal(page.form.elements.code.value,'','the code is never kept');
 page.engine.set({busy:true});
 assert.equal(isOff(page.find('verify')),true);
 assert.equal(page.form.elements.code.disabled,false,'the code field stays open while the engine is asked');
 assert.equal(page.doc.activeElement,page.find('verify'),'the focus is not lost while the engine is asked');
 // Pressed again while the engine is asked: nothing.
 page.form.elements.code.value='654321';await page.find('verify').dispatch('click');
 assert.equal(page.engine.calls.filter(call=>call[0]==='verify').length,1);assert.equal(page.form.elements.code.value,'654321');
 page.form.elements.code.value='';
 await page.engine.answer({error:messageFor({code:'verification_incorrect'}),retry:'status'});
 assert.equal(page.find('error-summary').textContent,words.engine.verification_incorrect);
 assert.equal(page.find('alert').hidden,false);assert.equal(page.find('error-summary').hidden,false);
 assert.equal(page.form.elements.code.getAttribute('aria-invalid'),'true');
 assert.equal(page.find('retry').hidden,true,'the code is typed again on this screen: no "Try again"');
 assert.equal(page.doc.activeElement,page.form.elements.code,'after a wrong code the code field holds the focus');

 // A lost connection on this screen does offer "Try again"; it takes the focus and repeats what the engine was asked.
 page.form.elements.code.value='123456';
 await page.form.elements.code.dispatch('keydown',{key:'Enter'});
 await page.engine.answer({error:messageFor({code:'nothing_known'}),retry:'status'});
 assert.equal(page.find('retry').hidden,false);
 assert.equal(page.doc.activeElement,page.find('retry'));
 await page.find('retry').dispatch('click');
 assert.equal(page.engine.calls.at(-1),'retryRequest');

 // Another code, once the wait is over; then the code field again.
 await page.engine.answer({error:'',retry:null,resendWait:0});
 assert.equal(isOff(page.find('resend')),false);assert.equal(page.find('countdown').textContent,'');
 assert.equal(page.form.elements.code.hasAttribute('aria-invalid'),false);
 page.form.elements.code.value='99';
 page.find('resend').focus();
 await page.find('resend').dispatch('click');
 assert.equal(page.engine.calls.at(-1),'resend');assert.equal(page.form.elements.code.value,'');
 page.engine.set({busy:true});
 assert.equal(page.doc.activeElement,page.find('resend'));
 await page.engine.answer({receipt:receipt('awaiting_verification',{generation:2,sends_remaining:1}),resendWait:60});
 assert.equal(page.find('remaining').textContent,words.code.remaining(1));
 assert.equal(isOff(page.find('resend')),true);
 assert.equal(page.doc.activeElement,page.form.elements.code,'after another code is sent the code field holds the focus');
 // "Send another code" does nothing while its countdown runs.
 await page.find('resend').dispatch('click');
 assert.equal(page.engine.calls.filter(call=>call==='resend').length,1);

 // The right code, by Enter: received, and the thank-you heading takes the focus.
 page.form.elements.code.value='222222';
 await page.form.elements.code.dispatch('keydown',{key:'Enter'});
 await page.engine.answer({receipt:receipt('received')});
 assert.equal(page.state(),'received');
 assert.equal(page.find('verification').hidden,true);
 const thanks=page.form.querySelector('[data-contact-panel="received"]');
 assert.equal(thanks.hidden,false);
 assert.equal(page.find('restart').hidden,false);
 assert.equal(page.doc.activeElement,thanks.querySelector('[data-contact-panel-title]'),'the confirmation holds the focus');
 assert.equal(page.shell.querySelector('[data-message-step="sent"]').getAttribute('aria-current'),'step');

 // Write another message: only when the engine agrees; then the first field takes the focus.
 page.engine.controller.restartAnswer=false;
 page.find('restart').focus();
 await page.find('restart').dispatch('click');await settle();
 assert.equal(page.form.wasReset,undefined);
 page.engine.controller.restartAnswer=true;
 await page.find('restart').dispatch('click');await settle();
 assert.equal(page.form.wasReset,true);assert.equal(page.state(),'ready');
 assert.equal(page.doc.activeElement,page.form.elements.name);
});

test('Enter on the code screen confirms the code: in the field, and by the form\'s own submit',async()=>{
 const page=await bound({initial:{started:true,receipt:receipt('awaiting_verification')}});
 assert.equal(page.state(),'code');
 assert.equal(page.focusLog.length,0,'a page reopened on the code screen does not move the focus');
 const code=page.form.elements.code;
 // Other keys, and Enter while a word is still being composed, are left alone.
 code.value='123456';
 assert.equal((await code.dispatch('keydown',{key:'5'})).defaultPrevented,undefined);
 assert.equal((await code.dispatch('keydown',{key:'Enter',isComposing:true})).defaultPrevented,undefined);
 assert.equal(page.engine.calls.filter(call=>call[0]==='verify').length,0);
 // Enter in the field.
 code.focus();
 const pressed=await code.dispatch('keydown',{key:'Enter'});
 assert.equal(pressed.defaultPrevented,true);
 assert.deepEqual(page.engine.calls.at(-1),['verify','123456']);assert.equal(code.value,'');
 page.engine.set({busy:true});
 assert.equal(page.doc.activeElement,code,'the field keeps the focus while the code is checked');
 // Enter again while the engine is asked does nothing.
 code.value='111111';await code.dispatch('keydown',{key:'Enter'});
 assert.equal(page.engine.calls.filter(call=>call[0]==='verify').length,1);
 code.value='';
 await page.engine.answer({error:messageFor({code:'verification_incorrect'}),retry:'status'});
 assert.equal(page.doc.activeElement,code);
 // A short code by Enter: words under the field, nothing sent.
 code.value='12';await code.dispatch('keydown',{key:'Enter'});
 assert.equal(page.form.querySelector('[data-contact-error="code"]').hidden,false);
 assert.equal(page.engine.calls.filter(call=>call[0]==='verify').length,1);
 // A phone keyboard's send key submits the form: on this screen that checks the code, never the hidden fields.
 code.value='654321';
 const submitted=await page.form.dispatch('submit');
 assert.equal(submitted.defaultPrevented,true);
 assert.deepEqual(page.engine.calls.at(-1),['verify','654321']);
 assert.equal(page.engine.calls.filter(call=>call[0]==='submit').length,0);
 await page.engine.answer({receipt:receipt('received')});
 assert.equal(page.state(),'received');
 // Enter on a screen without the code entry does nothing.
 code.value='123456';await code.dispatch('keydown',{key:'Enter'});
 assert.equal(page.engine.calls.filter(call=>call[0]==='verify').length,2);
});

test('the focus is handed on when the control that held it leaves the screen, and is otherwise left alone',async()=>{
 // The code runs out while the visitor is in the code field: the heading that says so takes the focus.
 const page=await bound({initial:{started:true,receipt:receipt('awaiting_verification')}});
 page.form.elements.code.focus();
 page.engine.set({expired:true});
 assert.equal(page.state(),'expired');
 assert.equal(page.doc.activeElement,page.find('code-title'));
 // On "Send another code" (still on the screen) nothing moves.
 const other=await bound({initial:{started:true,receipt:receipt('awaiting_verification')}});
 other.find('resend').focus();
 other.engine.set({expired:true});
 assert.equal(other.doc.activeElement,other.find('resend'));
 // The visitor is somewhere else on the page: the form never takes the focus from there.
 const away=await bound({initial:{started:true,receipt:receipt('awaiting_verification')}});
 const elsewhere={closest:()=>null};away.doc.activeElement=elsewhere;
 away.engine.set({expired:true});away.engine.set({expired:false,receipt:receipt('received')});
 assert.equal(away.doc.activeElement,elsewhere);assert.equal(away.focusLog.length,0);
 // A background check of the message does not interrupt typing: the code field is never switched off on its screen.
 const typing=await bound({initial:{started:true,receipt:receipt('awaiting_verification')}});
 typing.form.elements.code.focus();
 typing.engine.set({busy:true});
 assert.equal(typing.form.elements.code.disabled,false);assert.equal(isOff(typing.find('verify')),true);
 typing.engine.set({busy:false});
 assert.equal(typing.doc.activeElement,typing.form.elements.code);assert.equal(typing.focusLog.length,1);
 // The form closes while the visitor is on "How your details are used": the closed screen's heading takes the focus.
 let refuse;const closing=realForm(),engine=pretendEngine();
 bindContactForm(closing.form,{browser:engine.browser,api:{policy:()=>new Promise((resolve,reject)=>{refuse=()=>{const error=new Error('contact_unavailable');error.code='contact_unavailable';reject(error);};})}});
 const notice=closing.form.querySelector('[data-collection-notice]');notice.focus();
 refuse();await settle();
 assert.equal(closing.shell.getAttribute('data-state'),'closed');
 assert.equal(closing.doc.activeElement,closing.form.querySelector('[data-contact-panel="closed"]').querySelector('[data-contact-panel-title]'));
});

test('expired and locked codes each have their own screen',async()=>{
 const page=await bound({initial:{started:true,receipt:receipt('awaiting_verification')}});
 assert.equal(page.state(),'code');
 page.engine.set({expired:true});
 assert.equal(page.state(),'expired');
 assert.equal(page.find('code-title').textContent,words.code.expiredTitle);
 assert.equal(page.find('code-entry').hidden,true);assert.equal(page.find('resend').hidden,false);
 assert.equal(page.form.elements.code.disabled,true,'a field that is not shown takes nothing');
 assert.equal(page.find('check').hidden,true);
 // "Send another code" from here: the new code's field takes the focus.
 page.find('resend').focus();
 await page.find('resend').dispatch('click');
 await page.engine.answer({expired:false,receipt:receipt('awaiting_verification',{generation:2,sends_remaining:1}),resendWait:60});
 assert.equal(page.state(),'code');assert.equal(page.doc.activeElement,page.form.elements.code);
 page.engine.set({receipt:receipt('locked',{generation:3,sends_remaining:0})});
 assert.equal(page.state(),'locked');
 assert.equal(page.find('code-title').textContent,words.code.lockedTitle);
 assert.equal(page.find('sent-to').textContent,words.code.noneLeft);
 assert.equal(page.find('resend').hidden,true);
 assert.equal(page.doc.activeElement,page.find('code-title'),'the field has gone: the heading that says why takes the focus');
});

test('switched off: an honest closed screen with Call and WhatsApp, and no Send anywhere',async()=>{
 let asked=0;
 const page=await bound({api:{policy:async()=>{asked++;return policyClosed.policy();}}});
 assert.equal(page.state(),'closed');
 assert.equal(page.find('fields').hidden,true);assert.equal(page.find('compose').hidden,true);
 assert.equal(page.form.querySelector('[data-contact-panel="closed"]').hidden,false);
 assert.equal(page.find('instead').hidden,false);
 assert.equal(page.shell.querySelector('[data-message-steps]').hidden,true);
 assert.equal(page.find('retry').hidden,true,'a switched-off form offers Call and WhatsApp, not another try');
 assert.equal(page.find('status').textContent,words.status.closed);
 // Send cannot be forced.
 fill(page.form,good);await page.form.dispatch('submit');
 assert.equal(page.engine.calls.filter(call=>call[0]==='submit').length,0);
 assert.equal(asked,1);
});

test('could not open, and a browser that will not keep the reference',async()=>{
 const failed=await bound({api:policyBroken});
 assert.equal(failed.state(),'failed');
 assert.equal(failed.form.querySelector('[data-contact-panel="failed"]').hidden,false);
 assert.equal(failed.find('retry-label').textContent,words.retry);assert.equal(failed.find('instead').hidden,false);
 // "Try again" asks the engine again whether the form may be opened.
 let asked=0;
 const again=await bound({api:{policy:async()=>{asked++;throw new Error('offline');}}});
 await again.find('retry').dispatch('click');await settle();
 assert.equal(asked,2);assert.equal(again.state(),'failed');
 const blocked=await bound({initial:{blocked:true,error:messageFor({code:'storage_unavailable'})}});
 assert.equal(blocked.state(),'blocked');
 assert.equal(blocked.form.querySelector('[data-contact-panel="blocked"]').hidden,false);
 assert.equal(blocked.find('alert').hidden,true);
});

test('a lost connection keeps what was typed and the main button reads Try again; a reopened page finds its message',async()=>{
 const page=await bound();
 fill(page.form,good);page.find('send').focus();await page.form.dispatch('submit');
 page.engine.set({busy:true,started:true});
 await page.engine.answer({retry:'start',error:messageFor({code:'not_a_known_code'})});
 assert.equal(page.state(),'stalled');
 assert.equal(page.find('fields').hidden,false);assert.equal(page.find('fields').disabled,true);
 assert.equal(page.form.elements.message.value,good.message);
 assert.equal(page.find('error-summary').textContent,words.engine.interrupted);
 // "Try again" stands in Send's place (the same filled button); the small one is not shown beside it.
 assert.equal(page.find('send-label').textContent,words.retry);assert.equal(isOff(page.find('send')),false);
 assert.equal(page.find('compose').hidden,false);assert.equal(page.find('retry').hidden,true);
 assert.equal(page.doc.activeElement,page.find('send'),'the button that tries again holds the focus');
 await page.form.dispatch('submit');
 assert.equal(page.engine.calls.at(-1),'retryRequest');
 assert.equal(page.engine.calls.filter(call=>call[0]==='submit').length,1,'the message is not sent a second time');
 // The engine asks for a wait: the button is switched off and pressing it does nothing.
 await page.engine.answer({waiting:5,error:messageFor({code:'please_wait'})});
 assert.equal(isOff(page.find('send')),true);
 await page.form.dispatch('submit');
 assert.equal(page.engine.calls.filter(call=>call==='retryRequest').length,1);
 // It goes through: the code screen, with the focus in the code field.
 await page.engine.answer({waiting:0,error:'',retry:null,receipt:receipt('awaiting_verification')});
 assert.equal(page.state(),'code');
 // The engine sends the details back (first try only): the fields open again and the error takes the focus.
 const sentBack=await bound();
 fill(sentBack.form,good);sentBack.find('send').focus();await sentBack.form.dispatch('submit');
 sentBack.engine.set({busy:true,started:true});
 await sentBack.engine.answer({started:false,error:messageFor({code:'invalid_request'})});
 assert.equal(sentBack.state(),'ready');assert.equal(sentBack.find('fields').disabled,false);
 assert.equal(sentBack.find('error-summary').textContent,words.engine.invalid_request);
 assert.equal(sentBack.doc.activeElement,sentBack.find('alert'));
 const reopened=await bound({initial:{started:true}});
 assert.equal(reopened.state(),'resuming');
 assert.equal(reopened.find('status').textContent,words.status.resuming);
 assert.equal(reopened.find('check').hidden,false);assert.equal(reopened.find('fields').hidden,true);
 assert.equal(reopened.focusLog.length,0);
 reopened.find('check').focus();
 await reopened.find('check').dispatch('click');assert.equal(reopened.engine.calls.at(-1),'check');
 reopened.engine.set({busy:true});
 assert.equal(isOff(reopened.find('check')),true);
 await reopened.find('check').dispatch('click');assert.equal(reopened.engine.calls.filter(call=>call==='check').length,1);
 await reopened.engine.answer({receipt:receipt('awaiting_verification')});
 assert.equal(reopened.state(),'code');assert.equal(reopened.doc.activeElement,reopened.form.elements.code);
});

test('leaving the page stops everything; a missing form is passed over',async()=>{
 const page=await bound();
 assert.equal(page.form.listeners('submit'),1);
 page.abort.abort();
 assert.equal(page.form.listeners('submit'),0);
 assert.ok(page.engine.calls.includes('unsubscribe')&&page.engine.calls.includes('stop'));
 const before=page.state();
 page.engine.set({started:true,receipt:receipt('received')});
 assert.equal(page.state(),before,'nothing is painted after the page has gone');
 page.dispose();
 assert.equal(typeof bindContactForm(null),'function');
 // An answer that arrives after the page has gone changes nothing.
 let allow;const late=realForm(),engine=pretendEngine(),abort=new AbortController();
 bindContactForm(late.form,{signal:abort.signal,browser:engine.browser,api:{policy:()=>new Promise((resolve,reject)=>{allow={resolve,reject};})}});
 abort.abort();allow.resolve({version:1,receipt_key_id:'k'});await settle();
 assert.equal(late.shell.getAttribute('data-state'),'opening');
 const later=realForm(),second=new AbortController();
 bindContactForm(later.form,{signal:second.signal,browser:pretendEngine().browser,api:{policy:()=>new Promise((resolve,reject)=>{allow={resolve,reject};})}});
 second.abort();allow.reject(new Error('gone'));await settle();
 assert.equal(later.shell.getAttribute('data-state'),'opening');
});

test('with the real engine and no browser storage, the form says so and offers Call',async()=>{
 const page=realForm(),abort=new AbortController();
 globalThis.__BOOKING_PROFILE__={installation_id:'6c1f0a52-3b7e-4d19-9a44-2f8e5d7c1b30',environment:'test'};
 try{
  bindContactForm(page.form,{signal:abort.signal,api:policyOpen});
  await settle();
  assert.equal(page.shell.getAttribute('data-state'),'blocked');
  assert.equal(page.form.querySelector('[data-contact-instead]').hidden,false);
 }finally{abort.abort();delete globalThis.__BOOKING_PROFILE__;}
});

test('paintForm writes only what changed, and works without the surrounding shell',()=>{
 const {form}=realForm();
 const loose=build(`<form data-contact-form><p data-contact-status></p></form>`);loose.elements={};
 paintForm(loose,formView({policy:'open',state:IDLE}));
 assert.equal(loose.getAttribute('data-state'),'ready');
 const view=formView({policy:'open',state:IDLE});
 paintForm(form,view);paintForm(form,view);
 assert.equal(form.closest('[data-message-form]').getAttribute('data-state'),'ready');
});

test('the old page\'s markup still carries the engine\'s hooks until it is deleted',()=>{
 const old=contactFormMarkup();
 for(const hook of ['data-contact-form','data-contact-fields','data-contact-status','data-contact-error-summary','data-contact-verification','data-contact-verify','data-contact-resend','data-contact-countdown','data-contact-check','data-contact-retry','data-contact-restart','data-collection-notice'])assert.ok(old.includes(hook),hook);
});
