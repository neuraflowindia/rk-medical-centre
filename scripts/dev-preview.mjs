#!/usr/bin/env node
/**
 * Local preview of the built website. Development only: it is never deployed and never
 * contacts the real back end, a provider or a database.
 *
 * WHAT IT DOES
 *   Serves the built `dist/` folder the way the live site is routed, so any page can be looked
 *   at in either booking state without the real back end:
 *     - clean page addresses (/, /treatment, /about-clinic, /meet-doctor, /dr-sanjay-gupta,
 *       /dr-parul-gupta, /contact) open the pre-rendered page for the chosen booking state;
 *     - the booking screens (/booking, /booking-details, /booking-help) open while booking is
 *       ON and answer "Page not found" while it is OFF, exactly as on the live site;
 *     - the small set of API reads the pages make is answered with realistic stand-in data.
 *
 * HOW TO USE IT (run from the website folder, after a build)
 *   npm run build:hosting                 # makes dist/ (about 35 seconds)
 *   npm run preview:built                 # http://127.0.0.1:4310, booking ON, message form open
 *   node scripts/dev-preview.mjs --port 4320 --booking off --contact closed
 *
 *   Options
 *     --port <number>          port to listen on (default 4310; 0 picks a free one)
 *     --booking on|off         booking state when a visit has not chosen one (default on)
 *     --contact open|closed    message form state when a visit has not chosen one (default open)
 *     --dist <folder>          built site to serve (default: dist beside this script's folder)
 *     --host <address>         address to listen on (default 127.0.0.1)
 *     --help                   show this text
 *
 *   Choosing a state from the browser
 *     Add ?booking=off or ?booking=on (and ?contact=closed or ?contact=open) to any page
 *     address. The choice is remembered in a cookie for that browser, so the pages you click
 *     through to, and the state the page's own script reads, stay in that state. Use two
 *     browser profiles, or two ports, to see ON and OFF side by side.
 *     http://127.0.0.1:4310/__preview lists every page in both states.
 *
 * WHAT IT ANSWERS FOR THE API
 *     GET  /api/service-state                booking ON or OFF, as the pages' script expects
 *     GET  /api/contact/policy               message form open, or 503 when closed
 *     POST /api/contact/start|status|verify|resend
 *                                            a pretend message: any six-digit code is accepted,
 *                                            except 000000, which shows the "locked" state
 *     GET  /api/booking-policy               doctors, fee and payment choices from
 *                                            appointment-settings/business-settings.json
 *     GET  /api/availability?service_id&day&questions
 *                                            starting times worked out from the same settings
 *     POST /api/checkout-context, /api/checkout, /api/checkout/status, /api/checkout/email-details
 *                                            a pretend booking paid at the clinic: confirmed at once and kept
 *                                            in memory, so the confirmation, the saved receipt and its
 *                                            email-copy action can be looked at. Online payment answers
 *                                            "temporarily unavailable"; a time booked here is then taken;
 *                                            the note "preview: no answer" gets no answer the first time.
 *     POST /api/booking/details              "Find your booking": bookings made here, plus two ready-made
 *                                            ones for the name Asha Verma, phone +91 98765 43210
 *     everything else under /api             503 "preview only" (nothing is saved or sent)
 *
 * After changing source files, run `npm run build:hosting` again and reload the page.
 */
import {createServer} from 'node:http';
import {existsSync,lstatSync,readFileSync} from 'node:fs';
import {extname,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';

export const DEFAULT_PORT=4310;
export const BOOKING_COOKIE='rk_preview_booking';
export const CONTACT_COOKIE='rk_preview_contact';
const BOOKING_STATES=['on','off'],CONTACT_STATES=['open','closed'];
const projectRoot=fileURLToPath(new URL('..',import.meta.url));

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp',
 '.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.avif':'image/avif','.woff':'font/woff','.woff2':'font/woff2',
 '.ttf':'font/ttf','.otf':'font/otf','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.mp4':'video/mp4','.webm':'video/webm'};
