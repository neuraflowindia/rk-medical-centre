import test from 'node:test';
import assert from 'node:assert/strict';
import {doctors} from '../../src/clinic/model.mjs';
import {allReviews,reviewCounts,shelfSelection,readerOrder} from '../../src/clinic/review-list.mjs';
import {certificateCatalogue} from '../../src/clinic/certificate-catalogue.mjs';
import {plainCertificates} from '../../src/clinic/client-media.mjs';
import {doctorsSection,homeCertificates,questionsSection} from '../../src/clinic/page-content/home.mjs';
import {timetable,liveSignNeutral,liveSignNeutralShort} from '../../src/clinic/page-content/shared.mjs';
import {button,bookButton,bookingEntry,callButton,textLink,roundButton,chip,tab,tag} from '../../src/site/parts/button/button.mjs';
import {sectionHead,runningHead} from '../../src/site/parts/section-head/section-head.mjs';
import {openSign,OPEN_SIGN_FORMS} from '../../src/site/parts/open-sign/open-sign.mjs';
import {essentialsStrip} from '../../src/site/parts/essentials-strip/essentials-strip.mjs';
import {siteHeader,lockup,mainLinks,LOGO} from '../../src/site/parts/site-header/site-header.mjs';
import {menuLinks} from '../../src/site/parts/menu/menu.mjs';
import {siteFooter} from '../../src/site/parts/site-footer/site-footer.mjs';
import {hoursTable} from '../../src/site/parts/hours-table/hours-table.mjs';
import {closing,closingTitle} from '../../src/site/parts/closing/closing.mjs';
import {actionBar,callSheet,callRow,whatsappRow,doctorAvatar} from '../../src/site/parts/action-bar/action-bar.mjs';
import {callPanel} from '../../src/site/parts/call-panel/call-panel.mjs';
import {doctorCard} from '../../src/site/parts/doctor-card/doctor-card.mjs';
import {doctorMiniCard} from '../../src/site/parts/doctor-mini-card/doctor-mini-card.mjs';
import {photoFigure,archPortrait,PHOTO_RATIOS} from '../../src/site/parts/photo-figure/photo-figure.mjs';
import {questions} from '../../src/site/parts/questions/questions.mjs';
import {reviewShelf,reviewCard,reviewReader,readerList,reviewTotal} from '../../src/site/parts/review-shelf/review-shelf.mjs';
import {certificateFrame,certificateWall,certificateViewer,certificatePicture} from '../../src/site/parts/certificate-frame/certificate-frame.mjs';
import {stillShelf} from '../../src/site/parts/still-shelf/still-shelf.mjs';
import {sheetNote} from '../../src/site/parts/sheet/sheet.mjs';
import {callRows} from '../../src/clinic/page-content/shared.mjs';
import {count,TEST_NOW} from './support/page-contract.mjs';

const on={path:'/',mode:'on',now:TEST_NOW,search:''},off={...on,mode:'off'};
const noShared=html=>assert.doesNotMatch(html,/<h1\b|<main\b|\bundefined\b|\[object Object\]|STAND-IN/);

test('buttons: links or buttons, every variant and size, never without a label',()=>{
 assert.equal(button({label:'Send'}),'<button type="button" class="button button--main"><span class="button__label">Send</span></button>');
 const link=button({label:'Get directions',href:'https://maps.app.goo.gl/x',variant:'second',size:'large',iconAfter:'out',external:true,note:'(opens Google Maps)',className:'k',spoken:'Directions'});
 assert.match(link,/^<a href="https:\/\/maps\.app\.goo\.gl\/x" target="_blank" rel="noopener" class="button button--second button--large k" aria-label="Directions">/);
 assert.match(link,/<span class="visually-hidden"> \(opens Google Maps\)<\/span><\/a>$/);
 assert.match(button({label:'x',size:'compact',icon:'phone',type:'submit'}),/^<button type="submit" class="button button--main button--compact"><svg class="icon"/);
 assert.throws(()=>button({label:'x',variant:'ghost'}),/Unknown button variant/);assert.throws(()=>button({label:'x',size:'huge'}),/Unknown button size/);
 assert.throws(()=>roundButton({icon:'left'}),/spoken label/);
 assert.equal(roundButton({icon:'left',label:'Previous',quiet:true,attributes:{'data-x':true}}),'<button type="button" class="round-button round-button--quiet" aria-label="Previous" data-x><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-left"/></svg></button>');
});

