import {E,T,F,pose,iconMarkup} from './choreography-primitives.mjs';
const asset=stem=>`/clinic-assets/${stem}-960.webp`;
const image=stem=>`<img src="${asset(stem)}" width="960" height="960" alt="" decoding="async">`;
const lip='M267 611 Q269 596 288 590 L866 480 Q886 472 902 483 Q915 491 917 508 L952 657 Q959 678 936 688 L291 812 Q275 817 261 805 L260 636 Q260 616 267 611Z';
function draw(c,el,a,b){if(!el)return;const n=el.getTotalLength();el.style.strokeDasharray=n;c.add(el,[{strokeDashoffset:n},{strokeDashoffset:0}],a,b,T);}
function reuse(c,stage,html,cls){if(!stage)return null;stage.classList.add(cls);const previous=stage.innerHTML;stage.innerHTML=html;const clean=c.cleanup;c.cleanup=()=>{clean();stage.innerHTML=previous;stage.classList.remove(cls);};return stage;}
function alpha(stem,box,cls,x,y,w,h,z,extra=''){
 return `<div class="ch-part ${cls}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${z}"><div class="ch-entry"><div class="ch-idle"><svg viewBox="${box}" aria-hidden="true"><image href="${asset(stem)}" width="1254" height="1254"/>${extra}</svg></div></div></div>`;
}
export function hero(c){
 const stage=c.root.querySelector('.specialty-stage'),instrument=stage?.querySelector('.hero-instrument'),back=stage?.querySelector('.hero-backing');if(!stage||!instrument)return;
 c.stage=instrument;stage.classList.add('ch-hero-stage');const w=stage.clientWidth,h=c.phone?300:stage.clientHeight,k=c.phone?2300/2800:1;
 const path=c.phone?`M${w*.1} 240 C${w*-.02} 170 ${w*.12} 66 ${w*.38} 72 S${w*.84} 145 ${w*.87} 48`:'M108 554 C16 417 85 260 254 256 S595 404 610 210';
 const trace=c.inject(stage,`<svg class="ch-hero-traces" viewBox="0 0 ${c.phone?w:740} ${c.phone?300:760}" aria-hidden="true"><path class="ch-main-route" d="${path}"/><path class="ch-route-glint" d="${path}"/></svg>`);
 const tr=(e,f,a,b,curve=E)=>c.add(e,f,a*k,b*k,curve);
 tr(back,[{transform:'scale(.22,.5) rotate(-16deg)',opacity:.25,borderRadius:'49% 44% 47% 48%'},{transform:'scale(1.02,.97) rotate(2deg)',opacity:1,offset:.7},{transform:'none',opacity:1,borderRadius:'46% 44% 32% 48%'}],0,1050,F);
 tr(instrument,[{transform:pose(w*(c.phone?.10:.18),0,-9,.84),opacity:0},{transform:pose(w*(c.phone?.10:.18),0,-9,.84),opacity:1,offset:.12},{transform:pose(-w*(c.phone?.04:.07),-h*(c.phone?.025:.07),3,1.02),opacity:1,offset:.58},{transform:pose(0,-4,-.5),opacity:1,offset:.91},{transform:pose(),opacity:1}],120,2800,T);
 draw(c,trace.querySelector('.ch-main-route'),400*k,1700*k);
 stage.querySelectorAll('.specialty').forEach((card,i)=>{let flap=card.querySelector('.flap');if(!flap)flap=c.inject(card,'<span class="flap" aria-hidden="true"></span>');tr(flap,[{transform:`perspective(500px) rotateY(${i%2?40:-40}deg) rotate(${i%2?-8:8}deg)`,opacity:.3},{transform:'perspective(500px) rotateY(0) rotate(0)',opacity:1}],1050+i*90,2100+i*90,F);tr(card.querySelector('svg'),[{transform:'translateY(5px) scale(.9)',opacity:.4},{transform:'translateY(-2px) scale(1.08)',opacity:1,offset:.65},{transform:'none',opacity:1}],1750+i*60,2400+i*60);});
 const glint=trace.querySelector('.ch-route-glint');glint.style.strokeDasharray='24 1600';glint.style.opacity='0';c.loop(glint,[{strokeDashoffset:1000,opacity:0},{strokeDashoffset:1000,opacity:0,offset:.65},{strokeDashoffset:1000,opacity:.8,offset:.66},{strokeDashoffset:-40,opacity:.8,offset:.93},{strokeDashoffset:-40,opacity:0}],12000);
 c.loop(instrument.querySelector('[data-ambient]')||instrument.firstElementChild,[{transform:pose()},{transform:pose(),offset:.65},{transform:pose(0,-4,.4),offset:.78},{transform:pose(0,-2,-.15),offset:.9},{transform:pose()}],12000);
}
export function steps(c){
 const stage=reuse(c,c.root.querySelector('[data-composition="A12"]'),`<div class="ch-desk-halo"></div><span class="ch-desk-baseline"></span><svg class="ch-step-route-svg" viewBox="0 0 570 570"><path d="M150 355 C80 470 230 530 345 490 S510 410 566 362"/></svg><div class="ch-calendar">${image('a12-calendar')}</div><div class="ch-folio"><div class="ch-folio-base">${iconMarkup('person')}<i></i><i></i></div><div class="ch-folio-front">${iconMarkup('calendar')}<i></i><i></i><i class="ch-idle-rule"></i></div></div><div class="ch-review-outline"></div><div class="ch-slip">${image('a12-slip')}<svg class="ch-writing" viewBox="0 0 960 960"><path class="ch-note-lines" d="M290 405 560 320 M325 478 600 390 M357 550 551 489"/><path class="ch-check" d="m490 573 49 27 100-111"/></svg></div><div class="ch-pen"><div class="ch-idle">${image('a12-pen')}</div></div>`,'ch-step-art');if(!stage)return;c.stage=stage;
 const time=c.phone?2400/2900:1,k=c.phone?.65:1,tr=(sel,f,a,b,e=E)=>c.add(stage.querySelector(sel),f,a*time,b*time,e);
 tr('.ch-desk-halo',[{transform:'scale(.8,.62) rotate(-8deg)',opacity:.2},{transform:'none',opacity:1}],0,750,F);
 tr('.ch-desk-baseline',[{transform:'scaleX(.1)',opacity:0},{transform:'scaleX(1)',opacity:1}],100,1100);
 tr('.ch-calendar',[{transform:pose((c.phone?32:-100)*k,24*k,-10),opacity:0},{transform:pose(10*k,-8*k,2),opacity:1,offset:.72},{transform:'none',opacity:1}],0,1100,T);
 tr('.ch-folio',[{transform:pose(48*k,20*k,18),opacity:0},{transform:'rotate(8deg)',opacity:1}],400,1200);
 tr('.ch-folio-front',[{transform:'rotateY(0)'},{transform:'rotateY(-135deg)',offset:.45},{transform:'rotateY(-135deg)',offset:.7},{transform:'rotateY(-20deg)'}],550,2700,F);
 tr('.ch-slip',[{transform:pose(-90*k,-90*k,-18),opacity:0},{transform:pose(-35*k,-38*k,-4),opacity:1,offset:.28},{transform:pose(-35*k,-38*k,-4),opacity:1,offset:.62},{transform:'none',opacity:1}],900,2650,T);
 tr('.ch-pen',[{transform:pose((c.phone?-35:35)*k,-130*k,15),opacity:0},{transform:pose(-120*k,2*k),opacity:1,offset:.3667},{transform:pose(-106*k,10*k),opacity:1,offset:.48},{transform:pose(-78*k,-21*k),opacity:1,offset:.6667},{transform:'none',opacity:1}],1000,2500,'linear');
 draw(c,stage.querySelector('.ch-note-lines'),1150*time,1750*time);draw(c,stage.querySelector('.ch-check'),1550*time,2000*time);
 tr('.ch-review-outline',[{transform:'translate(-20px,-24px) rotate(-15deg) scale(.9)',opacity:0},{transform:'rotate(-8deg)',opacity:1}],1700,2650,F);
 for(const selector of ['.ch-review-outline','.ch-desk-baseline','.ch-step-route-svg'])c.retire(stage.querySelector(selector),2650*time,2900*time);
 if(!c.phone)draw(c,stage.querySelector('.ch-step-route-svg path'),1600*time,2750*time);
 c.add(c.root.querySelector('.step-line'),[{transform:'scaleY(0)'},{transform:'scaleY(.34)',offset:.3},{transform:'scaleY(.68)',offset:.65},{transform:'scaleY(1)'}],600*time,2750*time,T);
 c.loop(stage.querySelector('.ch-pen .ch-idle'),[{transform:'rotate(0)'},{transform:'rotate(0)',offset:.65},{transform:'rotate(2deg)',offset:.78},{transform:'rotate(-.5deg)',offset:.9},{transform:'rotate(0)'}],10000);
 c.loop(stage.querySelector('.ch-idle-rule'),[{opacity:.5},{opacity:.5,offset:.65},{opacity:1,offset:.82},{opacity:.5}],10000);
 c.onFrame=(ms)=>c.root.querySelectorAll('.step').forEach((el,i)=>el.classList.toggle('stage-active',ms>c.duration*.2&&i===(ms/c.duration<.32?0:ms/c.duration<.7?1:2)));
}
export function profile(c){
 const leaf='M50 100 C22 77 3 39 10 4 C45 -4 84 12 90 40 C95 63 72 89 50 100Z';
 const leaves=['left','middle','right'].map((name,i)=>`<div class="ch-leaf-position ch-leaf-${name}" style="left:${[56,66,77][i]}%;top:${[32,39,45][i]}%;width:${[18,19,18][i]}%;height:${[44,46,44][i]}%"><div class="ch-leaf-entry"><div class="ch-leaf-idle"><svg class="ch-leaf-face" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${leaf}"/></svg><svg class="ch-leaf-face ch-leaf-reverse" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${leaf}"/></svg></div></div></div>`).join('');
 const stage=reuse(c,c.root.querySelector('[data-composition="A21"]'),leaves+alpha('a21-fan','68 58 1127 1148','ch-fan',63.2,59.68,58.96,63.36,1)+alpha('a21-figure','155 14 901 1226','ch-figure',38.56,45.6,50.16,77.44,2)+'<svg class="ch-profile-ribbon" viewBox="0 0 460 460"><path d="M368 363 Q423 392 383 414 Q330 444 262 405"/></svg>','ch-profile-stage');if(!stage)return;c.stage=stage;
 const k=c.phone?5/6:1,w=stage.clientWidth,tr=(sel,f,a,b,e=T)=>{const el=stage.querySelector(sel);c.add(el,f,a*k,b*k,e);c.add(el,[{opacity:0},{opacity:1}],a*k,a*k+180);};
 tr('.ch-fan .ch-entry',[{transform:pose(0,w*.04,5,.93)},{transform:pose(-w*.01,-w*.01,-1),offset:1000/1900},{transform:'none'}],0,1900);
 tr('.ch-figure .ch-entry',[{transform:pose(c.phone?0:-w*.04,w*.04,0,.95)},{transform:pose(w*.01,-w*.01),offset:950/1750},{transform:'none'}],700,2450);
 ['left','middle','right'].forEach((name,i)=>{const r=c.phone?[[8,-10,-8],[0,1,0],[-8,10,8]][i]:[[12,-16,-12],[0,2,0],[-12,16,12]][i];tr(`.ch-leaf-${name} .ch-leaf-entry`,[{transform:`rotate(${r[0]}deg) rotateY(${c.phone?-42:-60}deg)`},{transform:`rotate(${r[1]}deg) rotateY(-8deg)`,offset:.65},{transform:`rotate(${r[2]}deg) rotateY(0)`}],500+i*150,1450+i*150,F);});
 draw(c,stage.querySelector('.ch-profile-ribbon path'),1900*k,2800*k);c.retire(stage.querySelector('.ch-profile-ribbon'),2800*k,2980*k);c.line(c.root.querySelector('.education-fact,[data-fact="education"],.profile-facts li,.doctor-facts li'),2600*k,3300*k);
 c.loop(stage.querySelector('.ch-leaf-right .ch-leaf-idle'),[{transform:'none'},{transform:'translateY(-4px) rotateY(2deg)',offset:.06},{transform:'translateY(-2px) rotateY(1deg)',offset:.1},{transform:'none',offset:.15},{transform:'none'}],12000);
}
export function booking(c){
 const clipId=`ch-front-lip-${c.id}`;
 const back=alpha('a23-holder','36 247 1218 835','ch-holder-back',50,64,80,46,1);
 const card=alpha('a23-card','55 257 1155 819','ch-card',57,56,38,38,2,'<path class="ch-card-glint" d="M145 210 883 316" transform="scale(1.30625)"/>');
 const front=`<div class="ch-part ch-holder-front" style="left:50%;top:64%;width:80%;height:46%;z-index:3"><div class="ch-entry"><svg viewBox="36 247 1218 835"><defs><clipPath id="${clipId}"><path d="${lip}" transform="scale(1.30625)"/></clipPath></defs><image href="${asset('a23-holder')}" width="1254" height="1254" clip-path="url(#${clipId})"/></svg></div></div>`;
 const stage=reuse(c,c.root.querySelector('[data-composition="A23"]'),back+card+front,'ch-booking-stage');if(!stage)return;c.stage=stage;
 const w=stage.clientWidth,h=stage.clientHeight,k=c.phone?.84:1;
 const tr=(el,f,a,b)=>{c.add(el,f,a*k,b*k,T);c.add(el,[{opacity:0},{opacity:1}],a*k,a*k+180);};
 stage.querySelectorAll('.ch-holder-back .ch-entry,.ch-holder-front .ch-entry').forEach(el=>tr(el,[{transform:pose(w*.04,h*.02,4,.94)},{transform:pose(-w*.01,0,-1),offset:650/1100},{transform:'none'}],0,1100));
 tr(stage.querySelector('.ch-card .ch-entry'),[{transform:pose(0,h*.12,-16,.95)},{transform:pose(0,-h*.12,-18),offset:800/1500},{transform:pose(0,0,-16)}],450,1950);
 const slots=[...c.root.querySelectorAll('[data-booking-step],.booking-steps li,.visit-progress li,.form-progress li')].slice(0,3),sb=c.bounds(stage);
 slots.forEach((el,i)=>{const r=c.anchor(el),icon=c.icon(['person','calendar','check'][i],r.cx-12,r.cy-12,24),x=c.phone?0:sb.x+w*.57-r.cx,y=c.phone?-22:sb.y+h*.42-r.cy;c.travel(icon,1050*k+i*140*k,1950*k,c.phone?[[x,y,0,.6],[0,-2,0,1,.8],[0,0]]:[[x,y,0,.6],[-16,y,0,.85,.35],[-16,0,0,1,.8],[0,0]]);c.retire(icon,1770*k,1950*k);});
 if(slots.length>1){const a=c.anchor(slots[0]),b=c.anchor(slots.at(-1)),rail=c.draw(c.path(`M${a.cx} ${a.cy}L${b.cx} ${b.cy}`),1750*k,2500*k);rail.dataset.chRetain='';}
 c.loop(stage.querySelector('.ch-card-glint'),[{opacity:.1},{opacity:.18,offset:.08},{opacity:.1,offset:.16},{opacity:.1}],10000);
}
