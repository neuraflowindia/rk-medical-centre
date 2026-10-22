import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {available,id,companyFixture,waitText} from './company-page-fixture.mjs';
const calendarButtons='<button type="button" data-google-resource="calendar_first">Connect Doctor First’s Calendar</button><button type="button" data-google-resource="calendar_second">Connect Doctor Second’s Calendar</button>';
const open=page=>page.getByText('Google connections and record copies',{exact:true}).click();

test('company names both private calendars and finishes the matching saved consent',{skip:!available},()=>companyFixture(async(page,state)=>{
 await open(page);let pending=true;
 state.handlers.set('/api/company/resources/status',({reply})=>reply({resources:[
  {resource:'calendar_first',label:'Doctor First Calendar',owner_email:'doctor-one@example.test',connected:true},
  {resource:'calendar_second',label:'Doctor Second Calendar',owner_email:'doctor-two@example.test',connected:false}],
  pending:pending?[{resource:'calendar_second',label:'Doctor Second Calendar',attempt_id:id}]:[]}));
 await page.click('#google-refresh');await waitText(page,'#google-status','Doctor First Calendar (doctor-one@example.test): connected');
 assert.match(await page.locator('#google-status').textContent(),/Doctor Second Calendar \(doctor-two@example.test\): not connected/);
 state.handlers.set('/api/company/resources/finish',({body,reply})=>{assert.equal(body.attempt_id,id);pending=false;reply({code:'saved'});});
 await page.getByRole('button',{name:'Finish Doctor Second Calendar connection',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#google-pending').children.length===0);
 assert.equal(await page.locator('[data-google-resource="calendar"]').count(),0);
 for(const [width,height]of[[1440,900],[390,844]]){
  await page.setViewportSize({width,height});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const resource of ['first','second'])assert.equal(await page.locator(`[data-google-resource="calendar_${resource}"]`).isVisible(),true);
  if(process.env.BOOKING_CALENDAR_VISUAL_DIR){await mkdir(process.env.BOOKING_CALENDAR_VISUAL_DIR,{recursive:true});await page.screenshot({path:join(process.env.BOOKING_CALENDAR_VISUAL_DIR,`company-calendars-${width}.png`),fullPage:true});}
 }
},{calendarButtons}));

test('each doctor connection sends only its own resource and refuses an untrusted redirect',{skip:!available},()=>companyFixture(async(page,state)=>{
 await open(page);state.handlers.set('/api/company/resources/start',({reply})=>reply({authorization_url:'https://foreign.example.test/'}));
 for(const resource of ['first','second']){
  await page.locator(`[data-google-resource="calendar_${resource}"]`).click();await waitText(page,'#google-status','could not start');
  assert.deepEqual(state.calls.filter(call=>call.path==='/api/company/resources/start').at(-1).body,{resource:'calendar_'+resource});
 }
},{calendarButtons}));
