<!-- src/views/ApiStatus.vue -->
<template>
  <div class="w-full max-w-4xl mx-auto space-y-6">
    <div class="card bg-base-100 shadow-md">
      <div class="card-body gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge badge-warning badge-sm">Incident</span>
          <span class="text-xs text-base-content/60">SFL Community API gate · Live farm fetch paused</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold">API Status — Live farm loading paused</h1>
        <div class="alert alert-warning text-sm py-3">
          <span class="font-mono text-xs bg-base-100/70 px-2 py-1 rounded">A community API key requires VIP access and a Bumpkin of level 50 or higher</span>
        </div>
        <p class="text-sm text-base-content/80">
          Sunflower Land recently tightened Community API keys.
          Every key now needs <strong>VIP Access + Bumpkin Level 50</strong> on the account that owns the key.
          <code class="text-xs bg-base-200 px-1 rounded">d1g.uk</code>'s shared server key (<code class="text-xs">SFL_API_KEY</code> in
          <code class="text-xs">netlify/functions/sfl-api.cjs</code> → <code class="text-xs">x-api-key</code> → <code class="text-xs">api.sunflower-land.com</code>)
          doesn't meet that, so every live farm fetch now returns the error above.
          This is a <strong>policy gate</strong>, not a quota/429 or downtime — and it affects all third-party tools, not just d1g.uk.
        </p>
        <div class="alert alert-info text-sm py-3">
          <span>We're currently asking the Sunflower Land team for help restoring access for community tools. While this isn't resolved yet, you can keep digging with <strong>other digging tools</strong> in the meantime — or <a href="#self-host" class="link link-primary font-medium">self-host your own copy of d1g.uk</a> with your own API key (guide below).</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <router-link to="/practice" class="btn btn-primary btn-sm">Try Practice Mode</router-link>
          <router-link to="/digging" class="btn btn-outline btn-sm">Back to Digging</router-link>
          <a href="#self-host" class="btn btn-ghost btn-sm">Self-host with your own key ↓</a>
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg">✅ What still works</h2>
          <ul class="list-disc list-inside text-sm space-y-1 text-base-content/80">
            <li><strong>Practice Mode</strong> — full simulator with deterministic boards</li>
            <li><strong>Manual hint entry</strong> — click tiles to cycle sand / crab / treasure hints</li>
            <li><strong>Shared board links</strong> — <code class="text-xs">?board=</code> and <code class="text-xs">?marks=</code> links are self-contained</li>
            <li><strong>History &amp; solver</strong> — paste any board, solver still proves safe digs</li>
            <li><strong>Dig-day Hub</strong> — practice &amp; sharing flows unaffected</li>
          </ul>
        </div>
      </div>
      <div class="card bg-base-100 shadow border border-warning/20">
        <div class="card-body">
          <h2 class="card-title text-lg">🚫 What doesn't</h2>
          <ul class="list-disc list-inside text-sm space-y-1 text-base-content/80">
            <li><strong>Live auto-load by Land ID</strong> — <code class="text-xs">/:landId/digging</code> can't pull today's desert from SFL</li>
            <li><strong>Refresh from server</strong> — the refresh button hits the same gate</li>
            <li>Both <code class="text-xs">/community/farms/:id</code> and <code class="text-xs">/visit/:id</code> are gated — fallback doesn't help</li>
          </ul>
          <p class="text-xs text-base-content/60 mt-2">Practice patterns + guest digging never hit the SFL API, so they're untouched.</p>
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
            <div class="timeline-end timeline-box">SFL updated Community keys to require VIP + Level 50 — shared key starts returning <span class="font-mono text-xs">VIP access…</span> for every farm.</div>
            <hr />
          </li>
          <li>
            <div class="timeline-start timeline-box text-xs">Now</div>
            <div class="timeline-middle"><span class="badge badge-info badge-xs">●</span></div>
            <div class="timeline-end timeline-box"><code>d1g.uk</code> is reaching out to the SFL team for help. Live fetch stays paused; solver / manual / practice remain. Self-host guide below for VIP/50 players.</div>
            <hr />
          </li>
          <li>
            <div class="timeline-start timeline-box text-xs">Next</div>
            <div class="timeline-middle"><span class="badge badge-ghost badge-xs">○</span></div>
            <div class="timeline-end timeline-box text-base-content/60">If SFL ships a community tier or restores access, we'll update this page and re-enable live loading.</div>
          </li>
        </ul>
        <p class="text-xs text-base-content/60 mt-2">Searchable error string to grep: <code class="bg-base-200 px-1 rounded">VIP access and a Bumpkin of level 50</code></p>
      </div>
    </div>

    <div id="self-host" class="card bg-base-100 shadow border border-primary/20 scroll-mt-6">
      <div class="card-body gap-4">
        <h2 class="card-title text-xl">🔑 Self-host with your own API key</h2>
        <p class="text-sm text-base-content/80">
          If <em>you</em> have <strong>VIP + Level 50</strong>, you can run your own copy of <code class="text-xs">d1g.uk</code> with your own key — no code change needed.
          <code class="text-xs">sfl-api.cjs</code> just reads <code class="text-xs">SFL_API_KEY</code> from the environment.
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
            <p class="text-base-content/70">Open <code class="text-xs">https://&lt;your-site&gt;/&lt;yourLandId&gt;/digging</code> — the grid should load. If it still shows the gate error, the key's account isn't VIP/50.</p>
          </div>
        </div>

        <div class="alert alert-info text-xs py-2">
          <span>Don't have VIP/50? Practice Mode + manual board entry still give you the full solver — no API needed. Share boards via <code>?board=</code> links.</span>
        </div>

        <p class="text-xs text-base-content/50">Not affiliated with Thought Farm / Sunflower Land. Game assets belong to their owners.</p>
      </div>
    </div>

    <p class="text-center text-xs text-base-content/40">
      Keep this page bookmarked — we'll update it if SFL ships a community tier.
      <router-link to="/" class="link link-hover ml-1">← Home</router-link>
    </p>
  </div>
</template>

<script setup>
// no logic — static status page
</script>
