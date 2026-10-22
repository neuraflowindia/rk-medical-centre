import test from 'node:test';import assert from 'node:assert/strict';
import {suppressBookingLinks,bookingDestination,syncBookingLink} from '../../src/clinic/booking-links.mjs';
test('OFF document retains exact destinations but removes booking hrefs only',()=>{
 const source='<a class="button" href="/booking?doctor=parul&amp;from=home">Book</a><a href="/contact">Contact</a><a href="/booking-details" hidden inert>Details</a><a href="/bookings">Unrelated</a><a name="anchor">Anchor</a>';
 const result=suppressBookingLinks(source);assert.equal(result,'<a class="button" data-booking-href="/booking?doctor=parul&amp;from=home" hidden inert>Book</a><a href="/contact">Contact</a><a data-booking-href="/booking-details" hidden inert>Details</a><a href="/bookings">Unrelated</a><a name="anchor">Anchor</a>');assert.equal(suppressBookingLinks(result),result);
});
test('single-quoted links and the retained access alias keep their destination',()=>assert.equal(suppressBookingLinks("<a href='/booking-help#entry'>Find booking</a>"),"<a data-booking-href='/booking-help#entry' hidden inert>Find booking</a>"));
test('only exact internal booking families are recognised',()=>{for(const value of [undefined,null,'','/bookings','https://other.test/booking','/contact'])assert.equal(bookingDestination(value),false);for(const value of ['/booking','/booking?doctor=sanjay','/booking/receipt','/booking-details','/booking-help#entry'])assert.equal(bookingDestination(value),true);});
test('a real link-shaped element survives OFF ON OFF without losing a doctor query',()=>{
 const attributes=new Map([['href','/booking?doctor=parul']]);const anchor={getAttribute:k=>attributes.get(k)??null,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k)};
 assert.equal(syncBookingLink(anchor,false),true);assert.equal(attributes.has('href'),false);assert.equal(anchor.hidden,true);assert.equal(anchor.inert,true);
 assert.equal(syncBookingLink(anchor,true),true);assert.equal(attributes.get('href'),'/booking?doctor=parul');assert.equal(anchor.hidden,false);assert.equal(anchor.inert,false);
 syncBookingLink(anchor,false);assert.equal(attributes.get('data-booking-href'),'/booking?doctor=parul');assert.equal(attributes.has('href'),false);
 const contact=new Map([['href','/contact']]);assert.equal(syncBookingLink({...anchor,getAttribute:k=>contact.get(k)??null},false),false);assert.equal(contact.get('href'),'/contact');
});
