// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createHead } from '@vueuse/head'
import './styles/style.css'
import { initChatWidget } from './utils/chatWidgetLoader';

const app = createApp(App)
const head = createHead()

app.use(head)
app.use(router)
app.mount('#app')

initChatWidget();

  ; (async function checkForUpdates () {
    const current = __APP_VERSION__    // the SHA baked into this bundle
    try {
      // fetch index.html bypassing cache
      const res = await fetch('/', { cache: 'no-cache' })
      const html = await res.text()
      // extract the SHA that index.html was built with
      const m = html.match(/__APP_VERSION__ = "(.+?)"/)
      const remote = m ? m[1] : null

      // only if a new build is detected…
      if (remote && remote !== current) {
        // clear all CacheStorage entries
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(key => caches.delete(key)))
        }
        // force a full reload from network
        window.location.reload(true)
      }
    } catch (e) {
      console.warn('Version check failed:', e)
    }
  })()
