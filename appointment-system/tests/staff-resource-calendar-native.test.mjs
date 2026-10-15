import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {staffFixture,available,id,other,waitText} from './staff-page-fixture.mjs';
const evidenceDir=process.env.BOOKING_STAFF_EVIDENCE_DIR||'/tmp/project001-staff-resource-browser';
const resources=[{id:'doctor-one',name:'First doctor'},{id:'doctor-two',name:'Second doctor'}];
const context={code:'ok',policy_version:2,resources,timezone:'Asia/Kolkata',today:'2031-04-04'};
const row={id,kind:'appointment',state:'confirmed',starts_at:'2031-04-04T10:30:00Z',ends_at:'2031-04-04T10:50:00Z',service:'Synthetic consultation',name:'Fixture Person',resource_id:'doctor-one',resource_name:'First doctor'};
async function ready(page,state,agency=false){
 state.status={...state.status,role:agency?'agency':'client',can_manage_schedule:true};
 state.handlers.set('/api/studio/calendar/time-context',({reply})=>reply(context));
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#calendar-resource-field').hidden&&!document.querySelector('#calendar-next').disabled);
}
async function block(page){await page.fill('#closure-start','2031-04-04T16:00');await page.fill('#closure-end','2031-04-04T16:20');await page.fill('#closure-reason','Synthetic commitment');await page.locator('#calendar-close button').click();}
test('resource view labels all-doctor month counts and never disguises unvisited pages as an empty day',{skip:!available},()=>staffFixture(async(page,state)=>{
 state.handlers.set('/api/studio/calendar/list',({body,reply})=>reply({code:'ok',day:body.day,timezone:context.timezone,items:[body.after?{...row,id:other,resource_id:'doctor-two',resource_name:'Second doctor'}:row],next_cursor:body.after?null:id}));await ready(page,state);
 await page.selectOption('#calendar-resource','doctor-two');await waitText(page,'#calendar-status','Showing 0 of 1 loaded records');assert.match(await page.locator('#calendar-status').textContent(),/More records/);assert.match(await page.locator('#calendar-month-status').textContent(),/all doctors/);
 await page.click('#calendar-more');await waitText(page,'#calendar-status','Showing 1 of 2');assert.equal(await page.locator('#calendar-items li:visible').count(),1);assert.match(await page.locator('#calendar-items li:visible').textContent(),/Second doctor/);
}));
test('closure requires deliberate resource and preserves exact doctor or all-doctor selection',{skip:!available},()=>staffFixture(async(page,state)=>{
 await ready(page,state);await block(page);assert.equal(state.calls.filter(c=>c.path.endsWith('/calendar/close')).length,0);
 state.handlers.set('/api/studio/calendar/close',({body,reply})=>reply({code:'closed',active:true,claim_ids:body.resource_id==='*'?[id,other]:[id]}));
 await page.selectOption('#closure-resource','doctor-one');await block(page);await waitText(page,'#calendar-action-status','Existing appointments have not been changed');assert.equal(state.calls.filter(c=>c.path.endsWith('/calendar/close')).at(-1).body.resource_id,'doctor-one');
 await page.selectOption('#closure-resource','*');await block(page);await page.waitForFunction(()=>!document.querySelector('#calendar-next').disabled);assert.equal(state.calls.filter(c=>c.path.endsWith('/calendar/close')).at(-1).body.resource_id,'*');
}));
test('malformed v2 closure acknowledgement stays pending; exact operation check resolves without second write',{skip:!available},()=>staffFixture(async(page,state)=>{
 await ready(page,state);state.handlers.set('/api/studio/calendar/close',({reply})=>reply({code:'closed',active:true,claim_ids:[id,id]}));await page.selectOption('#closure-resource','*');await block(page);await waitText(page,'#calendar-action-status','could not confirm');assert.equal(await page.locator('#closure-resource').isDisabled(),true);
 state.handlers.set('/api/studio/calendar/action-result',({body,reply})=>reply({code:'closed',operation_id:body.operation_id}));await page.click('#calendar-repeat');await waitText(page,'#calendar-action-status','Earlier changes checked');assert.equal(state.calls.filter(c=>c.path.endsWith('/calendar/close')).length,1);
}));
test('approved agency can manage schedule but cannot use owner-only contact or Google controls',{skip:!available},()=>staffFixture(async(page,state)=>{
 state.handlers.set('/api/studio/calendar/list',({body,reply})=>reply({code:'ok',day:body.day,timezone:context.timezone,items:[row],next_cursor:null}));
 state.handlers.set('/api/studio/appointments/detail',({reply})=>reply({code:'ok',claim_id:id,revision:1,can_cancel:true,can_reschedule:true,policy_guidance:'no_payment_received',payment_method:'at_clinic',starts_at:row.starts_at,name:row.name,service:row.service,resource_name:row.resource_name,state:'confirmed',reference:other}));
 await ready(page,state,true);assert.equal(await page.locator('#calendar-panel').isVisible(),true);for(const selector of ['#booking-lookup','#connect','#connect-records','#prepare-workbook'])assert.equal(await page.locator(selector).isVisible(),false);
 await page.getByRole('button',{name:'Manage appointment',exact:true}).click();await page.locator('#appointment-cancel').waitFor();assert.match(await page.locator('#appointment-summary').textContent(),/First doctor/);assert.match(await page.locator('#appointment-policy').textContent(),/No online payment/);
 await mkdir(evidenceDir,{recursive:true});for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${evidenceDir}/agency-calendar-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#calendar-close input')].every(n=>n.getBoundingClientRect().right<=document.querySelector('#calendar-panel').getBoundingClientRect().right-10)),'Closure fields stay inside panel');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth).map(n=>({tag:n.tagName,id:n.id,width:n.getBoundingClientRect().width,right:n.getBoundingClientRect().right})).slice(0,10))));}
 await page.evaluate(()=>{document.querySelector('#booking-lookup').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('#connect').click();document.querySelector('#prepare-workbook').click();});assert.equal(state.calls.some(c=>c.path.endsWith('/appointments/lookup')||c.path.endsWith('/resources/start')||c.path.endsWith('/workbook/prepare')),false);
 state.handlers.set('/api/studio/appointments/cancel',({reply})=>reply({code:'cancelled',revision:2}));await page.fill('#appointment-reason','Synthetic cancellation');await page.check('#appointment-ack');await page.locator('#appointment-cancel button').click();await waitText(page,'#appointment-status','Appointment cancelled');
}));
test('agency without explicit schedule permission sees no calendar and cannot submit a forged closure event',{skip:!available},()=>staffFixture(async(page,state)=>{
 state.status={signed_in:true,role:'agency',email:'agency@example.test',can_manage_schedule:false};await page.reload();await waitText(page,'#status','cannot check');assert.equal(await page.locator('#calendar-panel').isVisible(),false);const before=state.calls.length;
 await page.evaluate(()=>document.querySelector('#calendar-close').dispatchEvent(new Event('submit',{cancelable:true})));assert.equal(state.calls.slice(before).some(c=>c.path.endsWith('/calendar/close')),false);
}));
test('invalid resource context fails closed and agency sign-in is only shown when server enables it',{skip:!available},()=>staffFixture(async(page,state)=>{
 state.handlers.set('/api/studio/calendar/time-context',({reply})=>reply({...context,resources:[resources[0],resources[0]]}));await page.reload();await waitText(page,'#calendar-status','could not load');assert.equal(await page.locator('#calendar-month button').count(),0);
 state.status={signed_in:false,agency_schedule_signin:true};await page.reload();await page.locator('#agency-schedule-signin').waitFor();state.status={signed_in:false,agency_schedule_signin:false};await page.reload();await page.locator('#signin-panel').waitFor();assert.equal(await page.locator('#agency-schedule-signin').isVisible(),false);
}));

