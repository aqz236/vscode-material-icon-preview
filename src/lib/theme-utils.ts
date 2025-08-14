/**
 * 基于用户时区判断当前是白天还是黑夜
 * @returns 'light' | 'dark'
 */
export function getThemeByTimeZone(): 'light' | 'dark' {
  const now = new Date()
  const hour = now.getHours()
  
  // 6:00-18:00 为白天，其他时间为黑夜
  return hour >= 6 && hour < 18 ? 'light' : 'dark'
}

/**
 * 从请求头或Cookie中获取主题
 * @param cookieString - document.cookie 或请求头中的 cookie 字符串
 * @returns Theme | null
 */
export function getThemeFromCookie(cookieString: string): 'light' | 'dark' | null {
  if (!cookieString) return null
  
  const cookies = cookieString.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)
  
  const theme = cookies['_theme']
  if (theme && ['light', 'dark'].includes(theme)) {
    return theme as 'light' | 'dark'
  }
  
  return null
}

/**
 * 设置主题Cookie
 * @param theme - 主题值
 * @param options - Cookie选项
 */
export function setThemeCookie(
  theme: 'light' | 'dark',
  options: {
    maxAge?: number
    path?: string
    domain?: string
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  } = {}
) {
  if (typeof document === 'undefined') return
  
  const {
    maxAge = 60 * 60 * 24 * 365, // 1年
    path = '/',
    secure = window.location.protocol === 'https:',
    sameSite = 'lax'
  } = options
  
  let cookieString = `_theme=${theme}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}`
  
  if (secure) {
    cookieString += '; Secure'
  }
  
  if (options.domain) {
    cookieString += `; Domain=${options.domain}`
  }
  
  document.cookie = cookieString
}

/**
 * 获取服务器端的初始主题
 * @param cookieString - Cookie字符串
 * @returns 主题值
 */
export function getServerInitialTheme(
  cookieString?: string
): 'light' | 'dark' {
  const cookieTheme = cookieString ? getThemeFromCookie(cookieString) : null
  
  if (cookieTheme) {
    return cookieTheme
  }
  
  // 如果没有Cookie，则根据时区判断
  return getThemeByTimeZone()
}
