// A small reader of the site's stylesheets, for the style-rule tests. It is not a full CSS
// parser: it strips comments and strings, then walks the braces so that selectors, at-rules and
// declarations can be judged separately.

export const BREAKPOINTS=Object.freeze([480,768,1024,1280]);
/** One documented exception, for phones narrower than 360 px (buttons stack, the strip folds). */
export const SMALL_PHONE_MAX=359;
/** Tokens only: the main heading grows once more on very wide screens. */
export const WIDE_TOKEN_MIN=1600;

export function stripComments(css){return css.replace(/\/\*[\s\S]*?\*\//g,match=>match.replace(/[^\n]/g,' '));}

/**
 * Walk a stylesheet. Calls `visit({kind, prelude, depth, layers, line, declarations})` for every block:
 * kind 'at' (an at-rule with a block) or 'rule' (a style rule); `declarations` is the block's own
 * declarations (text before any nested block). Also returns the top-level statements without a block.
 */
export function walk(css){
 const text=stripComments(css),blocks=[],statements=[];
 const stack=[];let buffer='',line=1,start=1;
 const lineAt=()=>start;
 for(let index=0;index<text.length;index++){
  const char=text[index];
  if(char==='\n')line++;
  if(char==='{'){
   const prelude=buffer.trim();
   const kind=prelude.startsWith('@')?'at':'rule';
   const block={kind,prelude,depth:stack.length,layers:stack.filter(item=>/^@layer\b/.test(item.prelude)).map(item=>item.prelude.replace(/^@layer\s*/,'')),line:lineAt(),declarations:'',parents:stack.map(item=>item.prelude)};
   blocks.push(block);stack.push(block);buffer='';start=line;
  }else if(char==='}'){
   const open=stack.pop();
   if(!open)throw new Error('Unbalanced } at line '+line);
   open.declarations+=buffer;buffer='';start=line;
  }else if(char===';'){
   if(stack.length)stack.at(-1).declarations+=buffer+';';
   else if(buffer.trim())statements.push({text:buffer.trim(),line:lineAt()});
   buffer='';start=line;
  }else{
   if(!buffer.trim()&&char.trim())start=line;
   buffer+=char;
  }
 }
 if(stack.length)throw new Error('Unbalanced { in stylesheet');
 return {blocks,statements};
}

const declarationsOf=block=>block.declarations.split(';').map(item=>item.trim()).filter(Boolean).map(item=>{
 const at=item.indexOf(':');return at<0?{property:item,value:''}:{property:item.slice(0,at).trim().toLowerCase(),value:item.slice(at+1).trim()};
});
const withoutVars=value=>{
 // Remove var(...) references (with nested fallbacks) so only literal values remain.
 let output='',depth=0;
 for(let index=0;index<value.length;index++){
  if(depth===0&&value.startsWith('var(',index)){depth=1;index+=3;continue;}
  if(depth>0){if(value[index]==='(')depth++;else if(value[index]===')')depth--;continue;}
  output+=value[index];
 }
 return output;
};

/**
 * Every break of the style rules in one stylesheet, as plain sentences.
 *   tokens: true for tokens.css (colours, sizes and timings are written there)
 *   fonts:  true for fonts.css (the only file with @font-face at the top level)
 *   index:  true for index.css (the layer order and the @import list)
 */
export function styleProblems(css,{tokens=false,fonts=false,index=false}={}){
 const problems=[],{blocks,statements}=walk(css);
 const say=(line,words)=>problems.push(`line ${line}: ${words}`);
 if(/!important/i.test(stripComments(css)))say(stripComments(css).split('\n').findIndex(row=>/!important/i.test(row))+1,'!important is not allowed');
 for(const statement of statements){
  if(/^@import\b/.test(statement.text)){if(!index&&!/layer\(/.test(statement.text))say(statement.line,'only index.css imports stylesheets');continue;}
  if(/^@layer\b/.test(statement.text)){if(!index)say(statement.line,'the layer order is declared once, in index.css');continue;}
  if(/^@charset\b/.test(statement.text))continue;
  say(statement.line,`a statement outside a layer: ${statement.text.slice(0,60)}`);
 }
 for(const block of blocks){
  if(block.depth===0){
   if(/^@font-face\b/.test(block.prelude)){if(!fonts)say(block.line,'@font-face belongs in fonts.css');}
   else if(!/^@layer\s+[a-z-]+$/.test(block.prelude))say(block.line,`a rule outside a layer: ${block.prelude.slice(0,60)}`);
  }
  if(block.kind==='at'&&/^@media\b/.test(block.prelude)){
   for(const match of block.prelude.matchAll(/\(\s*(min|max)-width\s*:\s*([\d.]+)px\s*\)/g)){
    const edge=match[1],size=Number(match[2]);
    const fine=edge==='min'?(BREAKPOINTS.includes(size)||(tokens&&size===WIDE_TOKEN_MIN)):size===SMALL_PHONE_MAX;
    if(!fine)say(block.line,`breakpoint (${edge}-width: ${size}px) is not one of ${BREAKPOINTS.join(', ')} (min-width) or ${SMALL_PHONE_MAX} (max-width)`);
   }
   if(/\b(width|height)\s*[<>]=?/.test(block.prelude))say(block.line,'write breakpoints as (min-width: …px)');
  }
  if(block.kind==='rule'&&!block.parents.some(parent=>/^@(keyframes|font-face)\b/.test(parent))){
   const selector=block.prelude.replace(/\[[^\]]*\]/g,'').replace(/:(?:is|where|not|has)\(/g,'(');
   if(/#[a-zA-Z_-]/.test(selector))say(block.line,`an id selector: ${block.prelude.slice(0,60)}`);
  }
  if(tokens)continue;
  for(const {property,value} of declarationsOf(block)){
   const literal=withoutVars(value);
   if(/#[0-9a-fA-F]{3,8}\b/.test(literal)||/\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i.test(literal))say(block.line,`a colour written outside tokens.css: ${property}: ${value.slice(0,60)}`);
   if(property==='font-size'&&/\d/.test(literal))say(block.line,`a type size written outside tokens.css: ${value}`);
   if(property==='font'&&/\d(?:px|rem|em|pt|%)/.test(literal))say(block.line,`a type size written outside tokens.css: font: ${value.slice(0,60)}`);
   if(/^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$/.test(property)&&/\d+(?:\.\d+)?(?:px|rem|em)/.test(literal))say(block.line,`a radius written outside tokens.css: ${value}`);
   if(/^(?:transition|animation)(?:-duration|-delay)?$/.test(property)&&/(?:^|[\s,(])\d*\.?\d+m?s\b/.test(literal)&&!/(?:^|[\s,(])0m?s\b/.test(literal.replace(/\d*\.?\d*[1-9]\d*m?s/g,'x')))say(block.line,`a timing written outside tokens.css: ${property}: ${value.slice(0,60)}`);
  }
 }
 return problems;
}
