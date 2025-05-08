// File: src/composables/softReload.js
// A lightweight event bus for triggering and subscribing to soft reloads of landData

const listeners = new Map(); // Map<landID|string, Set<Function>>

/**
 * Subscribe to soft-reload events.
 * @param {(landID: string) => void} cb - callback invoked with the landID that was reloaded
 * @returns {() => void} unsubscribe function
 */
export function subscribeSoftReload (cb) {
  const key = '*';
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(cb);

  // return unsubscriber
  return () => {
    listeners.get(key).delete(cb);
    if (listeners.get(key).size === 0) listeners.delete(key);
  };
}

/**
 * Trigger a soft-reload for a specific landID.
 * @param {string} landID
 */
export function triggerSoftReload (landID) {
  // notify wildcard listeners
  const wildcard = listeners.get('*');
  console.log("wildcard is:", wildcard)
  if (wildcard) {
    wildcard.forEach(fn => fn(landID));
  }
}
