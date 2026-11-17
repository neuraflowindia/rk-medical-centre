// The Treatments page's behaviour: the decisions as pure functions, and the wiring on a small
// stand-in page that lays its rows out the way the real one does.
import test from 'node:test';
import assert from 'node:assert/strict';
import {bindTreatments,paired,nextOpen,startingRow,revealScroll,besideScroll,headerCover,addressFor,arrivedByQuery,PAIRED_FROM,CLEARANCE} from '../../src/site/pages/treatments/treatments.behaviour.mjs';
import {rowIds,groupIds,rowById} from '../../src/clinic/page-content/treatments.mjs';

// ---- decisions ----

test('the panel stands beside the index from 1024 px',()=>{
 assert.equal(PAIRED_FROM,1024);
 assert.equal(paired(1024),true);assert.equal(paired(1440),true);assert.equal(paired(1023),false);assert.equal(paired(390),false);assert.equal(paired(undefined),false);
});

test('choosing a row: in place the open row closes on a second tap; beside the index one is always chosen',()=>{
 assert.equal(nextOpen({current:null,chosen:'thyroid'}),'thyroid');
 assert.equal(nextOpen({current:'diabetes',chosen:'thyroid'}),'thyroid');
 assert.equal(nextOpen({current:'thyroid',chosen:'thyroid'}),null);
 assert.equal(nextOpen({current:'thyroid',chosen:'thyroid',beside:true}),'thyroid');
 assert.equal(nextOpen({current:'diabetes',chosen:'pregnancy',beside:true}),'pregnancy');
 assert.equal(nextOpen({current:'diabetes',chosen:'unknown'}),'diabetes');
 assert.equal(nextOpen({current:null,chosen:undefined,beside:true}),null);
});

test('the row a page starts with: the address first, then what was drawn, then the first row beside the index',()=>{
 assert.equal(startingRow({}),null);
 assert.equal(startingRow({beside:true}),rowIds[0]);
 assert.equal(startingRow({drawn:'thyroid',beside:true}),'thyroid');
 assert.equal(startingRow({arrival:'ultrasound',drawn:'thyroid'}),'ultrasound');
 assert.equal(startingRow({arrival:'unknown',drawn:'unknown'}),null);
});

test('after a row opens in place the page moves only as far as its panel needs',()=>{
 const view={viewportHeight:844,topLine:68,bottomReserve:96};
 // everything already in view
 assert.equal(revealScroll({...view,rowTop:200,panelBottom:700}),0);
 // the panel runs past the lower edge: up by exactly the overshoot
 assert.equal(revealScroll({...view,rowTop:400,panelBottom:900}),152);
 // a long panel: the row stops at the top line, it never goes under the header
 assert.equal(revealScroll({...view,rowTop:300,panelBottom:1400}),232);
 // a row hidden under the header comes down to the top line
 assert.equal(revealScroll({...view,rowTop:20,panelBottom:500}),-48);
 assert.equal(revealScroll({...view,rowTop:-300,panelBottom:900}),-368);
 // a row already on the top line cannot give any more room
 assert.equal(revealScroll({...view,rowTop:68,panelBottom:1200}),0);
 // without a header or a bar
 assert.equal(revealScroll({rowTop:500,panelBottom:900,viewportHeight:800}),100);
 // nothing sensible to measure
 assert.equal(revealScroll({rowTop:NaN,panelBottom:900,viewportHeight:800}),0);
 assert.equal(revealScroll({rowTop:10,panelBottom:900,viewportHeight:0}),0);
});

test('beside the index the page moves only when the end of the index has carried the panel up',()=>{
 assert.equal(besideScroll({panelTop:120,stickyLine:120}),0);
 assert.equal(besideScroll({panelTop:119.4,stickyLine:120}),0);
 assert.equal(besideScroll({panelTop:300,stickyLine:120}),0);
 assert.equal(besideScroll({panelTop:-80,stickyLine:120}),-200);
 assert.equal(besideScroll({panelTop:10,stickyLine:NaN}),0);
});

test('the header covers the top of the screen only while it is shown',()=>{
 assert.equal(headerCover(56),56);assert.equal(headerCover(55.6),56);
 assert.equal(headerCover(-1.12),0);assert.equal(headerCover(0),0);
 assert.equal(headerCover(undefined),0);assert.equal(headerCover(NaN),0);
});

