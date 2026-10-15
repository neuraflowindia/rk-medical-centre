// Decoration follows actual navigation state. Reading text and hit areas never move.
export function bindSharedPolish({signal,previousNav=null}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),animations=new Set();
 const run=(element,frames,options)=>{if(!element||reduced.matches)return;const a=element.animate(frames,options);animations.add(a);a.finished.then(()=>animations.delete(a),()=>animations.delete(a));};
 const nav=document.querySelector('.desktop-nav'),selected=nav?.querySelector('[aria-current]');
 let resizeObserver=null;
 if(nav&&selected){
  const parent=nav.getBoundingClientRect(),to=selected.getBoundingClientRect();
  const line=document.createElement('span');line.className='navigation-marker';line.setAttribute('aria-hidden','true');nav.append(line);nav.classList.add('has-navigation-marker');
  Object.assign(line.style,{left:(to.left-parent.left+3)+'px',width:Math.max(0,to.width-6)+'px'});
  if(previousNav&&to.width>0){const dx=previousNav.left-to.left,scale=Math.max(.1,previousNav.width/to.width);
   run(line,[{transform:`translateX(${dx}px) scaleX(${scale})`,offset:0},{transform:`translateX(${dx}px) scaleX(.2)`,offset:.33},{transform:'translateX(0) scaleX(.2)',offset:.73},{transform:'translateX(0) scaleX(1)',offset:1}],{duration:300,easing:'cubic-bezier(.77,0,.175,1)'});
  }
  resizeObserver=new ResizeObserver(()=>{const parent=nav.getBoundingClientRect(),to=selected.getBoundingClientRect();Object.assign(line.style,{left:(to.left-parent.left+3)+'px',width:Math.max(0,to.width-6)+'px'});});
  resizeObserver.observe(nav);resizeObserver.observe(selected);
 }
 const footer=document.querySelector('.site-footer');
 let observer=null;
 if(footer){footer.classList.add('has-drawing-rule');const rule=document.createElement('span');rule.className='footer-drawing-rule';rule.setAttribute('aria-hidden','true');footer.prepend(rule);
  observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){run(rule,[{transform:'scaleX(.05)',opacity:.3},{transform:'scaleX(1)',opacity:1}],{duration:450,easing:'cubic-bezier(.23,1,.32,1)'});observer.disconnect();}},{threshold:.1});observer.observe(footer);
 }
 const settle=()=>{if(reduced.matches)for(const a of animations)a.finish();};reduced.addEventListener('change',settle,{signal});
 signal?.addEventListener('abort',()=>{observer?.disconnect();resizeObserver?.disconnect();for(const a of animations)a.cancel();animations.clear();},{once:true});
}
