import {E,T,F,pose,partTrack,iconMarkup} from './choreography-primitives.mjs';

// Decorative construction only. The shared runtime owns visibility, cancellation,
// reduced movement, resize reconstruction and idle scheduling. Reading text and
// every real action remain in their resting layout throughout these tracks.
const styles=`
.ch-section:is([data-section-scene="P2"],[data-section-scene="C2"])>.wrap{position:relative;z-index:1}
.ch-profile-folio{position:absolute;border-radius:12px;background:#d8e9e3;perspective:600px;pointer-events:none}
.ch-profile-folio .ch-plane{inset:0!important;width:100%!important;height:100%!important;border-radius:12px;transform-style:preserve-3d}
.ch-profile-folio .ch-face{background:#fffbf4;border:1px solid #94b8af;border-radius:12px;position:absolute;inset:0;backface-visibility:hidden}
.ch-profile-folio .ch-reverse{background:#bddad1;transform:rotateY(180deg)}
.ch-profile-folio:after{content:'';position:absolute;inset:18% 18% auto;height:2px;background:#7ca59b;box-shadow:0 10px #7ca59b;opacity:.4}
.ch-profile-card:after{content:'';position:absolute;left:18%;right:18%;top:28%;height:1px;background:#7ca59b;box-shadow:0 5px #7ca59b,0 10px #7ca59b}.ch-profile-card{position:absolute;border:1px solid #94b8af;background:#fffbf4;border-radius:7px;box-shadow:0 6px 12px #11294420;pointer-events:none}
.ch-profile-calendar{position:absolute;pointer-events:none;color:#0a706b;perspective:400px}
.ch-profile-calendar>svg{width:100%;height:100%;fill:#fffbf4;stroke:currentColor;stroke-width:1.2;stroke-linecap:round}
.ch-profile-calendar-page{position:absolute;left:12.5%;top:33.333%;width:75%;height:54.167%;transform-origin:50% 0;transform-style:preserve-3d}
.ch-calendar-face{position:absolute;inset:0;border:1px solid #8bafa5;background:#fff;border-radius:2px;backface-visibility:hidden}
.ch-calendar-face:after{content:'';position:absolute;width:4px;height:4px;border-radius:50%;background:#0a706b;left:43%;top:42%}
.ch-calendar-back{background:#fffbf4;transform:rotateX(180deg)}
.ch-author-band{position:absolute;border-radius:12px;background:#aacfc1;transform-origin:0 50%;pointer-events:none;z-index:0}
.ch-section .review-card{position:relative;isolation:isolate}.ch-section .review-card blockquote,.ch-section .review-card figcaption{position:relative;z-index:2}
.ch-speech-frame{position:absolute;border:1px solid #5f9b8a;border-radius:24px;background:#d4e9df;transform-origin:0 0;pointer-events:none;z-index:0}
.ch-speech-tail{position:absolute;left:16%;top:78%;width:12%;height:14%;background:#d4e9df;clip-path:polygon(0 0,0 100%,100% 0);transform-origin:0 0}
.ch-care-tab{pointer-events:none;z-index:0}.ch-section .care-list{position:relative;isolation:isolate}.ch-section .care-list a{position:relative;z-index:2}
.ch-pin-halo{position:absolute;border:1px solid #0a706b;border-radius:50%;pointer-events:none;opacity:.25}
.ch-report-corner{position:absolute;left:58.333%;top:8.333%;width:25%;height:25%;transform-origin:0 50%;transform-style:preserve-3d}
.ch-report-corner>i{position:absolute;inset:0;background:#b9d8ca;clip-path:polygon(0 0,100% 100%,0 100%);backface-visibility:hidden}.ch-report-corner>i:last-child{transform:rotateY(180deg);background:#fffbf4}
`;
const all=(c,selector)=>[...c.root.querySelectorAll(selector)].filter(el=>!el.closest('[hidden]'));
const time=(c,d,p)=>c.phone?p:d;
function decorate(c){c.inject(c.root,`<style>${styles}</style>`);}
function fade(c,el,a,b,from=.3,to=1){c.add(el,[{opacity:from},{opacity:to}],a,b,E);}
function stroke(c,svg,a,b){if(!svg)return;for(const el of svg.querySelectorAll('path,circle,rect')){if(typeof el.getTotalLength!=='function')continue;el.setAttribute('pathLength','1');el.style.strokeDasharray='1';c.add(el,[{strokeDashoffset:1,opacity:.3},{strokeDashoffset:0,opacity:1}],a,b,T);}}
function mark(c,name,x,y,size=24){const el=c.icon(name,x,y,size);el.style.zIndex='3';return el;}
function rule(c,x,y,w,a,b){return c.draw(c.path(`M${x} ${y}h${w}`),a,b);}