test('the address of a row, and which arrivals are tidied into one',()=>{
 assert.equal(addressFor('/treatment','thyroid'),'/treatment#thyroid');
 assert.equal(addressFor('/treatment',null),'/treatment');
 assert.equal(arrivedByQuery({search:'?topic=thyroid'}),true);
 assert.equal(arrivedByQuery({search:'?service=ultrasound'}),true);
 assert.equal(arrivedByQuery({search:'?area=women'}),true);
 assert.equal(arrivedByQuery({search:'?topic=thyroid',hash:'#pregnancy'}),false);
 assert.equal(arrivedByQuery({hash:'#thyroid'}),false);
 assert.equal(arrivedByQuery({search:'?booking=off'}),false);
 assert.equal(arrivedByQuery({}),false);
});

// ---- wiring, on a stand-in page ----

const ROW=90,PANEL=520,FIRST=400;
/**
 * A page with the nine rows stacked from 400 px down, each 90 px tall; the open row's panel adds
 * 520 px under it (in place) or stands at a fixed line (beside the index). Positions are measured
 * from the top of the screen, so scrolling moves them.
 */
function standIn({width=390,height=844,search='',hash='',drawn=null,header=56,headerAway=false,bar=true,motion=true,media=true,panelLine=null}={}){
 const state={scrollY:0,scrolls:[],replaced:[],announced:[],frames:[],listeners:{},mediaListeners:[],focused:null,intoView:[],remeasured:0};
 const beside=()=>state.width>=1024;
 state.width=width;
 const element=(extra={})=>{
  const attributes=new Map();
  return {attributes,getAttribute:name=>attributes.has(name)?attributes.get(name):null,setAttribute:(name,value)=>attributes.set(name,String(value)),
   removeAttribute:name=>attributes.delete(name),hasAttribute:name=>attributes.has(name),...extra};
 };
 const openId=()=>rowIds.find(id=>items.get(id).item.hasAttribute('data-open'))||null;
 const pageTop=id=>{
  const at=rowIds.indexOf(id),open=openId(),above=!beside()&&open&&rowIds.indexOf(open)<at?PANEL:0;
  return FIRST+at*ROW+above;
 };
 const items=new Map(rowIds.map(id=>{
  const item=element({id});item.setAttribute('data-topic',id);
  const row=element({getBoundingClientRect:()=>({top:pageTop(id)-state.scrollY}),closest:selector=>selector==='[data-topic-row]'?row:selector==='[data-topic]'?item:null});
  const panel=element({style:{top:'120px'},getBoundingClientRect:()=>beside()
   ?{top:panelLine??120,bottom:(panelLine??120)+PANEL}
   :{top:pageTop(id)+ROW-state.scrollY,bottom:pageTop(id)+ROW+PANEL-state.scrollY}});
  item.querySelector=selector=>selector==='[data-topic-row]'?row:selector==='[data-topic-panel]'?panel:null;
  item.scrollIntoView=options=>state.intoView.push({id,options});
  item.focus=options=>{state.focused={id,options};};
  return [id,{item,row,panel}];
 }));
 if(drawn)items.get(drawn).item.setAttribute('data-open','');
 const groupsById=new Map(groupIds.map(id=>[id,element({id,scrollIntoView:options=>state.intoView.push({id,options}),focus:options=>{state.focused={id,options};}})]));
 const index=element({
  querySelector:selector=>selector==='[data-topic][data-open]'?(openId()?items.get(openId()).item:null):null,
  querySelectorAll:selector=>selector==='[data-topic]'?[...items.values()].map(entry=>entry.item):[],
  addEventListener:(type,listener,options)=>{state.listeners[type]=listener;state.listenerOptions=options;}
 });
 // a header that is tucked away keeps its height but sits just above the screen
 const headerElement={offsetHeight:header,getBoundingClientRect:()=>({bottom:headerAway?-1.12:header})},barElement={offsetHeight:64,style:{display:bar?'grid':'none'}};
 const windowObject={
  get innerWidth(){return state.width;},innerHeight:height,
  document:{querySelector:selector=>selector==='.site-header'?(header?headerElement:null):selector==='[data-action-bar]'?barElement:null,
   getElementById:id=>items.get(id)?.item||groupsById.get(id)||null},
  history:{state:{key:7},replaceState:(historyState,unused,address)=>state.replaced.push({historyState,address})},
  location:{pathname:'/treatment',search,hash},
  matchMedia:media?()=>({get matches(){return beside();},addEventListener:(type,listener)=>state.mediaListeners.push(listener)}):undefined,
  getComputedStyle:target=>target.style||{display:'block'},
  scrollBy:options=>{state.scrolls.push(options);state.scrollY+=options.top;},
  requestAnimationFrame:callback=>state.frames.push(callback)
 };
 const services={motion:{allowed:()=>motion,remeasure:()=>{state.remeasured++;}},announce:words=>state.announced.push(words)};
 const root={querySelector:selector=>selector==='[data-topics]'?index:null};
 const click=(id,extra={})=>{
  const event={target:{closest:selector=>selector==='[data-topic-row]'&&id?items.get(id).row:null},defaultPrevented:false,button:0,prevented:false,preventDefault(){this.prevented=true;},...extra};
  state.listeners.click(event);return event;
 };
 const expanded=()=>Object.fromEntries(rowIds.map(id=>[id,items.get(id).row.getAttribute('aria-expanded')]));
 return {state,items,index,root,windowObject,services,click,openId,expanded,rowTop:id=>items.get(id).row.getBoundingClientRect().top};
}
const bind=(page,extra={})=>bindTreatments(page.root,{signal:extra.signal,ctx:{},services:extra.services===undefined?page.services:extra.services,windowObject:page.windowObject});

