const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const nodes = new Map();
const $ = id => {
  if (!nodes.has(id)) nodes.set(id, { value: '', checked: true, textContent: '',
    addEventListener(event, fn) { this[event] = fn; }, classList: { remove() {} } });
  return nodes.get(id);
};
const existingAudio = { saved: true };
const state = { audioBlob: existingAudio, recording: false, dictating: false };
let recognizer;
class SR {
  constructor() { recognizer = this; }
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
}
const tr = { value: 'Наш продукт.' };
const box = { $, state, SR, tr, mobileCapture: true, Date, Promise, asrBadge: $('#badge'),
  within: p => p, clearTimeout() {}, setTimeout() {}, syncTranscriptMode() {},
  showAsrFallback(message) { $('#dictationStatus').textContent = message; },
  updateRecognitionText() { tr.value = (state.asrFinal + ' ' + state.asrInterim).trim(); } };
vm.createContext(box);
vm.runInContext(source.slice(source.indexOf('  function startAsr(track)'), source.indexOf('  function addTip(')), box);
(async () => {
  $('#btnDictate').click();
  assert.equal(state.dictating, true);
  assert.equal(state.recording, false);
  assert.equal(state.audioBlob, existingAudio, 'Separate dictation must preserve recorded audio');
  const result = [{ transcript: 'Помогает клиентам.' }]; result.isFinal = true;
  recognizer.onresult({ resultIndex: 0, results: [result] });
  assert.equal(tr.value, 'Наш продукт. Помогает клиентам.');
  assert.equal(state.cues, null, 'Dictation must not invent timestamps in the earlier audio');
  await box.stopDictation();
  assert.equal(state.dictating, false);
  assert.equal(state.finishing, null);
  assert.equal(state.audioBlob, existingAudio);
  assert.equal($('#btnDictate').disabled, false);
  console.log('Separate dictation, transcript updates, saved audio and Stop passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
