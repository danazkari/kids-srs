// Web Speech API wrapper. Voice list is async on some platforms — we wait for
// the `voiceschanged` event before considering the list ready.

let _ready = null;
const listeners = new Set();
let _cachedVoices = null;

function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function getVoicesSync() {
  if (!isSupported()) return [];
  return window.speechSynthesis.getVoices() || [];
}

function ensureReady() {
  if (!isSupported()) return Promise.resolve([]);
  if (_cachedVoices && _cachedVoices.length) return Promise.resolve(_cachedVoices);
  if (_ready) return _ready;
  _ready = new Promise((resolve) => {
    const initial = getVoicesSync();
    if (initial.length) {
      _cachedVoices = initial;
      resolve(initial);
      return;
    }
    const handler = () => {
      const v = getVoicesSync();
      if (v.length) {
        _cachedVoices = v;
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Hard timeout — some browsers never fire the event.
    setTimeout(() => {
      const v = getVoicesSync();
      _cachedVoices = v;
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(v);
    }, 1500);
  });
  return _ready;
}

export function getVoices() {
  return ensureReady();
}

export function getVoicesForLanguage(lang) {
  return ensureReady().then((voices) => {
    if (!lang) return voices;
    const prefix = lang.toLowerCase().split('-')[0];
    const exact = voices.filter((v) => v.lang === lang);
    if (exact.length) return exact;
    return voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  });
}

export function pickBestVoice(voices, lang, voiceURI) {
  if (!voices || !voices.length) return null;
  if (voiceURI) {
    const exact = voices.find((v) => v.voiceURI === voiceURI);
    if (exact) return exact;
  }
  if (lang) {
    const exact = voices.find((v) => v.lang === lang);
    if (exact) return exact;
    const prefix = lang.toLowerCase().split('-')[0];
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (match) return match;
  }
  return voices[0];
}

export function speak(text, opts = {}) {
  if (!isSupported() || !text) return null;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.lang || 'en-US';
    u.rate = opts.rate ?? 0.9;
    u.pitch = opts.pitch ?? 1.0;
    u.volume = opts.volume ?? 1.0;
    if (opts.voice) u.voice = opts.voice;
    if (opts.onend) u.onend = opts.onend;
    if (opts.onerror) u.onerror = opts.onerror;
    window.speechSynthesis.speak(u);
    return u;
  } catch (e) {
    console.warn('speak() failed', e);
    return null;
  }
}

export function cancelSpeech() {
  if (isSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export function onVoicesChanged(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
