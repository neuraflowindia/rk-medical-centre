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
 const under=c.inject(stage,'<svg class="ch-topic-vectors ch-topic-under" viewBox="0 0 100 100" aria-hidden="true"></svg>'),over=c.inject(stage,'<svg class="ch-topic-vectors ch-topic-over" viewBox="0 0 100 100" aria-hidden="true"></svg>');
 const el=(name,attrs,parent=under)=>{const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 const path=(d,parent=under)=>{const p=el('path',{d,pathLength:1},parent);p.style.vectorEffect='none';p.style.strokeWidth=String((c.phone?1.75:2)/(w/100));return p;};
 const line=(d,a,b,parent=under)=>{const p=path(d,parent);p.style.strokeDasharray='1';c.add(p,[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:.45}],a,b,T);return p;};
 const dot=(x,y,parent=over)=>el('circle',{cx:x,cy:y,r:1.2,class:'ch-endpoint',fill:'#0a706b',stroke:'none'},parent);
 const slots=[...c.root.querySelectorAll('.topic-item-icon')],kinds={'general-health':['report','medicine','question'],diabetes:['report','report','medicine'],'blood-pressure':['report','report','medicine'],thyroid:['report','report','question'],'fever-infections':['report','medicine','calendar'],'womens-health':['report','calendar','medicine'],pregnancy:['report','report','question'],ultrasound:['report','report','question']};
 const dock=(name,x,y,size,a,b,index,existing)=>{
  const g=existing||el('g',{class:'ch-solid-glyph',transform:`translate(${x-size/2} ${y-size/2}) scale(${size/24})`,color:'#0a706b'},over);if(!existing){g.innerHTML=solidIconPaths[name];c.add(g,[{opacity:0},{opacity:1}],a,Math.min(a+180,b-180));c.retire(g,b-360,b-180);}
  const slot=slots[index];if(!slot)return g;const sr=c.bounds(stage),tr=c.bounds(slot),px=sr.x+w*x/100,py=sr.y+h*y/100,mark=c.icon(kinds[key][index],px-12,py-12,24),dx=tr.cx-px,dy=tr.cy-py;
  c.add(mark,[{opacity:0},{opacity:1}],b-500,b-400);c.travel(mark,b-500,b,[[0,0,0,.85],[dx*.35,c.phone?dy*.15:dy,0,.95,.45],[dx,dy]],T);c.retire(mark,b-180,b);return g;
 };
 const transient=(d,cycle,active,parent=under)=>{const p=path(d,parent);p.style.strokeDasharray='.12 1';p.style.opacity='0';c.loop(p,[{strokeDashoffset:.15,opacity:0},{strokeDashoffset:0,opacity:.28,offset:active/cycle*.15},{strokeDashoffset:-.85,opacity:.28,offset:active/cycle*.8},{strokeDashoffset:-1,opacity:0,offset:active/cycle},{strokeDashoffset:-1,opacity:0}],cycle);return p;};
 const pulse=(target,cycle,active,from=.18,to=.35)=>c.loop(target,[{opacity:from},{opacity:to,offset:active/cycle/2},{opacity:from,offset:active/cycle},{opacity:from}],cycle);
 if(key==='general-health'){
  const arcs=[line('M19 24 Q8 50 19 77',0,650),line('M72 22 Q88 40 84 70',0,650)];arcs.forEach(p=>c.add(p,[{strokeDasharray:'1 1'},{strokeDasharray:'.12 1',strokeDashoffset:-.88}],1700,2500,T));
  arcs.forEach(arc=>{const len=arc.getTotalLength(),origin=arc.getPointAtLength(0),d=dot(origin.x,origin.y,under);c.add(d,Array.from({length:33},(_,i)=>{const p=arc.getPointAtLength(len*i/32);return{offset:i/32,transform:pose(p.x-origin.x,p.y-origin.y),opacity:i?1:0}}),650,2920,'linear');c.retire(d,2740,2920);c.retire(arc,2920,3100,.45);});
  dock('question',50,94,8,2500,3100,2);dock('report',19,77,8,2500,3100,0);transient('M72 22 Q88 40 84 70',12000,2300);
 }else if(key==='diabetes'){
  const p=line('M81 42H89V78H80',2200,2850);c.add(p,[{strokeDasharray:'1 1'},{strokeDasharray:'.22 1',strokeDashoffset:-.78}],2850,3300);c.retire(p,3120,3300,.45);dock('report',19,82,13,2700,3300,0);
  // Trace the photographed case rim inside its alpha silhouette, rather than
  // the rectangular asset bounds. The same normalized part layout serves both widths.
  const edge=path('M78.7 47.5C84.2 53.1 84.6 59.7 81.5 65.3',over);edge.style.opacity='.18';pulse(edge,11000,1800);
 }else if(key==='blood-pressure'){
  const ps=[[12,20],[88,20],[12,78],[88,78]].map(([x,y],i)=>{const sx=x<50?1:-1,sy=y<50?1:-1,g=el('g',{transform:`translate(${x} ${y})`});path(`M${sx*8} 0H0V${sy*8}`,g);const a=i<2?600:0,b=i<2?1450:650;c.add(g,[{transform:`translate(${i<2?(i?60:40):x}px,${i<2?12:85}px) rotate(${i%2?35:-35}deg)`,opacity:0},{transform:`translate(${x}px,${y}px) rotate(0)`,opacity:.45}],a,b,T);return g;});
  ps.forEach(g=>c.retire(g,2520,2700,.45));dock('report',84,85,10,2000,2700,0);
  transient('M12 20H88V78H12Z',10000,1600);
 }else if(key==='thyroid'){
  ['M15 68A41 41 0 0 1 30 12','M85 28A41 41 0 0 1 70 84'].forEach((d,i)=>{const p=line(d,0,700);p.style.transformOrigin='50px 48px';c.add(p,[{transform:'rotate(0)'},{transform:`rotate(${i?35:-35}deg)`}],650,1500,T);c.retire(p,2720,2900,.45);});
  [[30,12,17,84],[70,84,83,84]].forEach(([x,y,fx,fy])=>{const d=dot(x,y);c.add(d,[{transform:pose(),opacity:1},{transform:pose((fx-x)*.4,(fy-y)*.7),opacity:1,offset:.5},{transform:pose(fx-x,fy-y),opacity:0}],1400,2900,T);});
  dock('report',17,84,12,2200,2900,0);dock('question',83,84,12,2200,2900,2);pulse(slots[2],14000,2000,.35,.55);
 }else if(key==='fever-infections'){
  [25,50,75].forEach((x,i)=>{const tick=line(`M${x} 85V91`,2300+i*100,2800+i*100,over);c.add(tick,[{opacity:.5},{opacity:0}],2800+i*100,3150);dock(kinds[key][i],x,88,6.5,2300+i*100,3150,i);});const baseline=line('M25 93H75',2700,2970,over);c.retire(baseline,2970,3150,.45);
  const glint=path('M25 25H65',over);glint.style.strokeDasharray='.15 1';glint.style.opacity='0';c.loop(glint,[{strokeDashoffset:.2,opacity:0},{strokeDashoffset:-.8,opacity:.16,offset:.1},{strokeDashoffset:-1,opacity:0,offset:1600/12000},{strokeDashoffset:-1,opacity:0}],12000);
 }else if(key==='womens-health'){
  const width=c.phone?14:16,height=c.phone?36:42,x=c.phone?78:76,y=c.phone?39:36;
  const leaf=c.plane(w*x/100,h*y/100,w*width/100,h*height/100,{parent:stage});leaf.style.zIndex=0;leaf.classList.add('ch-topic-leaf');
  for(const face of leaf.children)face.innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M8 100C-4 65 0 20 90 2C106 40 81 88 8 100Z"/><path class="ch-leaf-vein" d="M8 100Q30 50 90 2"/></svg>';
  c.add(leaf,[{transform:`perspective(${c.phone?450:650}px) rotateY(${c.phone?-58:-72}deg)`,opacity:0},{transform:'perspective(650px) rotateY(0)',opacity:1,offset:900/2100},{transform:'perspective(650px) rotateY(0)',opacity:1,offset:1500/2100},{transform:`perspective(650px) rotateY(${c.phone?-10:-14}deg)`,opacity:1}],1300,3400,F);
  [43,57,71].forEach((y,i)=>{const d=dot(91,43);c.add(d,[{transform:pose(),opacity:0},{transform:pose(0,y-43),opacity:1}],2100+i*100,2750+i*100,T);c.retire(d,2850,3030);});
  const face=leaf.querySelector('.ch-face');c.loop(face,[{transform:'rotateY(0)'},{transform:`rotateY(${c.phone?3:4}deg)`,offset:900/13000},{transform:'rotateY(0)',offset:1800/13000},{transform:'rotateY(0)'}],13000);
 }else if(key==='pregnancy'){
  const pts=c.phone?[[74,26],[84,40],[86,56]]:[[78,28],[86,42],[87,58]];
  pts.forEach(([x,y],i)=>{
   const g=el('g',{},over),r=c.phone?3.25:3.5,ring=el('circle',{cx:0,cy:0,r,class:'ch-marker-ring',pathLength:1},g),icon=el('g',{class:'ch-solid-glyph',transform:'translate(-2 -2) scale(.166667)',color:'#0a706b'},g);icon.innerHTML=solidIconPaths[['calendar','report','question'][i]];
   c.add(g,[{transform:pose(...pts[0],0,.92)},{transform:pose(...pts[0]),offset:700/1600},{transform:pose(x,y)}],1100,2700,T);
   c.add(g,[{opacity:0},{opacity:1}],[1100,2260,2400][i],[1280,2440,2580][i]);c.retire(g,2700,2880);
   c.add(ring,[{strokeDasharray:'1 1'},{strokeDasharray:'.75 1'}],2500,3200);ring.style.vectorEffect='none';ring.style.strokeWidth=String((c.phone?1.75:2)/(w/100));
   // The fan keeps its physical timing; only its separated interiors appear.
   dock(kinds[key][i],x,y,6.5,2700,3200,i,g);
   if(slots[i]){const accent=c.inject(slots[i],'<svg class="ch-topic-fixed-accent" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" pathLength="1"/></svg>'),fixed=accent.querySelector('circle'),frames=[{strokeDasharray:'.75 1',offset:0}];if(i)frames.push({strokeDasharray:'.75 1',offset:i/3});frames.push({strokeDasharray:'.72222 1',offset:(i*12000+800)/36000},{strokeDasharray:'.75 1',offset:(i*12000+1600)/36000},{strokeDasharray:'.75 1',offset:1});c.loop(fixed,frames,36000);}
  });
 }else if(key==='ultrasound'){
  (c.phone?[32,37,42]:[35,40,45]).forEach((r,i)=>{const p=line(`M${50-r*.57} ${50+r*.82}A${r} ${r} 0 0 0 ${50+r*.26} ${50+r*.97}`,i*450,i*450+650);p.style.transformOrigin='50px 50px';c.add(p,[{transform:'rotate(0)'},{transform:`rotate(${(i-1)*(c.phone?12:18)}deg)`}],1100,2200,T);c.add(p,[{strokeDasharray:'1 1',opacity:.15+i*.1},{strokeDasharray:'.08 1',strokeDashoffset:-.92,opacity:.15+i*.1}],2100,2850,T);const x=(c.phone?32:30)+i*(c.phone?18:20),d=dot(50,85);c.add(d,[{transform:pose(),opacity:0},{transform:pose(x-50,2),opacity:1},{transform:pose(x-50,2),opacity:0}],2100,3300,T);dock(kinds[key][i],x,87,6.5,2700,3300,i);c.retire(p,3120,3300,.15+i*.1);if(i===2)transient(p.getAttribute('d'),14000,2100);});
 }
}
