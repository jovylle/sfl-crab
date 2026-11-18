/** @type {import('dependency-cruiser').IConfiguration} */
// Layer rules for sfl-crab. See docs/ARCHITECTURE.md ("Dependency rules").
// Run with `npm run check:deps`. A new violation fails `npm run check`.
module.exports = {
  forbidden: [
    {
      name: 'no-src-to-netlify',
      comment: 'The browser app must not import server functions.',
      severity: 'error',
      from: { path: '^src' },
      to: { path: '^netlify' },
    },
    {
      name: 'no-netlify-to-src',
      comment: 'Netlify functions must not import browser code.',
      severity: 'error',
      from: { path: '^netlify' },
      to: { path: '^src' },
    },
    {
      name: 'no-src-to-tests',
      comment: 'Application code must not depend on tests.',
      severity: 'error',
      from: { path: '^src' },
      to: { path: '^tests' },
    },
    {
      name: 'no-src-to-scripts',
      comment: 'Build and data scripts are not part of the app runtime.',
      severity: 'error',
      from: { path: '^src' },
      to: { path: '^scripts' },
    },
    {
      name: 'no-circular',
      comment: 'Circular imports make module load order fragile.',
      severity: 'error',
      // KeyValueList.vue renders itself (recursive component), an allowed self-cycle.
      from: { pathNot: '^src/components/KeyValueList[.]vue$' },
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'jsconfig.json' },
    exclude: { path: '^(dist|public|digging)' },
    reporterOptions: { dot: { collapsePattern: 'node_modules/[^/]+' } },
  },
};
