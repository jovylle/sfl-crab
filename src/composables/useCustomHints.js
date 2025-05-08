// src/composables/useCustomHints.js
import { ref } from 'vue';

export function useCustomHints (landId) {
  const STORAGE_KEY = `gridCustomHints_${landId}`;
  const hints = ref({}); // { idx: ['hint-sand', …], … }

  function loadCustomHints () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      hints.value = raw ? JSON.parse(raw) : {};
    } catch {
      hints.value = {};
    }
  }

  function saveCustomHints () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hints.value));
  }
  
  function toggleHintAt (idx, nextClasses) {
    if (nextClasses && nextClasses.length) {
      // set this tile’s hints
      hints.value[idx] = nextClasses;
    } else {
      // remove if no hints
      delete hints.value[idx];
    }
    saveCustomHints();
  }

  function clearCustomHints () {
    // Remove the stored hints and reset the reactive object
    localStorage.removeItem(STORAGE_KEY);
    hints.value = {};
  }
  // initialize once
  loadCustomHints();

  return {
    hints, toggleHintAt, loadCustomHints, saveCustomHints, clearCustomHints
  };
}