function sanjayOpening(c){
 const stage=c.root.querySelector('[data-composition="A20"]');if(!stage)return;c.stage=stage;
 const casePart=partTrack(c,'A20','case',[[0,5,4,7,.93],[900,-1,-1,-2,1],[1500,0,0,0,1]],[[0,0,5,4,.94],[750,0,0,0,1],[1250,0,0,0,1]]);
 const scope=partTrack(c,'A20','stethoscope',[[650,-4,4,-6,.94],[1650,2,-1,2,1],[2500,0,0,0,1]],[[550,0,5,-3,.95],[1400,1,-1,1,1],[2100,0,0,0,1]]);
 if(casePart)casePart.closest('.art-position').style.zIndex='2';if(scope)scope.closest('.art-position').style.zIndex='4';
 const w=stage.clientWidth,h=stage.clientHeight,cx=c.phone?70:68,cy=c.phone?40:38,fw=c.phone?24:27,fh=c.phone?30:34;
 const folio=c.inject(stage,`<span class="ch-profile-folio" aria-hidden="true" style="left:${cx-fw/2}%;top:${cy-fh/2}%;width:${fw}%;height:${fh}%;z-index:1"></span>`);
 const front=c.plane(0,0,w*fw/100,h*fh/100,{parent:folio});
 c.add(front,[{transform:`rotateY(${c.phone?-8:-10}deg)`},{transform:`rotateY(${c.phone?-100:-125}deg)`,offset:c.phone?680/1830:800/2200},{transform:`rotateY(${c.phone?-100:-125}deg)`,offset:c.phone?1180/1830:1450/2200},{transform:`rotateY(${c.phone?-12:-18}deg)`}],time(c,500,420),time(c,2700,2250),F);
 fade(c,folio,time(c,500,420),time(c,680,600));
 const card=c.inject(stage,'<span class="ch-profile-card" aria-hidden="true" style="left:67%;top:50%;width:16%;height:10%;z-index:3"></span>');
 const points=c.phone?[[1550,-5,-7,-3],[1950,3,-2,1],[2200,0,0,0]]:[[1850,-7,-7,-5],[2300,5,-2,2],[2650,0,0,0]],start=points[0][0],end=points.at(-1)[0];
 c.add(card,points.map(([t,x,y,r])=>({offset:(t-start)/(end-start),transform:pose(w*x/100,h*y/100,r)})),start,end,T);fade(c,card,start,start+180,0,1);
 c.add(card,[{transform:pose(),zIndex:3},{transform:pose(-w*.04,-h*.12),zIndex:0}],time(c,2650,2200),time(c,2850,2380),T);
 const fact=c.root.querySelector('.doctor-facts li');if(fact)c.line(fact,time(c,2500,2100),c.duration,{inset:37});
 const idle=scope?.querySelector('.art-drift');c.loop(idle,[{transform:pose()},{transform:pose(0,-4),offset:.075},{transform:pose(),offset:.15},{transform:pose()}],12000);
 const sr=c.bounds(stage),glint=rule(c,sr.x+w*.54,sr.y+h*.82,w*.3,0,180);c.loop(glint,[{opacity:0},{opacity:.18,offset:.075},{opacity:0,offset:.15},{opacity:0}],12000);
}

function preparation(c,start,end){
 all(c,'.preparation article').forEach((row,i)=>{
  const slot=row.querySelector('.prep-art');if(!slot)return;const r=c.bounds(slot),a=start+i*70,b=end-70*(2-i);
  if(i===0){
   // An explicitly separate vector corner, not an animated raster/report edge.
   const corner=c.inject(slot,'<span class="ch-report-corner" aria-hidden="true"><i></i><i></i></span>');
   c.add(slot.querySelector('svg'),[{opacity:.35},{opacity:1}],a,b);
   c.add(corner,[{transform:'rotateY(0)'},{transform:'rotateY(-110deg)',offset:.48},{transform:'rotateY(-12deg)'}],a,b,F);
  }else stroke(c,slot.querySelector('svg'),a,b);
 });
}

