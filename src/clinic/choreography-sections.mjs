import {E,T,F,pose,partTrack,iconMarkup} from './choreography-primitives.mjs';
const pick=(c,selector)=>[...(c.root.matches(selector)?[c.root]:[]),...c.root.querySelectorAll(selector)].filter(el=>el.getClientRects().length&&el.closest('[data-section-scene]')===c.root.closest('[data-section-scene]'));
const scale=(c,d,p)=>c.phone?p:d;
function glint(c,target,cycle,active,restFirst=false){if(!target)return;const shine=c.own(target.cloneNode(true));shine.removeAttribute('style');shine.setAttribute('pathLength','1');shine.style.strokeDasharray='.12 1';shine.style.strokeWidth='3';shine.style.opacity='0';target.parentNode.append(shine);const start=restFirst?1-active/cycle:0,end=start+active/cycle,frames=[{strokeDashoffset:.12,opacity:0,offset:0}];if(start)frames.push({strokeDashoffset:.12,opacity:0,offset:start});frames.push({strokeDashoffset:0,opacity:.18,offset:start+active/cycle*.1},{strokeDashoffset:-.95,opacity:.18,offset:start+active/cycle*.9},{strokeDashoffset:-1.12,opacity:0,offset:end});if(end<1)frames.push({strokeDashoffset:-1.12,opacity:0,offset:1});c.loop(shine,frames,cycle);}
function iconGlint(c,target,cycle,active){if(!target)return;const r=c.bounds(target),shine=c.inject(c.root,'<span class="ch-emblem-glint" aria-hidden="true" style="left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px">'+target.outerHTML+'</span>');c.loop(shine,[{clipPath:'inset(0 100% 0 0)',opacity:0},{clipPath:'inset(0 60% 0 15%)',opacity:.65,offset:active/cycle*.35},{clipPath:'inset(0 0 0 100%)',opacity:0,offset:active/cycle},{clipPath:'inset(0 0 0 100%)',opacity:0}],cycle);}
function closing(c,fork=true){
 const title=c.root.querySelector('h2'),actions=pick(c,'.button,.text-link');if(!title||!actions.length)return;
 // Keep the real action-arrow response without temporary connector construction.
 actions.slice(0,c.id==='D3'?1:fork?2:1).forEach(action=>c.add(action.querySelector('[aria-hidden]'),[{opacity:.2},{opacity:1}],c.phone?650:750,c.phone?1000:c.id==='D3'?1150:1200));
}
function preparation(c,style){const items=pick(c,'.preparation article'),icons=items.map(el=>el.querySelector('svg'));if(!items.length)return;
 if(style==='D2'){
  const r=c.bounds(items[0].querySelector('.prep-art')||items[0]),flap=c.plane(r.x+r.w*.58,r.y+r.h*.08,r.w*.25,r.h*.25,{origin:'50% 0'});flap.classList.add('ch-preparation-corner');c.add(flap,[{transform:'rotateX(0)'},{transform:`perspective(300px) rotateX(${c.phone?-85:-110}deg)`,offset:.46},{transform:`perspective(300px) rotateX(${c.phone?-8:-12}deg)`}],scale(c,350,300),scale(c,1000,850),F);
  c.travel(icons[1],scale(c,350,300),scale(c,1000,850),[[0,0,c.phone?-10:-18,.94],[0,0,c.phone?2:4,1,.54],[0,0]]);
  for(const p of icons[2]?.querySelectorAll('path')||[]){p.setAttribute('pathLength','1');p.style.strokeDasharray='1';c.add(p,[{strokeDashoffset:1},{strokeDashoffset:0}],scale(c,450,380),scale(c,1000,850));}
 }else icons.forEach((el,i)=>c.travel(el,c.phone?0:i*100,scale(c,750,650),[[c.phone?0:-10,c.phone?12:10,c.phone?0:-6,.9],[c.phone?0:2,-1,c.phone?0:1,1,.6],[0,0]]));
 const ready=c.root.querySelector('[data-visit-ready] svg');if(ready)c.travel(ready,scale(c,1500,1250),c.duration,[[0,-10],[0,1,0,1,.6],[0,0]]);
}
export function supporting(c){const {id,phone:p}=c;
 if(id==='H2'){
  const form=c.root.querySelector('form');if(!form)return;const r=c.bounds(form);
  const panel=c.plane(r.x,r.y,r.w,r.h);panel.classList.add('ch-form-plane');c.hinge(panel,350*c.duration/1900,1000*c.duration/1900,p?-48:-70);c.retire(panel,c.duration-180,c.duration);
  const slots=[...c.root.querySelectorAll('.visit-sequence li svg,.visit-benefits li svg')].slice(0,3);slots.forEach((mark,i)=>c.travel(mark,(800+120*i)*c.duration/1900,1500*c.duration/1900,[[p?0:-10,p?8:0],[p?0:2,p?-1:0,0,1,.65],[0,0]]));
 }else if(id==='H3'||id==='H3-card'){
  if(id==='H3'){c.stage=c.root.querySelector('.section-heading')||c.root;c.media=[];return;}
  // Native lazy pictures never hold the card's readable text at opacity zero.
  c.media=[];
  for(const card of pick(c,'.care-card'))c.add(card,[{opacity:0},{opacity:1}],0,480,E);
 }else if(['H4','H4-panel','A3','A3-panel','D1','D1-panel'].includes(id)){
  if(id==='H4'||id==='A3'){c.stage=c.root.querySelector('.section-heading')||c.root;c.media=[];return;}
  if(id==='H4-panel')c.media=[];
  if(id==='A3-panel'){c.stage=c.root.querySelector('.about-doctor-identity')||c.root;c.media=[];}
  // Keep original instrument admission, without waiting for new identity photos.
  if(id==='D1'||id==='D1-panel')c.media=[...c.root.querySelectorAll('.doctor-decoration img,.doctor-decoration svg image')].filter(el=>el.closest('[data-motion-owner]')===c.root);
  const base=id.split('-panel')[0],cards=pick(c,'.doctor-card');if((p||base==='D1')&&!id.includes('-panel'))return;
  cards.forEach((card,j)=>{const marks=card.querySelectorAll('[data-layer="contour"]');marks.forEach(el=>{el.setAttribute('pathLength','1');el.style.strokeDasharray='1';c.add(el,[{strokeDashoffset:1},{strokeDashoffset:0}],0,p?550:650);});
   const main=card.querySelector('[data-layer="main"],.doctor-decoration [data-scene="emblem"] svg');
   if(base==='H4'&&main){const mr=c.bounds(main),direction=card.dataset.doctor==='parul'?1:-1,x=p?0:Math.min(28,mr.w*.3)*direction,svg=main.ownerSVGElement,sf=svg?svg.getBoundingClientRect().width/svg.viewBox.baseVal.width:1;
    main.style.transformBox='fill-box';main.style.transformOrigin='center';c.travel(main,p?450:500,p?1100:1300,[[x/sf,p?mr.h*.14/sf:0,(p?6:12)*direction,p?.9:.86],[p?0:-mr.w*.02*direction/sf,-mr.h*.02/sf,p?0:-2*direction,1.03,p?450/650:550/800],[0,0]]);
   }
   if(base==='A3'){const mark=card.querySelector('.doctor-name-mark svg');c.travel(mark,p?350:400,p?900:1100,[[p?0:-18,p?12:0,p?0:-8,p?.94:.9],[p?0:2,p?-1:0,p?0:1,1,.6],[0,0]]);}
   const facts=[...card.querySelectorAll('.doctor-facts li')];facts.forEach((el,i)=>{const a=base==='H4'?(p?950+i*300:1100+i*350):base==='A3'?(p?750+i*250:900+i*350):(p?1100+i*350:1250+j*300+i*500);c.fact(el,a,a+(p?450:500));});
   if(base==='H4')iconGlint(c,main,12000,1800);else if(base==='A3')iconGlint(c,card.querySelector('.doctor-name-mark svg'),12000,1500);
  });
  if(base==='D1'){partTrack(c,'A18','whole',[[500,0,5,-3,.94],[1150,0,-1,1,1],[1600,0,0]],[[420,0,5,-2,.95],[950,0,0],[1350,0,0]]);partTrack(c,'A19','fold',[[500,5,4,4,.94],[1200,-1,0,-1],[1750,0,0]],[[420,0,4,2,.95],[1000,0,0],[1450,0,0]]);partTrack(c,'A19','hands',[[700,-4,3,0,.94],[1400,1,0],[1950,0,0]],[[600,0,4,0,.95],[1200,0,0],[1650,0,0]]);}
 }else if(id==='H6'||id==='D4-new-reviews'){
  if(id==='H6'&&c.root.querySelector('[data-home-reviews]')){
   const rail=c.root.querySelector('[data-home-review-viewport]');
   c.stage=rail&&!rail.hidden?rail:c.root.querySelector('.section-heading')||c.root;c.media=[];
   c.travel(c.root.querySelector('.home-review-count svg'),0,p?420:500,[[p?0:-12,p?6:0,0,.9],[p?0:2,p?-1:0,0,1,.6],[0,0]]);
   const visibleCards=[...c.root.querySelectorAll('[data-home-review-group]>.home-review-card')].slice(0,p?1:4);
   visibleCards.forEach((card,index)=>{
    const delay=index*70,avatar=card.querySelector('.home-review-avatar'),quote=card.querySelector('.home-review-quote svg'),topic=card.querySelector('.home-review-topic svg');
    c.travel(avatar,200+delay,650+delay,[[0,10,0,.94],[0,-1,0,1,.72],[0,0]]);
    c.travel(quote,500+delay,950+delay,[[8,0,-8,.9],[-1,0,1,1,.7],[0,0]]);
    c.travel(topic,800+delay,1300+delay,[[-10,0,0,.9],[1,0,0,1,.72],[0,0]]);
   });return;
  }
  const quotes=pick(c,'.review-grid:not([hidden])>.review-card'),d=id==='H6';quotes.forEach((el,i)=>{const r=c.bounds(el),author=el.querySelector('figcaption');if(!d){const slot=author.querySelector('.review-quote-slot');if(slot&&!slot.children.length)c.inject(slot,iconMarkup('quote'));}if(d){const backing=c.plane(r.x,r.y,r.w,r.h,{color:'white'});backing.classList.add('ch-quote-backing');const mid=quotes.length===2?(c.bounds(quotes[0]).cx+c.bounds(quotes[1]).cx)/2:r.cx;c.add(backing,[{transform:pose(p?0:mid-r.cx,p?12:0,p?0:i?-2:2,p?.96:.85),opacity:.35},{transform:pose(0,p?-2:0,0,1),opacity:1,offset:.7},{transform:'none',opacity:1}],p?350:400,p?950:1050,T);}
   c.add(author.querySelector('.review-author-rule'),[{transform:'scaleX(.1)',transformOrigin:'0 50%'},{transform:'scaleX(1)',transformOrigin:'0 50%'}],p?800:900,d?(p?1400:1600):(p?1300:1500));
  });
  if(d){const rail=c.root.querySelector('.review-rail');if(rail){const previous=rail.innerHTML;rail.innerHTML='<span class="ch-quote-mark">‘</span><span class="ch-quote-mark">‘</span>';const clean=c.cleanup;c.cleanup=()=>{clean();rail.innerHTML=previous;};rail.querySelectorAll('.ch-quote-mark').forEach((mark,i)=>c.travel(mark,0,p?420:500,p?[[0,0,0,.9],[0,i?-6:6,i?-8:8,1,.5],[0,0]]:[[i?-12:12,0,0,.9],[i?12:-12,0,i?-8:8,1,.5],[0,0]]));c.loop(rail,[{transform:pose()},{transform:pose(0,-6),offset:.1},{transform:pose(),offset:.2},{transform:pose()}],12000);}}
 }else if(['H7','T5','D3'].includes(id))closing(c,id==='H7');
 else if(id==='T1'){
  const links=pick(c,'.chapter-link');
  links.forEach((el,i)=>{
   const r=c.bounds(el),back=c.plane(r.x,r.y,r.w,r.h,{origin:p?'50% 0':'50% 50%'});c.hinge(back,p?350:400,p?900:1050,p?-35:i?55:-55,p?'X':'Y');c.retire(back,c.duration-180,c.duration);
   const mark=el.querySelector('svg');
   c.travel(mark,p?750:900,p?1400:1600,[[0,p?-8:-12,i?8:-8,.9],[0,p?1:2,0,1,.6],[0,0]]);
  });
 }else if(id==='T4'){
  partTrack(c,'A32','report',[[0,-10,4,-5,.94],[630,1,-1,1],[1010,0,0]],[[0,0,7,-2,.95],[565,0,-1],[870,0,0]]);
  partTrack(c,'A32','list',[[380,-10,-3,-8,.92],[1050,4,-5,2],[1685,0,0]],[[305,0,-8,-4,.94],[915,2,-4,1],[1435,0,0]]);
  const note=partTrack(c,'A32','note',[[885,-12,-12,-12,.94],[1560,1,-3,3],[2105,0,0]],[[740,-8,-9,-7,.95],[1305,0,-2,1],[1825,0,0]]);
  if(p)pick(c,'.preparation article').forEach((el,i)=>c.travel(el.querySelector('svg'),1215+i*70,1870+i*45,[[0,6],[0,-1,0,1,.65],[0,0]]));
  const idle=note?.querySelector('.art-drift');c.loop(idle,[{transform:pose()},{transform:pose(),offset:.65},{transform:pose(0,-4),offset:.825},{transform:pose()}],10000);
 }else if(id==='A1'){
  partTrack(c,'A15','stethoscope',[[0,-5,4,-6,.9],[900,4,-1,2],[2050,0,0]],[[0,0,7,-3,.93],[750,2,-1,1],[1750,0,0]]);const probe=partTrack(c,'A15','probe',[[250,4,-5,7,.9],[1200,-4,2,-2],[2050,0,0]],[[200,0,-6,4,.93],[1000,-2,1,-1],[1750,0,0]]);
  const stage=c.root.querySelector('.composition'),r=c.bounds(stage),curve=c.path(p?`M${r.x+r.w*.24} ${r.y+r.h*.82}C${r.x+r.w*.13} ${r.y+r.h*.56} ${r.x+r.w*.37} ${r.y+r.h*.20} ${r.x+r.w*.75} ${r.y+r.h*.24}`:`M${r.x+r.w*.25} ${r.y+r.h*.81}C${r.x+r.w*.12} ${r.y+r.h*.6} ${r.x+r.w*.41} ${r.y+r.h*.12} ${r.x+r.w*.77} ${r.y+r.h*.23}`);c.draw(curve,p?420:500,p?1150:1350);curve.dataset.chRetain='';glint(c,curve,12000,1600);
  c.loop(probe?.querySelector('.art-drift'),[{transform:pose()},{transform:pose(),offset:.1},{transform:pose(0,-4),offset:.15},{transform:pose(),offset:.2},{transform:pose()}],12000);
 }else if(id==='A2'||id==='A2-panel'){
  if(p&&id==='A2')return;
  for(const [a,name,keys,pk]of[
   ['A16','ground',[[0,0,4,-3,.94],[700,0,-1,1],[1300,0,0]],[[0,0,3,-2,.95],[600,0,0],[1100,0,0]]],
   ['A16','woman',[[450,-5,5,0,.94],[1300,1,-1],[2050,0,0]],[[350,0,6,0,.95],[1150,0,0],[1750,0,0]]],
   ['A16','man',[[600,5,5,0,.94],[1450,-1,-1],[2050,0,0]],[[500,0,6,0,.95],[1300,0,0],[1750,0,0]]],
   ['A17','rear-fold',[[0,4,4,-4,.94],[1000,-1,0,1],[2050,0,0]],[[0,0,4,-2,.96],[850,0,0],[1750,0,0]]],
   ['A17','front-fold',[[600,-4,4,4,.94],[1550,1,0,-1],[2050,0,0]],[[500,0,4,2,.96],[1300,0,0],[1750,0,0]]],
   ['A17','woman',[[450,-4,4,0,.94],[1300,1,-1],[2050,0,0]],[[350,0,5,0,.95],[1100,0,0],[1750,0,0]]]])partTrack(c,a,name,keys,pk);
  pick(c,'.composition').forEach(stage=>{const a=stage.dataset.composition,r=c.bounds(stage),left=a==='A16',plane=c.plane(r.x+r.w*(left?.09:p?.65:.615),r.y+r.h*(left?.67:.21),r.w*(left?.82:p?.20:.23),r.h*(left?p?.18:.20:p?.58:.64),{origin:left?'50% 100%':'0 50%'});plane.classList.add('ch-care-support');c.hinge(plane,p?350:450,p?1100:1300,p?-45:left?-70:-65,left?'X':'Y');c.retire(plane,c.duration-180,c.duration);});
 }else if(id==='A2-new-credentials'){
  pick(c,'.credential-rows p').forEach(el=>{const icon=el.querySelector('svg');c.hinge(icon,p?420:500,p?950:1100,p?-35:-55);});
 }else if(['A4','D2'].includes(id))preparation(c,id);
}
