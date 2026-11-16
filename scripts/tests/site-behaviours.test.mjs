import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {headerTravel,bindSiteHeader,AWAY_AFTER,DOWN_TRAVEL,UP_TRAVEL} from '../../src/site/parts/site-header/site-header.behaviour.mjs';
import {paintMotionToggle,noticeWords,detailsNoticeMarkup,privacyChoicesMarkup,bindSiteFooter} from '../../src/site/parts/site-footer/site-footer.behaviour.mjs';
import {paintOpenSign,bindOpenSigns} from '../../src/site/parts/open-sign/open-sign.behaviour.mjs';
import {paintClosing,bindClosing} from '../../src/site/parts/closing/closing.behaviour.mjs';
import {rowHolds,paintToday,bindHoursTable} from '../../src/site/parts/hours-table/hours-table.behaviour.mjs';
import {barVisible,bindActionBar} from '../../src/site/parts/action-bar/action-bar.behaviour.mjs';
import {callAction,bindCallPanel} from '../../src/site/parts/call-panel/call-panel.behaviour.mjs';
import {nextChip,bindDoctorCards} from '../../src/site/parts/doctor-card/doctor-card.behaviour.mjs';
import {nextTab,shelfPlan,selectTab,arrangeShelf,markClamped,bindReviewShelf,everyReview} from '../../src/site/parts/review-shelf/review-shelf.behaviour.mjs';
import {shelfStep,shelfEnds,shelfIndex,shelfStill,bindStillShelf} from '../../src/site/parts/still-shelf/still-shelf.behaviour.mjs';
import {viewerStep,viewerItems,viewerTitle,bindCertificates,openViewerWalk} from '../../src/site/parts/certificate-frame/certificate-frame.behaviour.mjs';
import {rowsToClose,bindQuestions} from '../../src/site/parts/questions/questions.behaviour.mjs';
import {bindEssentialsStrip} from '../../src/site/parts/essentials-strip/essentials-strip.behaviour.mjs';
import {createSheets} from '../../src/site/parts/sheet/sheet.behaviour.mjs';
import {bindDialog} from '../../src/clinic/dialog.js';
import {savePreference,parsePreference,preferenceKey} from '../../src/clinic/visitor-preferences.mjs';
import {setBookingAddress} from '../../src/clinic/booking-links.mjs';
import {liveSign} from '../../src/clinic/page-content/shared.mjs';
import {shelfSelection} from '../../src/clinic/review-list.mjs';
import {createMotion} from '../../src/site/motion/motion.mjs';
import {renderedApp,TEST_NOW} from './support/page-contract.mjs';
import {createPage,installGlobals,Event} from './support/mini-dom.mjs';

const shell=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const dialogs=/<dialog id="reader"[\s\S]*<\/dialog>/.exec(shell)[0];
/** The Home, as printed, with the shell's dialogs, in a test document; services as the runtime gives them. */
function homePage({mode='on',width=1440,media={}}={}){
 const page=createPage({width,height:800,media,body:`<div id="app">${renderedApp('/',mode)}</div>${dialogs}`});
 const motion=createMotion({documentObject:page.document,windowObject:page.window});
 const sheets=createSheets({documentObject:page.document});
 sheets.refresh({path:'/',mode,now:TEST_NOW,search:''});
 const listeners=new Set();let enabled=mode==='on';
 const booking={enabled:()=>enabled,subscribe:(listener,{signal}={})=>{listeners.add(listener);signal?.addEventListener('abort',()=>listeners.delete(listener));},set(value){enabled=value;for(const listener of listeners)listener(value);}};
 const chosen=[];
 const services={reader:sheets.reader,menu:sheets.menu,viewer:sheets.viewer,call:sheets.call,motion,booking,privacy:{choose:value=>chosen.push(value)}};
 const abort=new AbortController();
 return {page,app:page.document.getElementById('app'),services,sheets,motion,booking,chosen,abort,context:{signal:abort.signal,services,windowObject:page.window,ctx:{path:'/',mode}},
  $:selector=>page.document.querySelector(selector),$$:selector=>page.document.querySelectorAll(selector),done(){abort.abort();motion.dispose();}};
}
const key=(target,name)=>target.dispatchEvent(new Event('keydown',{key:name}));

