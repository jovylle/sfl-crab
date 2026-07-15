// resolve-alias-loader.mjs — Node ESM loader hook mapping '@/x' -> 'src/x'.
//
// Lets scripts/*.js import src/ modules the same way the app does (vite's
// '@' alias), so treasureSolver.js and friends need zero path changes to run
// under plain `node` instead of the vite bundler.

import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = pathToFileURL(path.join(__dirname, '..', '..', 'src') + '/')

export async function resolve (specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(new URL(specifier.slice(2), srcRoot).href, context)
  }
  return nextResolve(specifier, context)
}