test('client contact correction for a saved clinic booking requires phone verification but no invented payment',{skip:!available},()=>staffFixture(async(page,state)=>{
 await ready(page,state);state.handlers.set('/api/studio/appointments/lookup',({reply})=>reply({code:'ok',reference:id,claim_id:other,revision:2,name:'Fixture Person',service:'Synthetic consultation',state:'confirmed',starts_at:row.starts_at,email:null,phone:'+919999999999',unresolved_payments:0,payments:[],contact_email_required:false,facts_version:2,payment_method:'at_clinic',resource_id:'doctor-one',resource_name:'First doctor',amount_due_paise:10000}));
 await page.fill('#booking-reference',id);await page.locator('#booking-lookup button').click();await page.locator('#booking-support-change').waitFor();assert.equal(await page.locator('#support-payment').isVisible(),false);assert.match(await page.locator('#support-verification-label').textContent(),/saved clinic appointment/);
 await page.fill('#support-phone','+918888888888');await page.fill('#support-reason','Synthetic verified correction');await page.locator('#booking-support-change').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));assert.equal(state.calls.some(c=>c.path.endsWith('/appointments/support')),false);
 state.handlers.set('/api/studio/appointments/support',({body,reply})=>reply({code:'contact_corrected',revision:3,reference:id,operation_id:body.operation_id}));await page.check('#support-verified');await page.locator('#booking-support-change button').click();await waitText(page,'#booking-support-status','Contact details corrected');const call=state.calls.find(c=>c.path.endsWith('/appointments/support'));assert.equal(call.body.verified_payment_id,null);assert.equal(call.body.verification_confirmed,true);
}));
test('staff discretion shows past confirmed appointment controls and keeps contact-only policy private',{skip:!available},()=>staffFixture(async(page,state)=>{
 const past={...row,starts_at:'2020-04-04T10:30:00Z',ends_at:'2020-04-04T10:50:00Z'};
 state.handlers.set('/api/studio/calendar/list',({body,reply})=>reply({code:'ok',day:body.day,timezone:context.timezone,items:[past],next_cursor:null}));
 state.handlers.set('/api/studio/appointments/detail',({reply})=>reply({code:'ok',claim_id:id,revision:1,can_cancel:true,can_reschedule:true,policy_guidance:'staff_decision',appointment_changes:'staff_discretion',payment_method:'online',starts_at:past.starts_at,name:past.name,service:past.service,resource_name:past.resource_name,state:'confirmed',reference:other}));
 await ready(page,state);await page.getByRole('button',{name:'Manage appointment',exact:true}).click();await page.locator('#appointment-cancel').waitFor();
 assert.equal(await page.locator('#appointment-reschedule').isVisible(),true);assert.match(await page.locator('#appointment-policy').textContent(),/clinic decides/);
 assert.doesNotMatch(await page.locator('#appointment-policy').textContent(),/12 hours|24 hours|14 days/);
 await mkdir(evidenceDir,{recursive:true});for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.locator('#appointment-detail').screenshot({path:`${evidenceDir}/staff-discretion-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 state.handlers.set('/api/studio/appointments/reschedule',({reply})=>reply({code:'rescheduled',revision:2,starts_at:'2031-04-05T10:30:00Z'}));
 await page.fill('#appointment-start','2031-04-05T16:00');await page.fill('#appointment-move-reason','Patient called about the earlier visit');await page.locator('#appointment-reschedule button').click();await waitText(page,'#appointment-status','Appointment moved');assert.match(await page.locator('#appointment-policy').textContent(),/clinic decides/);
}));