test('the phone header leaves after 48 px of travel down and returns after 24 px up, however slowly',()=>{
 assert.deepEqual([AWAY_AFTER,DOWN_TRAVEL,UP_TRAVEL],[120,48,24]);
 let state={y:0,down:0,up:0,away:false};
 const go=(y,options)=>{state=headerTravel(state,y,options);return state.away;};
 assert.equal(go(100),false,'never near the top');assert.equal(go(150),false,'48 px past the start are needed');assert.equal(go(200),true);
 for(let y=198;y>178;y-=2)go(y);assert.equal(state.away,true,'22 px up is not enough');assert.equal(go(174),false,'24 px up brings it back, at any speed');
 assert.equal(go(174),false,'standing still changes nothing');assert.equal(go(400),true);
 assert.equal(go(500,{phone:false}),false,'laptops keep the header');state.away=true;assert.equal(go(600,{blocked:true}),false,'never while a dialog is open or the keyboard is in it');
 state={y:300,down:60,up:0,away:true};assert.equal(go(90),false);
});

test('header wiring: the menu button opens the menu; scrolling hides and returns the header on phones',()=>{
 const {page,app,services,context,$,done}=homePage({width:390,media:{'(max-width: 1023px)':true}});
 const restore=installGlobals(page);
 try{
  bindSiteHeader(app,context);
  const header=$('[data-site-header]'),button=$('[data-open-menu]');
  for(let y=0;y<=400;y+=40){page.scroll(y);page.frames(1);}
  assert.ok(header.classList.contains('is-away')&&header.classList.contains('is-scrolled'));
  for(let y=396;y>=370;y-=2){page.scroll(y);page.frames(1);}
  assert.ok(!header.classList.contains('is-away'));
  const click=new Event('click');button.dispatchEvent(click);
  assert.ok(click.defaultPrevented&&$('#menu').open);assert.equal(button.getAttribute('aria-expanded'),'true');
  page.scroll(900);page.frames(1);assert.ok(!header.classList.contains('is-away'),'the header stays while a dialog is open');
  page.media('(max-width: 1023px)').set(false);assert.equal($('#menu').open,false,'the menu belongs to the phone layout');assert.equal(button.getAttribute('aria-expanded'),'false');
  key(button,' ');assert.equal($('#menu').open,true);services.menu.close();
  bindSiteHeader(page.document.createElement('div'),context);
 }finally{restore();done();}
});

test('the footer: Pause motion, "How your details are used" and the privacy choice',()=>{
 const {app,services,context,chosen,$,done}=homePage();
 bindSiteFooter(app,context);
 const toggle=$('[data-motion-toggle]');
 assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(toggle.querySelector('[data-motion-label]').textContent,'Pause motion');
 toggle.click();
 assert.equal(services.motion.state(),'paused');assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.equal(toggle.querySelector('[data-motion-label]').textContent,'Play motion');assert.equal(toggle.querySelector('use').getAttribute('href'),'#i-play');
 paintMotionToggle(toggle,'on');assert.equal(toggle.querySelector('use').getAttribute('href'),'#i-pause');
 $('.site-footer [data-collection-notice]').click();
 assert.equal($('#reader-title').textContent,'How your details are used');assert.equal($('#reader-content').querySelectorAll('p').length,noticeWords().paragraphs.length+(noticeWords().more?1:0),'the way to the full notice is one more paragraph, when there is one');assert.ok($('#reader').open);
 $('.site-footer [data-privacy]').click();
 assert.equal($('#reader-title').textContent,'Your privacy choices');
 $('#reader [data-privacy-accept]').click();assert.deepEqual(chosen,[false]);assert.equal($('#reader').open,false);
 const full=noticeWords({title:'How your details are used',summary:['What we take.','Who sees it.'],more:{label:'Read the full notice',href:'/contact#privacy-notice'}});
 assert.deepEqual(full.paragraphs,['What we take.','Who sees it.']);assert.match(detailsNoticeMarkup(full),/<p>Who sees it\.<\/p><p class="sheet__actions"><a class="text-link" href="\/contact#privacy-notice">/);
 assert.equal(noticeWords({summary:[]}).more,null);assert.match(privacyChoicesMarkup(),/data-privacy-accept/);
 bindSiteFooter(app,{});bindEssentialsStrip();done();
});

