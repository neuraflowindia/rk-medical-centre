import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {parseArguments,cleanPath,pageFile,readCookies,chooseStates,route,contentType,zoneOffsetMinutes,dayStarts,createStubs,
 previewIndex,readManifest,readSettings,createPreview,helpText,main,DEFAULT_PORT,BOOKING_COOKIE,CONTACT_COOKIE} from '../dev-preview.mjs';
// The stand-in answers are checked with the booking package's own readers, so they stay true to what the pages expect.
import {checkedDisplay} from '../../appointment-system/browser/product-state.mjs';
import {createEnquiryAPI} from '../../appointment-system/browser/enquiry/protocol.mjs';
import {checkedPolicy,checkedAvailability} from '../../appointment-system/browser/booking/protocol.mjs';

const publicPaths=['/','/treatment','/about-clinic','/meet-doctor','/dr-sanjay-gupta','/dr-parul-gupta','/contact'];
const manifest={version:1,installation_id:'test',public_paths:publicPaths,booking_paths:['/booking','/booking-details','/booking-help'],
 backend_paths:['/studio','/studio/calendar','/enquiries-studio','/company/booking-control'],
 assets:{'/assets/index-AbC1.css':'general','/assets/clinic-booking-XyZ.js':'booking','/robots.txt':'general','/clinic-assets/logo.webp':'general','/assets/gone.js':'general'}};
const settings=readSettings();

/** A small built site in a temporary folder; removed when the test ends. */
function builtSite(t){
 const dist=mkdtempSync(join(tmpdir(),'rk-preview-test-'));
 t.after(()=>rmSync(dist,{recursive:true,force:true}));
 const write=(name,text)=>{mkdirSync(resolve(dist,name,'..'),{recursive:true});writeFileSync(resolve(dist,name),text);};
 write('appointment-surface-manifest.json',JSON.stringify(manifest));
 for(const booking of ['on','off']){
  for(const path of publicPaths)write(pageFile(path,booking),`<html data-booking-state="${booking}"><main><h1>${path} ${booking}</h1></main></html>`);
  write(pageFile('/sitemap.xml',booking),`<urlset>${booking}</urlset>`);
 }
 for(const path of manifest.booking_paths)write(pageFile(path,'on'),`<html><main><h1>${path}</h1></main></html>`);
 write('assets/index-AbC1.css','body{margin:0}');write('assets/clinic-booking-XyZ.js','export{}');
 write('robots.txt','User-agent: *');write('clinic-assets/logo.webp','webp');
 return dist;
}

test('the command line: defaults, every option, and plain refusals',()=>{
 const defaults=parseArguments([]);
 assert.equal(defaults.port,DEFAULT_PORT);assert.equal(defaults.booking,'on');assert.equal(defaults.contact,'open');
 assert.equal(defaults.host,'127.0.0.1');assert.equal(defaults.help,false);assert.match(defaults.dist,/dist$/);
 const chosen=parseArguments(['--port','5001','--booking','off','--contact=closed','--dist','/tmp/site','--host','0.0.0.0']);
 assert.deepEqual({...chosen},{port:5001,booking:'off',contact:'closed',dist:resolve('/tmp/site'),host:'0.0.0.0',help:false});
 assert.equal(parseArguments(['--port=0']).port,0);
 assert.equal(parseArguments(['--help']).help,true);assert.equal(parseArguments(['-h']).help,true);
 assert.throws(()=>parseArguments(['--port','abc']),/--port needs a number/);
 assert.throws(()=>parseArguments(['--port','70000']),/--port needs a number/);
 assert.throws(()=>parseArguments(['--booking','maybe']),/--booking needs on or off/);
 assert.throws(()=>parseArguments(['--contact','ajar']),/--contact needs open or closed/);
 assert.throws(()=>parseArguments(['--speed','9']),/Unknown option --speed/);
 assert.throws(()=>parseArguments(['--port']),/Missing value for --port/);
});

test('addresses are tidied the way the live routing tidies them',()=>{
 assert.equal(cleanPath('/'),'/');assert.equal(cleanPath('/treatment'),'/treatment');assert.equal(cleanPath('/Treatment/'),'/treatment');
 assert.equal(cleanPath('/treatment.html'),'/treatment');assert.equal(cleanPath('/index.html'),'/');assert.equal(cleanPath('/contact/index.html'),'/contact');
 assert.equal(cleanPath('//meet-doctor//'),'/meet-doctor');assert.equal(cleanPath('/.html'),'/');
 assert.equal(cleanPath('/a%2Fb'),'/a/b','an encoded slash is decoded once, as on the live site');
 for(const unsafe of ['/a/../b','/./a','/a%252fb','/%E0%A4%A','relative','/a\\b','/a?b','/a#b','/a\u0000'])assert.equal(cleanPath(unsafe),null,unsafe);
});

