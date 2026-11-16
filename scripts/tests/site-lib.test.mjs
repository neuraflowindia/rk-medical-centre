import test from 'node:test';
import assert from 'node:assert/strict';
import {e,text,classes,attrs,bookingOn,stateText,emphasise,srcset,image,paragraphs,oneOf} from '../../src/site/lib/html.mjs';
import {icon,stars,sprite,iconNames,iconPaths,iconId} from '../../src/site/icons/icons.mjs';

test('text is escaped, and short pairs never break across lines',()=>{
 assert.equal(e('<a href="x">Tom & Jerry\'s</a>'),'&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
 assert.equal(text('Dr. Sanjay Gupta at R. K. Medical Centre'),'Dr.&nbsp;Sanjay Gupta at R.&nbsp;K. Medical Centre');
 assert.equal(text('10:00 am to 1:30 pm'),'10:00&nbsp;am to 1:30&nbsp;pm');
 assert.equal(text('Reg. No. 38164'),'Reg.&nbsp;No.&nbsp;38164');
 assert.equal(text('Call 94150 49410'),'Call 94150&nbsp;49410');
 assert.equal(text('families since 1992.'),'families since&nbsp;1992.');
 assert.equal(text('Ring Road <b>'),'Ring&nbsp;Road &lt;b&gt;');
 assert.equal(text(800),'800');
});

test('class lists and attributes are built safely',()=>{
 assert.equal(classes('a',false,null,undefined,'',' b ',['c',0&&'d']),'a b c');
 assert.equal(attrs({href:'/x?a=1&b=2',hidden:true,inert:false,title:null,id:undefined,'data-n':3}),' href="/x?a=1&amp;b=2" hidden data-n="3"');
 assert.equal(attrs(),'');
 assert.throws(()=>attrs({'on click':'x'}),/Unsafe attribute name/);
});

test('state-aware words start in their own booking state and carry both',()=>{
 assert.equal(bookingOn({mode:'on'}),true);assert.equal(bookingOn({mode:'off'}),false);assert.equal(bookingOn(undefined),false);
 assert.equal(stateText({mode:'on'},{on:'Book',off:'Arrange a visit'}),'<span data-booking-on="Book" data-booking-off="Arrange a visit">Book</span>');
 assert.equal(stateText({mode:'off'},{on:'Book',off:'Arrange a visit',tag:'b',className:'x'}),'<b class="x" data-booking-on="Book" data-booking-off="Arrange a visit">Arrange a visit</b>');
});

test('one phrase of a heading is set in italics and kept on one line',()=>{
 assert.equal(emphasise('Two doctors. One family practice.','One family practice.'),'Two doctors. <em>One&nbsp;family&nbsp;practice.</em>');
 assert.equal(emphasise('See a doctor today.','today.'),'See a doctor <em>today.</em>');
 assert.equal(emphasise('Before you come, come early.','come'),'Before you come, <em>come</em> early.','the last match is the one set apart');
 assert.equal(emphasise('Plain <words>'),'Plain &lt;words&gt;');assert.equal(emphasise('Plain words','missing'),'Plain words');
});

test('pictures carry their sizes, alt text and loading; several widths need sizes',()=>{
 const one={src:'/clinic-assets/a-100.webp',width:100,height:50,alt:''};
 assert.equal(image(one),'<img src="/clinic-assets/a-100.webp" width="100" height="50" alt="" loading="lazy" decoding="async">');
 const many={src:'/client-photos/b-264.webp',width:264,height:330,alt:'B',sources:[{src:'/client-photos/b-264.webp',width:264},{src:'/client-photos/b-528.webp',width:528}]};
 assert.equal(srcset(many.sources),'/client-photos/b-264.webp 264w, /client-photos/b-528.webp 528w');
 assert.equal(image(many,{sizes:'264px',eager:true,className:'x',alt:'Other',attributes:{'data-k':'v'}}),
  '<img class="x" src="/client-photos/b-264.webp" srcset="/client-photos/b-264.webp 264w, /client-photos/b-528.webp 528w" sizes="264px" width="264" height="330" alt="Other" fetchpriority="high" decoding="async" data-k="v">');
 assert.throws(()=>image(many),/sizes is needed/);assert.throws(()=>image({}),/picture record/);assert.throws(()=>image(null),/picture record/);
 assert.equal(paragraphs(['One.','Two & three.']),'<p>One.</p><p>Two &amp; three.</p>');
 assert.equal(oneOf('a',['a','b']),'a');assert.throws(()=>oneOf('c',['a','b'],'size'),/Unknown size: c/);
});

test('icons are references into one sprite that holds every icon once',()=>{
 assert.equal(icon('phone'),'<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-phone"/></svg>');
 assert.equal(icon('out',{className:'x',label:'Opens Google Maps'}),'<svg class="icon x" role="img" aria-label="Opens Google Maps" focusable="false"><use href="#i-out"/></svg>');
 assert.throws(()=>icon('unicorn'),/Unknown icon/);
 const all=sprite();
 for(const name of iconNames)assert.equal((all.match(new RegExp(`<symbol id="${iconId(name)}" `,'g'))||[]).length,1,name);
 assert.ok(iconNames.length>=24&&Object.isFrozen(iconPaths));
 assert.match(all,/^<svg class="sprite" aria-hidden="true"/);assert.match(all,/id="i-half-fill"/);
 for(const path of Object.values(iconPaths))assert.doesNotMatch(path,/fill=|stroke=|style=/,'icons take their line from the stylesheet');
 const five=stars([1,1,1,.5,0]);
 assert.equal((five.match(/<svg/g)||[]).length,5);assert.equal((five.match(/icon--half/g)||[]).length,1);assert.equal((five.match(/icon--empty/g)||[]).length,1);
});