test('booking buttons: an ordinary one is a real booking link; the main controls never disappear',()=>{
 assert.match(bookButton(on,{doctor:'sanjay',topic:'diabetes'}),/^<a href="\/booking\?doctor=sanjay&amp;topic=diabetes" class="button button--main"><span class="button__label">Book with Dr\.&nbsp;Sanjay<\/span>/);
 assert.match(bookButton(off),/href="\/booking"[^>]*>.*Book an appointment/);
 const header=place=>bookingEntry(place==='off'?off:on,{place:'header',size:'compact',hook:'data-header-appointment'});
 assert.match(header('on'),/href="\/booking" aria-label="Book an appointment" title="Book an appointment online" data-booking-entry="header" data-header-appointment>/);
 assert.match(header('off'),/href="\/contact" aria-label="Book an appointment by calling the clinic"/);
 const page=bookingEntry(off,{hook:'data-home-appointment-entry'});
 assert.match(page,/data-booking-entry="page" data-home-appointment-entry>/);
 assert.match(page,/data-home-entry-icon="calendar" hidden>.*data-home-entry-icon="phone">/);
 assert.match(page,/<span class="button__label" data-booking-on="Book an appointment" data-booking-off="Arrange a visit">Arrange a visit<\/span>/);
 assert.match(bookingEntry(on),/data-home-entry-icon="calendar">.*data-home-entry-icon="phone" hidden>/);
 assert.doesNotMatch(bookingEntry(on),/data-booking-only|data-booking-entry-hook/);
 assert.throws(()=>bookingEntry(on,{place:'footer'}),/Unknown booking entry/);
});

test('Call: a doctor\'s button dials; the general one opens the sheet and falls back to the footer\'s numbers',()=>{
 const general=callButton(on);
 assert.match(general,/^<a href="#footer-calls" class="button button--second" aria-label="Call the clinic" aria-haspopup="dialog" data-open-call="">/);
 const doctor=callButton(off,{doctor:'parul',lead:true});
 assert.match(doctor,/href="tel:\+919838655095" class="button button--second button--lead" aria-label="Call Dr\. Parul Gupta at \+91 98386 55095" data-open-call="parul"/);
 assert.match(doctor,/data-booking-on="Call" data-booking-off="Call Dr\. Parul">Call Dr\. Parul</);
 assert.match(callButton(on,{doctor:'sanjay'}),/<span class="button__label">Call<\/span>/);
 assert.throws(()=>callButton(on,{doctor:'nobody'}),/Unknown doctor/);
});

