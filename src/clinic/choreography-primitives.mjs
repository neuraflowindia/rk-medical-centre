import {compositions} from './composition-data.mjs';
import {solidIcon,solidIconPaths} from './ui.js';
export const E='cubic-bezier(.23,1,.32,1)',T='cubic-bezier(.77,0,.175,1)',F='cubic-bezier(.32,.72,0,1)';
const NS='http://www.w3.org/2000/svg';
export const pose=(x=0,y=0,r=0,s=1)=>`translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`;
export const iconMarkup=(name,cls='ch-icon')=>solidIcon(name,cls);
export {solidIconPaths};
export function context(root,id,phone,duration){
 const tracks=[],loops=[],owned=[];let overlay;
 root.classList.add('ch-section');
 const own=el=>{el.dataset.choreographyOwned=id;owned.push(el);return el;};
 const add=(element,frames,start,end,easing=E)=>{if(!element||end<=start)return;tracks.push({element,frames:frames.map(f=>({...f,easing})),start,end,easing:'linear'});};
 const loop=(element,frames,cycle,{easing='ease-in-out',key,pauseWhen,visibilityRoot}={})=>{if(element)loops.push({element,frames,duration:cycle,easing,key,pauseWhen,visibilityRoot});};
 const inject=(parent,html)=>{const t=document.createElement('template');t.innerHTML=html;const els=[...t.content.children];for(const el of els){own(el);parent.append(el);}return els[0];};
 const bounds=el=>{const a=(el||root).getBoundingClientRect(),b=root.getBoundingClientRect();return {x:a.left-b.left,y:a.top-b.top,w:a.width,h:a.height,cx:a.left-b.left+a.width/2,cy:a.top-b.top+a.height/2};};
 const svg=()=>{if(overlay)return overlay;overlay=own(document.createElementNS(NS,'svg'));overlay.classList.add('ch-overlay');overlay.setAttribute('aria-hidden','true');overlay.setAttribute('viewBox',`0 0 ${root.clientWidth} ${root.clientHeight}`);overlay.setAttribute('preserveAspectRatio','none');root.append(overlay);return overlay;};
 const path=(d,cls='ch-route',parent=svg())=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.classList.add(cls);p.setAttribute('pathLength','1');parent.append(p);return p;};
 const draw=(p,a,b,opacity=.65)=>{p.style.strokeDasharray='1';add(p,[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity}],a,b,T);return p;};
 const icon=(name,x,y,size=24)=>inject(root,`<span class="ch-floating-icon" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px" aria-hidden="true">${iconMarkup(name)}</span>`);
 const travel=(el,a,b,points,easing=T)=>add(el,points.map(([x,y,r=0,s=1,offset])=>({transform:pose(x,y,r,s),...(offset===undefined?{}:{offset})})),a,b,easing);
 const plane=(x,y,w,h,{axis='Y',origin='0 50%',color='mint',parent=root}={})=>inject(parent,`<span class="ch-plane ch-plane-${color}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-origin:${origin}" aria-hidden="true"><span class="ch-face"></span><span class="ch-face ch-reverse"></span></span>`);
 const hinge=(el,a,b,angle=-65,axis='Y',end=0)=>{if(!el)return;const edge=axis==='Y'?el.clientWidth:el.clientHeight,depth=Math.max(phone?450:600,edge*8);add(el,[{transform:`perspective(${depth}px) rotate${axis}(${angle}deg)`,opacity:.3},{transform:`perspective(${depth}px) rotate${axis}(-8deg)`,opacity:1,offset:.7},{transform:`perspective(${depth}px) rotate${axis}(${end}deg)`,opacity:1}],a,b,F);};
 const retire=(el,a,b,opacity=1)=>{if(!el)return;el.dataset.chRetires='';add(el,[{opacity},{opacity:0}],a,b);};
 const anchor=(el)=>bounds(el?.querySelector('[data-motion-slot],.care-list-icon,.topic-item-icon,.prep-art,.review-quote-slot,svg,[aria-hidden="true"]')||el);
 const fact=(el,a,b)=>{if(!el)return;const mark=el.querySelector('svg');travel(mark,a,b,[[phone?-6:-10,0],[phone?1:2,0],[0,0]]);};
 return {root,id,phone,duration,tracks,loops,own,inject,bounds,anchor,svg,path,draw,icon,travel,plane,hinge,retire,fact,add,loop,
  requestSync(){root.dispatchEvent(new CustomEvent('choreography:interaction',{bubbles:true}));},
  cleanup(){for(const el of owned)el.remove();},stage:root.querySelector('[data-scene-stage],.composition,.care-media,.specialty-stage')||root};
}
export function partTrack(c,compositionId,name,keys,phoneKeys){
 const stage=c.root.querySelector(`[data-composition="${compositionId}"]`),layer=stage?.querySelector(`[data-part="${name}"]`);if(!stage||!layer)return null;
 const spec=compositions[compositionId]?.layers.find(x=>x.name===name);if(!spec)return null;
 const pos=layer.closest('.art-position'),x=50+.88*(spec.x-50),y=50+.88*(spec.y-50);Object.assign(pos.style,{left:x+'%',top:y+'%',width:spec.w*.88+'%',height:spec.h*.88+'%',...(spec.z?{zIndex:spec.z}:{})});
 const k=c.phone&&phoneKeys?phoneKeys:keys,start=k[0][0],end=k.at(-1)[0],w=stage.clientWidth,h=stage.clientHeight;
 c.add(layer,k.map(([t,dx,dy,r=0,s=1])=>({offset:(t-start)/(end-start),transform:pose(w*dx/100,h*dy/100,r,s)})),start,end,T);
 c.add(layer,[{opacity:0},{opacity:1}],start,Math.min(start+180,end));return layer;
}
export function selectedTargets(root,selector){return [...root.querySelectorAll(selector)].filter(x=>!x.closest('[data-choreography-owned]'));}