/** The content type for a file name; unknown kinds are sent as plain bytes. */
export function contentType(file){return types[extname(file).toLowerCase()]||'application/octet-stream';}

/** Read the command line. Unknown options and bad values are reported, never guessed. */
export function parseArguments(argv){
 const options={port:DEFAULT_PORT,booking:'on',contact:'open',dist:resolve(projectRoot,'dist'),host:'127.0.0.1',help:false};
 const args=[...argv];
 while(args.length){
  let name=args.shift(),value;
  if(name==='--help'||name==='-h'){options.help=true;continue;}
  if(name.startsWith('--')&&name.includes('=')){[name,value]=[name.slice(0,name.indexOf('=')),name.slice(name.indexOf('=')+1)];}
  else value=args.shift();
  if(value===undefined)throw new Error(`Missing value for ${name}`);
  if(name==='--port'){
   const port=Number(value);
   if(!Number.isInteger(port)||port<0||port>65535)throw new Error('--port needs a number from 0 to 65535');
   options.port=port;
  }else if(name==='--booking'){
   if(!BOOKING_STATES.includes(value))throw new Error('--booking needs on or off');
   options.booking=value;
  }else if(name==='--contact'){
   if(!CONTACT_STATES.includes(value))throw new Error('--contact needs open or closed');
   options.contact=value;
  }else if(name==='--dist')options.dist=resolve(value);
  else if(name==='--host')options.host=value;
  else throw new Error(`Unknown option ${name}`);
 }
 return options;
}

/**
 * Tidy a requested address the way the live routing does: lower case, no trailing slash,
 * "/x.html" and "/x/index.html" mean "/x". Returns null for anything unsafe or malformed.
 */
