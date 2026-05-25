export const A4_VIEWPORT_WIDTH = Math.round(210 * (96 / 25.4))

export function getViewportMetaContent(isMobile: boolean): string {
  if (isMobile) {
    return `width=${A4_VIEWPORT_WIDTH}, maximum-scale=5, user-scalable=yes`
  }

  return "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
}

export function isMobileViewportDevice(win: Window): boolean {
  const shortestScreenSide = Math.min(win.screen.width, win.screen.height)
  return shortestScreenSide <= 768 || win.navigator.maxTouchPoints > 0
}
