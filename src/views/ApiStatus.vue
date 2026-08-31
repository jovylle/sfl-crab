<!-- src/views/ApiStatus.vue -->
<template>
  <div class="w-full max-w-4xl mx-auto space-y-6">
    <div class="card bg-base-100 shadow-md">
      <div class="card-body gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge badge-success badge-sm">Operational</span>
          <span class="text-xs text-base-content/60">SFL Community API · Live farm fetch active</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold">API Status — Live farm loading operational</h1>
        <div class="alert alert-success text-sm py-3">
          <span>✅ <strong>Live digging is back.</strong> Our server API key has been whitelisted — <code class="text-xs bg-base-100/70 px-1 rounded">/:landId/digging</code> loads directly from <code class="text-xs">api.sunflower-land.com</code> again.</span>
        </div>
        <p class="text-sm text-base-content/80">
          Sunflower Land tightened Community API keys to require <strong>VIP Access + Bumpkin Level 50</strong> on the
          <em>key owner's</em> account. That temporarily gated our shared server key (<code class="text-xs">SFL_API_KEY</code> in
          <code class="text-xs">netlify/functions/sfl-api.cjs</code>). The key is now whitelisted, so live fetches work
          for all farms again. If you hit the gate error on self-hosted deploys, see the self-host guide below.
        </p>
        <div class="flex flex-wrap gap-2">
          <router-link to="/digging" class="btn btn-primary btn-sm">Go to Digging</router-link>
          <router-link to="/practice" class="btn btn-outline btn-sm">Practice Mode</router-link>
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg">✅ What works</h2>
          <ul class="list-disc list-inside text-sm space-y-1 text-base-content/80">
            <li><strong>Live auto-load by Land ID</strong> — <code class="text-xs">/:landId/digging</code> pulls today's desert from SFL</li>
            <li><strong>Practice Mode</strong> — full simulator with deterministic boards</li>
            <li><strong>Manual hint entry</strong> — click tiles to cycle sand / crab / treasure hints</li>
            <li><strong>Shared board links</strong> — <code class="text-xs">?board=</code> and <code class="text-xs">?marks=</code> links</li>
            <li><strong>History &amp; solver</strong> — paste any board, solver still proves safe digs</li>
          </ul>
        </div>
      </div>
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg">ℹ️ If you see the VIP gate error</h2>
          <p class="text-sm text-base-content/70">
            <span class="font-mono text-xs bg-base-200 px-1 rounded">VIP access and a Bumpkin of level 50</span> means the
            <em>API key's</em> account lacks VIP/50. On <code class="text-xs">d1g.uk</code> this is resolved.
            On a self-host it means your <code class="text-xs">SFL_API_KEY</code> needs VIP + Level 50.
          </p>
          <p class="text-xs text-base-content/60 mt-2">Both <code class="text-xs">/community/farms/:id</code> and <code class="text-xs">/visit/:id</code> share the same gate — fallback doesn't bypass it.</p>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title">🕐 Timeline</h2>
        <ul class="timeline timeline-vertical text-sm">
          <li>
            <div class="timeline-start timeline-box text-xs">Recently</div>
            <div class="timeline-middle"><span class="badge badge-warning badge-xs">●</span></div>
            <div class="timeline-end timeline-box">SFL updated Community keys to require VIP + Level 50 — shared key started returning <span class="font-mono text-xs">VIP access…</span> for every farm.</div>
            <hr />
          </li>
          <li>
            <div class="timeline-start timeline-box text-xs">Now</div>
            <div class="timeline-middle"><span class="badge badge-success badge-xs">●</span></div>
            <div class="timeline-end timeline-box"><strong>Whitelisted &amp; operational</strong> — live fetch restored on <code>d1g.uk</code>. Solver / manual / practice remain. Self-host still requires VIP/50 on your own key.</div>
            <hr />
          </li>
        </ul>
        <p class="text-xs text-base-content/60 mt-2">Searchable error string to grep: <code class="bg-base-200 px-1 rounded">VIP access and a Bumpkin of level 50</code></p>
      </div>
    </div>

    <div id="self-host" class="card bg-base-100 shadow border border-primary/20 scroll-mt-6">
      <div class="card-body gap-4">
        <h2 class="card-title text-xl">🔑 Self-host with your own API key</h2>
        <p class="text-sm text-base-content/80">
          Power users can run their own copy of <code class="text-xs">d1g.uk</code> with their own key — no code change needed.
          <code class="text-xs">sfl-api.cjs</code> just reads <code class="text-xs">SFL_API_KEY</code> from the environment.
          Your key's account must have <strong>VIP + Level 50</strong> unless whitelisted.
        </p>

        <div class="steps steps-vertical sm:steps-horizontal w-full text-xs">
          <div class="step step-primary">Fork repo</div>
          <div class="step step-primary">Set env var</div>
          <div class="step step-primary">Deploy</div>
          <div class="step">Dig</div>
        </div>

        <div class="space-y-3 text-sm">
          <div>
            <h3 class="font-semibold">1. Fork</h3>
            <p class="text-base-content/70">Fork <a href="https://github.com/jovylle/sfl-crab" target="_blank" rel="noopener" class="link link-primary">jovylle/sfl-crab</a> on GitHub (one click).</p>
          </div>
          <div>
            <h3 class="font-semibold">2. Get your key</h3>
            <p class="text-base-content/70">Sunflower Land → your profile/settings → copy the API key (<code class="text-xs">sfl.…</code>). It must belong to an account with VIP + Level 50.</p>
          </div>
          <div>
            <h3 class="font-semibold">3. Deploy</h3>
            <ul class="list-disc list-inside text-base-content/70 space-y-1">
              <li><strong>Netlify:</strong> New site from Git → pick your fork → Build <code class="text-xs">npm run build</code>, publish <code class="text-xs">dist</code> → Env vars: add <code class="text-xs">SFL_API_KEY=sfl.…</code> (and <code class="text-xs">SFL_API_KEY_DEV</code> if you use testnet). Deploy.</li>
              <li><strong>Vercel / Cloudflare Pages:</strong> same — set <code class="text-xs">SFL_API_KEY</code> in project env vars, deploy.</li>
            </ul>
            <p class="text-xs text-base-content/60 mt-1">Details: <code class="text-xs">API_KEY_SETUP.md</code> in the repo. No client code ever sees the key — it stays server-side in the Netlify function.</p>
          </div>
          <div>
            <h3 class="font-semibold">4. Verify</h3>
            <p class="text-base-content/70">Open <code class="text-xs">https://&lt;your-site&gt;/&lt;yourLandId&gt;/digging</code> — the grid should load. If it still shows the gate error, the key's account isn't VIP/50 or not whitelisted.</p>
          </div>
        </div>

        <p class="text-xs text-base-content/50">Not affiliated with Thought Farm / Sunflower Land. Game assets belong to their owners.</p>
      </div>
    </div>

    <p class="text-center text-xs text-base-content/40">
      Live digging is operational.
      <router-link to="/" class="link link-hover ml-1">← Home</router-link>
    </p>
  </div>
</template>
<script setup>
// no logic — static status page
</script>