test('each page address maps to its pre-rendered file for the chosen booking state',()=>{
 assert.equal(pageFile('/','on'),'__booking_display/on/index.html');
 assert.equal(pageFile('/','off'),'__booking_display/off/index.html');
 assert.equal(pageFile('/treatment','off'),'__booking_display/off/treatment.html');
 assert.equal(pageFile('/dr-parul-gupta','on'),'__booking_display/on/dr-parul-gupta.html');
 assert.equal(pageFile('/sitemap.xml','off'),'__booking_display/off/sitemap.xml');
 assert.throws(()=>pageFile('/','perhaps'),RangeError);
});

test('cookies are read from a request header',()=>{
 assert.deepEqual(readCookies('a=1; rk_preview_booking=off;  b = two ; broken'),{a:'1',rk_preview_booking:'off',b:'two'});
 assert.deepEqual(readCookies(),{});assert.deepEqual(readCookies(undefined),{});
});

test('the state comes from the address first, then the cookie, then the default',()=>{
 const defaults={booking:'on',contact:'open'};
 assert.deepEqual(chooseStates({defaults}),{booking:'on',contact:'open',remember:[]});
 const asked=chooseStates({search:'?booking=off&contact=closed',cookie:`${BOOKING_COOKIE}=on`,defaults});
 assert.equal(asked.booking,'off');assert.equal(asked.contact,'closed');
 assert.deepEqual(asked.remember,[`${BOOKING_COOKIE}=off; Path=/; SameSite=Lax`,`${CONTACT_COOKIE}=closed; Path=/; SameSite=Lax`]);
 assert.deepEqual(chooseStates({cookie:`${BOOKING_COOKIE}=off; ${CONTACT_COOKIE}=closed`,defaults}),{booking:'off',contact:'closed',remember:[]});
 assert.deepEqual(chooseStates({search:'?booking=sideways',cookie:`${BOOKING_COOKIE}=upside-down`,defaults:{booking:'off',contact:'open'}}),{booking:'off',contact:'open',remember:[]});
});

test('routing: the seven pages in both states, booking screens only while ON',()=>{
 for(const booking of ['on','off'])for(const path of publicPaths)
  assert.deepEqual(route({pathname:path,booking,manifest}),{kind:'page',file:pageFile(path,booking)});
 assert.deepEqual(route({pathname:'/sitemap.xml',booking:'off',manifest}),{kind:'page',file:'__booking_display/off/sitemap.xml'});
 for(const path of manifest.booking_paths){
  assert.deepEqual(route({pathname:path,booking:'on',manifest}),{kind:'booking',file:pageFile(path,'on')});
  assert.deepEqual(route({pathname:path,booking:'off',manifest}),{kind:'missing'});
 }
 assert.deepEqual(route({pathname:'/Meet-Doctor/',booking:'on',manifest}),{kind:'page',file:'__booking_display/on/meet-doctor.html'});
});

test('routing: files, the API, staff screens and everything else',()=>{
 assert.deepEqual(route({pathname:'/assets/index-AbC1.css',booking:'off',manifest}),{kind:'asset',file:'assets/index-AbC1.css'});
 assert.deepEqual(route({pathname:'/assets/index-abc1.css',booking:'off',manifest}),{kind:'asset',file:'assets/index-AbC1.css'},'addresses are compared in lower case');
 assert.deepEqual(route({pathname:'/assets/clinic-booking-XyZ.js',booking:'on',manifest}),{kind:'asset',file:'assets/clinic-booking-XyZ.js'});
 assert.deepEqual(route({pathname:'/assets/clinic-booking-XyZ.js',booking:'off',manifest}),{kind:'missing'},'booking code is not served while OFF');
 assert.deepEqual(route({pathname:'/api/service-state',booking:'off',manifest}),{kind:'api',path:'/api/service-state'});
 assert.deepEqual(route({pathname:'/api/contact/policy',booking:'off',manifest}),{kind:'api',path:'/api/contact/policy'});
 assert.deepEqual(route({pathname:'/api/booking-policy',booking:'on',manifest}),{kind:'api',path:'/api/booking-policy'});
 assert.deepEqual(route({pathname:'/api/booking-policy',booking:'off',manifest}),{kind:'missing'});
 assert.deepEqual(route({pathname:'/api/availability',booking:'off',manifest}),{kind:'missing'});
 assert.deepEqual(route({pathname:'/api',booking:'on',manifest}),{kind:'api',path:'/api'});
 for(const path of ['/studio','/studio/calendar','/company/booking-control','/company/anything','/enquiries-studio/inbox'])
  assert.deepEqual(route({pathname:path,booking:'on',manifest}),{kind:'backend'},path);
 assert.deepEqual(route({pathname:'/__preview',booking:'on',manifest}),{kind:'index'});
 for(const path of ['/nope','/__booking_display/on/index.html','/__booking_display','/appointment-surface-manifest.json','/a/../treatment','/%zz'])
  assert.deepEqual(route({pathname:path,booking:'on',manifest}),{kind:'missing'},path);
});