function facts(c,parul=false){
 const fs=all(c,'.doctor-facts li,.profile-education,.profile-experience');
 if(parul){const k=c.phone?2200/2600:1;c.fact(fs[0],0,550*k);c.fact(fs[1],450*k,1250*k);}else{c.fact(fs[0],0,time(c,550,450));c.fact(fs[1],time(c,400,350),time(c,1150,950));}
 const links=all(c,'.care-list a');
 links.forEach((link,i)=>{
  const r=c.bounds(link),arrow=link.querySelector('[aria-hidden]');
  if(parul){
   const plane=c.plane(r.x-8,r.y,r.w+8,Math.max(c.phone?36:32,r.h));plane.classList.add('ch-care-tab');
   const perspective=Math.max(900,(r.w+8)*6);
   c.add(plane,[{transform:`perspective(${perspective}px) rotateY(${c.phone?-42:-65}deg)`,opacity:.3},{transform:`perspective(${perspective}px) rotateY(${c.phone?-5:-8}deg)`,opacity:.35,offset:(c.phone?350-10*i:400-10*i)/(c.phone?700-10*i:850-20*i)},{transform:`perspective(${perspective}px) rotateY(0)`,opacity:.35}],time(c,1100+100*i,950+80*i),time(c,1950+80*i,1650+70*i),F);
   fade(c,plane,time(c,2300,1950),c.duration,.35,0);
   if(arrow){const ar=c.bounds(arrow);c.draw(c.path(`M${ar.x+2} ${ar.cy+4}l8 -8m-7 0h7v7`),time(c,1800,1550),time(c,2300,1950));}
  }else{
   const target=c.anchor(link),previous=i?c.anchor(links[i-1]):target,from={x:previous.cx,y:i?previous.cy:target.y-12},a=time(c,1000+90*i,850+70*i),b=time(c,1850+70*i,1550+60*i);
   const rail=c.draw(c.path('M'+from.x+' '+from.y+'L'+target.cx+' '+target.cy),a,b);c.traveler(rail,a+(b-a)/2,b);
  }
 });
 if(!parul)preparation(c,time(c,1700,1450),c.duration);
}

function reviews(c,parul=false){
 all(c,'.review-card').forEach(card=>{
  const quote=card.querySelector('blockquote'),author=card.querySelector('figcaption');if(!quote||!author)return;
  const q=c.bounds(quote),a=c.bounds(author),r=c.bounds(card),quoteSlot=author.querySelector('.review-quote-slot');if(quoteSlot&&!quoteSlot.children.length)c.inject(quoteSlot,iconMarkup('quote'));
  if(parul){
   const initials=author.querySelector('.author-initials'),authorCentre=initials?c.bounds(initials).cy:a.cy,bandHeight=c.phone?44:40;
   const band=c.inject(card,`<span class="ch-author-band" aria-hidden="true" style="left:${a.x-r.x-6}px;top:${authorCentre-r.y-bandHeight/2}px;width:${a.w+12}px;height:${bandHeight}px"></span>`);
   c.add(band,[{transform:'scaleX(.1)',opacity:.2},{transform:'scaleX(1)',opacity:.35}],0,time(c,500,420),F);
   const slot=card.querySelector('.review-quote-slot'),dest=slot?c.bounds(slot):a,punctuation=mark(c,'quote',dest.cx-12,dest.cy-12,24);
   c.travel(punctuation,0,time(c,1150,950),[[0,c.phone?-6:-10,c.phone?3:6],[0,1,c.phone?0:-1,1,700/1150],[0,0,0]],T);c.retire(punctuation,time(c,970,770),time(c,1150,950));
   const separator=author.querySelector('.review-author-rule');c.add(separator,[{transform:'scaleX(.1)',transformOrigin:'0 50%'},{transform:'scaleX(1)',transformOrigin:'0 50%'}],time(c,1000,850),time(c,1700,1450));
  }else{
   const lead=mark(c,'quote',q.x,q.y-29,22);fade(c,lead,0,500*(c.phone?1750/2100:1));
   const slot=card.querySelector('.review-quote-slot'),dest=slot?c.bounds(slot):a,mx=dest.cx-12,my=dest.cy-12,marker=mark(c,'quote',mx,my,24),startY=c.phone?-20:q.y-my;
   c.travel(marker,time(c,400,350),time(c,1150,950),[[0,startY,0,.9],[0,startY/2,0,1,.5],[0,0]],T);c.retire(lead,time(c,970,770),time(c,1150,950));c.retire(marker,time(c,970,770),time(c,1150,950));
   c.draw(c.path(`M${q.x-12} ${q.y}V${a.y-9}`),time(c,1000,850),time(c,1700,1450),.4);
  }
 });
 c.line(c.root.querySelector('.review-toggle'),time(c,1550,1300),c.duration);
}

