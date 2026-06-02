// On-screen A-Z keyboard. Renders either QWERTY or ABC layout.
// Exposes a hidden focusable input so we can "consume" a real keypress,
// e.g. physical Bluetooth keyboard. Touches/taps are routed via onKey().

import { useEffect, useMemo, useRef } from 'preact/hooks';

const QWERTY_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m']
];

const ABC_ROWS = [
  ['a','b','c','d','e','f','g','h','i','j'],
  ['k','l','m','n','o','p','q','r','s','t'],
  ['u','v','w','x','y','z']
];

export function OnScreenKeyboard({ layout = 'qwerty', onKey, hiddenInputRef, disabled = false }) {
  const rows = useMemo(() => (layout === 'abc' ? ABC_ROWS : QWERTY_ROWS), [layout]);
  const pressedRef = useRef(null);

  // Press visual feedback (briefly).
  function pressVisual(key) {
    pressedRef.current = key;
    setTimeout(() => {
      if (pressedRef.current === key) pressedRef.current = null;
    }, 80);
  }

  function tapKey(key) {
    if (disabled) return;
    pressVisual(key);
    onKey && onKey(key);
  }

  return (
    <div class="osk-wrap" role="group" aria-label="on-screen keyboard">
      <div class="osk">
        {rows.map((row, i) => (
          <div key={i} class="osk-row">
            {i === rows.length - 1 && layout === 'qwerty' ? (
              <>
                <Key label="⌫" cls="osk-key--back" onClick={() => tapKey('Backspace')} disabled={disabled} title="Backspace" />
                {row.map((k) => <Key key={k} label={k} onClick={() => tapKey(k)} disabled={disabled} pressed={pressedRef.current === k} />)}
                <Key label="↵" cls="osk-key--enter" onClick={() => tapKey('Enter')} disabled={disabled} title="Submit" />
              </>
            ) : i === rows.length - 1 && layout === 'abc' ? (
              <>
                <Key label="⌫" cls="osk-key--back" onClick={() => tapKey('Backspace')} disabled={disabled} title="Backspace" />
                {row.map((k) => <Key key={k} label={k} onClick={() => tapKey(k)} disabled={disabled} pressed={pressedRef.current === k} />)}
                <Key label="↵" cls="osk-key--enter" onClick={() => tapKey('Enter')} disabled={disabled} title="Submit" />
              </>
            ) : (
              row.map((k) => <Key key={k} label={k} onClick={() => tapKey(k)} disabled={disabled} pressed={pressedRef.current === k} />)
            )}
          </div>
        ))}
      </div>
      {/* Hidden input that captures physical keyboard events. */}
      <input
        ref={hiddenInputRef}
        class="sr-only"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        inputMode="none"
        aria-hidden="true"
        tabIndex={-1}
        onBeforeInput={(e) => {
          // Browsers that fire beforeinput (e.g. Chrome on Android) — cancel the insertion.
          e.preventDefault();
        }}
        onKeyDown={(e) => {
          // Suppress native keys (don't insert into the field).
          e.preventDefault();
          if (e.key === 'Backspace') { tapKey('Backspace'); return; }
          if (e.key === 'Enter') { tapKey('Enter'); return; }
          if (/^[a-zA-Z]$/.test(e.key)) { tapKey(e.key.toLowerCase()); }
        }}
      />
    </div>
  );
}

function Key({ label, cls = '', onClick, disabled, pressed, title }) {
  return (
    <button
      type="button"
      class={`osk-key ${cls} ${pressed ? 'is-pressed' : ''}`}
      onClick={(e) => { e.preventDefault(); onClick && onClick(); }}
      disabled={disabled}
      title={title}
      aria-label={title || label}
    >
      {label}
    </button>
  );
}
