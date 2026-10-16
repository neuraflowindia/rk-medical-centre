import {topicTracks} from './choreography-data.mjs';
import {T,F,solidIconPaths,pose} from './choreography-primitives.mjs';
const NS='http://www.w3.org/2000/svg';
export function treatment(c){
 const stage=c.root.querySelector('[data-topic-key],[data-composition]');if(!stage)return;
 const key=stage.dataset.topicKey||c.root.querySelector('[data-topic][aria-pressed="true"]')?.dataset.topic,topic=topicTracks[key];if(!topic)return;
 c.duration=topic.duration;c.stage=stage;c.topicKey=key;stage.classList.add('ch-topic-stage');
 const w=stage.clientWidth,h=stage.clientHeight;
 for(const part of topic.parts){const name=part.stem.replace(/^a\d+-/,''),el=stage.querySelector(`[data-part="${name}"]`),position=el?.closest('.art-position');if(!el||!position)continue;
  const keys=c.phone?part.phone:part.desktop,last=keys.at(-1),start=keys[0].t,end=last.t;
  Object.assign(position.style,{left:last.x+'%',top:last.y+'%',width:part.width+'%',height:part.height+'%',zIndex:part.z});
  c.add(el,keys.map(p=>({offset:(p.t-start)/(end-start),transform:pose((p.x-last.x)*w/100,(p.y-last.y)*h/100,p.rotate,p.scale)})),start,end,T);c.add(el,[{opacity:0},{opacity:1}],start,start+180);
 }
 const over=c.inject(stage,'<svg class="ch-topic-vectors ch-topic-over" viewBox="0 0 100 100" aria-hidden="true"></svg>');
 const el=(name,attrs,parent=over)=>{const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 // The retained path is the real case-rim accent, not a construction route.
 const path=d=>{const p=el('path',{d,pathLength:1});p.style.vectorEffect='none';p.style.strokeWidth=String((c.phone?1.75:2)/(w/100));return p;};
 const slots=[...c.root.querySelectorAll('.topic-item-icon')],kinds={'general-health':['report','medicine','question'],diabetes:['report','report','medicine'],'blood-pressure':['report','report','medicine'],thyroid:['report','report','question'],'fever-infections':['report','medicine','calendar'],'womens-health':['report','calendar','medicine'],pregnancy:['report','report','question'],ultrasound:['report','report','question']};
 const dock=(name,x,y,size,a,b,index,existing)=>{
  const g=existing||el('g',{class:'ch-solid-glyph',transform:`translate(${x-size/2} ${y-size/2}) scale(${size/24})`,color:'#0a706b'},over);if(!existing){g.innerHTML=solidIconPaths[name];c.add(g,[{opacity:0},{opacity:1}],a,Math.min(a+180,b-180));c.retire(g,b-360,b-180);}
  const slot=slots[index];if(!slot)return g;const sr=c.bounds(stage),tr=c.bounds(slot),px=sr.x+w*x/100,py=sr.y+h*y/100,mark=c.icon(kinds[key][index],px-12,py-12,24),dx=tr.cx-px,dy=tr.cy-py;
  c.add(mark,[{opacity:0},{opacity:1}],b-500,b-400);c.travel(mark,b-500,b,[[0,0,0,.85],[dx*.35,c.phone?dy*.15:dy,0,.95,.45],[dx,dy]],T);c.retire(mark,b-180,b);return g;
 };
 const pulse=(target,cycle,active,from=.18,to=.35)=>c.loop(target,[{opacity:from},{opacity:to,offset:active/cycle/2},{opacity:from,offset:active/cycle},{opacity:from}],cycle);
 if(key==='general-health'){
  dock('question',50,94,8,2500,3100,2);dock('report',19,77,8,2500,3100,0);
 }else if(key==='diabetes'){
  dock('report',19,82,13,2700,3300,0);
  // Trace the photographed case rim inside its alpha silhouette, rather than
  // the rectangular asset bounds. The same normalized part layout serves both widths.
  const edge=path('M78.7 47.5C84.2 53.1 84.6 59.7 81.5 65.3');edge.style.opacity='.18';pulse(edge,11000,1800);
 }else if(key==='blood-pressure'){
  dock('report',84,85,10,2000,2700,0);
 }else if(key==='thyroid'){
  dock('report',17,84,12,2200,2900,0);dock('question',83,84,12,2200,2900,2);pulse(slots[2],14000,2000,.35,.55);
 }else if(key==='fever-infections'){
  [25,50,75].forEach((x,i)=>dock(kinds[key][i],x,88,6.5,2300+i*100,3150,i));
 }else if(key==='womens-health'){
  const width=c.phone?14:16,height=c.phone?36:42,x=c.phone?78:76,y=c.phone?39:36;
  const leaf=c.plane(w*x/100,h*y/100,w*width/100,h*height/100,{parent:stage});leaf.style.zIndex=0;leaf.classList.add('ch-topic-leaf');
  for(const face of leaf.children)face.innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M8 100C-4 65 0 20 90 2C106 40 81 88 8 100Z"/><path class="ch-leaf-vein" d="M8 100Q30 50 90 2"/></svg>';
  c.add(leaf,[{transform:`perspective(${c.phone?450:650}px) rotateY(${c.phone?-58:-72}deg)`,opacity:0},{transform:'perspective(650px) rotateY(0)',opacity:1,offset:900/2100},{transform:'perspective(650px) rotateY(0)',opacity:1,offset:1500/2100},{transform:`perspective(650px) rotateY(${c.phone?-10:-14}deg)`,opacity:1}],1300,3400,F);
  const face=leaf.querySelector('.ch-face');c.loop(face,[{transform:'rotateY(0)'},{transform:`rotateY(${c.phone?3:4}deg)`,offset:900/13000},{transform:'rotateY(0)',offset:1800/13000},{transform:'rotateY(0)'}],13000);
 }else if(key==='pregnancy'){
  const pts=c.phone?[[74,26],[84,40],[86,56]]:[[78,28],[86,42],[87,58]];
  pts.forEach(([x,y],i)=>{
   const g=el('g',{},over),icon=el('g',{class:'ch-solid-glyph',transform:'translate(-2 -2) scale(.166667)',color:'#0a706b'},g);icon.innerHTML=solidIconPaths[['calendar','report','question'][i]];
   c.add(g,[{transform:pose(...pts[0],0,.92)},{transform:pose(...pts[0]),offset:700/1600},{transform:pose(x,y)}],1100,2700,T);
   c.add(g,[{opacity:0},{opacity:1}],[1100,2260,2400][i],[1280,2440,2580][i]);c.retire(g,2700,2880);
   // The fan keeps its physical timing; only its separated interiors appear.
   dock(kinds[key][i],x,y,6.5,2700,3200,i,g);
   if(slots[i]){const accent=c.inject(slots[i],'<svg class="ch-topic-fixed-accent" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" pathLength="1"/></svg>'),fixed=accent.querySelector('circle'),frames=[{strokeDasharray:'.75 1',offset:0}];if(i)frames.push({strokeDasharray:'.75 1',offset:i/3});frames.push({strokeDasharray:'.72222 1',offset:(i*12000+800)/36000},{strokeDasharray:'.75 1',offset:(i*12000+1600)/36000},{strokeDasharray:'.75 1',offset:1});c.loop(fixed,frames,36000);}
  });
 }else if(key==='ultrasound'){
  [0,1,2].forEach(i=>{const x=(c.phone?32:30)+i*(c.phone?18:20);dock(kinds[key][i],x,87,6.5,2700,3300,i);});
 }
}
