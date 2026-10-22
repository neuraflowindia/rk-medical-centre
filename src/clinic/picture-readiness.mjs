/** Bound image decoding to the current page lifetime. No provider or DOM mutation. */
export function waitForPictures(images,{signal,timeoutMs=10000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 return new Promise((resolve,reject)=>{
  let settled=false,timer;
  const finish=(error)=>{
   if(settled)return;
   settled=true;clearTimer(timer);signal?.removeEventListener('abort',abort);
   if(error)reject(error);else resolve();
  };
  const abort=()=>finish(new DOMException('Picture request cancelled','AbortError'));
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimer(()=>finish(new Error('Picture unavailable')),timeoutMs);
  // Rejection handlers stay attached even after a page change or deadline.
  Promise.all(images.map(image=>Promise.resolve().then(()=>image.decode()))).then(()=>finish(),finish);
 });
}
