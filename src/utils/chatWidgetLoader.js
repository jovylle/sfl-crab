// src/utils/chatWidgetLoader.js
// Waits for landData in localStorage or via event, then patches chat config & injects embed.js

export function initChatWidget () {
  let hasInitialized = false
  const EMBED_SRC = 'https://chat-widget.uft1.com/embed.js'
  const CONFIG_IDS = ['chat-widget-config', 'chat-widget-config-001']

  function findConfigElement () {
    for (const id of CONFIG_IDS) {
      const el = document.getElementById(id)
      if (el) return el
    }
    return null
  }

  function onDataReady ({ desertDigging, username }) {
    if (hasInitialized) return

    const patterns = Array.isArray(desertDigging?.patterns) ? desertDigging.patterns : []
    const grid = Array.isArray(desertDigging?.grid) ? desertDigging.grid : []
    const safeUsername = typeof username === 'string' && username.trim() ? username.trim() : 'player'

    // 1) Build the prompt with live data
    const patternText = patterns.length ? patterns.join(', ') : 'none available'
    const gridCount = grid.length
    const prompt = `
You are the Sunflower Land Desert Assistant.
Greet the player: "Hi ${safeUsername},".
Today's treasure patterns are: ${patternText}.
There are ${gridCount} dug tiles in the grid.
Use these details to explain digging logic and strategy.
Important: you may make assumptions and mistakes.
If you’re unsure, say “I’m not certain” or suggest verifying. Tell the player that you only know the "username", "Dig Count" and "today's patterns". And Reply as short as possible.
    `.trim()

    // 2) Overwrite the stub’s instructions
    const cfgEl = findConfigElement()
    if (!cfgEl) {
      console.warn('[chatWidgetLoader] Missing chat config element.')
      return
    }

    let cfg
    try {
      cfg = JSON.parse(cfgEl.textContent || '{}')
    } catch {
      console.warn('[chatWidgetLoader] Invalid JSON in chat config element.')
      return
    }

    cfg.chatbot = cfg.chatbot || {}
    cfg.chatbot.instructions = prompt
    cfg.chatbot.position = 'bottom-left'
    cfgEl.textContent = JSON.stringify(cfg)

    // 3) Finally inject the embedded widget
    if (document.querySelector(`script[src="${EMBED_SRC}"]`)) {
      hasInitialized = true
      return
    }

    const s = document.createElement('script')
    s.src = EMBED_SRC
    s.defer = true
    s.dataset.chatWidgetEmbed = 'true'
    document.body.appendChild(s)
    hasInitialized = true
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
