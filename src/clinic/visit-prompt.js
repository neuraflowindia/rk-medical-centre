const key='rk-choreography-visit-handled';
export function createPrompt({node,anchor,dialog,controller,onSuppress=()=>{}}){let visible=false,total=0,quiet=0,last=performance.now(),stopped=false,timer=0;try{stopped=sessionStorage.getItem(key)==='1';}catch{}const abort=new AbortController();
 function suppress(){stopped=true;clearInterval(timer);try{sessionStorage.setItem(key,'1');}catch{}onSuppress();}
 function restore(){if(anchor.isConnected&&!anchor.contains(node))anchor.append(node);anchor.style.minHeight='';}
 dialog.addEventListener('restoring',()=>{restore();suppress();},{signal:abort.signal});
 function tick(){const now=performance.now(),dt=Math.min(250,now-last);last=now;const r=anchor.getBoundingClientRect(),inline=r.bottom>0&&r.top<innerHeight;const busy=!visible||document.hidden||!!document.querySelector('dialog[open],#privacy-panel:not([hidden])')||!!document.activeElement?.matches('input,select,textarea')||inline;if(busy){quiet=0;return;}total+=dt;quiet+=dt;if(total>=7000&&quiet>=3000&&!stopped){anchor.style.minHeight=anchor.offsetHeight+'px';document.querySelector('#visit-dialog-body').append(node);controller.open({focusHeading:true});suppress();}}
 if(!stopped)timer=setInterval(tick,100);
 return {setVisible(v){visible=v;last=performance.now();quiet=0;},suppress,replay(){try{sessionStorage.removeItem(key);}catch{}stopped=false;total=0;quiet=0;last=performance.now();clearInterval(timer);timer=setInterval(tick,100);},dispose(){suppress();controller.close('navigate');restore();abort.abort();clearInterval(timer);},status(){return{total,quiet,stopped,visible};}};
}