test('the live signs are painted from the clinic\'s clock and repainted; a failure leaves them as they were',()=>{
 const {page,app,$,done}=homePage();
 const timers={callbacks:[],setInterval(callback){this.callbacks.push(callback);return this.callbacks.length;},clearInterval(id){this.callbacks[id-1]=null;}};
 let moment=new Date('2026-11-16T05:30:00Z');const painted=[];const abort=new AbortController();
 bindOpenSigns(page.document,{signal:abort.signal,now:()=>moment,timers,onPaint:sign=>painted.push(sign.state)});
 const strip=$('.essentials-strip [data-open-sign]'),header=$('.site-header [data-open-sign]'),sheet=$('#call-sheet [data-open-sign]');
 assert.equal(strip.getAttribute('data-state'),'open');assert.equal(header.querySelector('[data-open-label]').textContent,'Open now');assert.equal(sheet.getAttribute('data-state'),'open','the call sheet\'s sign is live too');
 moment=new Date('2026-11-15T12:00:00Z');timers.callbacks[0]();
 assert.equal(strip.getAttribute('data-state'),'closed');assert.equal(strip.querySelector('[data-open-label]').textContent,'Closed now');
 assert.equal(strip.querySelector('[data-open-label-compact]').textContent,'Closed · opens');assert.equal(strip.querySelector('[data-open-detail-compact]').textContent.replace(/ /g,' '),'Mon 10:00 am');
 assert.deepEqual(painted,['open','closed']);
 moment=new Date('nonsense');timers.callbacks[0]();assert.equal(strip.getAttribute('data-state'),'closed','a bad clock changes nothing');
 abort.abort();assert.equal(timers.callbacks[0],null);
 paintOpenSign(header,liveSign(new Date('2026-11-16T09:30:00Z')));assert.equal(header.getAttribute('data-state'),'later');
 const stop=bindOpenSigns(null,{timers});assert.equal(typeof stop,'function','a missing page is survived');stop();done();
});

test('the closing heading and the Today tag follow the clock and the booking state',()=>{
 const {app,context,booking,$,done}=homePage();
 const title=$('[data-closing-title]'),repaint=bindClosing(app,context);
 repaint({state:'open'});assert.equal(title.textContent.replace(/ /g,' '),'See a doctor today.');assert.equal(title.querySelector('em').textContent,'today.');
 repaint({state:'closed'});assert.equal(title.textContent.replace(/ /g,' '),'Book your next visit.');
 booking.set(false);assert.equal(title.textContent.replace(/ /g,' '),'Arrange your next visit.');
 assert.equal(paintClosing(title,'closed',false),false,'nothing is rewritten when nothing changed');assert.equal(bindClosing(app.querySelector('header'),context),null);
 assert.equal(rowHolds('1 2 3 4 5 6',3),true);assert.equal(rowHolds('0',3),false);assert.equal(rowHolds('',0),false);
 const today=bindHoursTable(app,{now:()=>new Date('2026-11-15T12:00:00Z')});
 const [weekdays,sunday]=app.querySelectorAll('[data-hours-table] tr[data-days]');
 assert.ok(sunday.classList.contains('is-today')&&!sunday.querySelector('[data-today]').hidden&&weekdays.querySelector('[data-today]').hidden);
 paintToday(app,2);assert.ok(weekdays.classList.contains('is-today')&&sunday.querySelector('[data-today]').hidden);today();
 assert.equal(bindHoursTable(app.querySelector('header')),null);done();
});

