import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as behaviour from '../../src/site/pages/profile/profile.behaviour.mjs';
import {pageFor} from '../../src/site/runtime/registry.mjs';
import {doctors} from '../../src/clinic/model.mjs';
import {doctorOrder} from '../../src/clinic/care-catalogue.mjs';

test('a profile adds no behaviour of its own: the shared parts bind themselves',()=>{
 assert.deepEqual(Object.keys(behaviour),['bindProfile']);
 for(const id of doctorOrder)assert.equal(pageFor(doctors[id].path).bind,behaviour.bindProfile);
 const scope=new AbortController();
 assert.equal(behaviour.bindProfile(null,{}),undefined);
 assert.equal(behaviour.bindProfile({querySelectorAll:()=>{throw new Error('the page is not read');}},{signal:scope.signal}),undefined);
 assert.equal(behaviour.bindProfile(),undefined);
});

test('the page keeps no clock: nothing in its behaviour starts a timer or reads the time',()=>{
 const source=readFileSync(new URL('../../src/site/pages/profile/profile.behaviour.mjs',import.meta.url),'utf8').replace(/\/\/[^\n]*/g,'');
 assert.doesNotMatch(source,/setInterval|setTimeout|new Date|Date\.now|import\s/);
});
