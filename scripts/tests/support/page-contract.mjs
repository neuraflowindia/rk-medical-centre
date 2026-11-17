// Checks every page template must pass, in one place, so that each page's own test can call them.
//   import {checkPage,renderedPage} from './support/page-contract.mjs';
//   test('Treatments keeps the page contract',()=>{for(const mode of ['on','off'])checkPage('/treatment',mode);});
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {renderApp,pageContext,applyBookingMode} from '../../../src/site/runtime/render.mjs';
import {knownPaths,pageFor} from '../../../src/site/runtime/registry.mjs';
import {bookingDestination} from '../../../src/clinic/booking-links.mjs';
import {publicImagePath} from '../../public-asset-boundary.mjs';
import {iconNames} from '../../../src/site/icons/icons.mjs';

const publicFolder=fileURLToPath(new URL('../../../public',import.meta.url));
/** A fixed moment for tests: Monday 16 November 2026, 11:00 in India (the clinic is open). */
export const TEST_NOW=new Date('2026-11-16T05:30:00Z');

export const count=(html,pattern)=>(html.match(pattern)||[]).length;
/** The inside of `<main>` for one page (what the page's own template printed). */
export function renderedPage(path,mode='on',now=TEST_NOW){
 return pageFor(path).render(pageContext({path,mode,now}));
}
/** The whole app for one page in its booking state, as a visitor's document carries it. */
export function renderedApp(path,mode='on',now=TEST_NOW){
 return applyBookingMode(renderApp(pageContext({path,mode,now})),mode);
}
/** Every value of one attribute in a piece of markup. */
export function attributeValues(html,name){
 return [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`,'g'))].map(match=>match[1].replaceAll('&amp;','&'));
}

/** The contract of one page's own markup (contracts 2.8, 2.9, 2.11 and the data rules). */
export function checkPageMarkup(html,{path}){
 assert.equal(count(html,/<h1\b/g),1,`${path}: a page prints exactly one <h1>`);
 assert.equal(count(html,/<main\b/g),0,`${path}: a page prints no <main> of its own`);
 assert.doesNotMatch(html,/STAND-IN/,`${path}: the stand-in marker must never reach a page`);
 assert.doesNotMatch(html,/\bundefined\b|\[object Object\]|\bNaN\b/,`${path}: a value is missing from the page`);
 assert.doesNotMatch(html,/<(?:title|meta|link)\b|application\/ld\+json/i,`${path}: templates never print metadata`);
 assert.doesNotMatch(html,/\sstyle="(?!--[a-z-]+:[^";]*(?:;--[a-z-]+:[^";]*)*;?")/,`${path}: inline styles may only set custom properties`);
 assert.doesNotMatch(html,/<(?:input|select|textarea)\b(?![^>]*\b(?:name|type="(?:search|radio|checkbox)"))/,`${path}: a form control needs a name`);
 for(const href of attributeValues(html,'href')){
  if(/^(?:tel:|mailto:|https:\/\/)/.test(href))continue;
  if(href.startsWith('#')){assert.ok(href.length>1,`${path}: an empty #place link`);continue;}
  const address=href.split(/[?#]/)[0];
  // a framed certificate leads to its own picture when scripts are off
  if(publicImagePath.test(address)){assert.ok(existsSync(publicFolder+address),`${path}: the picture ${href} does not exist in public/`);continue;}
  assert.ok(knownPaths.includes(address)||bookingDestination(address),`${path}: "${href}" is not an address of this site`);
 }
 for(const use of attributeValues(html,'href').filter(href=>href.startsWith('#i-')))assert.ok(iconNames.includes(use.slice(3)),`${path}: unknown icon ${use}`);
 const pictures=[...attributeValues(html,'src'),...attributeValues(html,'srcset').flatMap(set=>set.split(',').map(item=>item.trim().split(/\s+/)[0]))];
 for(const src of pictures){
  assert.match(src,publicImagePath,`${path}: picture ${src} is outside the image folders or breaks the naming rule`);
  assert.ok(existsSync(publicFolder+src),`${path}: picture ${src} does not exist in public/`);
 }
 for(const tag of html.match(/<img\b[^>]*>/g)||[]){
  assert.match(tag,/\salt="[^"]*"/,`${path}: a picture without alt text: ${tag.slice(0,80)}`);
  assert.match(tag,/\swidth="\d+"/,`${path}: a picture without its width: ${tag.slice(0,80)}`);
  assert.match(tag,/\sheight="\d+"/,`${path}: a picture without its height: ${tag.slice(0,80)}`);
 }
}

/** The contract of the whole app around a page, in one booking state (contracts 2.3, 2.4, 2.8). */
export function checkApp(html,{path,mode}){
 assert.equal(count(html,/<h1\b/g),1,`${path} ${mode}: one <h1>`);
 assert.equal(count(html,/<main\b/g),1,`${path} ${mode}: one <main>`);
 assert.match(html,/<main id="main" tabindex="-1"/);
 assert.equal(count(html,/<svg class="sprite"/g),1,`${path} ${mode}: the icon sprite is printed once`);
 const slim=pageFor(path).chrome==='slim';
 const entries=html.match(/<a\b[^>]*data-booking-entry="[^"]*"[^>]*>/g)||[];
 if(!slim)assert.ok(entries.some(tag=>/data-header-appointment/.test(tag)),`${path} ${mode}: the header keeps its main booking control`);
 for(const tag of entries){
  assert.doesNotMatch(tag,/data-booking-only|\shidden\b|\sinert\b/,`${path} ${mode}: a main booking control is never hidden`);
  assert.match(tag,mode==='on'?/href="\/booking"/:/href="\/contact"/,`${path} ${mode}: a main booking control leads to the right place`);
 }
 if(mode==='off'){
  assert.doesNotMatch(html,/\shref="\/booking/,`${path} off: no booking address while booking is OFF`);
  for(const tag of html.match(/<[a-z0-9]+\b[^>]*\sdata-booking-only\b[^>]*>/g)||[])assert.match(tag,/\shidden\b[^>]*\sinert\b|\sinert\b[^>]*\shidden\b/,`${path} off: ${tag.slice(0,90)} must be hidden and inert`);
  for(const tag of html.match(/<[a-z0-9]+\b[^>]*\sdata-booking-off-only\b[^>]*>/g)||[])assert.doesNotMatch(tag,/\shidden\b/,`${path} off: an OFF-only part is shown`);
 }else{
  assert.doesNotMatch(html,/data-booking-href=/,`${path} on: booking links keep their address`);
  for(const tag of html.match(/<[a-z0-9]+\b[^>]*\sdata-booking-only\b[^>]*>/g)||[])assert.doesNotMatch(tag,/\shidden\b/,`${path} on: a booking-only part is shown`);
  for(const tag of html.match(/<[a-z0-9]+\b[^>]*\sdata-booking-off-only\b[^>]*>/g)||[])assert.match(tag,/\shidden\b/,`${path} on: an OFF-only part is hidden`);
 }
 for(const tag of html.match(/<[a-z0-9]+\b[^>]*\sdata-booking-on="[^"]*"[^>]*>[^<]*/g)||[]){
  const words=mode==='on'?/data-booking-on="([^"]*)"/.exec(tag)[1]:/data-booking-off="([^"]*)"/.exec(tag)?.[1];
  assert.ok(tag.endsWith('>'+words),`${path} ${mode}: a state-aware label must start in its own state: ${tag.slice(0,120)}`);
 }
}

/** Both checks for one page in one state. Returns the page's own markup for further tests. */
export function checkPage(path,mode='on'){
 const page=renderedPage(path,mode);
 checkPageMarkup(page,{path});
 checkApp(renderedApp(path,mode),{path,mode});
 return page;
}
