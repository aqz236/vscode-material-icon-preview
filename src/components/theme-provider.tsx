import { createContext, useContext, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '@/hooks/use-theme'

type ThemeProviderContextValue = ReturnType<typeof useTheme>

const ThemeProviderContext = createContext<ThemeProviderContextValue | undefined>(
  undefined
)

export function useThemeContext() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useTheme()
  const isInitialMount = useRef(true)

  // 只在用户主动切换主题时更新DOM，避免初始化时的冲突
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 跳过初始挂载，因为脚本已经设置了正确的主题
      if (isInitialMount.current) {
        isInitialMount.current = false
        return
      }
      
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(theme.currentTheme)
    }
  }, [theme.currentTheme])

  return (
    <ThemeProviderContext.Provider value={theme}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
