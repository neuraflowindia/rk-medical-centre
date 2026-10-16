import {E,T,F,pose,partTrack,iconMarkup} from './choreography-primitives.mjs';
import {symbol} from './artwork.js';
const pick=(c,selector)=>[...(c.root.matches(selector)?[c.root]:[]),...c.root.querySelectorAll(selector)].filter(el=>el.getClientRects().length&&el.closest('[data-section-scene]')===c.root.closest('[data-section-scene]'));
const scale=(c,d,p)=>c.phone?p:d;
function glint(c,target,cycle,active,restFirst=false){if(!target)return;const shine=c.own(target.cloneNode(true));shine.removeAttribute('style');shine.setAttribute('pathLength','1');shine.style.strokeDasharray='.12 1';shine.style.strokeWidth='3';shine.style.opacity='0';target.parentNode.append(shine);const start=restFirst?1-active/cycle:0,end=start+active/cycle,frames=[{strokeDashoffset:.12,opacity:0,offset:0}];if(start)frames.push({strokeDashoffset:.12,opacity:0,offset:start});frames.push({strokeDashoffset:0,opacity:.18,offset:start+active/cycle*.1},{strokeDashoffset:-.95,opacity:.18,offset:start+active/cycle*.9},{strokeDashoffset:-1.12,opacity:0,offset:end});if(end<1)frames.push({strokeDashoffset:-1.12,opacity:0,offset:1});c.loop(shine,frames,cycle);}
function iconGlint(c,target,cycle,active){if(!target)return;const r=c.bounds(target),shine=c.inject(c.root,'<span class="ch-emblem-glint" aria-hidden="true" style="left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px">'+target.outerHTML+'</span>');c.loop(shine,[{clipPath:'inset(0 100% 0 0)',opacity:0},{clipPath:'inset(0 60% 0 15%)',opacity:.65,offset:active/cycle*.35},{clipPath:'inset(0 0 0 100%)',opacity:0,offset:active/cycle},{clipPath:'inset(0 0 0 100%)',opacity:0}],cycle);}
function branch(c,from,to,a,b){const x=to.cx,y=to.cy,p=c.path(`M${from.x} ${from.y}C${from.x} ${from.y+24} ${x-24} ${y} ${x} ${y}`);c.draw(p,a,b);c.traveler(p,a+(b-a)*.35,b);return p;}
function closing(c,fork=true){const title=c.root.querySelector('h2'),actions=pick(c,'.button,.text-link');if(!title||!actions.length)return;const r=c.bounds(title.parentElement),origin={x:r.x-8,y:r.y+r.h+12};
 if(c.id==='D3'){
  const action=actions[0],b=c.anchor(action),junction={x:b.cx,y:b.cy},phrases=[title,title.parentElement.querySelector('p')].filter(Boolean);
  phrases.forEach(el=>{const q=c.bounds(el),x=q.x-8,y=q.y+q.h+8,line=c.path(`M${x} ${y-12}V${y}H${junction.x}V${junction.y}`);c.draw(line,0,c.phone?350:400);const dot=c.dot([[x,y],[junction.x,y],[junction.x,junction.y]],c.phone?250:300,c.phone?700:850,4);c.add(dot,[{opacity:1},{opacity:0}],c.phone?650:750,c.phone?1000:1150);c.add(line,[{opacity:.65},{opacity:0}],c.phone?1000:1150,c.duration);});
  const arrow=action.querySelector('[aria-hidden]');c.add(arrow,[{opacity:.2},{opacity:1}],c.phone?650:750,c.phone?1000:1150);return;
 }
 c.draw(c.path(`M${origin.x} ${origin.y-12}v12`),0,scale(c,400,350));
 actions.slice(0,fork?2:1).forEach((el)=>{const b=c.anchor(el),endX=b.cx,line=c.path(`M${origin.x} ${origin.y}H${endX}V${b.cy}`);c.draw(line,scale(c,300,250),scale(c,fork?900:850,750));c.traveler(line,c.phone?(fork?700:250):(fork?800:300),c.phone?(fork?1000:750):(fork?1200:850));
  c.add(el.querySelector('[aria-hidden]'),[{opacity:.2},{opacity:1}],c.phone?650:750,c.phone?1000:1200);
 });
}
function preparation(c,style){const items=pick(c,'.preparation article'),icons=items.map(el=>el.querySelector('svg'));if(!items.length)return;
 if(style==='D2'){
  const r=c.bounds(items[0].querySelector('.prep-art')||items[0]),flap=c.plane(r.x+r.w*.58,r.y+r.h*.08,r.w*.25,r.h*.25,{origin:'50% 0'});flap.classList.add('ch-preparation-corner');c.add(flap,[{transform:'rotateX(0)'},{transform:`perspective(300px) rotateX(${c.phone?-85:-110}deg)`,offset:.46},{transform:`perspective(300px) rotateX(${c.phone?-8:-12}deg)`}],scale(c,350,300),scale(c,1000,850),F);
  c.travel(icons[1],scale(c,350,300),scale(c,1000,850),[[0,0,c.phone?-10:-18,.94],[0,0,c.phone?2:4,1,.54],[0,0]]);
  for(const p of icons[2]?.querySelectorAll('path')||[]){p.setAttribute('pathLength','1');p.style.strokeDasharray='1';c.add(p,[{strokeDashoffset:1},{strokeDashoffset:0}],scale(c,450,380),scale(c,1000,850));}
 }else icons.forEach((el,i)=>c.travel(el,c.phone?0:i*100,scale(c,750,650),[[c.phone?0:-10,c.phone?12:10,c.phone?0:-6,.9],[c.phone?0:2,-1,c.phone?0:1,1,.6],[0,0]]));
 // The preparation rail ends at the last preparation icon. It never wraps
 // the observation note or reaches across unrelated contact copy.
 const anchors=items.map(item=>c.anchor(item)),a=scale(c,style==='D2'?900:1000,style==='D2'?750:850),b=scale(c,style==='D2'?1650:1750,style==='D2'?1400:1450);
 if(anchors.length>1){anchors.slice(1).forEach((r,i)=>{const from=anchors[i],lane=Math.min(from.y,r.y)-12,d=c.phone?`M${from.cx} ${from.cy}L${r.cx} ${r.cy}`:`M${from.cx} ${from.cy}V${lane}H${r.cx}V${r.cy}`,rail=c.draw(c.path(d),a,b);c.traveler(rail,a+(b-a)*.35,b);});}
 const ready=c.root.querySelector('[data-visit-ready] svg');if(ready)c.travel(ready,scale(c,1500,1250),c.duration,[[0,-10],[0,1,0,1,.6],[0,0]]);
}
export function supporting(c){const {id,phone:p}=c;
 if(id==='H2'){
  const form=c.root.querySelector('form');if(!form)return;const r=c.bounds(form),title=c.root.querySelector('h2'),h=c.bounds(title);
  const railX=Math.max(8,r.x-12),startY=p?h.y+h.h+12:h.cy;c.draw(c.path(`M${railX} ${startY}C${railX-5} ${startY+24} ${railX-5} ${r.cy-24} ${railX} ${r.cy}`),0,450*c.duration/1900);
  const panel=c.plane(r.x,r.y,r.w,r.h);panel.classList.add('ch-form-plane');c.hinge(panel,350*c.duration/1900,1000*c.duration/1900,p?-48:-70);c.retire(panel,c.duration-180,c.duration);
  const slots=[...c.root.querySelectorAll('.visit-sequence li svg,.visit-benefits li svg')].slice(0,3);slots.forEach((mark,i)=>c.travel(mark,(800+120*i)*c.duration/1900,1500*c.duration/1900,[[p?0:-10,p?8:0],[p?0:2,p?-1:0,0,1,.65],[0,0]]));
  const btn=form.querySelector('button[type="submit"]');if(btn)branch(c,{x:r.x-10,y:r.y+r.h-20},c.anchor(btn),1400*c.duration/1900,c.duration);
 }else if(id==='H3'||id==='H3-card'){
  if(id==='H3'){c.stage=c.root.querySelector('.section-heading')||c.root;c.media=[];return;}
  const cards=pick(c,'.care-card');
  cards.forEach((card,i)=>{const media=card.querySelector('.care-media'),obj=card.querySelector('.care-object'),link=card.querySelector('.text-link'),r=c.bounds(media),lr=c.bounds(link);const start=p?500:950+50*i,end=p?1450:1800+35*i;
   c.travel(obj,start,end,p?[[0,r.h*.10,i%2?2:-2,.95],[0,-r.h*.01,0,1,.6],[0,0]]:[[r.w*(i%2?.12:-.12),0,i%2?3:-3,.94],[-r.w*(i%2?.01:-.01),0,i%2?-.5:.5,1,.6],[0,0]]);
   const shelf=c.path(`M${r.x} ${r.y+r.h-1}H${r.x+r.w}`);c.draw(shelf,p?300:450,p?850:1100);c.retire(shelf,p?1950:2200,p?2200:2600,.65);
   const endpoint=c.anchor(link);c.dot([[r.x,r.y+r.h],[endpoint.cx,endpoint.cy-12],[endpoint.cx,endpoint.cy]],p?1300:1650+40*i,p?1950:2350,4);if(i===0)glint(c,shelf,10000,1500);
  });
 }else if(['H4','H4-panel','A3','A3-panel','D1','D1-panel'].includes(id)){
  if(id==='H4'){c.stage=c.root.querySelector('.section-heading')||c.root;c.media=[];return;}
  const base=id.split('-panel')[0],cards=pick(c,'.doctor-card');if((p||base==='D1')&&!id.includes('-panel'))return;
  cards.forEach((card,j)=>{const marks=card.querySelectorAll('[data-layer="contour"]');marks.forEach(el=>{el.setAttribute('pathLength','1');el.style.strokeDasharray='1';c.add(el,[{strokeDashoffset:1},{strokeDashoffset:0}],0,p?550:650);});
   const main=card.querySelector('[data-layer="main"],.doctor-decoration [data-scene="emblem"] svg'),r=c.bounds(card),name=card.querySelector('h2,h3'),nr=c.bounds(name);
   if(base==='H4'&&main){const mr=c.bounds(main),direction=card.dataset.doctor==='parul'?1:-1,x=p?0:Math.min(28,mr.w*.3)*direction,svg=main.ownerSVGElement,sf=svg?svg.getBoundingClientRect().width/svg.viewBox.baseVal.width:1;
    main.style.transformBox='fill-box';main.style.transformOrigin='center';c.travel(main,p?450:500,p?1100:1300,[[x/sf,p?mr.h*.14/sf:0,(p?6:12)*direction,p?.9:.86],[p?0:-mr.w*.02*direction/sf,-mr.h*.02/sf,p?0:-2*direction,1.03,p?450/650:550/800],[0,0]]);
   }
   if(base==='A3'){const mark=card.querySelector('.doctor-name-mark svg');c.travel(mark,p?350:400,p?900:1100,[[p?0:-18,p?12:0,p?0:-8,p?.94:.9],[p?0:2,p?-1:0,p?0:1,1,.6],[0,0]]);}
   const facts=[...card.querySelectorAll('.doctor-facts li')];facts.forEach((el,i)=>{const a=base==='H4'?(p?950+i*300:1100+i*350):base==='A3'?(p?750+i*250:900+i*350):(p?1100+i*350:1250+j*300+i*500);c.fact(el,a,a+(p?450:500));});
   card.querySelectorAll('.doctor-topics a').forEach((el,i)=>{const b=c.bounds(el),a=base==='H4'?(p?1500+i*70:1750+i*90):(p?1650:1950),end=base==='H4'?(p?2050:2450):(p?2350:2850);c.line(el,a,end,{width:Math.min(42,b.w)});});
   const action=card.querySelector('.doctor-actions a:not([hidden])'),rule=c.line(base==='D1'?card.querySelector('.doctor-actions'):action,base==='A3'?(p?1350:1550):base==='H4'?(p?2000:2300):(p?2300:2700),c.duration,{side:base==='D1'?'top':'bottom'});
   if(base==='D1')glint(c,rule,14000,4900,true);else if(base==='H4')iconGlint(c,main,12000,1800);else iconGlint(c,card.querySelector('.doctor-name-mark svg'),12000,1500);
  });
  if(base==='D1'){cards.forEach(card=>{const r=c.bounds(card);for(const side of[0,1]){const x=r.x+(side?r.w-8:8),dx=side?-8:8;const corner=c.draw(c.path(`M${x+dx} ${r.y+8}H${x}v8`),0,p?550:650);c.retire(corner,p?550:650,p?730:830,.65);}});partTrack(c,'A18','whole',[[500,0,5,-3,.94],[1150,0,-1,1,1],[1600,0,0]],[[420,0,5,-2,.95],[950,0,0],[1350,0,0]]);partTrack(c,'A19','fold',[[500,5,4,4,.94],[1200,-1,0,-1],[1750,0,0]],[[420,0,4,2,.95],[1000,0,0],[1450,0,0]]);partTrack(c,'A19','hands',[[700,-4,3,0,.94],[1400,1,0],[1950,0,0]],[[600,0,4,0,.95],[1200,0,0],[1650,0,0]]);}
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
  const quotes=pick(c,'.review-grid:not([hidden])>.review-card'),d=id==='H6';quotes.forEach((el,i)=>{const r=c.bounds(el),author=el.querySelector('figcaption'),ar=c.bounds(author);if(!d){const slot=author.querySelector('.review-quote-slot');if(slot&&!slot.children.length)c.inject(slot,iconMarkup('quote'));}if(d){const backing=c.plane(r.x,r.y,r.w,r.h,{color:'white'});backing.classList.add('ch-quote-backing');const mid=quotes.length===2?(c.bounds(quotes[0]).cx+c.bounds(quotes[1]).cx)/2:r.cx;c.add(backing,[{transform:pose(p?0:mid-r.cx,p?12:0,p?0:i?-2:2,p?.96:.85),opacity:.35},{transform:pose(0,p?-2:0,0,1),opacity:1,offset:.7},{transform:'none',opacity:1}],p?350:400,p?950:1050,T);}else{for(let n=0;n<2;n++){const slot=c.bounds(author.querySelector('.review-quote-slot')||author),dot=c.dot([[r.x+r.w*(.2+n*.5),r.y-16],[slot.cx+(n?3:-3),slot.cy-4],[slot.cx,slot.cy]],p?350:400,p?950:1000,10);c.add(dot,[{opacity:.3},{opacity:1}],0,p?416.667:500);}}
   c.add(author.querySelector('.review-author-rule'),[{transform:'scaleX(.1)',transformOrigin:'0 50%'},{transform:'scaleX(1)',transformOrigin:'0 50%'}],p?800:900,d?(p?1400:1600):(p?1300:1500));
  });
  const button=c.root.querySelector('.review-toggle');if(d&&button){const r=c.bounds(button),strip=c.plane(r.x,r.y+r.h-1,r.w,4,{origin:'50% 0'});c.hinge(strip,p?1250:1450,c.duration,p?-35:-55,'X');c.retire(strip,c.duration-180,c.duration);}else c.line(button,p?1250:1450,c.duration);
  if(d){const rail=c.root.querySelector('.review-rail');if(rail){const previous=rail.innerHTML;rail.innerHTML='<span class="ch-quote-mark">‘</span><span class="ch-quote-mark">‘</span>';const clean=c.cleanup;c.cleanup=()=>{clean();rail.innerHTML=previous;};rail.querySelectorAll('.ch-quote-mark').forEach((mark,i)=>c.travel(mark,0,p?420:500,p?[[0,0,0,.9],[0,i?-6:6,i?-8:8,1,.5],[0,0]]:[[i?-12:12,0,0,.9],[i?12:-12,0,i?-8:8,1,.5],[0,0]]));c.loop(rail,[{transform:pose()},{transform:pose(0,-6),offset:.1},{transform:pose(),offset:.2},{transform:pose()}],12000);}}
 }else if(['H7','T5','D3'].includes(id))closing(c,id==='H7');
 else if(id==='T1'){
  const links=pick(c,'.chapter-link'),head=c.root.querySelector('h1'),h=c.bounds(head.closest('.section-heading')||head),gutter=Math.max(8,h.x-12);
  links.forEach((el,i)=>{
   const r=c.bounds(el),back=c.plane(r.x,r.y,r.w,r.h,{origin:p?'50% 0':'50% 50%'});c.hinge(back,p?350:400,p?900:1050,p?-35:i?55:-55,p?'X':'Y');c.retire(back,c.duration-180,c.duration);
   const mark=el.querySelector('svg'),slot=c.bounds(mark||el),points=[[gutter,h.y+h.h+12],[gutter,r.y-12],[slot.cx,r.y-12],[slot.cx,slot.cy]],route=c.draw(c.path('M'+points.map(point=>point.join(' ')).join('L')),0,p?420:500);c.traveler(route,(p?420:500)*.35,p?420:500);
   c.travel(mark,p?750:900,p?1400:1600,[[0,p?-8:-12,i?8:-8,.9],[0,p?1:2,0,1,.6],[0,0]]);
  });
 }else if(id==='T4'){
  partTrack(c,'A32','report',[[0,-10,4,-5,.94],[630,1,-1,1],[1010,0,0]],[[0,0,7,-2,.95],[565,0,-1],[870,0,0]]);
  partTrack(c,'A32','list',[[380,-10,-3,-8,.92],[1050,4,-5,2],[1685,0,0]],[[305,0,-8,-4,.94],[915,2,-4,1],[1435,0,0]]);
  const note=partTrack(c,'A32','note',[[885,-12,-12,-12,.94],[1560,1,-3,3],[2105,0,0]],[[740,-8,-9,-7,.95],[1305,0,-2,1],[1825,0,0]]),stage=c.root.querySelector('[data-composition="A32"]'),sr=c.bounds(stage),lists=pick(c,'.preparation article');
  c.svg().classList.add('ch-underlay');
  lists.forEach((el,i)=>{const mark=el.querySelector('svg'),mr=c.bounds(mark||el),part=stage.querySelector('[data-part="'+['report','list','note'][i]+'"]'),pr=c.bounds(part),a=p?1215+i*70:1430+i*85,b=p?1870+i*45:2105+i*65;let path;
   if(p){const x=Math.min(sr.x+sr.w-12,pr.cx),y=Math.min(sr.y+sr.h-14,pr.y+pr.h+5);path=c.path('M'+x+' '+y+'h24');c.travel(mark,a,b,[[0,6],[0,-1,0,1,.65],[0,0]]);}
   else{const endX=mr.cx,turnX=Math.min(mr.x-12,sr.x+sr.w+10),startY=Math.min(sr.y+sr.h-8,pr.y+pr.h+5);path=c.path('M'+pr.cx+' '+startY+'H'+turnX+'V'+mr.cy+'H'+endX);}
   c.draw(path,a,b);c.retire(path,p?1820:2220,p?2000:2400,.65);
  });
  const idle=note?.querySelector('.art-drift');c.loop(idle,[{transform:pose()},{transform:pose(),offset:.65},{transform:pose(0,-4),offset:.825},{transform:pose()}],10000);
 }else if(id==='A1'){
  partTrack(c,'A15','stethoscope',[[0,-5,4,-6,.9],[900,4,-1,2],[2050,0,0]],[[0,0,7,-3,.93],[750,2,-1,1],[1750,0,0]]);const probe=partTrack(c,'A15','probe',[[250,4,-5,7,.9],[1200,-4,2,-2],[2050,0,0]],[[200,0,-6,4,.93],[1000,-2,1,-1],[1750,0,0]]);
  const stage=c.root.querySelector('.composition'),r=c.bounds(stage),curve=c.path(p?`M${r.x+r.w*.24} ${r.y+r.h*.82}C${r.x+r.w*.13} ${r.y+r.h*.56} ${r.x+r.w*.37} ${r.y+r.h*.20} ${r.x+r.w*.75} ${r.y+r.h*.24}`:`M${r.x+r.w*.25} ${r.y+r.h*.81}C${r.x+r.w*.12} ${r.y+r.h*.6} ${r.x+r.w*.41} ${r.y+r.h*.12} ${r.x+r.w*.77} ${r.y+r.h*.23}`);c.draw(curve,p?420:500,p?1150:1350);curve.dataset.chRetain='';glint(c,curve,12000,1600);
  for(const [sx,sy,ex,ey]of(p?[[.75,.24,.78,.78],[.24,.82,.22,.83]]:[[.77,.23,.78,.78],[.25,.81,.22,.83]]))c.dot([[r.x+r.w*sx,r.y+r.h*sy],[r.x+r.w*ex,r.y+r.h*ey]],p?1000:1200,p?1708.333:2050);
  c.line(c.root.querySelector('.experience-strip'),p?1500:1800,p?2200:2600);c.loop(probe?.querySelector('.art-drift'),[{transform:pose()},{transform:pose(),offset:.1},{transform:pose(0,-4),offset:.15},{transform:pose(),offset:.2},{transform:pose()}],12000);
 }else if(id==='A2'||id==='A2-panel'){
  if(p&&id==='A2')return;
  for(const [a,name,keys,pk]of[
   ['A16','ground',[[0,0,4,-3,.94],[700,0,-1,1],[1300,0,0]],[[0,0,3,-2,.95],[600,0,0],[1100,0,0]]],
   ['A16','woman',[[450,-5,5,0,.94],[1300,1,-1],[2050,0,0]],[[350,0,6,0,.95],[1150,0,0],[1750,0,0]]],
   ['A16','man',[[600,5,5,0,.94],[1450,-1,-1],[2050,0,0]],[[500,0,6,0,.95],[1300,0,0],[1750,0,0]]],
   ['A17','rear-fold',[[0,4,4,-4,.94],[1000,-1,0,1],[2050,0,0]],[[0,0,4,-2,.96],[850,0,0],[1750,0,0]]],
   ['A17','front-fold',[[600,-4,4,4,.94],[1550,1,0,-1],[2050,0,0]],[[500,0,4,2,.96],[1300,0,0],[1750,0,0]]],
   ['A17','woman',[[450,-4,4,0,.94],[1300,1,-1],[2050,0,0]],[[350,0,5,0,.95],[1100,0,0],[1750,0,0]]]])partTrack(c,a,name,keys,pk);
  pick(c,'.composition').forEach(stage=>{const a=stage.dataset.composition,r=c.bounds(stage),left=a==='A16',plane=c.plane(r.x+r.w*(left?.09:p?.65:.615),r.y+r.h*(left?.67:.21),r.w*(left?.82:p?.20:.23),r.h*(left?p?.18:.20:p?.58:.64),{origin:left?'50% 100%':'0 50%'});plane.classList.add('ch-care-support');c.hinge(plane,p?350:450,p?1100:1300,p?-45:left?-70:-65,left?'X':'Y');c.retire(plane,c.duration-180,c.duration);const article=stage.closest('article');if(article){const link=article.querySelector('a');c.line(link,p?2200:2500,c.duration);article.querySelectorAll('.clear-bullets li').forEach((el,i)=>c.line(el,p?1550+i*100:1850+i*120,p?2250:2700,{width:20}));}});
 }else if(id==='A2-new-credentials'){
  pick(c,'.credential-rows p').forEach(el=>{const icon=el.querySelector('svg');c.line(el,0,p?520:600);c.hinge(icon,p?420:500,p?950:1100,p?-35:-55);});c.line(c.root.querySelector('h3'),p?900:1000,c.duration,{width:48});
 }else if(['A4','D2'].includes(id))preparation(c,id);
}