test('content types',()=>{
 assert.equal(contentType('index.html'),'text/html; charset=utf-8');assert.equal(contentType('a/b/photo.WEBP'),'image/webp');
 assert.equal(contentType('font.woff2'),'font/woff2');assert.equal(contentType('data.bin'),'application/octet-stream');
});

test('time zones and starting times come from the business settings',()=>{
 assert.equal(zoneOffsetMinutes('Asia/Kolkata',new Date('2026-11-17T06:30:00Z')),330);
 assert.equal(zoneOffsetMinutes('UTC',new Date('2026-06-01T00:00:00.400Z')),0);
 assert.ok(settings,'the business settings are readable');
 const monday=dayStarts(settings,'dr-sanjay-gupta','2026-11-16'),sunday=dayStarts(settings,'dr-parul-gupta','2026-11-15');
 assert.equal(monday[0],600);assert.ok(monday.includes(1080),'evening session on a weekday');assert.ok(monday.every(minute=>minute>=600&&minute<=1230));
 assert.ok(sunday.length>0&&sunday.every(minute=>minute<=810),'no Sunday evening');
 assert.deepEqual([...monday].sort((a,b)=>a-b),monday,'in time order');
 const small={slot_step_minutes:30,resources:[{id:'r',weekly_windows:[{weekday:0,start:'10:00',end:'12:00',extra_starts:['12:45']},{weekday:1,start:'09:00',end:'09:00'}]}]};
 assert.deepEqual(dayStarts(small,'r','2026-11-16'),[600,630,690,720,765],'10:00 to 12:00 and 12:45, with the third time (11:00) left out as taken');
 assert.deepEqual(dayStarts(small,'r','2026-11-17'),[540]);
 assert.deepEqual(dayStarts(small,'r','2026-11-18'),[]);
 assert.deepEqual(dayStarts(small,'nobody','2026-11-16'),[]);assert.deepEqual(dayStarts(small,'r','2026-02-31'),[]);assert.deepEqual(dayStarts(small,'r','soon'),[]);
});

test('the booking state answer is one the pages accept',()=>{
 const stubs=createStubs({settings});
 for(const booking of ['on','off']){
  const reply=stubs.serviceState(booking);
  assert.equal(reply.status,200);assert.equal(reply.headers['content-type'],'application/json');
  assert.equal(checkedDisplay(JSON.parse(reply.body)).enabled,booking==='on');
 }
 assert.equal(stubs.answer({method:'GET',path:'/api/service-state',search:'',booking:'on',contact:'open'}).status,200);
 assert.equal(stubs.answer({method:'HEAD',path:'/api/service-state',search:'',booking:'off',contact:'open'}).status,200);
 assert.equal(stubs.answer({method:'GET',path:'/api/service-state',search:'?x=1',booking:'on',contact:'open'}).status,400);
 assert.equal(stubs.answer({method:'POST',path:'/api/service-state',search:'',booking:'on',contact:'open'}).status,400);
 assert.equal(createStubs({epoch:'11111111-2222-4333-8444-555555555555'}).epoch,'11111111-2222-4333-8444-555555555555');
});

/** The package's own message-form client, wired to the stand-ins instead of the network. */
function enquiryClient(stubs,contact='open'){
 return createEnquiryAPI({fetcher:async(path,init)=>{
  const reply=stubs.answer({method:init.method,path,search:'',booking:'on',contact,body:init.body?JSON.parse(init.body):undefined});
  return new Response(reply.body,{status:reply.status,headers:reply.headers});
 }});
}