test('links, chips, tabs and tags',()=>{
 assert.equal(textLink({label:'Full profile',href:'/dr-parul-gupta'}),'<a class="text-link" href="/dr-parul-gupta"><span>Full profile</span><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></a>');
 assert.match(textLink({label:'Map',href:'https://x.test',external:true,note:'(opens a map)'}),/target="_blank" rel="noopener">.*#i-out.*visually-hidden/);
 assert.match(textLink({label:'More',icon:''}),/^<button type="button" class="text-link"><span>More<\/span><\/button>$/);
 assert.equal(chip({label:'Fever & infections',href:'/treatment#fever-infections',chosen:true,attributes:{'data-chip-id':'fever-infections'}}),
  '<a class="chip" href="/treatment#fever-infections" data-chip data-chosen data-chip-id="fever-infections"><span class="chip__label">Fever &amp; infections</span></a>');
 assert.doesNotMatch(chip({label:'x',href:'/treatment#x'}),/data-chosen/);
 assert.equal(tab({label:'Dr. Sanjay',id:'t-sanjay',controls:'panel',count:9}),'<button type="button" class="tab" role="tab" id="t-sanjay" aria-controls="panel" aria-selected="false" tabindex="-1">Dr.&nbsp;Sanjay <span class="tab__count">9</span></button>');
 assert.match(tab({label:'All',id:'t',controls:'p',selected:true}),/aria-selected="true">All<\/button>$/);
 assert.equal(tag({label:'KGMU gold medalist',icon:'medal',tone:'gold'}),'<p class="tag tag--gold"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-medal"/></svg>KGMU gold medalist</p>');
 assert.throws(()=>tag({label:'x',tone:'red'}),/Unknown tag tone/);
});

test('a section head: running head, one italic phrase, the right heading level, optional entrance',()=>{
 const head=sectionHead({runningHead:'The doctors',heading:'Two doctors. One family practice.',emphasis:'One family practice.',intro:'Both trained at KGMU.',id:'doctors-title'});
 assert.equal(head,'<header class="section-head"><p class="section-head__running" data-enter="rule"><span>The doctors</span></p><h2 class="section-head__title" id="doctors-title" data-enter>Two doctors. <em>One&nbsp;family&nbsp;practice.</em></h2><p class="section-head__intro" data-enter>Both trained at KGMU.</p></header>');
 const page=sectionHead({heading:'Call, message or visit.',level:1,tone:'on-deep',className:'x'});
 assert.equal(page,'<header class="section-head section-head--page section-head--on-deep x"><h1 class="section-head__title">Call, message or visit.</h1></header>','a page heading never animates in');
 assert.doesNotMatch(sectionHead({heading:'Quiet',enter:false,runningHead:'r'}),/data-enter/);
 assert.match(sectionHead({heading:'Small',level:3}),/<h3 /);
 assert.throws(()=>sectionHead({heading:'x',level:4}),/level 1, 2 or 3/);assert.throws(()=>sectionHead({}),/needs a heading/);
 assert.equal(runningHead('Credentials',{enter:false,className:'k'}),'<p class="section-head__running k"><span>Credentials</span></p>');
});

test('the live sign prints a neutral line in every form; only the strip carries compact words',()=>{
 assert.deepEqual(OPEN_SIGN_FORMS,['line','strip','closing']);
 const line=openSign(on,{form:'line',className:'x'});
 assert.match(line,/^<p class="open-sign open-sign--line x" data-open-sign="line" data-state="pending" data-nosnippet>/);
 assert.doesNotMatch(line,/data-ambient|compact/,'the header line never pulses');
 assert.match(line,new RegExp(`data-open-label>${liveSignNeutral.label}<`));
 const strip=openSign(on,{form:'strip',tag:'div'});
 assert.match(strip,/^<div class="open-sign open-sign--strip" data-open-sign="strip" data-state="pending" data-nosnippet data-ambient="minor">/);
 assert.equal(count(strip,/data-open-(label|detail)-compact>/g),2);assert.match(strip,new RegExp(`data-open-label>${liveSignNeutralShort().label}<`));
 assert.match(openSign(on,{form:'closing'}),/data-ambient="minor"/);assert.doesNotMatch(openSign(on,{form:'closing',still:true}),/data-ambient/);
 assert.throws(()=>openSign(on,{form:'banner'}),/Unknown open sign form/);
});

test('the essentials strip: three cells, the first live, the fee once, the place opening a map',()=>{
 const strip=essentialsStrip(on);noShared(strip);
 assert.equal(count(strip,/<li class="essentials-strip__cell/g),3);assert.equal(count(strip,/data-open-sign="strip"/g),1);
 assert.equal(count(strip,/₹800/g),1);assert.match(strip,/#i-banknote/);
 assert.match(strip,/<a class="essentials-strip__link" href="https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9]+" target="_blank" rel="noopener">/);
 assert.match(strip,/Tedhi Pulia<span class="wide-only">, Ring Road<\/span>/);assert.match(strip,/\(opens Google Maps\)/);
});

test('the header: full on the public pages, quiet on the booking screens; the current link is marked',()=>{
 const full=siteHeader({...on,path:'/dr-parul-gupta'});noShared(full);
 assert.match(full,/^<header class="site-header" data-site-header>/);
 assert.equal(count(full,/class="site-header__link"/g),4);
 assert.match(full,/href="\/meet-doctor" aria-current="page">Doctors/,'"Doctors" is current on a profile');
 assert.equal(count(full,/aria-current="page"/g),1);
 assert.match(full,/data-header-appointment/);assert.match(full,/data-open-sign="line"/);
 assert.match(full,/<a class="site-header__menu" href="#site-footer" role="button" aria-haspopup="dialog" aria-controls="menu" aria-expanded="false" aria-label="Open menu" data-open-menu>/);
 const slim=siteHeader(on,{chrome:'slim'});
 assert.match(slim,/site-header--slim/);assert.doesNotMatch(slim,/site-header__nav|data-header-appointment|data-open-menu/);assert.match(slim,/<span class="site-header__help-lead">Need help\? <\/span>Call<\/span>/,'a narrow phone shows "Call" alone');
 assert.throws(()=>siteHeader(on,{chrome:'wide'}),/Unknown header chrome/);
 assert.match(lockup({deep:true,nameId:'n'}),/<span class="lockup__tile"><img src="\/clinic-assets\/rk-medical-centre-logo\.webp" width="165" height="192" alt="" decoding="async"><\/span>.*id="n">R\.&nbsp;K\. Medical Centre/);
 assert.equal(count(mainLinks(on),/aria-current/g),0);assert.equal(LOGO.width,165);
});

test('the phone menu lists the pages and ends with the two actions',()=>{
 const menu=menuLinks({...on,path:'/contact'});noShared(menu);
 assert.equal(count(menu,/class="menu__link"/g),5);assert.match(menu,/href="\/contact" aria-current="page"><span>Contact/);
 assert.match(menu,/data-booking-entry="header"/);assert.match(menu,/data-open-call=""/);
 assert.doesNotMatch(menuLinks(off),/\shref="\/booking/,'while booking is off the menu holds no booking address');
});

test('the footer is complete in both states and names each doctor with number and registration',()=>{
 for(const ctx of [on,off]){
  const footer=siteFooter(ctx);noShared(footer);
  assert.match(footer,/^<footer class="site-footer" id="site-footer" data-site-footer>/);
  assert.match(footer,/id="footer-calls"/);
  for(const id of ['sanjay','parul']){assert.ok(footer.includes(`href="tel:${doctors[id].tel}"`));assert.ok(footer.includes(doctors[id].phone.replace(/(\d{5}) (\d{5})/,'$1&nbsp;$2')));}
  assert.equal(count(footer,/UP Medical Council Reg\.&nbsp;No\.&nbsp;\d{5}/g),2);
  assert.equal(count(footer,/class="site-footer__link"/g),7);
  assert.match(footer,/data-collection-notice/);assert.match(footer,/data-privacy/);assert.match(footer,/aria-pressed="false" data-motion-toggle data-needs-script>.*Pause motion/);
  assert.match(footer,/© 2026 R\.&nbsp;K\. Medical Centre/);
 }
 assert.match(siteFooter({...on,path:'/contact'}),/href="\/contact" aria-current="page"/);
});

test('the hours timetable: a morning and an evening column, "Closed" where there is no session, a Today tag per row',()=>{
 const table=hoursTable(on,{className:'x'});noShared(table);
 assert.match(table,/^<table class="hours-table x" data-hours-table><caption class="visually-hidden">Appointment times<\/caption>/);
 assert.equal(count(table,/<tr data-days="/g),timetable.rows.length);
 assert.match(table,/<tr data-days="1 2 3 4 5 6">.*Mon–Sat.*<td>10:00–1:30<\/td><td>6:00–8:30<\/td>/);
 assert.match(table,/<tr data-days="0">.*Sunday.*<td>10:00–1:30<\/td><td class="hours-table__none">Closed<\/td>/);
 assert.equal(count(table,/data-today hidden>Today</g),2);assert.equal(count(table,/scope="col"/g),3);assert.equal(count(table,/scope="row"/g),2);
});

test('the closing: one decision, true at any hour and in either booking state',()=>{
 assert.deepEqual(closingTitle('open',true),{heading:'See a doctor today.',emphasis:'today.',keep:'See a doctor'});
 assert.deepEqual(closingTitle('later',false),{heading:'See a doctor today.',emphasis:'today.',keep:'See a doctor'});
 assert.deepEqual(closingTitle('closed',true),{heading:'Book your next visit.',emphasis:'next visit.',keep:'Book your'});
 assert.deepEqual(closingTitle('closed',false),{heading:'Arrange your next visit.',emphasis:'next visit.',keep:'Arrange your'});
 const both=closing(on);noShared(both);
 assert.match(both,/^<section class="closing" id="closing" aria-labelledby="closing-title" data-closing>/);
 assert.match(both,/<span data-closing-title><span class="keep">Book your<\/span> <em>next&nbsp;visit\.<\/em><\/span>/,'before the clock is read the heading makes no promise about today');
 assert.equal(count(both,/class="call-row"/g),2);assert.match(both,/href="\/booking" class="button button--main button--large"/);assert.match(both,/data-open-sign="closing"/);
 assert.match(closing(off),/<span class="keep">Arrange your<\/span> <em>next&nbsp;visit\.<\/em>/);
 const one=closing(on,{doctor:'parul'});
 assert.match(one,/data-closing-doctor="parul"/);assert.equal(count(one,/class="call-row"/g),1);assert.match(one,/href="\/booking\?doctor=parul"[^>]*>.*Book with Dr\.&nbsp;Parul/);
 assert.throws(()=>closing(on,{doctor:'nobody'}),/Unknown doctor/);
});

test('the phone bar, the call rows and the call sheet',()=>{
 const bar=actionBar(on);noShared(bar);
 assert.match(bar,/^<nav class="action-bar" aria-label="Quick actions" data-action-bar>/);
 assert.match(bar,/data-open-call>.*Call.*<a class="action-bar__book" href="\/booking">Book<\/a>.*Directions/);
 const row=callRow(callRows()[0],{avatar:doctorAvatar('sanjay'),needFirst:true});
 assert.match(row,/^<a class="call-row" href="tel:\+919415049410" aria-label="Call Dr\. Sanjay Gupta at \+91 94150 49410" data-call-row="sanjay"><img class="call-row__avatar"/);
 assert.match(row,/<span class="call-row__need">General health and diabetes<\/span><strong class="call-row__name">Dr\.&nbsp;Sanjay Gupta<\/strong>/);
 assert.match(row,/94150&nbsp;49410<\/span><\/a>$/);
 assert.match(callRow(callRows()[1]),/<strong class="call-row__name">Dr\.&nbsp;Parul Gupta<\/strong><span class="call-row__need">Women’s health and pregnancy<\/span>/);
 assert.throws(()=>doctorAvatar('nobody'),/Unknown doctor/);
 assert.match(whatsappRow(on,{attributes:{'data-k':'1'}}),/^<a class="call-row call-row--whatsapp" href="https:\/\/wa\.me\/919415049410\?text=[^"]+" target="_blank" rel="noopener" data-k="1">/);
 const sheet=callSheet(on);noShared(sheet);
 assert.equal(count(sheet,/data-call-row="/g),2);assert.equal(count(sheet,/call-row--whatsapp/g),1);assert.match(sheet,/data-open-sign="line"/);
 assert.equal(callPanel(on),sheet,'the laptop panel and the phone sheet hold the same rows');
});

test('the doctor card: chips as links with the first chosen, one answer and one object shown, both actions',()=>{
 const [sanjay,parul]=doctorsSection.cards;
 const card=doctorCard(sanjay,on);noShared(card);
 assert.match(card,/^<article class="doctor-card doctor-card--sage" aria-labelledby="doctor-sanjay-name" data-doctor-card="sanjay" data-enter="card">/);
 assert.equal(count(card,/data-chip /g),5);assert.equal(count(card,/data-chip data-chosen/g),1);
 assert.equal(count(card,/<div class="doctor-card__answer" data-answer="[a-z-]+"/g),5);assert.equal(count(card,/data-answer="[a-z-]+" data-active/g),1);
 assert.equal(count(card,/data-object="[a-z-]+"/g),5);assert.equal(count(card,/data-object="diabetes" data-active/g),1);
 assert.match(card,/href="\/treatment#diabetes" data-chip data-chosen data-chip-id="diabetes" data-book-href="\/booking\?doctor=sanjay&amp;topic=diabetes"/);
 assert.match(card,/MBBS, DGO/);assert.doesNotMatch(card,/MD \(Medicine\)|38164|since/);
 assert.match(card,/data-card-book/);assert.match(card,/data-open-call="sanjay"/);assert.equal(count(card,/Full profile/g),2,'one in the name block, one beside the buttons; the stylesheet shows one');
 const second=doctorCard(parul,off,{order:1});
 assert.match(second,/doctor-card--rose.*data-enter-after="0\.12"/);assert.match(second,/tag tag--gold.*KGMU gold medalist/);assert.equal(count(second,/data-chip /g),4);
});

test('the doctor mini-card and the photograph frames',()=>{
 const mini=doctorMiniCard('parul',on);noShared(mini);
 assert.match(mini,/^<article class="doctor-mini-card doctor-mini-card--parul" data-doctor="parul"><img class="doctor-mini-card__avatar"/);
 assert.match(mini,/<h3 class="doctor-mini-card__name">Dr\.&nbsp;Parul Gupta<\/h3><p class="doctor-mini-card__role">Women’s health and pregnancy care<\/p>/);
 assert.match(mini,/href="\/booking\?doctor=parul".*data-open-call="parul"/);
 const bare=doctorMiniCard('sanjay',on,{actions:false,profile:false,level:2,className:'x'});
 assert.doesNotMatch(bare,/button|text-link/);assert.match(bare,/<h2 /);
 assert.throws(()=>doctorMiniCard('nobody',on),/Unknown doctor/);assert.throws(()=>doctorMiniCard('sanjay',on,{level:5}),/level 2, 3 or 4/);
 const figure=photoFigure('frontage',{ratio:'16:9',caption:'Look for the green wall.',captionKey:'Outside',sizes:'640px',className:'x'});
 assert.match(figure,/^<figure class="photo-figure photo-figure--plain photo-figure--16x9 x" data-enter="photo"><div class="photo-figure__frame"><img src="\/client-photos\/frontage-from-ring-road-640\.webp" srcset=/);
 assert.match(figure,/<figcaption class="photo-figure__caption"><span class="photo-figure__key">Outside<\/span>Look for the green wall\.<\/figcaption><\/figure>$/);
 const first=photoFigure('waiting',{ratio:'4:5',frame:'arch',loading:'eager'});
 assert.match(first,/photo-figure--arch photo-figure--4x5"><div/);assert.match(first,/fetchpriority="high"/);assert.doesNotMatch(first,/data-enter|figcaption|loading="lazy"/);
 assert.deepEqual(PHOTO_RATIOS,['16:9','4:5','3:2','1:1']);
 for(const bad of [()=>photoFigure('nowhere'),()=>photoFigure('frontage',{ratio:'2:1'}),()=>photoFigure('frontage',{frame:'oval'}),()=>photoFigure('frontage',{loading:'soon'}),()=>archPortrait('nowhere')])assert.throws(bad,RangeError);
 assert.match(archPortrait('portrait-parul',{eager:true,className:'k'}),/^<div class="arch-frame k"><img src="\/client-photos\/dr-parul-gupta-portrait-264\.webp"/);
});

test('questions are native details rows that share a name; one starts open',()=>{
 const html=questions(questionsSection.rows,{name:'home-questions'});noShared(html);
 assert.equal(count(html,/<details class="questions__row" name="home-questions" id="question-[a-z-]+"/g),4);assert.equal(count(html,/ open>/g),1);
 assert.equal(count(html,/<summary class="questions__summary"><h3 class="questions__question">/g),4);
 assert.doesNotMatch(questions([{question:'Q',answer:'A'}],{open:-1,level:4}),/ open>| id=/);
 assert.throws(()=>questions([]),/at least one row/);
});

test('the review shelf prints every review once; tabs, cards and the reader come from one list',()=>{
 const shelf=reviewShelf(on,{head:'<header>h</header>'});noShared(shelf);
 assert.equal(count(shelf,/<li class="review-card/g),26);
 for(const review of allReviews)assert.equal(count(shelf,new RegExp(`data-review="${review.id}"`,'g')),1,review.name);
 assert.equal(count(shelf,/<li class="review-card[^>]* hidden>/g),26-shelfSelection('all').length);
 assert.equal(count(shelf,/review-card--lead/g),1);assert.match(shelf,/<li class="review-card review-card--lead" data-review="meera-raman" data-review-filters="all sanjay">/);
 assert.match(shelf,/<div class="wrap review-shelf__head"><header>h<\/header><div class="tabs review-shelf__tabs" role="tablist"/);
 assert.equal(count(shelf,/role="tab" /g),3);assert.match(shelf,/data-open-reviews="all" data-needs-script>.*Read all 26 reviews/);assert.match(shelf,/data-shelf-count>1 of 8</);
 assert.match(shelf,/role="img" aria-label="Rated 5 out of 5"/);
 const hers=reviewShelf(on,{filter:'parul',limit:3,featured:false,id:'profile-reviews'});
 assert.equal(count(hers,/<li class="review-card/g),reviewCounts.parul);assert.equal(count(hers,/<li class="review-card[^>]* hidden>/g),reviewCounts.parul-3);
 assert.doesNotMatch(hers,/role="tab"|review-card--lead/);assert.match(hers,/id="profile-reviews" data-review-shelf="parul" data-review-limit="3" data-review-featured="false"/);
 assert.equal(count(reviewShelf(on,{limit:0}),/ hidden>/g),0);assert.throws(()=>reviewShelf(on,{filter:'nobody'}),/Unknown review filter/);
 assert.match(reviewCard(allReviews[0],{lead:true,hidden:true}),/^<li class="review-card review-card--lead" data-review="[a-z-]+" data-review-filters="all[a-z ]*" hidden>/);
 const reader=reviewReader(readerOrder('all'),{pointed:'aditi-sen'});
 assert.equal(count(reader,/<li class="review-reader__item/g),26);assert.equal(count(reader,/is-pointed/g),1);assert.match(reader,/id="review-aditi-sen"/);
 assert.match(reader,/All <span class="tab__count">26<\/span>.*Dr\.&nbsp;Sanjay <span class="tab__count">9<\/span>.*Dr\.&nbsp;Parul <span class="tab__count">10<\/span>/);
 assert.equal(count(reader,/<p class="review-reader__about/g),26,'every review says whom it is about');
 assert.equal(count(reader,/<p class="review-reader__about">/g),allReviews.filter(review=>review.doctors.length!==1).length,'one about both doctors or the clinic carries no doctor\'s tint');
 assert.equal(count(reader,/review-reader__about--sanjay"><span class="visually-hidden">About <\/span>Dr\.&nbsp;Sanjay Gupta</g),allReviews.filter(review=>review.doctors.join()==='sanjay').length);
 assert.equal(count(reader,/About <\/span>The clinic</g),allReviews.filter(review=>!review.doctors.length).length);
 assert.doesNotMatch(reviewReader(readerOrder('sanjay'),{filter:'sanjay',filters:['sanjay']}),/role="tab"|role="tabpanel"/);
 assert.equal(count(readerList(readerOrder('parul')),/<li /g),10);assert.equal(reviewTotal('all'),26);
});

test('certificates: one frame for all ten, a wall that may settle, a viewer that walks through them',()=>{
 for(const item of certificateCatalogue){const picture=certificatePicture(item);assert.equal(picture.src,plainCertificates[item.id].src,'every certificate has lost its physical frame');assert.equal(picture.alt,item.description);}
 assert.equal(certificatePicture({id:'other',description:'d',variants:[{src:'/certificates/a-480.webp',width:480,height:360},{src:'/certificates/a-720.webp',width:720,height:540}]}).sources.length,2);
 const [first]=homeCertificates(),frame=certificateFrame(first,{view:true,tone:'on-deep',size:'large'});noShared(frame);
 assert.match(frame,/^<figure class="certificate-frame certificate-frame--large certificate-frame--on-deep" data-certificate="sanjay-gupta-certificate-08" style="--tilt:0deg;--lag:0;--ar:1\.517">/);assert.match(frame,/<span>Harvard Medical School, 2016<\/span>/,'the second line reads with a comma');
 assert.match(frame,/<button class="certificate-frame__mat certificate-frame__mat--view" type="button" aria-haspopup="dialog" aria-label="View: Clinical diabetology course" data-view-certificate="sanjay-gupta-certificate-08">/);
 assert.match(frame,/<figcaption class="certificate-frame__label"><strong>Clinical diabetology course<\/strong><span>[^<]+<\/span><span>Dr\.&nbsp;Sanjay Gupta<\/span><\/figcaption>/);
 assert.match(certificateFrame(certificateCatalogue[0]),/<div class="certificate-frame__mat">/);
 assert.throws(()=>certificateFrame(first,{size:'giant'}),/Unknown certificate size/);assert.throws(()=>certificateFrame(first,{tone:'pink'}),/Unknown certificate tone/);
 const wall=certificateWall(homeCertificates(),{label:'Certificates',settle:true});
 assert.match(wall,/^<ul class="certificate-wall" aria-label="Certificates" data-certificate-wall data-settle>/);assert.equal(count(wall,/<li class="certificate-wall__item">/g),4);
 assert.match(wall,/style="--tilt:-2\.2deg;--lag:0;--ar:1\.517".*style="--tilt:1\.6deg;--lag:0\.12;--ar:0\.708".*--lag:0\.24.*--lag:0\.36/);
 assert.doesNotMatch(certificateWall(homeCertificates()),/data-settle|--tilt:-/);
 const viewer=certificateViewer(certificateCatalogue,2);
 assert.match(viewer,/^<figure class="certificate-viewer__figure" data-viewer-certificate="sanjay-gupta-certificate-08">/);assert.match(viewer,/3 of 10/);assert.match(viewer,/data-viewer-previous.*data-viewer-next/);
 assert.doesNotMatch(certificateViewer([certificateCatalogue[0]],0),/data-viewer-next/);assert.throws(()=>certificateViewer(certificateCatalogue,99),/No such certificate/);
});

test('a still shelf and a sheet note',()=>{
 const shelf=stillShelf(['<p>one</p>','<p>two</p>'],{label:'A walk through the clinic',previous:'Back',next:'On',className:'x'});
 assert.match(shelf,/^<div class="still-shelf x" data-still-shelf><ul class="still-shelf__row" tabindex="0" aria-label="A walk through the clinic" data-shelf><li class="still-shelf__item"><p>one<\/p><\/li>/);
 assert.match(shelf,/<div class="still-shelf__arrows" data-needs-script>.*aria-label="Back" data-shelf-previous.*aria-label="On" data-shelf-next/);
 assert.throws(()=>stillShelf(['x']),/needs a label/);
 assert.equal(sheetNote('Nothing & more'),'<p class="sheet__note">Nothing &amp; more</p>');
});

test('options a page may ask for: roomy call rows and timetable, a button that shows its icon alone on phones',()=>{
 const row=callRows()[0];
 assert.match(callRow(row,{roomy:true}),/^<a class="call-row call-row--roomy" /);assert.match(callRow(row),/^<a class="call-row" /);
 assert.match(whatsappRow(on,{roomy:true}),/^<a class="call-row call-row--whatsapp call-row--roomy" /);assert.match(whatsappRow(on),/^<a class="call-row call-row--whatsapp" /);
 assert.match(hoursTable(on,{roomy:true,className:'k'}),/^<table class="hours-table hours-table--roomy k" /);assert.match(hoursTable(on),/^<table class="hours-table" /);
 const map=button({label:'Open in Google Maps',href:'https://maps.app.goo.gl/x',variant:'second',external:true,iconAfter:'out',labelHidden:'narrow'});
 assert.match(map,/class="button button--second button--icon-narrow"/);assert.match(map,/<span class="button__label">Open in Google Maps<\/span>/,'the words stay for assistive technology');
 assert.throws(()=>button({label:'x',labelHidden:'narrow'}),/needs an icon/);assert.throws(()=>button({label:'x',icon:'pin',labelHidden:'wide'}),/hidden label/);
});
