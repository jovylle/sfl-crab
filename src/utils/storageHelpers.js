// src/utils/storageHelpers.js

/**
 * Parses all entries in localStorage into a plain object, JSON-parsing values when possible.
 * @returns {Record<string, any>} Object mapping localStorage keys to their parsed values
 */
export function getLocalStorageObject () {
  const result = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const raw = localStorage.getItem(key);
    try {
      result[key] = JSON.parse(raw);
    } catch {
      result[key] = raw;
    }
  }
  return result;
}

/**
 * Safely retrieves a nested property from a JSON-parsed localStorage entry.
 * @param {string} storageKey - The key in localStorage
 * @param {string|string[]} path - Dot-separated string or array of path segments (e.g. 'state.bumpkin.id')
 * @returns {any} The nested value, or undefined if not found
 */
export function getNestedLocalStorageProperty (storageKey, path) {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return undefined;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const segments = Array.isArray(path) ? path : path.split('.');
  return segments.reduce((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return acc[segment];
    }
    return undefined;
  }, data);
}