test('the message form: open, pretend sending, code check, resend limit and locked',async()=>{
 let time=Date.parse('2026-11-16T05:00:00Z');
 const stubs=createStubs({settings,clock:()=>time}),api=enquiryClient(stubs);
 assert.deepEqual(await api.policy(),{version:1,receipt_key_id:'preview'});
 const access={request_id:'r-1',secret:'s'},fields={name:'Asha Rao',email:'asha@example.com',message:'Is the clinic open on Sunday?'};
 const started=await api.send('start',access,fields);
 assert.equal(started.state,'awaiting_verification');assert.equal(started.generation,1);assert.equal(started.sends_remaining,2);
 assert.equal((await api.send('start',access,fields)).generation,1,'sending the same request twice keeps one message');
 assert.equal((await api.send('status',access)).state,'awaiting_verification');
 await assert.rejects(api.send('verify',access,{generation:2,code:'123456'}),{code:'verification_changed'});
 await assert.rejects(api.send('verify',access,{generation:1,code:'12ab'}),{code:'invalid_request'});
 time+=61000;
 assert.equal((await api.send('resend',access,{operation_id:'o'})).generation,2);
 assert.equal((await api.send('resend',access,{operation_id:'o'})).generation,3);
 await assert.rejects(api.send('resend',access,{operation_id:'o'}),{code:'verification_limit'});
 const received=await api.send('verify',access,{generation:3,code:'123456'});
 assert.equal(received.state,'received');
 assert.equal((await api.send('verify',access,{generation:3,code:'123456'})).state,'received','checking again changes nothing');
 assert.equal((await api.send('resend',access,{operation_id:'o'})).state,'received');
 const second={request_id:'r-2',secret:'s'};
 await api.send('start',second,fields);
 assert.equal((await api.send('verify',second,{generation:1,code:'000000'})).state,'locked');
 await assert.rejects(api.send('status',{request_id:'r-unknown',secret:'s'}),{code:'access_unavailable'});
 await assert.rejects(api.send('start',{request_id:'r-3',secret:'s'},{name:'Only a name'}),{code:'invalid_request'});
 assert.equal(stubs.contact('open','start',{}).status,422);assert.equal(stubs.contact('open','start',undefined).status,422);
});

test('the message form while closed, and the limit on remembered pretend messages',async()=>{
 const stubs=createStubs({settings}),closed=enquiryClient(stubs,'closed');
 await assert.rejects(closed.policy(),{code:'contact_unavailable'});
 await assert.rejects(closed.send('start',{request_id:'r',secret:'s'},{name:'A B',email:'a@b.c',message:'Hi'}),{code:'contact_unavailable'});
 const fields={name:'A B',email:'a@b.c',message:'Hi'};
 for(let index=0;index<51;index++)assert.equal(stubs.contact('open','start',{...fields,request_id:'m-'+index}).status,200);
 assert.equal(stubs.contact('open','status',{request_id:'m-0'}).status,404,'the oldest pretend message was dropped');
 assert.equal(stubs.contact('open','status',{request_id:'m-50'}).status,200);
});

test('doctors, fee and starting times pass the booking screen\'s own checks',()=>{
 const clock=()=>Date.parse('2026-11-16T03:00:00Z'); // Monday 8:30 am in India
 const stubs=createStubs({settings,clock});
 const policy=checkedPolicy(JSON.parse(stubs.bookingPolicy().body));
 assert.equal(policy.policy.meeting,'in_person');assert.equal(policy.policy.display_duration,false);
 assert.deepEqual(policy.policy.services.map(service=>service.id),['dr-sanjay-gupta','dr-parul-gupta']);
 assert.equal(policy.policy.services[0].pricing.amount_paise,80000);
 assert.deepEqual(policy.payment_availability.at_clinic,{available:true,reason:null});
 assert.deepEqual(policy.payment_availability.online,{available:false,reason:'temporarily_unavailable'});
 for(const [service,day] of [['dr-sanjay-gupta','2026-11-17'],['dr-parul-gupta','2026-11-22'],['dr-sanjay-gupta','2026-11-16']]){
  const reply=stubs.answer({method:'GET',path:'/api/availability',search:`?service_id=${service}&day=${day}&questions=1`,booking:'on',contact:'open'});
  const data=checkedAvailability(JSON.parse(reply.body),{service,day,questions:1,policy});
  assert.ok(data.slots.length>3,`${service} has starting times on ${day}`);
  assert.equal(data.service.amount_paise,80000);
 }
 const today=JSON.parse(stubs.availability('?service_id=dr-sanjay-gupta&day=2026-11-16&questions=1').body);
 assert.ok(today.slots.every(slot=>Date.parse(slot.starts_at)>clock()+settings.notice_minutes*60000),'nothing sooner than the notice time');
 assert.equal(stubs.availability('?service_id=dr-nobody&day=2026-11-17&questions=1').status,409);
 assert.equal(stubs.availability('?service_id=dr-sanjay-gupta&day=17-11-2026&questions=1').status,422);
 assert.equal(stubs.availability('?service_id=dr-sanjay-gupta&day=2026-11-17&questions=2').status,422);
 assert.equal(stubs.answer({method:'GET',path:'/api/booking-policy',search:'',booking:'on',contact:'open'}).status,200);
});