function appointment(c,parul=false){
 const booking=c.root.querySelector('a[href*="/booking"]'),contact=c.root.querySelector('a[href*="/contact"]');if(!booking||!booking.getClientRects().length)return;
 const b=c.bounds(booking),slot=c.root.querySelector('.profile-calendar-slot'),sr=slot&&c.bounds(slot),size=c.phone?40:48;
 // A reserved adjacent slot is preferred. The fallback uses clear space above
 // the control, never its label or an offscreen left-hand coordinate.
 const x=sr?sr.cx-size/2:c.phone?b.x:parul?b.x+b.w+8:Math.max(8,b.x-size-12),y=sr?sr.cy-size/2:c.phone?b.y-size-14:b.cy-size/2;
 const calendar=c.inject(c.root,`<span class="ch-profile-calendar" aria-hidden="true" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="18" rx="3"/><path d="M6 1v5M18 1v5"/></svg><span class="ch-profile-calendar-page"><i class="ch-calendar-face"></i><i class="ch-calendar-face ch-calendar-back"></i></span></span>`);
 const page=calendar.querySelector('.ch-profile-calendar-page');
 c.add(page,[{transform:'rotateX(0)'},{transform:`rotateX(${c.phone?-85:-105}deg)`,offset:c.phone?250/600:300/700},{transform:`rotateX(${c.phone?-85:-105}deg)`,offset:c.phone?380/600:450/700},{transform:`rotateX(${c.phone?-6:-8}deg)`}],time(c,350,300),time(c,1050,900),F);
 fade(c,calendar,0,time(c,450,380),.4,1);
 const leadY=y-9,origin=parul?Math.min(c.root.clientWidth-5,x+size+20):Math.max(5,x-20);
 c.draw(c.path(`M${origin} ${leadY}Q${x+size/2} ${leadY} ${x+size/2} ${y}`),0,time(c,450,380));
 if(contact){const r=c.anchor(contact),cx=r.cx,cy=r.cy,routeY=Math.min(y+size+12,b.y+b.h+12),path=c.path(`M${x+size/2} ${y+size}V${routeY}H${cx}V${cy}`);c.draw(path,time(c,950,800),time(c,1500,1250));const dot=c.dot([[x+size/2,y+size],[x+size/2,routeY],[cx,routeY],[cx,cy]],time(c,950,800),time(c,1500,1250));fade(c,dot,time(c,1400,1200),c.duration,1,0);}
}

