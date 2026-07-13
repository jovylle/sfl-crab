import { toCanvas } from 'html-to-image'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

const FRAME_DELAY_MS = 700
/** Last frame holds longer so the completed grid is readable before the GIF loops. */
const FINAL_FRAME_DELAY_MS = 2500
/** Short hold for each baked shovel sub-frame so the dig reads as motion. */
const SUBFRAME_DELAY_MS = 110

/**
 * Capture replay grid DOM per step and encode as GIF.
 *
 * When `subFrames > 0` and `setSubFrame` is supplied, each dig step (s ≥ 1)
 * first emits `subFrames + 1` short shovel-pose sub-frames, then the settled
 * step frame — baking the shovel dig animation into the GIF.
 *
 * @param {object} options
 * @param {HTMLElement} options.element Root element wrapping ReplayGrid
 * @param {number} options.maxStep
 * @param {(step: number) => void | Promise<void>} options.setStep
 * @param {(step: number, k: number, K: number) => void | Promise<void>} [options.setSubFrame]
 * @param {number} [options.subFrames] Sub-frame count K (loop k = 0..K).
 * @param {(current: number, total: number) => void} [options.onProgress]
 * @param {number} [options.frameDelayMs]
 * @param {number} [options.finalFrameDelayMs]
 * @param {number} [options.subFrameDelayMs]
 * @returns {Promise<Uint8Array>}
 */
export async function exportReplayGif ({
  element,
  maxStep,
  setStep,
  setSubFrame,
  subFrames = 0,
  onProgress,
  frameDelayMs = FRAME_DELAY_MS,
  finalFrameDelayMs = FINAL_FRAME_DELAY_MS,
  subFrameDelayMs = SUBFRAME_DELAY_MS,
}) {
  if (!element) throw new Error('Nothing to capture')
  if (maxStep < 0) throw new Error('No replay steps')

  const bg =
    getComputedStyle(element).backgroundColor === 'rgba(0, 0, 0, 0)'
      ? '#ffffff'
      : getComputedStyle(element).backgroundColor

  const frames = [] // { imageData, delay }

  async function capture (delay) {
    await waitForPaint()
    const canvas = await toCanvas(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: bg,
    })
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not read replay frame')
    frames.push({
      imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
      delay,
    })
  }

  async function callSubFrame (s, k, K) {
    const r = setSubFrame(s, k, K)
    if (r != null && typeof r.then === 'function') await r
  }

  for (let s = 0; s <= maxStep; s++) {
    const stepResult = setStep(s)
    if (stepResult != null && typeof stepResult.then === 'function') {
      await stepResult
    }

    // Baked shovel dig sub-frames (only steps that actually dig a tile).
    if (s >= 1 && subFrames > 0 && setSubFrame) {
      for (let k = 0; k <= subFrames; k++) {
        await callSubFrame(s, k, subFrames)
        await capture(subFrameDelayMs)
      }
      // Turn the shovel off (k < 0) before the settled frame.
      await callSubFrame(s, -1, subFrames)
    }

    await capture(frameDelayMs)
    onProgress?.(s, maxStep)
  }

  return encodeGifFrames(frames, finalFrameDelayMs)
}

function waitForPaint () {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve)
    })
  })
}

function encodeGifFrames (frames, finalDelayMs) {
  const gif = GIFEncoder()
  const last = frames.length - 1

  frames.forEach(({ imageData, delay }, i) => {
    const { data, width, height } = imageData
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, width, height, {
      palette,
      delay: i === last ? finalDelayMs : delay,
    })
  })

  gif.finish()
  return gif.bytes()
}

/**
 * @param {Uint8Array} bytes
 * @param {string} filename
 */
export function downloadGif (bytes, filename) {
  const blob = new Blob([bytes], { type: 'image/gif' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
