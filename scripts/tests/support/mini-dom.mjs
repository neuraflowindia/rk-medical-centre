// A small stand-in for the browser's document, for unit tests of behaviour modules. It is not a
// browser: it parses the markup our templates print, answers the selectors our code uses, carries
// events with bubbling, and lets a test drive time (frames, timers), scrolling and observers by hand.
const VOID=new Set(['img','input','br','hr','meta','link','use','path','circle','rect','line','stop','source']);
const REFLECTED={hidden:'hidden',inert:'inert',disabled:'disabled',open:'open'};

class Style{
 constructor(){this.values=new Map();}
 setProperty(name,value){this.values.set(name,String(value));}
 removeProperty(name){this.values.delete(name);}
 getPropertyValue(name){return this.values.get(name)??'';}
}
class ClassList{
 constructor(element){this.element=element;}
 get list(){return (this.element.getAttribute('class')||'').split(/\s+/).filter(Boolean);}
 contains(name){return this.list.includes(name);}
 add(...names){this.element.setAttribute('class',[...new Set([...this.list,...names])].join(' '));}
 remove(...names){this.element.setAttribute('class',this.list.filter(name=>!names.includes(name)).join(' '));}
 toggle(name,force){const want=force===undefined?!this.contains(name):!!force;if(want)this.add(name);else this.remove(name);return want;}
}
class Target{
 constructor(){this.listeners=new Map();}
 addEventListener(type,listener,options={}){
  const entry={listener,capture:options===true||!!options.capture,once:!!options.once};
  if(!this.listeners.has(type))this.listeners.set(type,[]);
  this.listeners.get(type).push(entry);
  options.signal?.addEventListener('abort',()=>this.removeEventListener(type,listener),{once:true});
 }
 removeEventListener(type,listener){const list=this.listeners.get(type);if(list)this.listeners.set(type,list.filter(entry=>entry.listener!==listener));}
 fire(event,phase){
  for(const entry of [...(this.listeners.get(event.type)||[])]){
   if(phase==='capture'!==entry.capture&&phase!=='target')continue;
   if(entry.once)this.removeEventListener(event.type,entry.listener);
   event.currentTarget=this;entry.listener.call(this,event);
  }
 }
 dispatchEvent(event){
  event.target??=this;
  const path=[];for(let node=this;node;node=node.parentNode||(node.ownerDocument&&node!==node.ownerDocument?node.ownerDocument:node.defaultView&&node!==node.defaultView?node.defaultView:null))path.push(node);
  for(const node of [...path].reverse().slice(0,-1))node.fire(event,'capture');
  this.fire(event,'target');
  if(event.bubbles!==false)for(const node of path.slice(1))node.fire(event,'bubble');
  return !event.defaultPrevented;
 }
}
export class Event{
 constructor(type,init={}){Object.assign(this,{type,bubbles:true,defaultPrevented:false,button:0,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,key:''},init);}
 preventDefault(){this.defaultPrevented=true;}
 stopPropagation(){}
}
class Node extends Target{
 constructor(document){super();this.ownerDocument=document;this.parentNode=null;this.childNodes=[];}
 get parentElement(){return this.parentNode instanceof Element?this.parentNode:null;}
 get isConnected(){for(let node=this;node;node=node.parentNode)if(node===this.ownerDocument.documentElement)return true;return false;}
 remove(){if(this.parentNode){this.parentNode.childNodes=this.parentNode.childNodes.filter(node=>node!==this);this.parentNode=null;}}
}
class Text extends Node{constructor(document,data){super(document);this.data=data;}get textContent(){return this.data;}}
export class Element extends Node{
 constructor(document,tagName){super(document);this.localName=tagName.toLowerCase();this.tagName=tagName.toUpperCase();this.attributes=new Map();this.style=new Style();this.classList=new ClassList(this);
  this.rect={top:0,left:0,right:0,bottom:0,width:0,height:0};this.scrollLeft=0;this.scrollTop=0;this.scrollWidth=0;this.clientWidth=0;this.scrollHeight=0;this.clientHeight=0;this.offsetTop=0;this.offsetHeight=0;this.offsetParent=null;
  this.dataset=new Proxy({},{get:(_,name)=>this.getAttribute('data-'+String(name).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))??undefined,set:(_,name,value)=>{this.setAttribute('data-'+String(name).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value);return true;}});
 }
 get children(){return this.childNodes.filter(node=>node instanceof Element);}
 get firstElementChild(){return this.children[0]||null;}
 get id(){return this.getAttribute('id')||'';}
 set id(value){this.setAttribute('id',value);}
 get className(){return this.getAttribute('class')||'';}
 set className(value){this.setAttribute('class',value);}
 get href(){const raw=this.getAttribute('href');return raw===null?'':new URL(raw,this.ownerDocument.defaultView.location.href).href;}
 set href(value){this.setAttribute('href',value);}
 get rel(){return this.getAttribute('rel')||'';}set rel(value){this.setAttribute('rel',value);}
 get content(){return this.getAttribute('content')||'';}set content(value){this.setAttribute('content',value);}
 get target(){return this.getAttribute('target')||'';}
 get type(){return this.getAttribute('type')||'';}set type(value){this.setAttribute('type',value);}
 get loading(){return this.getAttribute('loading')||'eager';}set loading(value){this.setAttribute('loading',value);}
 get complete(){return true;}get naturalWidth(){return 1;}
 decode(){return Promise.resolve();}
 getAttribute(name){return this.attributes.has(name)?this.attributes.get(name):null;}
 setAttribute(name,value){this.attributes.set(name,String(value));}
 hasAttribute(name){return this.attributes.has(name);}
 removeAttribute(name){this.attributes.delete(name);}
 toggleAttribute(name,force){const want=force===undefined?!this.hasAttribute(name):!!force;if(want)this.setAttribute(name,'');else this.removeAttribute(name);return want;}
 getBoundingClientRect(){return {...this.rect};}
 getClientRects(){return this.closest('[hidden]')?[]:[this.rect];}
 focus(){this.ownerDocument.activeElement=this;this.dispatchEvent(new Event('focusin'));}
 click(){this.dispatchEvent(new Event('click',{cancelable:true}));}
 scrollTo({left=0}={}){this.scrollLeft=left;this.dispatchEvent(new Event('scroll',{bubbles:false}));}
 scrollIntoView(){this.ownerDocument.defaultView.scrolledTo=this;}
 showModal(){this.setAttribute('open','');this.dispatchEvent(new Event('toggle',{bubbles:false}));}
 close(){if(!this.hasAttribute('open'))return;this.removeAttribute('open');this.dispatchEvent(new Event('close',{bubbles:false}));}
 contains(node){for(let at=node;at;at=at.parentNode)if(at===this)return true;return false;}
 closest(selector){for(let node=this;node instanceof Element;node=node.parentNode)if(node.matches(selector))return node;return null;}
 matches(selector){return splitList(selector).some(part=>matchComplex(this,parseComplex(part)));}
 querySelectorAll(selector){const parts=splitList(selector).map(parseComplex),found=[];walk(this,node=>{if(node!==this&&parts.some(part=>matchComplex(node,part)))found.push(node);});return found;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.childNodes.push(node);}this.ownerDocument.mutated?.();}
 insertBefore(node,before){node.remove();node.parentNode=this;const at=this.childNodes.indexOf(before);this.childNodes.splice(at<0?this.childNodes.length:at,0,node);return node;}
 get textContent(){return this.childNodes.map(node=>node.textContent).join('');}
 set textContent(value){this.childNodes=[];if(value!=='')this.append(new Text(this.ownerDocument,String(value)));else this.ownerDocument.mutated?.();}
 get innerHTML(){return this.childNodes.map(serialise).join('');}
 set innerHTML(html){this.childNodes=[];for(const node of parse(this.ownerDocument,html)){node.parentNode=this;this.childNodes.push(node);}this.ownerDocument.mutated?.();}
 get outerHTML(){return serialise(this);}
}
for(const [property,attribute] of Object.entries(REFLECTED))Object.defineProperty(Element.prototype,property,{get(){return this.hasAttribute(attribute);},set(value){if(value)this.setAttribute(attribute,'');else this.removeAttribute(attribute);}});