export function cleanPath(pathname){
 let path;
 try{path=decodeURIComponent(pathname);}catch{return null;}
 if(!path.startsWith('/')||/[\\%?#\u0000-\u001f\u007f]/.test(path)||path.split('/').some(part=>part==='.'||part==='..'))return null;
 path='/'+path.toLowerCase().split('/').filter(Boolean).join('/');
 if(path.endsWith('/index.html'))return path.slice(0,-11)||'/';
 return path.endsWith('.html')?path.slice(0,-5)||'/':path;
}

/** The pre-rendered file for a page address and a booking state, relative to dist. */
export function pageFile(path,booking){
 if(!BOOKING_STATES.includes(booking))throw new RangeError('Booking state must be on or off');
 const name=path==='/'?'index.html':path==='/sitemap.xml'?'sitemap.xml':path.slice(1)+'.html';
 return `__booking_display/${booking}/${name}`;
}

/** Cookies from a request header, as a plain object. */
export function readCookies(header=''){
 const cookies={};
 for(const part of String(header).split(';')){
  const at=part.indexOf('=');
  if(at>0)cookies[part.slice(0,at).trim()]=part.slice(at+1).trim();
 }
 return cookies;
}

/**
 * Work out the states for one request: an explicit ?booking= / ?contact= wins and is remembered
 * in a cookie; otherwise the cookie; otherwise the default the server was started with.
 */
export function chooseStates({search='',cookie='',defaults}){
 const query=new URLSearchParams(search),cookies=readCookies(cookie),remember=[];
 const pick=(name,cookieName,allowed)=>{
  const asked=query.get(name);
  if(allowed.includes(asked)){remember.push(`${cookieName}=${asked}; Path=/; SameSite=Lax`);return asked;}
  return allowed.includes(cookies[cookieName])?cookies[cookieName]:defaults[name];
 };
 return {booking:pick('booking',BOOKING_COOKIE,BOOKING_STATES),contact:pick('contact',CONTACT_COOKIE,CONTACT_STATES),remember};
}

const within=(path,prefix)=>path===prefix||path.startsWith(prefix+'/');
// The same families the live routing treats as booking-only and as private.
const bookingApi=['/api/booking-policy','/api/availability','/api/checkout-context','/api/checkout','/api/booking','/api/booking-verification'];

/**
 * Decide what one address is, mirroring the live routing rules:
 *   {kind:'page',file}       a public page, in the given booking state
 *   {kind:'booking',file}    a booking screen (ON only)
 *   {kind:'asset',file}      a built or public file named in the build's own list
 *   {kind:'api',path}        an API address (answered by the stand-ins)
 *   {kind:'index'}           the preview's own list of pages
 *   {kind:'backend'}         staff and company screens, which the preview does not have
 *   {kind:'missing'}         everything else, including the booking screens while OFF
 */
export function route({pathname,booking,manifest}){
 const path=cleanPath(pathname);
 if(path===null)return {kind:'missing'};
 if(path==='/__preview')return {kind:'index'};
 if(within(path,'/__booking_display'))return {kind:'missing'};
 if(path==='/api'||within(path,'/api')){
  if(bookingApi.some(prefix=>within(path,prefix))&&booking!=='on')return {kind:'missing'};
  return {kind:'api',path};
 }
 if(manifest.backend_paths.some(prefix=>within(path,prefix))||within(path,'/company')||within(path,'/studio')||within(path,'/enquiries-studio'))return {kind:'backend'};
 // File names keep their capitals on disk; addresses are compared in lower case, as on the live site.
 const asset=Object.entries(manifest.assets).find(([name])=>cleanPath(name)===path);
 if(asset&&asset[1]==='booking'&&booking!=='on')return {kind:'missing'};
 if(asset)return {kind:'asset',file:asset[0].slice(1)};
 if(manifest.booking_paths.includes(path))return booking==='on'?{kind:'booking',file:pageFile(path,'on')}:{kind:'missing'};
 if(path==='/sitemap.xml'||manifest.public_paths.includes(path))return {kind:'page',file:pageFile(path,booking)};
 return {kind:'missing'};
}

const json=(status,value,headers={})=>({status,headers:{'content-type':'application/json',...headers},body:JSON.stringify(value)});
const hash=value=>createHash('sha256').update(value).digest('hex');

/** Minutes a time zone is ahead of UTC at one moment (330 for India). */
export function zoneOffsetMinutes(timezone,date){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hourCycle:'h23',year:'numeric',month:'numeric',
  day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'}).formatToParts(date).map(part=>[part.type,Number(part.value)]));
 return Math.round((Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)-Math.floor(date.getTime()/1000)*1000)/60000);
}
const minutesOf=text=>{const [hours,minutes]=text.split(':').map(Number);return hours*60+minutes;};
const validDay=day=>/^\d{4}-\d\d-\d\d$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;

/**
 * Starting times for one doctor on one day, from the weekly hours in the business settings.
 * Every fourth time is left out so the list looks like a real, partly booked day.
 */
export function dayStarts(settings,resourceId,day){
 const resource=settings.resources.find(item=>item.id===resourceId);
 if(!resource||!validDay(day))return [];
 const weekday=(new Date(day+'T12:00:00Z').getUTCDay()+6)%7; // the settings count Monday as 0
 const starts=new Set();
 for(const window of resource.weekly_windows.filter(item=>item.weekday===weekday)){
  for(let minute=minutesOf(window.start);minute<=minutesOf(window.end);minute+=settings.slot_step_minutes)starts.add(minute);
  for(const extra of window.extra_starts||[])starts.add(minutesOf(extra));
 }
 return [...starts].sort((a,b)=>a-b).filter((_,index)=>index%4!==2);
}

/**
 * The stand-in answers. `settings` is the parsed business settings (or null when unreadable);
 * `clock` returns the current time in milliseconds.
 */
export function createStubs({settings=null,clock=Date.now,epoch=randomUUID()}={}){
 const messages=new Map();
 const now=()=>new Date(clock()).toISOString();
 const quoteVersion=settings?hash('preview-quote:'+JSON.stringify(settings.services)):null;

 function serviceState(booking){return json(200,{enabled:booking==='on',activation_epoch:epoch});}

 function contactPolicy(contact){
  return contact==='open'?json(200,{version:1,receipt_key_id:'preview'}):json(503,{code:'contact_unavailable'});
 }
 function receipt(entry){
  return {code:'ok',request_id:entry.id,state:entry.state,generation:entry.generation,sends_remaining:3-entry.generation,
   verification_delivery:'accepted',server_now:now(),code_expires_at:new Date(entry.sent+10*60000).toISOString(),
   resend_after:new Date(entry.sent+60000).toISOString()};
 }
 /** A pretend message form: start → awaiting a code → received (or locked for code 000000). */
 function contact(contactState,action,body){
  if(contactState!=='open')return json(503,{code:'contact_unavailable'});
  const id=body?.request_id;
  if(typeof id!=='string'||!id||id.length>200)return json(422,{code:'invalid_request'});
  let entry=messages.get(id);
  if(action==='start'){
   if(!entry){
    if(typeof body.name!=='string'||typeof body.email!=='string'||typeof body.message!=='string')return json(422,{code:'invalid_request'});
    if(messages.size>=50)messages.delete(messages.keys().next().value);
    entry={id,state:'awaiting_verification',generation:1,sent:clock()};messages.set(id,entry);
   }
   return json(200,receipt(entry));
  }
  if(!entry)return json(404,{code:'access_unavailable'});
  if(action==='verify'){
   if(entry.state!=='awaiting_verification')return json(200,receipt(entry));
   if(body.generation!==entry.generation)return json(409,{code:'verification_changed'});
   if(!/^[0-9]{6}$/.test(body.code||''))return json(422,{code:'invalid_request'});
   entry.state=body.code==='000000'?'locked':'received';
   return json(200,receipt(entry));
  }
  if(action==='resend'){
   if(entry.state==='received')return json(200,receipt(entry));
   if(entry.generation>=3)return json(409,{code:'verification_limit'});
   entry.generation++;entry.state='awaiting_verification';entry.sent=clock();
   return json(200,receipt(entry));
  }
  return json(200,receipt(entry)); // status
 }

 function bookingPolicy(){
  if(!settings)return json(503,{code:'temporarily_unavailable'});
  const policy=Object.fromEntries(['version','timezone','horizon_days','services','resources','booking_verification','required_contacts',
   'meeting','payment_methods','display_duration','location','appointment_changes'].filter(key=>Object.hasOwn(settings,key)).map(key=>[key,settings[key]]));
  // Pay at the clinic works in the preview; online payment shows its "temporarily unavailable" state.
  const availability=Object.fromEntries(settings.payment_methods.map(method=>[method,method==='at_clinic'
   ?{available:true,reason:null}:{available:false,reason:'temporarily_unavailable'}]));
  return json(200,{policy,quote_version:quoteVersion,booking_verification_policy_hash:hash('preview-verification'),server_now:now(),
   schedule_browsing_open:true,receipt_access:{version:1,key_id:'preview'},payment_availability:availability});
 }

 // ---- pretend bookings: pay at the clinic, kept in memory for the life of the preview ----
 const bookings=new Map(),hiccups=new Set();
 const reference=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
 const sameName=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
 const samePhone=value=>String(value??'').replace(/[^0-9+]/g,'');
 const serviceFor=id=>settings.services.find(item=>item.id===id&&item.enabled);
 const localDay=instant=>new Date(instant+zoneOffsetMinutes(settings.timezone,new Date(instant))*60000).toISOString().slice(0,10);
 const taken=(service,start)=>[...bookings.values()].some(entry=>entry.receipt.resource_id===service.resource_id
  &&entry.receipt.appointment_state==='confirmed'&&Date.parse(entry.receipt.starts_at)===start);
 /** A day's starting times for one doctor, in milliseconds: after the notice time and not already booked here. */
 function freeStarts(service,day){
  const earliest=clock()+(settings.notice_minutes||0)*60000;
  const offset=zoneOffsetMinutes(settings.timezone,new Date(day+'T12:00:00Z'));
  const [year,month,date]=day.split('-').map(Number);
  return dayStarts(settings,service.resource_id,day).map(minute=>Date.UTC(year,month-1,date,0,minute)-offset*60000)
   .filter(start=>start>earliest&&!taken(service,start));
 }
 function keep({request_id,service,starts_at,email,name,phone,state='confirmed'}){
  const resource=settings.resources.find(item=>item.id===service.resource_id),amount=service.pricing.amount_paise;
  const receipt={request_id,appointment_state:state,order_state:'not_required',payment_state:'due_at_clinic',service_name:service.name,currency:'INR',
   timezone:settings.timezone,amount_paise:amount,captured_paise:0,refunded_paise:0,amount_due_paise:state==='cancelled'?0:amount,
   starts_at,ends_at:new Date(Date.parse(starts_at)+service.duration_minutes*60000).toISOString(),server_now:now(),hold_expires_at:null,
   booking_revision:1,meeting_mode:'in_person',meeting_state:'not_created',meet_url:null,facts_version:2,resource_id:resource.id,resource_name:resource.name,
   payment_method:'at_clinic',location:settings.location,display_duration:settings.display_duration,
   acknowledgement_state:email?'pending':'not_requested',meeting_email_state:'not_requested',payment_checked_at:null,payment_evidence_source:null,
   next_actions:['check_status','choose_new_time'],
   email_copy:{operation_id:null,booking_revision:null,state:'not_requested',has_booking_email:!!email,target_hint:null,next_request_at:null,
    remaining_requests:3,can_request:true,blocked_reason:null}};
  // at most 50 are kept: the oldest one made here goes first (the two seeded ones stay)
  if(bookings.size>=50){const oldest=[...bookings].find(([,entry])=>!entry.seeded);if(oldest)bookings.delete(oldest[0]);}
  const entry={receipt,name:sameName(name),phone:samePhone(phone),seeded:false};bookings.set(request_id,entry);return entry;
 }
 const fresh=entry=>({...entry.receipt,server_now:now()});
 if(settings){
  // Two bookings to look at without booking first: name "Asha Verma", phone +91 98765 43210.
  const at=(days,minute)=>{const day=localDay(clock()+days*86400000),[year,month,date]=day.split('-').map(Number);
   return new Date(Date.UTC(year,month-1,date,0,minute)-zoneOffsetMinutes(settings.timezone,new Date(day+'T12:00:00Z'))*60000).toISOString();};
  const seed=(request_id,index,days,state)=>{const service=settings.services.filter(item=>item.enabled)[index];
   if(service)keep({request_id,service,starts_at:at(days,10*60+20),email:'',name:'Asha Verma',phone:'+919876543210',state}).seeded=true;};
  seed('5a1c0de0-0001-4000-8000-000000000001',0,1,'confirmed');seed('5a1c0de0-0002-4000-8000-000000000002',1,-7,'cancelled');
 }
 /** The last press of the booking screen. Pay at the clinic is confirmed at once; each refusal can be reached by hand. */
 function checkout(body){
  if(!settings)return json(503,{code:'temporarily_unavailable'});
  const id=body?.request_id;
  if(typeof id!=='string'||!reference.test(id))return json(422,{code:'invalid_request'});
  if(bookings.has(id))return json(200,{receipt:fresh(bookings.get(id)),checkout:null}); // the same request, sent again
  if(body.payment_method==='online')return json(503,{code:'payment_not_configured'});
  if(body.payment_method!=='at_clinic')return json(422,{code:'invalid_request'});
  if(typeof body.full_name!=='string'||body.full_name.trim().length<2||typeof body.phone!=='string'||!body.phone.trim())return json(422,{code:'invalid_details'});
  const service=typeof body.service_id==='string'?serviceFor(body.service_id):null;
  if(!service)return json(409,{code:'service_unavailable'});
  const start=typeof body.starts_at==='string'?Date.parse(body.starts_at):NaN;
  if(!Number.isFinite(start)||!freeStarts(service,localDay(start)).includes(start))return json(409,{code:'time_unavailable'});
  // notes "preview: no answer": the first press gets no answer, so "Checking your booking" can be looked at
  if(body.notes==='preview: no answer'&&!hiccups.has(id)){hiccups.add(id);return json(503,{code:'temporarily_unavailable'});}
  hiccups.delete(id);
  const email=typeof body.email==='string'&&body.email.trim()?body.email.trim():'';
  const entry=keep({request_id:id,service,starts_at:new Date(start).toISOString(),email,name:body.full_name,phone:body.phone});
  return json(200,{receipt:fresh(entry),checkout:null});
 }
 function checkoutStatus(body){
  const entry=bookings.get(body?.request_id);
  if(!entry)return json(404,{code:'access_unavailable'});
  const reply=fresh(entry);
  // an email copy asked for is "delivered" by the read after the one that first shows it as pending
  if(entry.receipt.email_copy.state==='pending'){
   if(entry.copyShown)entry.receipt={...entry.receipt,email_copy:{...entry.receipt.email_copy,state:'delivered',can_request:true,blocked_reason:null}};
   else entry.copyShown=true;
  }
  return json(200,reply);
 }
 function emailDetails(body){
  const entry=bookings.get(body?.request_id);
  if(!entry)return json(404,{code:'access_unavailable'});
  const {operation_id,expected_revision}=body;
  if(typeof operation_id!=='string'||!reference.test(operation_id)||expected_revision!==entry.receipt.booking_revision)return json(409,{code:'booking_changed'});
  const copy={operation_id,booking_revision:expected_revision,state:'pending',has_booking_email:entry.receipt.email_copy.has_booking_email,
   target_hint:'p***@example.com',next_request_at:null,remaining_requests:Math.max(0,entry.receipt.email_copy.remaining_requests-1),can_request:false,blocked_reason:'delivery_pending'};
  entry.receipt={...entry.receipt,email_copy:copy};entry.copyShown=false;
  return json(200,{code:'receipt_copy_accepted',request_id:entry.receipt.request_id,operation_id,booking_revision:expected_revision,email_copy:copy});
 }
 /** "Find your booking": the list for a name and phone, or one booking of that list in full. */
 function bookingDetails(body){
  if(!settings)return json(503,{code:'temporarily_unavailable'});
  if(typeof body?.full_name!=='string'||typeof body?.phone!=='string')return json(422,{code:'invalid_request'});
  const mine=entry=>entry.name===sameName(body.full_name)&&entry.phone===samePhone(body.phone);
  if(body.request_id!==undefined){
   const entry=bookings.get(body.request_id);
   if(!entry||!mine(entry))return json(404,{code:'booking_not_found'});
   const {next_actions,email_copy,...detail}=fresh(entry);
   return json(200,{version:1,kind:'detail',receipt:detail,capabilities:{refresh:true,download_pdf:detail.appointment_state==='confirmed'}});
  }
  const summary=({appointment_state,booking_revision,ends_at,request_id,service_name,starts_at,timezone,facts_version,resource_id,resource_name,display_duration})=>
   ({appointment_state,booking_revision,ends_at,request_id,service_name,starts_at,timezone,facts_version,resource_id,resource_name,display_duration});
  const items=[...bookings.values()].filter(mine).map(entry=>summary(entry.receipt)).sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at)).slice(0,20);
  return json(200,{version:1,kind:'list',server_now:now(),items,next_cursor:null});
 }

 function availability(search){
  if(!settings)return json(503,{code:'temporarily_unavailable'});
  const query=new URLSearchParams(search),day=query.get('day')||'',questions=Number(query.get('questions')||1);
  const service=settings.services.find(item=>item.id===query.get('service_id')&&item.enabled);
  if(!service)return json(409,{code:'service_unavailable'});
  if(!validDay(day)||questions!==1)return json(422,{code:'invalid_request'});
  const resource=settings.resources.find(item=>item.id===service.resource_id);
  const slots=freeStarts(service,day).map(start=>({starts_at:new Date(start).toISOString(),ends_at:new Date(start+service.duration_minutes*60000).toISOString()}));
  return json(200,{date:day,server_now:now(),service:{id:service.id,quote_version:quoteVersion,timezone:settings.timezone,questions,
   currency:'INR',amount_paise:service.pricing.amount_paise,duration_minutes:service.duration_minutes,facts_version:2,
   resource_id:resource.id,resource_name:resource.name,display_duration:settings.display_duration,location:settings.location,
   payment_methods:settings.payment_methods},slots});
 }

 /** Answer one API request. `body` is the parsed JSON of a POST, or undefined. */
 function answer({method,path,search,booking,contact:contactState,body}){
  if(path==='/api/service-state')return ['GET','HEAD'].includes(method)&&!search?serviceState(booking):json(400,{code:'invalid_state_request'});
  if(path==='/api/contact/policy'&&method==='GET')return contactPolicy(contactState);
  const contactAction=/^\/api\/contact\/(start|status|verify|resend)$/.exec(path);
  if(contactAction&&method==='POST')return contact(contactState,contactAction[1],body);
  if(path==='/api/booking-policy'&&method==='GET')return bookingPolicy();
  if(path==='/api/availability'&&method==='GET')return availability(search);
  if(method==='POST'){
   if(path==='/api/checkout-context')return settings?json(200,{ready:true}):json(503,{code:'temporarily_unavailable'});
   if(path==='/api/checkout')return checkout(body);
   if(path==='/api/checkout/status')return checkoutStatus(body);
   if(path==='/api/checkout/email-details')return emailDetails(body);
   if(path==='/api/booking/details')return bookingDetails(body);
  }
  return json(503,{code:'temporarily_unavailable'},{'x-preview':'not-simulated'});
 }
 return {serviceState,contactPolicy,contact,bookingPolicy,availability,checkout,checkoutStatus,emailDetails,bookingDetails,answer,epoch};
}

