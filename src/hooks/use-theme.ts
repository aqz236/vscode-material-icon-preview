import { useEffect, useState } from 'react'
import { getThemeFromCookie, setThemeCookie } from '@/lib/theme-utils'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // 首先检查DOM上已经设置的主题类名（由内联脚本设置）
      const htmlElement = document.documentElement
      if (htmlElement.classList.contains('dark')) {
        return 'dark'
      }
      if (htmlElement.classList.contains('light')) {
        return 'light'
      }
      
      // 备用：从Cookie获取
      const cookieTheme = getThemeFromCookie(document.cookie)
      if (cookieTheme) {
        return cookieTheme
      }
      
      // 备用：从localStorage获取
      const stored = localStorage.getItem('theme')
      if (stored && ['dark', 'light'].includes(stored)) {
        return stored as Theme
      }
    }
    return 'light'
  })

  const currentTheme = theme

  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = window.document.documentElement
    
    root.classList.remove('light', 'dark')
    root.classList.add(currentTheme)

    // 同时更新Cookie和localStorage
    setThemeCookie(theme)
    localStorage.setItem('theme', theme)
  }, [theme, currentTheme])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  return {
    theme,
    setTheme: handleSetTheme,
    currentTheme,
  }
}
