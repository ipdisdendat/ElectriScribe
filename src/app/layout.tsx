import './globals.css'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'ElectriScribe',
  description: 'Electrical System Troubleshooting & Monitoring',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-base-200 text-base-content">
        <div className="drawer lg:drawer-open">
          <input id="app-drawer" type="checkbox" className="drawer-toggle" />
          <div className="drawer-content flex flex-col">
            <div className="navbar bg-base-100 border-b">
              <div className="flex-none lg:hidden">
                <label htmlFor="app-drawer" className="btn btn-ghost btn-square">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </label>
              </div>
              <div className="flex-1 px-2 font-semibold">ElectriScribe</div>
              <div className="flex-none">
                <ThemeToggle />
              </div>
            </div>
            <main className="p-4 lg:p-6 max-w-7xl w-full mx-auto">{children}</main>
          </div>
          <div className="drawer-side">
            <label htmlFor="app-drawer" className="drawer-overlay" aria-label="close sidebar"></label>
            <aside className="menu p-4 w-80 bg-base-100 min-h-full border-r">
              <nav className="menu">
                <li><a href="/" className="font-medium">Dashboard</a></li>
                <li><a href="/monitor">Monitor</a></li>
                <li><a href="/troubleshoot">Troubleshoot</a></li>
                <li><a href="/history">History</a></li>
                <li><a href="/logs">Logs</a></li>
                <li><a href="/settings">Settings</a></li>
              </nav>
            </aside>
          </div>
        </div>
      </body>
    </html>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')

  React.useEffect(() => {
    const current = (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
    setTheme(current)
    document.documentElement.setAttribute('data-theme', current)
  }, [])

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <button onClick={toggle} className="btn btn-ghost">
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  )
}

