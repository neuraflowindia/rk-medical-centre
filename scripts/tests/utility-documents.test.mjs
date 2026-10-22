import test from 'node:test';
import assert from 'node:assert/strict';
import {utilityDocument} from '../display-build.mjs';
test('raw utility document keeps noindex and working scripts without a public canonical or graph',()=>{
 const html=`<html><head><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://example.invalid/booking"><link href='https://example.invalid/booking' rel='canonical'><meta property="og:url" content="https://example.invalid/booking"><meta content='https://example.invalid/booking' name='twitter:url'><script data-site-graph type="application/ld+json">{"@type":"WebPage"}</script><script type="module" src="/assets/booking.js"></script></head><body><main>Book your visit</main></body></html>`;
 const result=utilityDocument(html);
 assert.doesNotMatch(result,/canonical|og:url|twitter:url|application\/ld\+json/);
 assert.match(result,/noindex, nofollow/);assert.match(result,/type="module" src="\/assets\/booking.js"/);assert.match(result,/<main>Book your visit<\/main>/);
 assert.equal(utilityDocument(result),result);
});
