import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createHead } from '@vueuse/head'

import './styles/style.css'

const app = createApp(App)
const head = createHead()

app.use(head)
app.use(router)
app.mount('#app')
