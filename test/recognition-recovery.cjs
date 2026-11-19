const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
function session() {
  let queued, starts = 0, message;
  const state = { recording: true, asrFinal: '', asrInterim: '' };
  const nodes = new Map();
  const $ = id => { if (!nodes.has(id)) nodes.set(id, { checked: true }); return nodes.get(id); };
  class SR { start() { starts++; } }
  const box = { SR, state, $, mobileCapture: true, Date, clearTimeout() { queued = null; },
    setTimeout(fn) { queued = fn; return 1; }, asrBadge: $('#badge'),
    showAsrFallback(text) { message = text; }, updateRecognitionText() {}, round2: x => x };
  vm.createContext(box);
  vm.runInContext(source.slice(source.indexOf('  function startAsr(track)'), source.indexOf('  const round2 =')), box);
  box.startAsr({});
  return { state, get starts() { return starts; }, get message() { return message; },
    end() { queued = null; state.recognition.onend(); },
    retry() { assert.ok(queued); const fn = queued; queued = null; fn(); } };
}
for (const error of ['aborted', 'network']) {
  const s = session();
  for (let i = 0; i < 2; i++) { s.state.recognition.onerror({ error }); s.end(); s.retry(); }
  assert.equal(s.starts, 3);
  assert.equal(s.message, undefined);
  s.state.recognition.onerror({ error });
  assert.ok(s.message.includes('Код: ' + error));
  assert.equal(s.state.recording, true);
}
const denied = session();
denied.state.recognition.onerror({ error: 'not-allowed' });
assert.ok(denied.message.includes('not-allowed'), 'Permission denial is reported without automatic retries');
const stopped = session();
stopped.state.recognition.onerror({ error: 'aborted' }); stopped.end();
stopped.state.recording = false; stopped.retry();
assert.equal(stopped.starts, 1, 'Stop cancels scheduled recognition restart');
console.log('Transient recovery, bounded retries, error codes and Stop passed.');
