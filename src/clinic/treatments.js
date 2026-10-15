import {topicArt} from './composition-data.mjs';
import {groups,topics,topicById,resolveSelection} from './care-catalogue.mjs';
import {doctors,escapeHTML as e} from './model.mjs';
import {intro,action,link,arrow,next,art,solidIcon} from './ui.js';
import {composition,preparation} from './page-parts.js';
function topicComposition(t,area){return composition(topicArt[t.id],area).replace('data-composition=',`data-topic-key="${t.id}" data-composition=`);}
const preparationIcons={'general-health':['report','medicine','question'],diabetes:['report','report','medicine'],'blood-pressure':['report','report','medicine'],thyroid:['report','report','question'],'fever-infections':['report','medicine','calendar'],'womens-health':['report','calendar','medicine'],pregnancy:['report','report','question'],ultrasound:['report','report','question']};
export function detail(t){return `<h3>${t.title}</h3><h4>What you can discuss</h4><p>${t.text}</p><h4>Bring these if you have them</h4><ul>${t.bring.map((x,i)=>`<li><span class="topic-item-icon" data-motion-slot aria-hidden="true">${solidIcon(preparationIcons[t.id]?.[i]||'report')}</span><span>${x}</span></li>`).join('')}</ul><a class="text-link" href="${link(doctors[t.doctor].path)}">${doctors[t.doctor].name} ${arrow}</a><div class="actions">${action('Book a visit','/booking?topic='+t.id+'&doctor='+t.doctor)}</div>`;}
export function treatments(selection=resolveSelection(location.search)){return `<section class="warm" id="opening" data-section-scene="T1"><div class="wrap">${intro('Treatments at the clinic','See what each doctor can help with, then choose the care you need.')}<div class="chapter-links">${groups.map(g=>`<a class="chapter-link" href="#${g.id}"><span class="chapter-icon" aria-hidden="true">${solidIcon(g.id==='physician'?'doctor':'heart')}</span><span><strong>${g.title}</strong><small>${doctors[g.doctor].name}</small></span><span aria-hidden="true">↓</span></a>`).join('')}</div></div></section>${groups.map(g=>{const t=topicById(selection[g.id]);return `<section class="care-chapter ${g.id==='women'?'mint':'blue'}" id="${g.id}" data-section-scene="${g.id==='women'?'T3':'T2'}"><div class="wrap"><div class="section-heading"><p class="eyebrow">${doctors[g.doctor].name}</p><h2>${g.title}</h2><p>${g.text}</p></div><div class="chapter-grid"><div class="chapter-art">${topicComposition(t,g.id)}</div><div class="topic-explorer"><div class="topic-buttons" role="group" aria-label="${e(g.title)}">${topics.filter(x=>x.area===g.id).map(x=>`<button data-topic="${x.id}" aria-pressed="${t.id===x.id}" aria-controls="detail-${g.id}"><span class="selected-mark" aria-hidden="true">✓</span>${x.title}</button>`).join('')}</div><div class="topic-detail" id="detail-${g.id}" role="region" aria-label="${e(t.title)}">${detail(t)}</div></div></div></div></section>`;}).join('')}<section class="warm" id="prepare" data-section-scene="T4"><div class="wrap"><div class="section-heading"><h2>What to bring for your visit</h2><p>Bring these if you have them. You can still speak with the doctor if you do not.</p></div><div class="preparation-grid">${composition('A32','preparation')}${preparation()}</div></div></section>${next().replace('id="next"','id="next" data-section-scene="T5"')}`;}

export function bindTreatments({signal,selection,onSelection,onArtChange=()=>{},onArtRemove=()=>{},onContentChange=()=>{}}){
 const generation={physician:0,women:0},timers=new Set(),exits=new Set();
 const delay=ms=>new Promise(resolve=>{const timer=setTimeout(()=>{timers.delete(timer);resolve();},ms);timers.add(timer);});
 signal.addEventListener('abort',()=>{generation.physician++;generation.women++;for(const t of timers)clearTimeout(t);timers.clear();for(const exit of exits)exit.cancel();exits.clear();},{once:true});
 for(const b of document.querySelectorAll('[data-topic]'))b.addEventListener('click',async()=>{
  const t=topicById(b.dataset.topic),g=t.area;
  if(selection[g]===t.id)return;
  const token=++generation[g];selection[g]=t.id;
  document.querySelectorAll('#'+g+' [data-topic]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.topic===t.id)));
  const region=document.querySelector('#detail-'+g);
  region.innerHTML=detail(t);region.setAttribute('aria-label',t.title);onContentChange(region);
  document.querySelector('#announce').textContent=t.title;onSelection({...selection},t.id);
  const root=document.querySelector('#'+g+' [data-scene]');
  onArtRemove(g);
  root.querySelectorAll('.art-loading').forEach(x=>x.remove());
  const template=document.createElement('template');template.innerHTML=topicComposition(t,g);
  const replacement=document.importNode(template.content.firstElementChild,true);
  const images=[...replacement.querySelectorAll('img')];images.forEach(img=>img.loading='eager');
  const current=()=>!signal.aborted&&generation[g]===token&&root.isConnected;
  let outgoing=null;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&root.childElementCount){
   outgoing=root.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:180,easing:'cubic-bezier(.23,1,.32,1)',fill:'forwards'});exits.add(outgoing);
  }
  const cleared=delay(outgoing?180:0).then(()=>{
   outgoing?.cancel();exits.delete(outgoing);
   if(current())root.replaceChildren();
  });
  const status=document.createElement('p');status.className='art-loading';status.setAttribute('role','status');status.textContent='Loading picture…';
  const loading=setTimeout(()=>{timers.delete(loading);if(current())root.append(status);},300);timers.add(loading);
  let deadline;
  try{
   await Promise.all([cleared,Promise.race([
    Promise.all(images.map(img=>img.decode())),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Picture unavailable')),10000);timers.add(deadline);})
   ])]);
   if(!current())return;
   root.className=replacement.className;root.dataset.composition=replacement.dataset.composition;
   root.dataset.scene=replacement.dataset.scene;root.dataset.topicKey=t.id;
   root.replaceChildren(...replacement.childNodes);
   onArtChange(g,{topicKey:t.id,replay:true});
  }catch{
   await cleared;
   if(current()){const unavailable=document.createElement('p');unavailable.className='art-loading';unavailable.setAttribute('role','status');unavailable.textContent='Picture unavailable. You can still read about this treatment.';root.replaceChildren(unavailable);root.dataset.failedTopic=t.id;console.warn('Treatment artwork unavailable:',t.id);}
  }finally{
   clearTimeout(loading);clearTimeout(deadline);timers.delete(loading);timers.delete(deadline);status.remove();
  }
 },{signal});
}