function contact(c){
 const stage=c.root.querySelector('[data-composition="A22"]');if(!stage)return;c.stage=stage;
 const handset=partTrack(c,'A22','handset',[[0,-4,4,-6,.93],[1050,2,-1,2,1],[2100,0,0,0,1]],[[0,0,6,-3,.95],[900,1,-1,1,1],[1750,0,0,0,1]]);
 const pin=partTrack(c,'A22','pin',[[800,0,-9,4,.9],[1650,0,2,-1,1],[2500,0,0,0,1]],[[650,0,-7,2,.93],[1400,0,1,0,1],[2100,0,0,0,1]]);
 if(handset)handset.closest('.art-position').style.zIndex='2';if(pin)pin.closest('.art-position').style.zIndex='3';
 const s=c.bounds(stage),routes=[],rows=all(c,'.contact-row'),rw=s.w,rh=s.h;
 // Routes use the clear inter-column gutter. They neither cross the words nor
 // wrap the entire contact copy in an unintended rectangular frame.
 const handsetBox=c.bounds(handset?.closest('.art-position')||stage),pinBox=c.bounds(pin?.closest('.art-position')||stage);
 rows.forEach(row=>{
  const destination=c.anchor(row),from={x:handsetBox.cx,y:handsetBox.y+handsetBox.h},lane=c.phone?Math.max(8,destination.x-12):s.x-16;
  const route=c.draw(c.path('M'+from.x+' '+from.y+'Q'+lane+' '+from.y+' '+lane+' '+destination.cy+'H'+destination.cx),time(c,500,420),time(c,1400,1200),.6);routes.push(route);
 });
 const address=c.root.querySelector('.contact-address');
 if(address){const destination=c.anchor(address),from={x:pinBox.cx,y:pinBox.y+pinBox.h},lane=c.phone?Math.max(8,destination.x-12):s.x-16;routes.push(c.draw(c.path('M'+from.x+' '+from.y+'Q'+lane+' '+from.y+' '+lane+' '+destination.cy+'H'+destination.cx),time(c,1900,1600),time(c,2750,2300),.6));}
 for(const p of routes){p.dataset.chRetires='';fade(c,p,time(c,2600,2200),c.duration,.6,0);}
 const halo=c.inject(stage,`<span class="ch-pin-halo" aria-hidden="true" style="left:calc(74.64% - ${rw*.095+9}px);top:calc(77% - ${rh*.035+9}px);width:${rw*.19+18}px;height:${rh*.07+18}px;z-index:0"></span>`);
 c.loop(halo,[{transform:'scale(1)'},{transform:'scale(1.025)',offset:.09},{transform:'scale(1)',offset:.18},{transform:'scale(1)'}],10000);
 c.loop(handset?.querySelector('.art-drift'),[{transform:'rotate(0)'},{transform:'rotate(0)',offset:.06},{transform:'rotate(2deg)',offset:.12},{transform:'rotate(0)',offset:.18},{transform:'rotate(0)'}],10000);
}

function question(c){
 const form=c.root.querySelector('form'),heading=c.root.querySelector('h2');if(!form||!heading)return;
 const r=c.bounds(form),h=c.bounds(heading),slot=c.root.querySelector('.question-icon-slot'),anchor=slot?c.bounds(slot):h,size=32,x=slot?anchor.x:Math.min(c.root.clientWidth-48,h.x+h.w-size),y=slot?anchor.y:h.y,icon=mark(c,'question',x,y,size);stroke(c,icon.querySelector('svg'),0,time(c,500,420));
 const frame=c.inject(c.root,`<span class="ch-speech-frame" aria-hidden="true" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"><i class="ch-speech-tail"></i></span>`),dx=x-r.x,dy=y-r.y;
 c.add(frame,[{transform:`translate(${dx}px,${dy}px) scale(${size/(r.w+12)},${size/(r.h+12)})`,opacity:.3},{transform:`translate(${dx*.5}px,${dy*.5}px) scale(.54,.54)`,opacity:.35,offset:.5},{transform:'translate(0,0) scale(1,1)',opacity:.35}],time(c,350,300),time(c,1150,950),T);
 fade(c,icon,time(c,600,500),time(c,850,710),1,0);
 c.add(frame.querySelector('.ch-speech-tail'),[{transform:'scaleY(1)'},{transform:'scaleY(0)'}],time(c,1000,850),time(c,1800,1500),T);
 rule(c,r.x+24,r.y+17,Math.max(16,r.w-48),time(c,1600,1350),time(c,2200,1850));
 fade(c,frame,time(c,2200,1850),c.duration,.35,0);
}

export function profileContact(c){
 if(!['S1','S2','S3','S4','P2','P3','P4','C1','C2'].includes(c.id))return false;
 decorate(c);
 switch(c.id){case'S1':sanjayOpening(c);break;case'S2':facts(c);break;case'S3':reviews(c);break;case'S4':appointment(c);break;case'P2':facts(c,true);break;case'P3':reviews(c,true);break;case'P4':appointment(c,true);break;case'C1':contact(c);break;case'C2':question(c);break;}
 return true;
}
