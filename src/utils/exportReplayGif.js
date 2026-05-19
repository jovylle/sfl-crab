import { toCanvas } from 'html-to-image'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

const FRAME_DELAY_MS = 700
/** Last frame holds longer so the completed grid is readable before the GIF loops. */
const FINAL_FRAME_DELAY_MS = 2500

/**
 * Capture replay grid DOM per step and encode as GIF.
 * @param {object} options
 * @param {HTMLElement} options.element Root element wrapping ReplayGrid
 * @param {number} options.maxStep
 * @param {(step: number) => void | Promise<void>} options.setStep
 * @param {(current: number, total: number) => void} [options.onProgress]
 * @param {number} [options.frameDelayMs]
 * @param {number} [options.finalFrameDelayMs]
 * @returns {Promise<Uint8Array>}
 */
export async function exportReplayGif ({
  element,
  maxStep,
  setStep,
  onProgress,
  frameDelayMs = FRAME_DELAY_MS,
  finalFrameDelayMs = FINAL_FRAME_DELAY_MS,
}) {
  if (!element) throw new Error('Nothing to capture')
  if (maxStep < 0) throw new Error('No replay steps')

  const bg =
    getComputedStyle(element).backgroundColor === 'rgba(0, 0, 0, 0)'
      ? '#ffffff'
      : getComputedStyle(element).backgroundColor

  const imageDatas = []

  for (let s = 0; s <= maxStep; s++) {
    const stepResult = setStep(s)
    if (stepResult != null && typeof stepResult.then === 'function') {
      await stepResult
    }
    await waitForPaint()
    const canvas = await toCanvas(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: bg,
    })
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not read replay frame')
    imageDatas.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    onProgress?.(s, maxStep)
  }

  return encodeGifFrames(imageDatas, frameDelayMs, finalFrameDelayMs)
}

function waitForPaint () {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve)
    })
  })
}

function encodeGifFrames (imageDatas, delayMs, finalDelayMs) {
  const gif = GIFEncoder()
  const last = imageDatas.length - 1

  imageDatas.forEach((frame, i) => {
    const { data, width, height } = frame
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    const delay = i === last ? finalDelayMs : delayMs
    gif.writeFrame(index, width, height, { palette, delay })
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
