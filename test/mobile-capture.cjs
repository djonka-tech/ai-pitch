const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const nodes = new Map();
const $ = id => {
  if (!nodes.has(id)) nodes.set(id, { value: '', checked: false, textContent: '',
    classList: { add() {}, remove() {}, contains() { return true; } } });
  return nodes.get(id);
};
let recorder, timer, previewed = false, released = false;
class Recorder {
  static isTypeSupported() { return true; }
  constructor(stream, options) { recorder = this; this.mimeType = options.mimeType; this.state = 'inactive'; }
  start(...args) { this.startArgs = args; this.state = 'recording'; }
  stop() { this.state = 'inactive'; } // Final data may arrive much later.
}
const track = { addEventListener() {} };
const state = {};
const box = { $, state, window: {}, navigator: { mediaDevices: { getUserMedia: async () => ({ getAudioTracks: () => [track] }) } },
  MediaRecorder: Recorder, appleMobileCapture: true, mobileCapture: true, SR: null,
  resetAudio() {}, releaseCapture() { released = true; }, previewAudio() { previewed = true; },
  Blob, Date, Promise, Float32Array, setTimeout(fn) { timer = fn; }, clearTimeout() {},
  setInterval() {}, clearInterval() {}, updateTrCount() {}, listMics() {}, startAsr() {},
  asrFallback: { disabled: false, classList: { contains() { return true; } } }, tr: { value: '' },
  fmtTime() {}, liveUpdate() {}, addTip() {}, showAsrFallback() {} };
vm.createContext(box);
vm.runInContext(source.slice(source.indexOf('  function pickMime()'), source.indexOf('  function fmtTime(')), box);
vm.runInContext(source.slice(source.indexOf('  async function startRecording()'), source.indexOf("  $('#btnRec').addEventListener('click'")), box);
(async () => {
  await box.startRecording();
  assert.equal(recorder.mimeType, 'audio/mp4;codecs=mp4a.40.2');
  assert.equal(recorder.startArgs.length, 0, 'iPhone records without periodic fragments');
  const finished = box.stopRecording();
  timer();
  assert.equal(previewed, false, 'Timeout must not expose incomplete MP4');
  assert.equal(released, false, 'Keep capture alive until recorder flushes');
  recorder.ondataavailable({ data: new Blob(['complete MP4 including final data'], { type: recorder.mimeType }) });
  await recorder.onstop();
  await finished;
  assert.equal(await state.audioBlob.text(), 'complete MP4 including final data');
  assert.equal(previewed, true);
  assert.equal(released, true);
  assert.equal(state.finishing, null);
  console.log('iPhone format, delayed final data, playback and capture cleanup passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