test('the behaviour does nothing where there is no index or no window',()=>{
 assert.equal(bindTreatments(null),null);
 assert.equal(bindTreatments({querySelector:()=>null},{windowObject:{}}),null);
 assert.equal(bindTreatments(standIn().root,{windowObject:null}),null);
 assert.equal(bindTreatments({}),null);
});

test('on a phone the page starts closed, says so on every row, and takes over from the address',()=>{
 const page=standIn(),bound=bind(page);
 assert.equal(bound.open(),null);assert.equal(page.openId(),null);
 assert.ok(Object.values(page.expanded()).every(value=>value==='false'));
 assert.equal(page.index.getAttribute('data-topics-bound'),'');
 assert.deepEqual(page.state.replaced,[]);assert.deepEqual(page.state.frames,[]);
});

test('on a laptop the first row is chosen from the start',()=>{
 const page=standIn({width:1440}),bound=bind(page);
 assert.equal(bound.open(),rowIds[0]);assert.equal(page.expanded()[rowIds[0]],'true');
 assert.equal(page.items.get(rowIds[0]).item.hasAttribute('data-arriving'),false,'nothing animates in on arrival');
});

test('a tap opens the row in place, announces it, puts it in the address and shows the panel\'s buttons',()=>{
 const page=standIn(),bound=bind(page);
 const event=page.click('fever-infections');
 assert.equal(event.prevented,true);
 assert.equal(bound.open(),'fever-infections');assert.equal(page.expanded()['fever-infections'],'true');
 assert.equal(page.items.get('fever-infections').item.hasAttribute('data-arriving'),true);
 assert.deepEqual(page.state.announced,['Showing '+rowById('fever-infections').title]);
 assert.deepEqual(page.state.replaced,[{historyState:{key:7},address:'/treatment#fever-infections'}]);
 // row at 670, panel to 1280; the screen shows to 844 - (64 + 24): the page moves up by 524
 assert.equal(CLEARANCE.bar,24);
 assert.deepEqual(page.state.scrolls,[{top:1280-(844-64-CLEARANCE.bar),left:0,behavior:'smooth'}]);
 assert.equal(page.rowTop('fever-infections'),670-524);
 assert.equal(page.state.remeasured,1,'parts waiting to enter are measured again after the page has moved');
});

test('opening a row below the open one keeps the tapped row under the finger, then reveals its panel',()=>{
 const page=standIn();bind(page);
 page.click('diabetes');page.state.scrolls.length=0;page.state.scrollY=300;
 const before=page.rowTop('pregnancy');
 page.click('pregnancy');
 const [anchor,reveal]=page.state.scrolls;
 assert.deepEqual(anchor,{top:-PANEL,left:0,behavior:'instant'},'the closed panel above is taken back at once');
 assert.equal(before,before+0);assert.equal(page.rowTop('pregnancy')+reveal.top,before,'only the reveal moved the row');
 assert.equal(reveal.behavior,'smooth');
 assert.equal(page.openId(),'pregnancy');assert.equal(page.items.get('diabetes').item.hasAttribute('data-arriving'),false);
 assert.equal(page.expanded().diabetes,'false');
});

