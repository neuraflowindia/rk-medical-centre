/** Built real project view -> intercepted same-origin request -> native app/SQL.
 * All non-fixture browser traffic is blocked. The provider window is synthetic.
 */
import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {displayProof} from '../tools/checks/website-display.mjs';
const root=process.env.BOOKING_WEBSITE_PROOF_PROJECT,site=process.env.BOOKING_WEBSITE_PROOF_SITE;
if(!root || !site)throw Error('Explicit isolated project and site required.');
const lines=createInterface({input:process.stdin,crlfDelay:Infinity}),pending=new Map();let sequence=0;
lines.on('line',line=>{const value=JSON.parse(line),resolve=pending.get(value.id);pending.delete(value.id);resolve(value);});
const bridge=(path,options={})=>new Promise(resolve=>{const id=++sequence;pending.set(id,resolve);process.stdout.write(JSON.stringify({id,path,...options})+'\n');});
const {chromium}=await import(pathToFileURL(resolve(process.env.BOOKING_BROWSER_NODE_MODULES||resolve(site,'node_modules'),'playwright-core/index.mjs')).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.BOOKING_CHROME_EXECUTABLE,args:['--no-sandbox']}),proof=await displayProof(root,site);
const context=await browser.newContext(),errors=[],observations=[];proof.setEnabled(true);let page;
try{
 await context.addInitScript(()=>{
  window.__isolatedPayment={opened:0,options:null};
  window.Razorpay=function(options){this.open=()=>{window.__isolatedPayment.opened++;window.__isolatedPayment.options=options;};this.close=()=>{};};
 });
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==proof.origin)return route.abort();
  if(!url.pathname.startsWith('/api/') || url.pathname==='/api/service-state')return route.continue();
  const body=request.postDataJSON(),secret=request.headers()['x-booking-receipt'];
  const response=await bridge(url.pathname+url.search,{...(body?{body}:{}),...(secret?{credential:{secret}}:{})});
  observations.push({path:url.pathname,status:response.status,code:response.body.code,
   appointment_state:response.body.receipt?.appointment_state||response.body.appointment_state});
  return route.fulfill({status:response.status,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(response.body)});
 });
 page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(proof.origin+'/booking');
 const fullName=page.locator('#full_name,#name,input[id$="full_name"]');await fullName.waitFor();
 const settings=(await bridge('test:settings')).body;
 const clinic=await page.locator('.doctor-choices').count()>0;
 if(clinic){
  const doctor=page.locator('.doctor-choices input[type="radio"]').nth(settings.doctor_index||0);
  await doctor.waitFor();await doctor.check();
 }
 const email=clinic?page.locator('input[id$="email"]'):page.locator('#email');
 const phone=clinic?page.locator('input[id$="phone"]'):page.locator('#phone');
 const date=(await bridge('test:date')).body.value;
 await page.locator('.abs-date-picker').filter({has:page.getByText('Appointment date',{exact:true})}).locator('.abs-date-group').click();
 const targetDay=Number(date.slice(-2));await page.locator('.abs-calendar-cell').first().waitFor();
 let cells=page.locator('.abs-calendar-cell:not([data-outside-month]):not([data-disabled])').filter({hasText:new RegExp('^'+targetDay+'$')});
 for(let moves=0;!(await cells.count()) && moves<2;moves++)await page.getByRole('button',{name:'Next month',exact:true}).click();
 await cells.first().click();
 await fullName.fill('Synthetic Customer');
 if(!settings.no_email)await email.fill('Customer@example.com');
 await phone.fill('9876543210');
 const slot=page.locator(clinic?'.slot-choices input[type="radio"]':'input[name="time"],button[data-booking-time]').first();await slot.waitFor();
 if(await slot.evaluate(node=>node.tagName==='INPUT'))await slot.check();else await slot.click();
 const send=page.getByRole('button',{name:'Send email code',exact:true});
 if(await send.count()){
  await send.click();await page.getByLabel('Email verification code',{exact:true}).waitFor();
  const code=(await bridge('test:verification-code')).body.value;
  await page.getByLabel('Email verification code',{exact:true}).fill(code);await page.getByRole('button',{name:'Verify code',exact:true}).click();
  await page.getByText('Your email address is verified.',{exact:true}).waitFor();
 }
 if(clinic)await page.getByRole('radio',{name:settings.payment_method==='at_clinic'?/^Pay at the clinic/:/^Pay online/}).check();
 await page.locator('input[type="checkbox"]').check();await page.locator('button[type="submit"]').click();
 if(settings.payment_method!=='at_clinic'){
 await page.waitForFunction(()=>window.__isolatedPayment.opened===1);
 const order=await page.evaluate(()=>window.__isolatedPayment.options.order_id),signed=(await bridge('test:payment-capture',{order})).body;
 await page.evaluate(signed=>window.__isolatedPayment.options.handler(signed),signed);
 }
 await page.getByRole('heading',{name:/Your appointment is confirmed/}).waitFor();
 assert.equal(await page.evaluate(()=>window.__isolatedPayment.opened),settings.payment_method==='at_clinic'?0:1);assert.deepEqual(errors,[]);
 if(clinic){
  assert.equal(await page.locator('a[href^="https://meet.google.com/"]').count(),0);
  await page.goto(proof.origin+'/booking-details');
  await page.getByLabel('Full name',{exact:true}).fill('Synthetic Customer');
  await page.getByLabel('Phone number',{exact:true}).fill('9876543210');
  await page.getByRole('button',{name:'View my bookings ↗',exact:true}).click();
  await page.getByRole('heading',{name:'Your appointment details',exact:true}).waitFor();
  assert.equal(await page.locator('a[href^="https://meet.google.com/"]').count(),0);
  // A full navigation has its own window and reruns the isolated init script.
  // The earlier confirmation already proved exactly one online payment open;
  // the read-only lookup must not open another payment in this new document.
  assert.equal(await page.evaluate(()=>window.__isolatedPayment.opened),0);
  assert.ok(observations.filter(item=>item.path==='/api/booking/details').length>=2,'The clinic lookup reads list and selected detail');
 }
 await page.screenshot({path:process.env.BOOKING_WEBSITE_SCREENSHOT||'/tmp/abs-booking-website-proof.png',fullPage:false});
 proof.setEnabled(false);
 // Read the new owner state through the real foreground event. Idle public
 // reads intentionally no longer run quickly enough for this bounded check.
 await page.waitForTimeout(110);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(clinic=>!document.body.innerText.includes(clinic?'Your appointment details':'Your appointment is confirmed'),clinic,{timeout:10000});
 assert.equal(await page.evaluate(()=>window.__isolatedPayment.opened),clinic||settings.payment_method==='at_clinic'?0:1);
 assert.deepEqual(errors,[]);
 await bridge('test:finished');
}catch(error){
 process.stderr.write(JSON.stringify({error:error.message,observations,synthetic_page_text:page?await page.locator('body').innerText():null})+'\n');throw error;
}finally{lines.close();await context.close();await browser.close();await proof.close();}