test('without readable settings, and for anything not simulated, the answer is a plain "unavailable"',()=>{
 const bare=createStubs({settings:null});
 assert.equal(bare.bookingPolicy().status,503);assert.equal(bare.availability('?service_id=x&day=2026-11-17').status,503);
 const reply=createStubs({settings}).answer({method:'POST',path:'/api/checkout',search:'',booking:'on',contact:'open',body:{}});
 assert.equal(reply.status,503);assert.equal(reply.headers['x-preview'],'not-simulated');assert.deepEqual(JSON.parse(reply.body),{code:'temporarily_unavailable'});
 assert.equal(createStubs({settings}).answer({method:'GET',path:'/api/contact/start',search:'',booking:'on',contact:'open'}).status,503,'the message form only accepts POST');
 assert.equal(readSettings('/nowhere/at/all.json'),null);
});

test('the list of preview pages names every page in both states',()=>{
 const html=previewIndex(manifest);
 for(const path of publicPaths){assert.ok(html.includes(`href="${path}?booking=on"`));assert.ok(html.includes(`href="${path}?booking=off"`));}
 assert.ok(html.includes('href="/booking?booking=on"'));assert.ok(!html.includes('href="/booking?booking=off"'));
 assert.equal((html.match(/<h1/g)||[]).length,1);
});

test('a missing or malformed build is reported with what to do',t=>{
 const empty=mkdtempSync(join(tmpdir(),'rk-preview-empty-'));t.after(()=>rmSync(empty,{recursive:true,force:true}));
 assert.throws(()=>readManifest(empty),/Run "npm run build:hosting" first/);
 assert.throws(()=>createPreview({dist:empty}),/No built site/);
 writeFileSync(join(empty,'appointment-surface-manifest.json'),JSON.stringify({public_paths:[],booking_paths:[],backend_paths:'x',assets:{}}));
 assert.throws(()=>readManifest(empty),/not in the expected form/);
 writeFileSync(join(empty,'appointment-surface-manifest.json'),JSON.stringify({public_paths:[],booking_paths:[],backend_paths:[]}));
 assert.throws(()=>readManifest(empty),/not in the expected form/);
});

