const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../engine.js');
for (const seconds of [1, 179, 180]) {
  const t = E.evaluateTiming(seconds, 180);
  assert.equal(t.score, 100); assert.equal(t.inTarget, true);
}
assert.equal(E.evaluateTiming(181,180).inTarget, false);
assert.equal(E.evaluateTiming(198,180).score, 80);
assert.equal(E.evaluateTiming(270,180).score, 0);
assert.equal(E.evaluateTiming(400,180).penalty, 10);
for (const [duration,limit] of [[0,180],[NaN,180],[100,0]]) {
  assert.equal(E.evaluateTiming(duration,limit).score, null);
}
const text = 'Мы помогаем клиентам. Наша команда проверила решение на пилоте и готовит запуск продукта.';
const base = E.analyze({text,durationSec:180,meta:{targetDurationSec:180}});
const over = E.analyze({text,durationSec:270,meta:{targetDurationSec:180}});
assert.equal(base.total.score-over.total.score,10);
assert.equal(over.meta.inTarget,false);
assert.match(E.buildMarkdown(over), /Соблюдение регламента/);
assert.match(E.buildStandaloneHtml(over), /Соблюдение регламента/);
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
assert.ok(!html.includes('id="audience"'));
const select=html.match(/<select id="industry">([\s\S]*?)<\/select>/)[1];
const industries=[...select.matchAll(/<option>(.*?)<\/option>/g)].map(x=>x[1]);
const sets=[];
for(const industry of industries) {
  if(industry==='Другое') continue;
  const r=E.analyze({text,meta:{industry}});
  assert.notEqual(r.text.industryProfile.key,'general',industry);
  assert.ok(r.questions.some(q=>q.criterion),industry);
  assert.ok(r.questions.filter(q=>q.criterion).every(q=>q.industry===r.text.industryProfile.key));
  sets.push(r.questions.map(q=>q.q).join('|'));
}
assert.equal(new Set(sets).size,sets.length);
console.log('Timing boundaries, score impact, exports, audience removal and '+sets.length+' industry question sets: passed.');
