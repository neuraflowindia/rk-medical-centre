// Real project controls must recover read failures without creating a payable request.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {displayProof} from '../tools/checks/website-display.mjs';
import {policy,availability} from './booking-browser-fixture.mjs';
const root=process.env.BOOKING_WEBSITE_PROOF_PROJECT,site=process.env.BOOKING_WEBSITE_PROOF_SITE;
test('actual booking form retries failed policy and schedule reads without starting checkout',{skip:!root||!site},async()=>{
 const {chromium}=await import(pathToFileURL(resolve(process.env.BOOKING_BROWSER_NODE_MODULES||resolve(site,'node_modules'),'playwright-core/index.mjs')).href);
 const browser=await chromium.launch({headless:true,executablePath:process.env.BOOKING_CHROME_EXECUTABLE,args:['--no-sandbox']});
 const proof=await displayProof(root,site,{enabled:true});
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 const business=JSON.parse(readFileSync(resolve(root,'appointment-settings/business-settings.json'))),clinic=business.version===2;
 const offered=policy();offered.policy.services=business.services;
 if(clinic){offered.policy=business;offered.payment_availability=Object.fromEntries(business.payment_methods.map(method=>[method,{available:true,reason:null}]));}
 let policyFailure=true,schedule='failed';const calls=[],errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==proof.origin)return route.abort();
  if(!url.pathname.startsWith('/api/')||url.pathname==='/api/service-state')return route.continue();
  calls.push(url.pathname);const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname==='/api/booking-policy')return policyFailure?send({code:'temporarily_unavailable'},503):send(offered);
  if(url.pathname==='/api/availability'){
   const selected=offered.policy.services.find(service=>service.id===url.searchParams.get('service_id')),questions=Number(url.searchParams.get('questions'));
   assert.ok(selected);const result=availability();result.date=url.searchParams.get('day');
   result.service={...selected,questions,amount_paise:selected.pricing.amount_paise*questions,currency:'INR',timezone:offered.policy.timezone,quote_version:offered.quote_version};
   if(clinic){
    const resource=business.resources.find(item=>item.id===selected.resource_id),starts=result.date+'T06:00:00Z';
    Object.assign(result.service,{facts_version:2,resource_id:resource.id,resource_name:resource.name,location:business.location,
     display_duration:business.display_duration,payment_methods:business.payment_methods});
    result.slots=[{starts_at:starts,ends_at:new Date(Date.parse(starts)+selected.duration_minutes*60000).toISOString()}];
   }
   return schedule==='failed'?send({code:'temporarily_unavailable'},503):send({...result,slots:schedule==='empty'?[]:result.slots});
  }
  return send({code:'unexpected_fixture_request'},500);
 });
 try{
  await page.goto(proof.origin+'/booking');
  await page.locator('[role=alert]').filter({hasText:/\S/}).first().waitFor();
  if(clinic){
   const submit=page.locator('button[type=submit]'),slots=page.locator('.slot-choices input[type=radio]');
   assert.equal(await submit.isDisabled(),true);policyFailure=false;
   await page.getByRole('button',{name:'Reload appointment options',exact:true}).click();
   const retry=page.getByRole('button',{name:'Check available times again',exact:true});await retry.waitFor();
   assert.equal(await slots.count(),0);assert.equal(await submit.isDisabled(),true);
   schedule='empty';await retry.click();
   await page.getByText('No appointments are available on this date. Please choose another date.',{exact:true}).waitFor();
   assert.equal(await submit.isDisabled(),true);
   schedule='ready';await page.reload();await slots.first().waitFor();
   for(const service of business.services){
    const doctor=page.locator('.doctor-choices input[type=radio][value="'+service.id+'"]');await doctor.check();
    await slots.first().waitFor();assert.equal(await doctor.isChecked(),true);
   }
   await slots.first().check();
   await page.locator('input[id$="full_name"]').fill('Synthetic Customer');
   await page.locator('input[id$="email"]').fill('customer@example.com');await page.locator('input[id$="phone"]').fill('+919876543210');
   await page.locator('textarea[id$="notes"]').fill('A synthetic appointment question.');
   await page.getByRole('radio',{name:/^Pay at the clinic/}).check();
   assert.equal(await submit.isDisabled(),true,'An unchecked acknowledgement must prevent submission');
   await page.locator('input[type=checkbox]').check();assert.equal(await submit.isDisabled(),false);
   await page.locator('input[type=checkbox]').uncheck();assert.equal(await submit.isDisabled(),true);
   assert.ok(calls.filter(path=>path==='/api/booking-policy').length>=3);
   assert.ok(calls.every(path=>['/api/booking-policy','/api/availability'].includes(path)),'Read retry must never create a context, order, verification send or payment');
   assert.deepEqual(errors,[]);return;
  }
  const stepped=await page.locator('.sarsa-booking').count()>0;
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  policyFailure=false;
  await page.getByRole('button',{name:stepped?'Reload service details':'Reload consultation details',exact:true}).click();
  const retry=page.getByRole('button',{name:/^(Try again|Retry available times|Check available times)$/});
  await retry.waitFor();
  assert.equal(await page.locator('input[name=time],button[data-booking-time]').count(),0);
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  schedule='empty';await retry.click();
  await page.getByText(stepped?'No times are available on this date. Please choose another date.':'There are no available times on this day. Please choose another date.',{exact:true}).waitFor();
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  // A fresh page visit checks the same saved business rules; no fake receipt is introduced.
  schedule='ready';await page.reload();
  const slot=page.locator('input[name=time],button[data-booking-time]').first();await slot.waitFor();
  for(const service of offered.policy.services){
   if(stepped)await page.locator('input[name=service][value="'+service.id+'"]').check();
   else await page.locator('#readingType').selectOption(service.id);
   await slot.waitFor();
   if(stepped)assert.equal(await page.locator('.selected-service').innerText(),service.name);
   else assert.equal(await page.locator('#readingType').inputValue(),service.id);
  }
  if(await slot.evaluate(node=>node.tagName==='INPUT'))await slot.check();else await slot.click();
  if(stepped){
   await page.getByRole('button',{name:'Fill your details →',exact:true}).click();
   await page.getByRole('button',{name:'Review your booking →',exact:true}).click();
   assert.equal(await page.locator('#full_name').evaluate(node=>node.validity.valueMissing),true);
  }
  await page.locator('#full_name,#name').fill('Synthetic Customer');
  await page.locator('#email').fill('customer@example.com');await page.locator('#phone').fill('+919876543210');
  await page.locator('#notes').fill('A synthetic appointment question.');
  if(stepped){
   await page.getByLabel('Country calling code',{exact:true}).selectOption('other');
   assert.equal(await page.locator('#phone').evaluate(node=>node.checkValidity()),true);
   await page.getByRole('button',{name:'Review your booking →',exact:true}).click();
   assert.equal(await page.locator('#review-title').evaluate(node=>document.activeElement===node),true);
   for(const button of await page.getByRole('button',{name:'Edit',exact:true}).all())await button.click();
   assert.equal(await page.locator('#full_name').inputValue(),'Synthetic Customer');
   assert.equal(await page.locator('#notes').inputValue(),'A synthetic appointment question.');
   for(const button of await page.locator('.journey-nav button').all())await button.click();
   await page.getByRole('button',{name:'← Date & time',exact:true}).click();
   await page.getByRole('button',{name:'← Service',exact:true}).click();
   await page.getByRole('button',{name:'Choose a date and time →',exact:true}).click();
  }
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true,'An unchecked acknowledgement must prevent submission');
  await page.locator('input[type=checkbox]').check();
  assert.equal(await page.locator('button[type=submit]').isDisabled(),false);
  await page.locator('input[type=checkbox]').uncheck();
  assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  assert.ok(calls.filter(path=>path==='/api/booking-policy').length>=3);
  assert.ok(calls.every(path=>['/api/booking-policy','/api/availability'].includes(path)),'Read retry must never create a context, order, verification send or payment');
  assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close();await proof.close();}
});