test('the phone bar shows only when the page\'s own buttons are out of view and nothing covers it',()=>{
 const shown={leadInView:false,leadPassed:true,closingInView:false,footerInView:false,dialogOpen:false,typing:false};
 assert.equal(barVisible(shown),true);
 for(const change of [{leadInView:true},{leadPassed:false},{closingInView:true},{footerInView:true},{dialogOpen:true},{typing:true}])assert.equal(barVisible({...shown,...change}),false,JSON.stringify(change));
 const {page,app,context,services,$,done}=homePage({width:390});
 bindActionBar(app,context);
 const bar=$('[data-action-bar]'),[lead,closing,footer]=page.observers.slice(-3);
 assert.ok(!bar.classList.contains('is-shown')&&bar.inert,'hidden on the first screen');
 lead.trigger([{target:$('[data-bar-lead]'),isIntersecting:false,top:-80}]);assert.ok(bar.classList.contains('is-shown')&&!bar.inert);
 closing.trigger([{target:$('[data-closing]')}]);assert.ok(!bar.classList.contains('is-shown'));
 closing.trigger([{target:$('[data-closing]'),isIntersecting:false}]);footer.trigger([{target:$('[data-site-footer]')}]);assert.ok(!bar.classList.contains('is-shown'));
 footer.trigger([{target:$('[data-site-footer]'),isIntersecting:false}]);assert.ok(bar.classList.contains('is-shown'));
 services.call.open();assert.ok(!bar.classList.contains('is-shown'),'never under a sheet');services.call.close();assert.ok(bar.classList.contains('is-shown'));
 lead.trigger([{target:$('[data-bar-lead]'),isIntersecting:false,top:900}]);assert.ok(!bar.classList.contains('is-shown'),'the buttons are still below: not passed yet');
 assert.equal(closing.options.rootMargin,'0px 0px -22% 0px');bindActionBar(page.document.createElement('div'),context);done();
});

test('Call: a doctor\'s button dials on a touch phone; everything else opens the sheet or panel',()=>{
 assert.equal(callAction({doctor:'sanjay',touch:true}),'dial');assert.equal(callAction({doctor:'sanjay',touch:false}),'open');assert.equal(callAction({doctor:'',touch:true}),'open');
 const laptop=homePage();bindCallPanel(laptop.app,laptop.context);
 const own=laptop.$('[data-doctor-card="parul"] [data-open-call]'),click=new Event('click');own.dispatchEvent(click);
 assert.ok(click.defaultPrevented&&laptop.$('#call-sheet').open);assert.ok(laptop.$('#call-sheet [data-call-row="parul"]').classList.contains('is-pointed'));
 laptop.services.call.close();assert.ok(!laptop.$('#call-sheet [data-call-row="parul"]').classList.contains('is-pointed'));
 const modified=new Event('click',{ctrlKey:true});own.dispatchEvent(modified);assert.ok(!modified.defaultPrevented&&!laptop.$('#call-sheet').open);
 key(laptop.$('.page-home__hero-actions [data-open-call]'),' ');assert.ok(laptop.$('#call-sheet').open);laptop.services.call.close();
 laptop.services.menu.open();laptop.$('#menu [data-open-call]').dispatchEvent(new Event('click'));assert.ok(laptop.$('#call-sheet').open&&!laptop.$('#menu').open);laptop.done();
 const phone=homePage({width:390,media:{'(hover: none)':true}});bindCallPanel(phone.app,phone.context);
 const dial=new Event('click');phone.$('[data-doctor-card="sanjay"] [data-open-call]').dispatchEvent(dial);assert.ok(!dial.defaultPrevented&&!phone.$('#call-sheet').open,'the number is the action');
 phone.$('[data-action-bar] [data-open-call]').dispatchEvent(new Event('click'));assert.ok(phone.$('#call-sheet').open);
 bindCallPanel(phone.app,{});phone.done();
});

