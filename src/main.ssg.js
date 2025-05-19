// src/main.ssg.js
import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import router from './router'
import { createHead } from '@vueuse/head'

export const createApp = ViteSSG(
  App,
  { routes: ['/', '/digging'] },
  ({ app }) => {
    const head = createHead()
    app.use(head)
    app.use(router)
  }
)

// Only run client mount in the browser:
if (!import.meta.env.SSR) {
  createApp().mount('#app')
}
