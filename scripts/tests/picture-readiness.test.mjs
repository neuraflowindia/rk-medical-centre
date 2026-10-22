import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waitForPictures} from '../../src/clinic/picture-readiness.mjs';
import {serializeGraph} from '../../src/clinic/page-schema.mjs';

function clock(){let callback;return {setTimer(fn){callback=fn;return 17;},clearTimer(id){if(id===17)callback=undefined;},fire(){callback?.();},get pending(){return !!callback;}};}
test('all image decodes finish before admission and release the deadline',async()=>{
 const timers=clock();let complete;
 const ready=waitForPictures([{decode:()=>Promise.resolve()},{decode:()=>new Promise(resolve=>{complete=resolve;})}],timers);
 await Promise.resolve();assert.equal(timers.pending,true);complete();await ready;assert.equal(timers.pending,false);
});
test('decode failures are recoverable and clear the timer',async()=>{
 const timers=clock();await assert.rejects(waitForPictures([{decode:()=>Promise.reject(new Error('bad image'))}],timers),/bad image/);assert.equal(timers.pending,false);
});
test('a stalled decoder expires and a late rejection remains handled',async()=>{
 const timers=clock();let reject;
 const ready=waitForPictures([{decode:()=>new Promise((_,r)=>{reject=r;})}],timers);
 await Promise.resolve();timers.fire();await assert.rejects(ready,/Picture unavailable/);reject(new Error('late'));await Promise.resolve();assert.equal(timers.pending,false);
});
test('leaving the page immediately settles pending decoding and clears timers',async()=>{
 const controller=new AbortController(),timers=clock();const ready=waitForPictures([{decode:()=>new Promise(()=>{})}],{signal:controller.signal,...timers});
 controller.abort();await assert.rejects(ready,{name:'AbortError'});assert.equal(timers.pending,false);
});
test('a page already left never begins a decoder or deadline',async()=>{
 const controller=new AbortController();controller.abort();let decoded=false;const timers=clock();
 await assert.rejects(waitForPictures([{decode(){decoded=true;}}],{signal:controller.signal,...timers}),{name:'AbortError'});assert.equal(decoded,false);assert.equal(timers.pending,false);
});
test('a synchronous decoder error is safely reported',async()=>{
 const timers=clock();await assert.rejects(waitForPictures([{decode(){throw new Error('sync');}}],timers),/sync/);assert.equal(timers.pending,false);
});
test('structured text cannot close a script and still round-trips exactly',()=>{
 const value={name:'<script></script><img src=x onerror=alert(1)>',description:'Care \u0026 questions'};
 const encoded=serializeGraph(value);assert.equal(encoded.includes('<'),false);assert.deepEqual(JSON.parse(encoded),value);
});
