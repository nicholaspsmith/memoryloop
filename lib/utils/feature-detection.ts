/**
 * Feature Detection Utilities
 *
 * Provides runtime detection for browser features with caching
 * Maps to T078 in Phase 9 (Polish)
 */

// Cache detection results to avoid repeated checks
const featureCache = new Map<string, boolean>()

/**
 * Detects if the browser supports CSS 3D transforms
 *
 * @returns true if 3D transforms are supported, false otherwise
 */
export function supports3DTransforms(): boolean {
  const cacheKey = '3d-transforms'

  if (featureCache.has(cacheKey)) {
    return featureCache.get(cacheKey)!
  }

  // Server-side rendering - assume support
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const testElement = document.createElement('div')
    const transforms = ['transform', 'WebkitTransform', 'MozTransform', 'msTransform', 'OTransform']

    for (const transform of transforms) {
      if (testElement.style[transform as any] !== undefined) {
        testElement.style[transform as any] = 'translate3d(1px, 1px, 1px)'
        const has3DSupport = testElement.style[transform as any] !== ''
        featureCache.set(cacheKey, has3DSupport)
        return has3DSupport
      }
    }

    featureCache.set(cacheKey, false)
    return false
  } catch (error) {
    console.warn('[Feature Detection] Failed to detect 3D transforms:', error)
    featureCache.set(cacheKey, false)
    return false
  }
}

/**
 * Detects if the user prefers reduced motion
 * Note: Not cached - user can change preferences at runtime
 *
 * @returns true if reduced motion is preferred, false otherwise
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    if (!window.matchMedia) {
      return false
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (error) {
    console.warn('[Feature Detection] Failed to detect motion preference:', error)
    return false
  }
}

/**
 * Detects if the browser supports the canvas element
 *
 * @returns true if canvas is supported, false otherwise
 */
export function supportsCanvas(): boolean {
  const cacheKey = 'canvas'

  if (featureCache.has(cacheKey)) {
    return featureCache.get(cacheKey)!
  }

  if (typeof window === 'undefined') {
    return false
  }

  try {
    const canvas = document.createElement('canvas')
    const hasSupport = !!(canvas.getContext && canvas.getContext('2d'))
    featureCache.set(cacheKey, hasSupport)
    return hasSupport
  } catch (error) {
    console.warn('[Feature Detection] Failed to detect canvas support:', error)
    featureCache.set(cacheKey, false)
    return false
  }
}

/**
 * Detects if the browser supports the CSS @supports rule
 *
 * @returns true if @supports is supported, false otherwise
 */
export function supportsCSS(): boolean {
  const cacheKey = 'css-supports'

  if (featureCache.has(cacheKey)) {
    return featureCache.get(cacheKey)!
  }

  if (typeof window === 'undefined') {
    return true
  }

  try {
    const hasSupport = 'CSS' in window && 'supports' in (window.CSS as any)
    featureCache.set(cacheKey, hasSupport)
    return hasSupport
  } catch (error) {
    console.warn('[Feature Detection] Failed to detect CSS.supports:', error)
    featureCache.set(cacheKey, false)
    return false
  }
}

/**
 * Clears the feature detection cache
 * Useful for testing or when features may have changed
 */
export function clearFeatureCache(): void {
  featureCache.clear()
}
