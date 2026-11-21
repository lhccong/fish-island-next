(() => {
  'use strict';

  const root = document.documentElement;
  const pendingAudio = new Map();

  function setTheme({ mode, mobile, tokens }) {
    root.dataset.colorMode = mode;
    root.dataset.mobile = String(mobile);
    for (const [name, value] of Object.entries(tokens)) root.style.setProperty(name, value);
  }

  function setStorage(port, initialSave) {
    let current = initialSave ?? '';
    let ready = false;
    Object.defineProperty(window, 'localStorage', {
      value: {
        get gameState() {
          return current;
        },
        set gameState(value) {
          if (value === current) return;
          current = value;
          if (ready) port.postMessage({ type: 'save', value });
        },
        clear() {
          this.gameState = '{}';
        },
      },
    });
    return () => {
      ready = true;
      if (current !== initialSave) port.postMessage({ type: 'save', value: current });
    };
  }

  function setAudio(port) {
    const buffers = new Map();
    AudioEngine.loadAudioFile = (source) => {
      if (!source) return Promise.resolve(AudioEngine._getMissingAudioBuffer());
      const name = source.slice('audio/'.length);
      if (!buffers.has(name)) {
        const buffer = new Promise((resolve) => {
          pendingAudio.set(name, resolve);
          port.postMessage({ type: 'audio', name });
        }).then(
          (bytes) =>
            new Promise((resolve) => {
              const missing = () => resolve(AudioEngine._getMissingAudioBuffer());
              if (!bytes) {
                missing();
                return;
              }
              const decoding = AudioEngine._audioContext.decodeAudioData(bytes, resolve, missing);
              decoding?.catch(missing);
            }),
        );
        buffers.set(name, buffer);
      }
      return buffers.get(name);
    };
  }

  function setImport() {
    Engine.import64 = (code) => {
      try {
        const text = Base64.decode(code.replace(/[.\s]/g, ''));
        if (text.length > 1_000_000) throw new Error();
        const save = JSON.parse(text, (key, value) => {
          if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error();
          return value;
        });
        if (!save || !Number.isFinite(save.version) || !save.game || !save.stores) {
          throw new Error();
        }
        localStorage.gameState = text;
        window.reloadDarkRoom();
      } catch {
        const feedback = document.createElement('p');
        feedback.className = 'import-error';
        feedback.setAttribute('role', 'alert');
        feedback.textContent = '存档码无效。请检查后重新导入。';
        document.getElementById('game-settings').after(feedback);
      }
    };
  }

  function start({ data, ports, source }) {
    if (source !== parent || data?.type !== 'dark-room-start' || ports.length !== 1) return;
    window.removeEventListener('message', start);
    const [port] = ports;
    window.reloadDarkRoom = () => port.postMessage({ type: 'reload' });
    port.onmessage = ({ data: message }) => {
      if (message.type === 'theme') setTheme(message.theme);
      if (message.type === 'reload') window.location.reload();
      if (message.type === 'audio') {
        pendingAudio.get(message.name)?.(message.bytes);
        pendingAudio.delete(message.name);
      }
    };
    try {
      setTheme(data.theme);
      const storageReady = setStorage(port, data.save);
      setAudio(port);
      setImport();
      window.prepareDarkRoom();
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.querySelector('.eventPanel')) {
          port.postMessage({ type: 'escape' });
        }
      });
      Engine.init();
      storageReady();
      port.postMessage({ type: 'ready' });
    } catch {
      port.postMessage({ type: 'error' });
    }
  }

  window.addEventListener('message', start);
})();
