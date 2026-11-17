// Browser storage that can never stop the site.
//
// Some browsers refuse site storage altogether (Chrome with "block all cookies", several in-app
// browsers, some private windows): merely reading `window.localStorage` throws there, and so can
// every read and write after it. Everything in the site that keeps a visitor's preference goes
// through `safeStorage`, which never throws. What the browser will not keep is kept in memory for
// as long as the page stays open, so a choice still holds while the visitor moves between pages;
// it is simply not remembered on the next visit.

/**
 * `open` is a function that returns the browser's storage (for example
 * `() => window.localStorage`). It is called once, inside a guard.
 * Returns {getItem, setItem, removeItem, persistent}:
 *   getItem(key)         the kept value, or null
 *   setItem(key, value)  true when the browser kept it, false when it is held in memory only
 *   removeItem(key)      forgets the value everywhere
 *   persistent()         false once the browser has refused a read or a write
 */
export function safeStorage(open){
 const memory=new Map();
 let real=null,refused=false;
 try{real=typeof open==='function'?open()||null:null;}catch{real=null;}
 if(!real)refused=true;
 return Object.freeze({
  getItem(key){
   const name=String(key);
   if(memory.has(name))return memory.get(name);
   if(!real)return null;
   try{const value=real.getItem(name);return value===null||value===undefined?null:String(value);}catch{refused=true;return null;}
  },
  setItem(key,value){
   const name=String(key),text=String(value);
   if(real){
    try{real.setItem(name,text);memory.delete(name);return true;}catch{refused=true;}
   }
   memory.set(name,text);
   return false;
  },
  removeItem(key){
   const name=String(key);
   memory.delete(name);
   if(!real)return;
   try{real.removeItem(name);}catch{refused=true;}
  },
  persistent:()=>!refused
 });
}