test('the chips of a doctor card are a radio group: one chosen, arrow keys move, the answer and the booking link follow',async()=>{
 assert.deepEqual([nextChip(0,'ArrowRight',5),nextChip(4,'ArrowRight',5),nextChip(0,'ArrowLeft',5),nextChip(2,'ArrowDown',5),nextChip(2,'ArrowUp',5),nextChip(3,'Home',5),nextChip(1,'End',5),nextChip(2,'a',5),nextChip(0,'End',0)],[1,0,4,3,1,0,4,2,-1]);
 const {app,context,$,done}=homePage({mode:'off'});
 bindDoctorCards(app,context);
 const card=$('[data-doctor-card="sanjay"]'),chips=card.querySelectorAll('[data-chip]'),book=card.querySelector('[data-card-book]');
 assert.equal(card.querySelector('[data-chip-row]').getAttribute('role'),'radiogroup');
 assert.deepEqual(chips.map(chip=>chip.getAttribute('aria-checked')),['true','false','false','false','false']);assert.deepEqual(chips.map(chip=>chip.getAttribute('tabindex')),['0','-1','-1','-1','-1']);
 const click=new Event('click');chips[2].dispatchEvent(click);
 assert.ok(click.defaultPrevented);assert.equal(chips[2].getAttribute('aria-checked'),'true');assert.ok(chips[2].hasAttribute('data-chosen')&&!chips[0].hasAttribute('data-chosen'));
 assert.equal(card.querySelector('[data-answer][data-active]').getAttribute('data-answer'),'thyroid');assert.match(card.querySelector('[data-chip-live]').textContent,/thyroid reports/);
 assert.equal(book.getAttribute('data-booking-href'),'/booking?doctor=sanjay&topic=thyroid');assert.equal(book.hasAttribute('href'),false,'while booking is off the address stays aside');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(card.querySelector('[data-object][data-active]').getAttribute('data-object'),'thyroid');assert.equal(card.querySelectorAll('[data-object][data-active]').length,1);
 key(chips[2],'ArrowRight');assert.equal(chips[3].getAttribute('aria-checked'),'true');key(chips[3],'Home');assert.equal(chips[0].getAttribute('aria-checked'),'true');key(chips[0],' ');key(chips[0],'x');
 const held=new Event('click',{metaKey:true});chips[4].dispatchEvent(held);assert.ok(!held.defaultPrevented&&chips[0].getAttribute('aria-checked')==='true','a modified click is left to the browser');
 const anchor=$('[data-doctor-card="parul"] [data-card-book]');anchor.setAttribute('href','/booking?doctor=parul');anchor.removeAttribute('data-booking-href');
 assert.equal(setBookingAddress(anchor,'/booking?doctor=parul&topic=pregnancy'),true);assert.equal(anchor.getAttribute('href'),'/booking?doctor=parul&topic=pregnancy');assert.equal(setBookingAddress(anchor,'/contact'),false);done();
});