test('one preview answers pages, files and the API in the chosen state',t=>{
 const dist=builtSite(t),preview=createPreview({dist,settings,epoch:'11111111-2222-4333-8444-555555555555'});
 const text=reply=>reply.body.toString();
 const home=preview.respond({url:'/'});
 assert.equal(home.status,200);assert.match(text(home),/\/ on</);assert.equal(home.headers['x-preview-booking'],'on');assert.equal(home.headers['cache-control'],'no-store');
 assert.equal(home.headers['set-cookie'],undefined);
 const off=preview.respond({url:'/treatment?booking=off'});
 assert.match(text(off),/\/treatment off</);assert.deepEqual(off.headers['set-cookie'],[`${BOOKING_COOKIE}=off; Path=/; SameSite=Lax`]);
 const remembered={cookie:`${BOOKING_COOKIE}=off; ${CONTACT_COOKIE}=closed`};
 assert.match(text(preview.respond({url:'/contact',headers:remembered})),/\/contact off</);
 assert.equal(preview.respond({url:'/booking',headers:remembered}).status,404);
 const booking=preview.respond({url:'/booking'});
 assert.equal(booking.status,200);assert.equal(booking.headers['x-robots-tag'],'noindex, nofollow');
 assert.deepEqual(JSON.parse(preview.respond({url:'/api/service-state',headers:remembered}).body),{enabled:false,activation_epoch:'11111111-2222-4333-8444-555555555555'});
 assert.equal(JSON.parse(preview.respond({url:'/api/service-state'}).body).enabled,true);
 assert.equal(preview.respond({url:'/api/service-state?booking=off'}).headers['set-cookie'],undefined,'only a page visit is remembered');
 assert.equal(JSON.parse(preview.respond({url:'/api/service-state?booking=off'}).body).enabled,false);
 assert.equal(preview.respond({url:'/api/contact/policy',headers:remembered}).status,503);
 assert.equal(preview.respond({url:'/api/contact/policy'}).status,200);
 assert.equal(preview.respond({url:'/api/availability?service_id=dr-sanjay-gupta&day=2026-11-17&questions=1&booking=on'}).status,200);
 assert.equal(preview.respond({url:'/api/booking-policy',headers:remembered}).status,404,'booking API is not found while OFF');
 const css=preview.respond({url:'/assets/index-AbC1.css'});
 assert.equal(css.status,200);assert.equal(css.headers['content-type'],'text/css; charset=utf-8');assert.equal(text(css),'body{margin:0}');
 assert.equal(preview.respond({url:'/assets/gone.js'}).status,404,'listed but not on disk');
 assert.equal(preview.respond({url:'/assets/clinic-booking-XyZ.js',headers:remembered}).status,404);
 assert.equal(preview.respond({url:'/robots.txt'}).status,200);
 assert.equal(preview.respond({url:'/studio'}).status,503);
 assert.match(text(preview.respond({url:'/__preview'})),/Preview pages/);
 assert.equal(preview.respond({url:'/nope'}).status,404);assert.equal(text(preview.respond({url:'/nope'})),'Page not found');
 assert.equal(preview.respond({method:'POST',url:'/'}).status,404);
 const head=preview.respond({method:'HEAD',url:'/'});
 assert.equal(head.status,200);assert.equal(head.body,'');
 assert.deepEqual(preview.defaults,{booking:'on',contact:'open'});
 const closedByDefault=createPreview({dist,booking:'off',contact:'closed',settings});
 assert.match(text(closedByDefault.respond({url:'/'})),/\/ off</);
 assert.match(text(closedByDefault.respond({url:'/?booking=on'})),/\/ on</);
});

test('the real server: a page, a pretend message, a bad body and a broken build',async t=>{
 const dist=builtSite(t),running=await createPreview({dist,settings}).listen({port:0});
 t.after(()=>running.close());
 assert.match(running.origin,/^http:\/\/127\.0\.0\.1:\d+$/);
 const page=await fetch(running.origin+'/dr-sanjay-gupta?booking=off');
 assert.equal(page.status,200);assert.match(await page.text(),/\/dr-sanjay-gupta off</);
 assert.equal(page.headers.get('set-cookie'),`${BOOKING_COOKIE}=off; Path=/; SameSite=Lax`);
 const sent=await fetch(running.origin+'/api/contact/start',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({request_id:'live-1',name:'Asha Rao',email:'asha@example.com',message:'Hello'})});
 assert.equal(sent.status,200);assert.equal((await sent.json()).state,'awaiting_verification');
 const garbled=await fetch(running.origin+'/api/contact/start',{method:'POST',body:'{not json'});
 assert.equal(garbled.status,422);
 const head=await fetch(running.origin+'/',{method:'HEAD'});
 assert.equal(head.status,200);assert.equal(await head.text(),'');
 unlinkSync(join(dist,'appointment-surface-manifest.json'));
 const broken=await fetch(running.origin+'/');
 assert.equal(broken.status,500);assert.match(await broken.text(),/Preview error: No built site/);
});

test('--help prints the usage notes and starts nothing; otherwise the preview starts and says where',async t=>{
 assert.match(helpText(),/HOW TO USE IT/);assert.match(helpText(),/--booking on\|off/);assert.doesNotMatch(helpText(),/^\s*\*/m);
 const lines=[];
 assert.equal(await main(['--help'],line=>lines.push(line)),null);
 assert.match(lines.join('\n'),/WHAT IT ANSWERS FOR THE API/);
 const dist=builtSite(t),said=[];
 const running=await main(['--dist',dist,'--port','0','--booking','off'],line=>said.push(line));
 t.after(()=>running.close());
 assert.match(said.join('\n'),/booking OFF, message form open/);assert.match(said.join('\n'),/__preview/);
 const page=await fetch(running.origin+'/');
 assert.match(await page.text(),/\/ off</);
 await assert.rejects(main(['--dist',join(dist,'nothing-here')],()=>{}),/No built site/);
});
