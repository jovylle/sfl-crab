// src/utils/chatWidgetLoader.js
// Waits for landData in localStorage or via event, then patches chat config & injects embed.js

export function initChatWidget () {

  function onDataReady ({ desertDigging, username }) {
    // 1) Build the prompt with live data
    const patternText = desertDigging.patterns.join(', ')
    const gridCount = desertDigging.grid.length
    const prompt = `
You are the Sunflower Land Desert Assistant.
Greet the player: "Hi ${username},".
Today's treasure patterns are: ${patternText}.
There are ${gridCount} dug tiles in the grid.
Use these details to explain digging logic and strategy.
Important: you may make assumptions and mistakes.
If you’re unsure, say “I’m not certain” or suggest verifying.
    `.trim()

    // 2) Overwrite the stub’s instructions
    const cfgEl = document.getElementById('chat-widget-config-001')
    const cfg = JSON.parse(cfgEl.textContent)
    cfg.instructions = prompt
    cfgEl.textContent = JSON.stringify(cfg)

    // 3) Finally inject the embedded widget
    const s = document.createElement('script')
    s.src = 'https://chat-widget.uft1.com/embed.js'
    s.defer = true
    document.body.appendChild(s)
  }

  // Listen for your event
  window.addEventListener('landDataReady', e => onDataReady(e.detail));
  // Option B: fallback polling if we don’t emit the event
  (function pollStorage () {
    // derive the same key your app uses
    const landId = window.SFL_LAND_ID || 1;
    const key = `landData_${landId}`;
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        const data = JSON.parse(raw);
        onDataReady(data);
      } catch {
        // if it’s still not valid JSON, try again shortly
        return setTimeout(pollStorage, 100);
      }
    } else {
      setTimeout(pollStorage, 100);
    }
  })();

}