test('the review shelf: tabs choose the cards and the lead; the arrows, Read more and the reader work',()=>{
 assert.deepEqual([nextTab(0,'ArrowRight',3),nextTab(2,'ArrowRight',3),nextTab(0,'ArrowLeft',3),nextTab(1,'Home',3),nextTab(1,'End',3),nextTab(1,'Enter',3),nextTab(0,'End',0)],[1,0,2,0,2,1,-1]);
 assert.deepEqual(shelfPlan('all'),shelfSelection('all').map(review=>review.id));assert.equal(shelfPlan('sanjay').length,6);assert.equal(shelfPlan('parul',{own:'parul',limit:3}).length,3);assert.equal(shelfPlan('parul',{own:'all',limit:0}).length,6);
 assert.equal(everyReview.length,26);
 const {page,app,context,$,done}=homePage();
 const restore=installGlobals(page);
 try{
  const row=$('[data-review-shelf] [data-shelf]'),first=row.querySelector('.review-card:not([hidden])');
  row.scrollWidth=3000;row.clientWidth=1200;for(const card of row.children)card.rect={left:0,width:340};
  const words=row.children[1].querySelector('.review-card__quote p');words.scrollHeight=200;words.clientHeight=130;
  bindReviewShelf(app,context);
  const previous=$('[data-shelf-previous]'),next=$('[data-shelf-next]');
  assert.ok(previous.disabled&&!next.disabled&&!previous.parentElement.hidden);assert.equal($('[data-shelf-count]').textContent,'1 of 8');
  next.click();assert.equal(row.scrollLeft,360);page.frames(1);assert.ok(!previous.disabled);
  key(row,'ArrowLeft');assert.equal(row.scrollLeft,0);key(row,'ArrowRight');key(row.children[0],'ArrowRight');assert.equal(row.scrollLeft,360);
  assert.equal(row.querySelectorAll('.review-card__more').length,1,'Read more only where the words are cut short');
  row.querySelector('.review-card__more').click();
  assert.ok($('#reader').open);assert.equal($('#reader').getAttribute('data-kind'),'reviews');assert.equal($('#reader-title').textContent,'All 26 reviews');assert.equal($('#reader .is-pointed').id,'review-'+row.children[1].getAttribute('data-review'));
  $('#reader [data-filter="parul"]').click();assert.equal($('#reader').querySelectorAll('.review-reader__item').length,10);assert.equal($('#reader-title').textContent,'10 reviews of Dr. Parul Gupta');assert.equal($('#reader [data-filter="parul"]').getAttribute('aria-selected'),'true');
  key($('#reader [data-filter="parul"]'),'ArrowLeft');assert.equal($('#reader-title').textContent,'9 reviews of Dr. Sanjay Gupta');
  context.services.reader.close();
  $('[data-review-tabs] [data-filter="parul"]').click();
  const shown=row.querySelectorAll('.review-card:not([hidden])');
  assert.equal(shown.length,6);assert.equal(shown[0].querySelector('.review-card__who strong').textContent,'Divya Menon');assert.ok(shown[0].classList.contains('review-card--lead')&&!first.classList.contains('review-card--lead'));
  assert.equal(row.children[0],shown[0],'the chosen cards stand first in the row');assert.equal(row.scrollLeft,0);assert.equal(row.children.length,26,'no card is added or lost');
  assert.equal($('[data-review-tabs] [data-filter="parul"]').getAttribute('tabindex'),'0');assert.equal($('#review-shelf-panel').getAttribute('aria-labelledby'),'review-shelf-tab-parul');
  $('[data-open-reviews]').dispatchEvent(new Event('click'));assert.ok($('#reader').open);assert.equal($('#reader').querySelectorAll('.review-reader__item').length,26);
  row.scrollWidth=1000;row.clientWidth=1200;next.click();page.frames(1);assert.ok(previous.parentElement.hidden,'a row that cannot move shows no arrows');
  assert.equal(markClamped(row,{}),1,'looked at again: still one cut-short review, and no second button');assert.equal(row.querySelectorAll('.review-card__more').length,1);assert.equal(arrangeShelf(row,['no-such-review']).length,0);selectTab($('[data-review-tabs]'),'all');
 }finally{restore();done();}
});