/** The preview's own list of pages, in both states. Plain on purpose: it is a tool, not a page of the site. */
export function previewIndex(manifest){
 const row=(path,booking)=>`<li><a href="${path}?booking=${booking}">${path}</a></li>`;
 const list=(paths,booking)=>`<ul>${paths.map(path=>row(path,booking)).join('')}</ul>`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Preview pages</title></head><body><main><h1>Preview pages</h1><p>Message form: add <code>&amp;contact=closed</code> or <code>&amp;contact=open</code> to an address.</p><h2>Booking ON</h2>${list([...manifest.public_paths,...manifest.booking_paths],'on')}<h2>Booking OFF</h2>${list(manifest.public_paths,'off')}</main></body></html>`;
}

/** Read the build's own page and file list. Throws a plain instruction when the site is not built. */
export function readManifest(dist){
 const file=resolve(dist,'appointment-surface-manifest.json');
 if(!existsSync(file))throw new Error(`No built site in ${dist}. Run "npm run build:hosting" first.`);
 const manifest=JSON.parse(readFileSync(file,'utf8'));
 for(const key of ['public_paths','booking_paths','backend_paths'])if(!Array.isArray(manifest[key]))throw new Error('The build list is not in the expected form.');
 if(!manifest.assets||typeof manifest.assets!=='object')throw new Error('The build list is not in the expected form.');
 return manifest;
}

/** Read the business settings used for the booking stand-ins; null when they cannot be read. */
export function readSettings(file=resolve(projectRoot,'appointment-settings/business-settings.json')){
 try{return JSON.parse(readFileSync(file,'utf8'));}catch{return null;}
}

/**
 * Build the preview. `respond` turns one request into {status, headers, body}; `listen` starts
 * a real server. Everything is read from `dist` at request time, so a rebuild shows on reload.
 */
export function createPreview({dist,booking='on',contact='open',settings=readSettings(),clock=Date.now,epoch}={}){
 const root=resolve(dist),defaults={booking,contact},stubs=createStubs({settings,clock,epoch});
 readManifest(root); // fail early, with the instruction, when there is no build
 const missing=()=>({status:404,headers:{'content-type':'text/plain; charset=utf-8'},body:'Page not found'});

 function file(name,status=200,extra={}){
  const path=resolve(root,name);
  if(relative(root,path).split(sep).includes('..')||!existsSync(path)||!lstatSync(path).isFile())return missing();
  return {status,headers:{'content-type':contentType(path),...extra},body:readFileSync(path)};
 }

 function respond({method='GET',url='/',headers={},body}){
  const address=new URL(url,'http://preview.invalid'),states=chooseStates({search:address.search,cookie:headers.cookie,defaults});
  const target=route({pathname:address.pathname,booking:states.booking,manifest:readManifest(root)});
  let reply;
  if(target.kind==='api'){
   // The page's own script asks for the state without a query, so the preview's own two are set aside.
   const query=new URLSearchParams(address.search);query.delete('booking');query.delete('contact');
   const search=query.size?'?'+query:'';
   reply=stubs.answer({method,path:target.path,search,booking:states.booking,contact:states.contact,body});
  }else if(!['GET','HEAD'].includes(method))reply=missing();
  else if(target.kind==='index')reply={status:200,headers:{'content-type':'text/html; charset=utf-8'},body:previewIndex(readManifest(root))};
  else if(target.kind==='backend')reply=json(503,{code:'preview_has_no_back_end'});
  else if(target.kind==='page')reply=file(target.file);
  else if(target.kind==='booking')reply=file(target.file,200,{'x-robots-tag':'noindex, nofollow'});
  else if(target.kind==='asset')reply=file(target.file);
  else reply=missing();
  const out={...reply,headers:{'cache-control':'no-store','x-preview-booking':states.booking,'x-preview-contact':states.contact,...reply.headers}};
  if(states.remember.length&&target.kind!=='api')out.headers['set-cookie']=states.remember;
  if(method==='HEAD')out.body='';
  return out;
 }

 function listen({port=DEFAULT_PORT,host='127.0.0.1'}={}){
  const server=createServer((request,response)=>{
   const chunks=[];let size=0;
   request.on('data',chunk=>{size+=chunk.length;if(size<=65536)chunks.push(chunk);});
   request.on('end',()=>{
    let reply;
    try{
     let body;
     if(chunks.length){try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{body=undefined;}}
     reply=respond({method:request.method,url:request.url,headers:request.headers,body});
    }catch(error){reply={status:500,headers:{'content-type':'text/plain; charset=utf-8'},body:'Preview error: '+error.message};}
    response.writeHead(reply.status,reply.headers);response.end(reply.body);
   });
  });
  return new Promise((done,fail)=>{
   server.once('error',fail);
   server.listen(port,host,()=>done({server,origin:`http://${host}:${server.address().port}`,close:()=>new Promise(closed=>server.close(closed))}));
  });
 }
 return {respond,listen,stubs,defaults};
}

/** The text shown by --help: the comment at the top of this file. */
export function helpText(){
 const source=readFileSync(fileURLToPath(import.meta.url),'utf8');
 return source.slice(source.indexOf('/**')+3,source.indexOf('*/')).split('\n').map(line=>line.replace(/^ \* ?/,'')).join('\n').trim();
}

/** Run from the command line. Returns the running preview, or null after --help. */
export async function main(argv=process.argv.slice(2),log=console.log){
 const options=parseArguments(argv);
 if(options.help){log(helpText());return null;}
 const preview=createPreview({dist:options.dist,booking:options.booking,contact:options.contact});
 const running=await preview.listen({port:options.port,host:options.host});
 log(`Preview of ${options.dist}`);
 log(`  ${running.origin}/            booking ${options.booking.toUpperCase()}, message form ${options.contact}`);
 log(`  ${running.origin}/__preview   every page in both states`);
 log('  Add ?booking=off or ?booking=on to any page address to switch. Ctrl+C stops the preview.');
 return running;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().then(running=>{
  if(!running)return;
  const stop=()=>running.close().then(()=>process.exit(0));
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
 }).catch(error=>{console.error(error.message);process.exit(1);});
}