test('a second tap closes the row and tidies the address; nothing is announced or scrolled',()=>{
 const page=standIn({bar:false}),bound=bind(page);
 page.click('diabetes');
 const scrolls=page.state.scrolls.length;
 page.click('diabetes');
 assert.equal(bound.open(),null);assert.equal(page.state.replaced.at(-1).address,'/treatment');
 assert.equal(page.state.announced.length,1);assert.equal(page.state.scrolls.length,scrolls);
});

test('with motion paused the page moves at once; without the phone bar it keeps only a little air',()=>{
 const page=standIn({motion:false,bar:false,header:0});bind(page);
 page.click('thyroid');
 // row at 580, panel to 1190, screen to 844 - 16
 assert.deepEqual(page.state.scrolls,[{top:1190-(844-CLEARANCE.bottom),left:0,behavior:'instant'}]);
});

test('a long panel on a small phone: the row stops under the header while it is shown, and goes to the top once it is tucked away',()=>{
 // 320 x 740: the panel (520) and its row (90) cannot both fit between the header and the bar
 const shown=standIn({width:320,height:740});bind(shown);
 shown.click('general-health');
 assert.equal(shown.rowTop('general-health'),56+CLEARANCE.top,'the row stays clear of the header');
 const away=standIn({width:320,height:740,headerAway:true});bind(away);
 away.click('general-health');
 // row at 760, panel to 1370, the screen shows to 740 - 88 = 652: it needs 718 and has 760 - 12 = 748 to give
 assert.deepEqual(away.state.scrolls,[{top:718,left:0,behavior:'smooth'}]);
 assert.equal(away.rowTop('general-health'),42);
});

test('a row whose panel is already in view moves nothing',()=>{
 const page=standIn({height:2000});const bound=bind(page);
 page.click('diabetes');
 assert.deepEqual(page.state.scrolls,[]);assert.equal(bound.reveal('unknown'),0);
});

test('beside the index: choosing changes the panel without moving the page; the chosen row stays chosen',()=>{
 const page=standIn({width:1440}),bound=bind(page);
 page.click('ultrasound');
 assert.equal(bound.open(),'ultrasound');assert.deepEqual(page.state.scrolls,[]);
 assert.equal(page.state.replaced.at(-1).address,'/treatment#ultrasound');
 const announced=page.state.announced.length,replaced=page.state.replaced.length;
 const event=page.click('ultrasound');
 assert.equal(event.prevented,true);assert.equal(bound.open(),'ultrasound');
 assert.equal(page.state.announced.length,announced);assert.equal(page.state.replaced.length,replaced);
});

test('beside the index, near its end: the page moves down just enough to bring the whole panel back',()=>{
 const page=standIn({width:1366,height:768,panelLine:-140});bind(page);
 page.click('pregnancy');
 assert.deepEqual(page.state.scrolls,[{top:-260,left:0,behavior:'smooth'}]);
});

test('clicks that are not a plain click on a row are left to the browser',()=>{
 const page=standIn(),bound=bind(page);
 for(const extra of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){
  const event=page.click('diabetes',extra);
  assert.equal(event.prevented,false);assert.equal(bound.open(),null);
 }
 assert.equal(page.click(null).prevented,false);
 const stray={target:null,button:0};page.state.listeners.click(stray);
 assert.equal(bound.open(),null);
});

test('arriving at a row\'s own place opens it and leaves the scrolling to the runtime',()=>{
 const page=standIn({hash:'#thyroid'}),bound=bind(page);
 assert.equal(bound.open(),'thyroid');assert.deepEqual(page.state.replaced,[]);assert.deepEqual(page.state.frames,[]);assert.deepEqual(page.state.announced,[]);
 // a doctor's group: nothing opens on a phone, the first row on a laptop
 const group=standIn({hash:'#women'});assert.equal(bind(group).open(),null);
 const wide=standIn({hash:'#women',width:1280});assert.equal(bind(wide).open(),rowIds[0]);
});