test('a shelf moves by one card, stops at its ends, and says where it stands',()=>{
 assert.equal(shelfStep({scrollLeft:0,step:360,max:1000,direction:1}),360);assert.equal(shelfStep({scrollLeft:900,step:360,max:1000,direction:1}),1000);assert.equal(shelfStep({scrollLeft:100,step:360,max:1000,direction:-1}),0);
 assert.deepEqual(shelfEnds({scrollLeft:0,max:500}),{atStart:true,atEnd:false});assert.deepEqual(shelfEnds({scrollLeft:499,max:500}),{atStart:false,atEnd:true});
 assert.equal(shelfIndex({lefts:[-340,20,380],start:20,scrollLeft:360,max:900}),1);assert.equal(shelfIndex({lefts:[-700,-340,20],start:60,scrollLeft:900,max:900}),2,'at the end the last card counts');assert.equal(shelfIndex({lefts:[],start:0,scrollLeft:0,max:0}),-1);
 assert.equal(shelfStill(0),true);assert.equal(shelfStill(2),true);assert.equal(shelfStill(3),false);
 const page=createPage({body:'<div data-still-shelf><ul data-shelf><li>a</li><li>b</li></ul><div><button data-shelf-previous></button><button data-shelf-next></button></div></div>'});
 const restore=installGlobals(page);
 try{
  const row=page.document.querySelector('[data-shelf]');row.scrollWidth=900;row.clientWidth=300;for(const item of row.children)item.rect={left:0,width:280};
  bindStillShelf(page.document.body,{services:{motion:{allowed:()=>true}}});
  page.document.querySelector('[data-shelf-next]').click();assert.equal(row.scrollLeft,300);page.document.querySelector('[data-shelf-previous]').click();assert.equal(row.scrollLeft,0);
  bindStillShelf(page.document.createElement('div'),{});
 }finally{restore();}
});

test('the certificate viewer walks through the documents, stops at the ends, and follows the arrow keys',()=>{
 assert.deepEqual([viewerStep(0,1,10),viewerStep(9,1,10),viewerStep(0,-1,10),viewerStep(4,-1,10),viewerStep(0,1,0)],[1,9,0,3,-1]);
 assert.equal(viewerItems().length,10);assert.equal(viewerItems('parul').length,5);assert.equal(viewerTitle(),'All certificates');assert.equal(viewerTitle('sanjay'),'Certificates of Dr. Sanjay Gupta');assert.equal(viewerTitle('nobody'),'All certificates');
 const {page,app,context,$,done}=homePage();
 app.querySelector('.page-home__certificates-more').innerHTML+='<button data-view-certificate="parul-gupta-certificate-01"></button><button data-view-certificate="parul-gupta-certificate-02" id="second"></button>';
 bindCertificates(app,context);
 const link=$('[data-open-certificates]'),click=new Event('click');link.dispatchEvent(click);
 assert.ok(click.defaultPrevented&&$('#viewer').open);assert.equal($('#viewer-title').textContent,'All certificates');assert.match($('#viewer-content').textContent,/1 of 10/);
 assert.ok($('#viewer [data-viewer-previous]').disabled);
 $('#viewer [data-viewer-next]').focus();$('#viewer [data-viewer-next]').click();assert.match($('#viewer-content').textContent,/2 of 10/);assert.equal(page.document.activeElement,$('#viewer [data-viewer-next]'),'focus stays on the arrow that was pressed');
 key($('#viewer'),'ArrowLeft');assert.match($('#viewer-content').textContent,/1 of 10/);key($('#viewer'),'ArrowLeft');assert.match($('#viewer-content').textContent,/1 of 10/);
 for(let step=0;step<12;step++)key($('#viewer'),'ArrowRight');assert.match($('#viewer-content').textContent,/10 of 10/);assert.ok($('#viewer [data-viewer-next]').disabled);
 context.services.viewer.close();
 $('#second').click();assert.equal($('#viewer-title').textContent,'Certificates of Dr. Parul Gupta');assert.match($('#viewer-content').textContent,/2 of 2/);context.services.viewer.close();
 const held=new Event('click',{shiftKey:true});link.dispatchEvent(held);assert.ok(!held.defaultPrevented&&!$('#viewer').open);
 openViewerWalk(context.services,{total:0,draw:()=>''});openViewerWalk({}, {total:1,draw:()=>''});bindCertificates(app,{});done();
});

test('opening one question closes the others of its group',()=>{
 const page=createPage({body:'<div data-questions><details name="a" open id="one"></details><details name="a" id="two"></details><details name="b" open id="other"></details></div>'});
 const rows=page.document.querySelectorAll('details');
 bindQuestions(page.document.body,{});
 rows[1].open=true;assert.deepEqual(rowsToClose(rows,rows[1]),[rows[0]]);rows[1].dispatchEvent(new Event('toggle',{bubbles:false}));
 assert.ok(!rows[0].open&&rows[1].open&&rows[2].open);rows[1].open=false;rows[1].dispatchEvent(new Event('toggle',{bubbles:false}));assert.ok(!rows[0].open);
});

