import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* 主题初始化脚本 - 在HTML解析时立即执行，防止闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function getCookie(name) {
                    const value = '; ' + document.cookie;
                    const parts = value.split('; ' + name + '=');
                    if (parts.length === 2) return parts.pop().split(';').shift();
                    return null;
                  }
                  
                  function getThemeByTime() {
                    const hour = new Date().getHours();
                    return hour >= 6 && hour < 18 ? 'light' : 'dark';
                  }
                  
                  const cookieTheme = getCookie('_theme');
                  let theme;
                  
                  if (cookieTheme && ['light', 'dark'].includes(cookieTheme)) {
                    theme = cookieTheme;
                  } else {
                    theme = getThemeByTime();
                  }
                  
                  document.documentElement.className = theme;
                } catch (e) {
                  document.documentElement.className = 'light';
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
