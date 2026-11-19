const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../engine.js');
const app = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
assert.equal(E.findCloseRepeats('Продукт помогает клиенту. Продукт ускоряет работу.').total, 1);
assert.equal(E.findCloseRepeats('Мы и вы и мы и вы.').total, 0);
const middle = 'клиент рынок спрос успех доход сбыт канал охват';
assert.equal(E.findCloseRepeats('продукт ' + middle + ' продукт').total, 1);
assert.equal(E.findCloseRepeats('продукт ' + middle + ' сервис продукт').total, 0);
const text = app.match(/const SAMPLE_PITCH = `([\s\S]*?)`;/)[1];
const clean = E.analyze({ text });
const axis = r => r.scores.find(a => a.key === 'cleanliness');
assert.equal(E.WEIGHTS.cleanliness, .12);
for (const extra of ['ну типа значит '.repeat(15), 'продукт продукт '.repeat(20)]) {
  const noisy = E.analyze({ text: text + ' ' + extra });
  assert.ok(axis(noisy).score < axis(clean).score);
  assert.ok(noisy.total.score < clean.total.score, 'Disfluencies must lower the overall score');
  assert.match(E.buildMarkdown(noisy), /Слова-паразиты и близкие повторы/);
  assert.match(E.buildStandaloneHtml(noisy), /Пример:/);
}
const empty = E.analyze({ text: '' });
assert.equal(axis(empty).available, false, 'Missing transcript must not get a cleanliness score');
console.log('10-word boundaries, stop words, overall score impact and exports passed.');