test('dialogs: one open at a time, closed by their button, Escape or a tap outside, and focus goes back',()=>{
 const page=createPage({body:`<button id="opener" aria-expanded="false">open</button>${dialogs}`});
 const sheets=createSheets({documentObject:page.document}),$=selector=>page.document.querySelector(selector),opener=$('#opener');
 opener.focus();sheets.menu.open({trigger:opener});
 assert.ok($('#menu').open&&page.document.documentElement.classList.contains('dialog-open'));assert.equal(opener.getAttribute('aria-expanded'),'true');assert.equal(page.document.activeElement,$('#menu [data-close]'));
 sheets.reader.open({title:'Notice',html:'<p>Words</p>',trigger:opener,kind:'notice'});
 assert.ok(!$('#menu').open&&$('#reader').open,'opening one closes the other');assert.equal(page.document.activeElement,$('#reader-title'));assert.equal(sheets.reader.content().innerHTML,'<p>Words</p>');assert.equal(sheets.anyOpen(),true);
 sheets.reader.setTitle('Other');assert.equal($('#reader-title').textContent,'Other');
 $('#reader [data-close]').click();assert.ok(!$('#reader').open&&!page.document.documentElement.classList.contains('dialog-open'));assert.equal(page.document.activeElement,opener,'focus returns to what opened it');
 sheets.viewer.open({title:'V',html:'<p>v</p>'});$('#viewer').rect={left:100,right:500,top:100,bottom:500};
 $('#viewer').dispatchEvent(new Event('click',{clientX:300,clientY:300}));assert.ok($('#viewer').open,'a click inside keeps it open');
 $('#viewer-content').dispatchEvent(new Event('click',{clientX:10,clientY:10}));assert.ok($('#viewer').open);
 $('#viewer').dispatchEvent(new Event('click',{clientX:10,clientY:10}));assert.ok(!$('#viewer').open,'a tap on the dimmed page closes it');
 sheets.call.open({doctor:'sanjay'});assert.ok($('#call-sheet').open);$('#viewer').focus();sheets.closeAll('navigate');assert.ok(!$('#call-sheet').open);assert.equal(page.document.activeElement,$('#viewer'),'a page change does not pull focus back');
 sheets.viewer.close();sheets.menu.close();assert.equal(sheets.anyOpen(),false);assert.equal(sheets.menu.node(),$('#menu'));assert.equal(sheets.call.node(),$('#call-sheet'));assert.equal(sheets.viewer.node(),$('#viewer'));assert.equal(sheets.reader.node(),$('#reader'));assert.equal(sheets.viewer.content(),$('#viewer-content'));
 const controller=bindDialog($('#menu'),{documentObject:page.document});controller.open();assert.equal(controller.isOpen(),true);controller.open();controller.dispose();assert.ok(!$('#menu').open);controller.open();assert.ok(!$('#menu').open,'a disposed controller opens nothing');controller.dispose();
 const empty=createSheets({documentObject:createPage({body:'<p>none</p>'}).document});empty.reader.open({title:'x',html:''});empty.menu.open();empty.viewer.open({title:'x',html:''});empty.call.open();empty.refresh({path:'/',mode:'on',now:TEST_NOW,search:''});empty.closeAll();
});

test('the privacy choice is kept as one small record',()=>{
 const map=new Map(),storage={setItem:(name,value)=>map.set(name,value),getItem:name=>map.get(name)??null};
 const record=savePreference(storage,false,1000);
 assert.deepEqual(record,{version:1,measurement:false,savedAt:1000});assert.deepEqual(parsePreference(map.get(preferenceKey),2000),record);
 assert.equal(savePreference({setItem(){throw new Error('closed');}},true),null);
});
