// src/utils/chatWidgetLoader.js
// Waits for landData in localStorage or via event, then patches chat config & injects embed.js

export function initChatWidget () {
  function onDataReady (landData) {
    const { desertDigging } = landData;

    // 1) Expose for the chatbot
    window.desertDigging = {
      grid: desertDigging.grid,
      todayPattern: desertDigging.todayPattern,
    };

    // 2) (Optional) We leave the instructions stub as-is

    // 3) Inject the chat widget script
    const script = document.createElement('script');
    script.src = 'https://chat-widget.uft1.com/embed.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  // Option A: listen for a custom event when landData is saved
  window.addEventListener('landDataReady', e => {
    onDataReady(e.detail);
  });

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