function walk(root,visit){for(const child of root.children){visit(child);walk(child,visit);}}
function serialise(node){
 if(node instanceof Text)return node.data;
 const attributes=[...node.attributes].map(([name,value])=>value===''?` ${name}`:` ${name}="${value}"`).join('');
 return VOID.has(node.localName)?`<${node.localName}${attributes}>`:`<${node.localName}${attributes}>${node.innerHTML}</${node.localName}>`;
}
function parse(document,html){
 const root={childNodes:[]},stack=[root],pattern=/<!--[\s\S]*?-->|<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z0-9-]+)((?:\s+[^\s=>\/]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
 for(let match;(match=pattern.exec(html));){
  const parent=stack.at(-1);
  if(match[5]!==undefined){const text=new Text(document,match[5].replaceAll('&nbsp;',' ').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'"));text.parentNode=parent instanceof Element?parent:null;parent.childNodes.push(text);}
  else if(match[1]){for(let at=stack.length-1;at>0;at--)if(stack[at].localName===match[1].toLowerCase()){stack.length=at;break;}}
  else if(match[2]){
   const element=new Element(document,match[2]);
   for(const attribute of (match[3]||'').matchAll(/([^\s=>\/]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))element.attributes.set(attribute[1],(attribute[2]??attribute[3]??attribute[4]??'').replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>'));
   element.parentNode=parent instanceof Element?parent:null;parent.childNodes.push(element);
   if(!VOID.has(element.localName)&&!match[4])stack.push(element);
  }
 }
 return root.childNodes;
}
function splitList(selector){const list=[];let depth=0,buffer='';for(const char of selector){if(char==='('||char==='[')depth++;else if(char===')'||char===']')depth--;if(char===','&&depth===0){list.push(buffer.trim());buffer='';}else buffer+=char;}if(buffer.trim())list.push(buffer.trim());return list;}
function parseComplex(selector){
 const steps=[];let buffer='',depth=0,combinator=' ';
 const push=()=>{if(buffer.trim()){steps.push({compound:buffer.trim(),combinator});combinator=' ';}buffer='';};
 for(const char of selector){
  if(char==='('||char==='[')depth++;else if(char===')'||char===']')depth--;
  if(depth===0&&(char===' '||char==='>')){push();if(char==='>')combinator='>';}else buffer+=char;
 }
 push();return steps;
}
function matchComplex(element,steps,at=steps.length-1){
 if(!matchCompound(element,steps[at].compound))return false;
 if(at===0)return true;
 if(steps[at].combinator==='>')return element.parentElement?matchComplex(element.parentElement,steps,at-1):false;
 for(let node=element.parentElement;node;node=node.parentElement)if(matchComplex(node,steps,at-1))return true;
 return false;
}
function matchCompound(element,compound){
 const pattern=/:not\(([^()]*(?:\([^()]*\))?[^()]*)\)|:is\(([^()]*)\)|:([a-z-]+)|\[([^\]~^$*|=]+)(?:([~^$*|]?=)"?([^"\]]*)"?)?\]|\.([\w-]+)|#([\w-]+)|([a-zA-Z][\w-]*|\*)/g;let consumed=0;
 for(let match;(match=pattern.exec(compound));){
  consumed+=match[0].length;
  if(match[1]!==undefined){if(splitList(match[1]).some(inner=>matchCompound(element,inner)))return false;}
  else if(match[2]!==undefined){if(!splitList(match[2]).some(inner=>matchCompound(element,inner)))return false;}
  else if(match[3]!==undefined){
   if(match[3]==='disabled'){if(!element.disabled)return false;}
   else if(match[3]==='focus-visible'){if(element.ownerDocument.keyboardFocus!==element)return false;}
   else if(match[3]==='scope')continue;
   else return false;
  }
  else if(match[4]!==undefined){
   const value=element.getAttribute(match[4].trim());if(value===null)return false;
   if(match[5]==='='&&value!==match[6])return false;
   if(match[5]==='~='&&!value.split(/\s+/).includes(match[6]))return false;
   if(match[5]==='^='&&!value.startsWith(match[6]))return false;
   if(match[5]==='*='&&!value.includes(match[6]))return false;
  }
  else if(match[7]!==undefined){if(!element.classList.contains(match[7]))return false;}
  else if(match[8]!==undefined){if(element.id!==match[8])return false;}
  else if(match[9]!==undefined&&match[9]!=='*'&&element.localName!==match[9].toLowerCase())return false;
 }
 if(consumed!==compound.length)throw new Error('The test document does not understand the selector: '+compound);
 return true;
}

class Storage{constructor(){this.map=new Map();}getItem(key){return this.map.has(key)?this.map.get(key):null;}setItem(key,value){this.map.set(key,String(value));}removeItem(key){this.map.delete(key);}}
class MediaQuery extends Target{constructor(matches){super();this.matches=matches;}set(value){this.matches=value;this.dispatchEvent(new Event('change',{bubbles:false}));}}

/**
 * A page for tests: `createPage({html, body, url, width, height, media})`.
 * Returns {window, document, frames(n), timers, observers, media(query), scroll(y), keyboard(element)}.
 */
export function createPage({html='',body='',url='https://clinic.test/',width=1440,height=900,media={},attributes={}}={}){
 const document=new Target();
 Object.assign(document,{nodeType:9,activeElement:null,keyboardFocus:null,title:'',visibilityState:'visible',fonts:{ready:Promise.resolve()}});
 const root=new Element(document,'html'),head=new Element(document,'head'),bodyElement=new Element(document,'body');
 document.documentElement=root;document.head=head;document.body=bodyElement;root.append(head,bodyElement);
 for(const [name,value] of Object.entries(attributes))root.setAttribute(name,value);
 document.createElement=tag=>new Element(document,tag);
 document.querySelector=selector=>root.matches(selector)?root:root.querySelector(selector);
 document.querySelectorAll=selector=>[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
 document.getElementById=id=>root.querySelectorAll('[id]').find(node=>node.id===id)||null;
 document.contains=node=>root.contains(node);
 const frameQueue=[],timerQueue=new Map(),observers=[],queries=new Map();let timerId=0,now=0;
 const window=new Target();
 const location=new URL(url),entries=[{state:null,url:location.href}];let at=0;
 Object.assign(window,{document,innerWidth:width,innerHeight:height,scrollY:0,scrolledTo:null,localStorage:new Storage(),sessionStorage:new Storage(),Element,
  CustomEvent:class extends Event{constructor(type,init={}){super(type,{bubbles:false,...init});}},
  location,
  history:{get state(){return entries[at].state;},scrollRestoration:'auto',
   pushState(state,_title,address){entries.length=at+1;entries.push({state,url:new URL(address,location.href).href});at++;location.href=entries[at].url;},
   replaceState(state,_title,address){entries[at]={state,url:address===undefined||address===''?entries[at].url:new URL(address,location.href).href};location.href=entries[at].url;},
   back(){if(at>0){at--;location.href=entries[at].url;window.dispatchEvent(new Event('popstate',{bubbles:false}));}}},
  scrollTo(_x,y){window.scrollY=y;window.dispatchEvent(new Event('scroll',{bubbles:false}));},
  matchMedia(query){if(!queries.has(query))queries.set(query,new MediaQuery(!!media[query]));return queries.get(query);},
  requestAnimationFrame(callback){frameQueue.push(callback);return frameQueue.length;},
  setTimeout(callback,delay=0){timerQueue.set(++timerId,{callback,at:now+delay});return timerId;},clearTimeout(id){timerQueue.delete(id);},
  setInterval(callback,every){timerQueue.set(++timerId,{callback,at:now+every,every});return timerId;},clearInterval(id){timerQueue.delete(id);},
  getComputedStyle:()=>({columnGap:'20px',paddingLeft:'0px',visibility:'visible'}),
  IntersectionObserver:class{constructor(callback,options={}){this.callback=callback;this.options=options;this.targets=new Set();observers.push(this);}observe(target){this.targets.add(target);}unobserve(target){this.targets.delete(target);}disconnect(){this.targets.clear();}
   /** Tell the observer what it sees: trigger([{target, isIntersecting, intersectionRatio, top}]). */
   trigger(list){this.callback(list.map(item=>({isIntersecting:true,intersectionRatio:1,...item,boundingClientRect:{top:item.top??0,bottom:item.bottom??0}})),this);}}
 });
 document.defaultView=window;
 if(html)root.innerHTML=html;else if(body)bodyElement.innerHTML=body;
 if(html){document.head=root.querySelector('head')||head;document.body=root.querySelector('body')||bodyElement;}
 return {window,document,observers,
  /** Run `count` animation frames, 16 ms apart. */
  frames(count=1,step=16){for(let index=0;index<count;index++){now+=step;const due=frameQueue.splice(0);for(const callback of due)callback(now);}},
  /** Let `ms` of timers pass. */
  tick(ms){now+=ms;for(const [id,timer] of [...timerQueue]){if(timer.at>now)continue;if(timer.every){timer.at+=timer.every;}else timerQueue.delete(id);timer.callback();}},
  pending:()=>({frames:frameQueue.length,timers:timerQueue.size}),
  media:query=>window.matchMedia(query),
  scroll(y){window.scrollTo(0,y);},
  keyboard(element){document.keyboardFocus=element;element?.focus?.();}
 };
}
/** Install a page as the globals behaviour modules fall back to; returns a function that removes them again. */
export function installGlobals(page){
 const names=['window','document','getComputedStyle','requestAnimationFrame','setTimeout','clearTimeout'],saved=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const define=(name,value)=>Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
 define('window',page.window);define('document',page.document);define('getComputedStyle',page.window.getComputedStyle);define('requestAnimationFrame',page.window.requestAnimationFrame);
 return ()=>{for(const [name,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}};
}
