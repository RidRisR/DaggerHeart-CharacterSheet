// 设备能力检测和打印方法选择
export interface PrintCapability {
    platform: 'desktop' | 'mobile' | 'tablet'
    browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other'
    os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'other'
    supportsNativePrint: boolean
    recommendedMethod: 'native' | 'client-pdf' | 'hybrid'
    qualityProfile: 'vector' | 'raster-hd' | 'raster-standard'
}

export function detectPrintCapability(): PrintCapability {
    const userAgent = navigator.userAgent.toLowerCase()

    // 平台检测
    const platform = detectPlatform()
    const browser = detectBrowser()
    const os = detectOS()

    // 核心能力检测
    const supportsNativePrint = 'print' in window && !isIOSSafari()
    const isDesktop = platform === 'desktop' && window.innerWidth >= 1024
    const hasHighDPI = window.devicePixelRatio >= 2
    const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

    // 决策逻辑
    let recommendedMethod: PrintCapability['recommendedMethod']
    let qualityProfile: PrintCapability['qualityProfile']

    if (isDesktop && supportsNativePrint && !isIOSSafari() && !isMobileDevice) {
        // 桌面端：保持矢量优势
        recommendedMethod = 'native'
        qualityProfile = 'vector'
    } else if (platform === 'mobile' || isIOSSafari() || isMobileDevice) {
        // 移动端：高清PDF生成
        recommendedMethod = 'client-pdf'
        qualityProfile = hasHighDPI ? 'raster-hd' : 'raster-standard'
    } else {
        // 混合模式：尝试原生，失败时降级
        recommendedMethod = 'hybrid'
        qualityProfile = 'vector'
    }

    return {
        platform,
        browser,
        os,
        supportsNativePrint,
        recommendedMethod,
        qualityProfile
    }
}

function detectPlatform(): PrintCapability['platform'] {
    const userAgent = navigator.userAgent.toLowerCase()

    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        return 'mobile'
    } else if (/ipad/i.test(userAgent)) {
        return 'tablet'
    }
    return 'desktop'
}

function detectBrowser(): PrintCapability['browser'] {
    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome'
    if (userAgent.includes('firefox')) return 'firefox'
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari'
    if (userAgent.includes('edg')) return 'edge'
    return 'other'
}

function detectOS(): PrintCapability['os'] {
    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('windows')) return 'windows'
    if (userAgent.includes('mac')) return 'macos'
    if (userAgent.includes('linux')) return 'linux'
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
    if (userAgent.includes('android')) return 'android'
    return 'other'
}

function isIOSSafari(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}