test('arriving beside the index at a row near its end brings the panel back whole, once the runtime has scrolled',()=>{
 const page=standIn({width:1366,height:768,hash:'#ultrasound',panelLine:-178});bind(page);
 assert.deepEqual(page.state.scrolls,[]);assert.equal(page.state.frames.length,1);
 page.state.frames.shift()();page.state.frames.shift()();
 assert.deepEqual(page.state.scrolls,[{top:-298,left:0,behavior:'instant'}]);
 // an older link does the same after it has brought its row into view
 const older=standIn({width:1440,search:'?service=gynecology',panelLine:85});bind(older);
 older.state.frames.shift()();older.state.frames.shift()();
 assert.deepEqual(older.state.intoView.map(item=>item.id),['womens-health']);
 assert.deepEqual(older.state.scrolls,[{top:-35,left:0,behavior:'instant'}]);
 // a panel that is whole is left alone, and a page that was left in the meantime is not touched
 const whole=standIn({width:1440,hash:'#thyroid'});bind(whole);
 whole.state.frames.shift()();whole.state.frames.shift()();
 assert.deepEqual(whole.state.scrolls,[]);
 const controller=new AbortController(),left=standIn({width:1440,hash:'#ultrasound',panelLine:-178});
 bind(left,{signal:controller.signal});controller.abort();left.state.frames.shift()();left.state.frames.shift()();
 assert.deepEqual(left.state.scrolls,[]);
});

test('an older ?topic= link opens its row, becomes the page\'s own address and is brought into view after the runtime has settled',()=>{
 const page=standIn({search:'?topic=blood-pressure'}),bound=bind(page);
 assert.equal(bound.open(),'blood-pressure');
 assert.deepEqual(page.state.replaced,[{historyState:{key:7},address:'/treatment#blood-pressure'}]);
 assert.equal(page.state.frames.length,1);page.state.frames.shift()();
 assert.equal(page.state.frames.length,1);assert.deepEqual(page.state.intoView,[]);
 page.state.frames.shift()();
 assert.deepEqual(page.state.intoView,[{id:'blood-pressure',options:{behavior:'instant',block:'start'}}]);
 assert.equal(page.items.get('blood-pressure').item.getAttribute('tabindex'),'-1');
 assert.deepEqual(page.state.focused,{id:'blood-pressure',options:{preventScroll:true}});
});

test('an older ?area= link brings the doctor\'s group into view; a page that was drawn open stays open',()=>{
 const page=standIn({search:'?area=women',drawn:'general-health'}),bound=bind(page);
 assert.equal(bound.open(),'general-health');
 assert.equal(page.state.replaced.at(-1).address,'/treatment#women');
 page.state.frames.shift()();page.state.frames.shift()();
 assert.deepEqual(page.state.intoView,[{id:'women',options:{behavior:'instant',block:'start'}}]);
});

test('a page that is left before the two frames have passed is not scrolled',()=>{
 const controller=new AbortController(),page=standIn({search:'?service=ultrasound'});
 bind(page,{signal:controller.signal});
 assert.equal(page.state.listenerOptions.signal,controller.signal);
 page.state.frames.shift()();controller.abort();page.state.frames.shift()();
 assert.deepEqual(page.state.intoView,[]);assert.equal(page.state.focused,null);
});

test('a place that already takes focus keeps its own tabindex',()=>{
 const page=standIn({search:'?topic=thyroid'});page.items.get('thyroid').item.setAttribute('tabindex','0');
 bind(page);page.state.frames.shift()();page.state.frames.shift()();
 assert.equal(page.items.get('thyroid').item.getAttribute('tabindex'),'0');
});

test('widening the window chooses the first row; narrowing it leaves the open row open',()=>{
 const page=standIn(),bound=bind(page);
 assert.equal(bound.open(),null);
 page.state.width=1280;for(const listener of page.state.mediaListeners)listener();
 assert.equal(bound.open(),rowIds[0]);assert.deepEqual(page.state.announced,[]);
 page.click('thyroid');page.state.width=390;for(const listener of page.state.mediaListeners)listener();
 assert.equal(bound.open(),'thyroid');
});

test('the page works without the motion and announce services, and without matchMedia',()=>{
 const page=standIn({media:false,width:1100}),bound=bind(page,{services:null});
 assert.equal(bound.open(),rowIds[0]);
 page.click('diabetes');page.click('thyroid');
 assert.equal(bound.open(),'thyroid');
 const narrow=standIn({media:false}),second=bind(narrow,{services:{}});
 narrow.click('diabetes');
 assert.equal(second.open(),'diabetes');assert.equal(narrow.state.scrolls[0].behavior,'instant');
});
