import test from 'node:test';import assert from 'node:assert/strict';
import {bindProfile,paintSession,SESSION_REFRESH} from '../../src/site/pages/profile/profile.behaviour.mjs';
import {nextSession,nextSessionNeutral} from '../../src/clinic/page-content/doctors.mjs';

/** A stand-in for the printed session line: just enough of an element for the behaviour. */
function line(session=nextSessionNeutral){
 const attributes=new Map([['data-state',session.state]]),writes=[];
 const part=value=>{let words=value;return {get textContent(){return words;},set textContent(next){writes.push(next);words=next;}};};
 const label=part(session.label),detail=part(session.detail);
 return {writes,label,detail,getAttribute:name=>attributes.get(name)??null,setAttribute:(name,value)=>{writes.push(`${name}=${value}`);attributes.set(name,value);},
  querySelector:selector=>selector==='[data-session-label]'?label:selector==='[data-session-detail]'?detail:null};
}
const page=lines=>({querySelectorAll:selector=>selector==='[data-next-session]'?lines:[]});
function timers(){
 const running=new Map();let next=1;
 return {running,setInterval(run,every){running.set(next,{run,every});return next++;},clearInterval(id){running.delete(id);},tick(){for(const {run} of running.values())run();}};
}
const MONDAY_11=new Date('2026-11-16T05:30:00Z'),MONDAY_15=new Date('2026-11-16T09:30:00Z'),MONDAY_21=new Date('2026-11-16T15:30:00Z');
const plain=text=>text.replace(/\u00A0/g,' ');

test('painting writes the state and both parts, and touches nothing that is already right',()=>{
 const node=line();
 paintSession(node,nextSession(MONDAY_15));
 assert.equal(node.getAttribute('data-state'),'later');assert.equal(node.label.textContent,'Next clinic session');assert.equal(plain(node.detail.textContent),'today, 6:00 pm');
 const before=node.writes.length;
 paintSession(node,nextSession(MONDAY_15));
 assert.equal(node.writes.length,before,'a second paint with the same answer writes nothing');
 // a line that lost a part is still painted without failing
 const bare={getAttribute:()=>null,setAttribute(){},querySelector:()=>null};
 assert.doesNotThrow(()=>paintSession(bare,nextSession(MONDAY_15)));
});

test('the page paints its session lines at once, keeps them fresh, and stops when the page changes',()=>{
 const first=line(),second=line(),clock=timers(),scope=new AbortController();
 let now=MONDAY_11;
 bindProfile(page([first,second]),{signal:scope.signal,now:()=>now,timers:clock});
 for(const node of [first,second]){assert.equal(node.getAttribute('data-state'),'open');assert.equal(node.label.textContent,'In clinic now');assert.equal(plain(node.detail.textContent),'until 1:30 pm');}
 assert.equal(clock.running.size,1);assert.equal([...clock.running.values()][0].every,SESSION_REFRESH);assert.equal(SESSION_REFRESH,30000);
 now=MONDAY_21;clock.tick();
 assert.equal(first.getAttribute('data-state'),'closed');assert.equal(plain(first.detail.textContent),'tomorrow, 10:00 am');
 scope.abort();
 assert.equal(clock.running.size,0,'the timer is cleared when the router leaves the page');
});

test('a page without the line, or one already left, starts nothing; a failing clock leaves the printed words',()=>{
 const clock=timers();
 bindProfile(page([]),{timers:clock});bindProfile(null,{timers:clock});bindProfile({},{timers:clock});
 const gone=new AbortController();gone.abort();
 const untouched=line();
 bindProfile(page([untouched]),{signal:gone.signal,timers:clock});
 assert.equal(clock.running.size,0);assert.equal(untouched.writes.length,0);
 const kept=line();
 assert.doesNotThrow(()=>bindProfile(page([kept]),{now:()=>{throw new Error('no clock');},timers:clock,every:5}));
 assert.equal(kept.label.textContent,nextSessionNeutral.label);assert.equal(kept.detail.textContent,nextSessionNeutral.detail);
 assert.equal([...clock.running.values()][0].every,5);
 // with the real clock and no signal it still paints a known state
 const real=line(),own=timers();
 bindProfile(page([real]),{timers:own});
 assert.ok(['open','later','closed'].includes(real.getAttribute('data-state')));
});
