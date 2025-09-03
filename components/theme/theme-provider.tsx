"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "midnight" | "ocean" | "forest" | "sunset" | "lavender" | "rose"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  accentColor: string
  setTheme: (theme: Theme) => void
  setAccentColor: (color: string) => void
}

const initialState: ThemeProviderState = {
  theme: "dark",
  accentColor: "#5865F2",
  setTheme: () => null,
  setAccentColor: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, defaultTheme = "dark", storageKey = "theme", ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [accentColor, setAccentColor] = useState("#5865F2")

  useEffect(() => {
    const root = window.document.documentElement
    const storedTheme = localStorage.getItem(storageKey) as Theme
    const storedAccentColor = localStorage.getItem("accent-color")

    if (storedTheme) {
      setTheme(storedTheme)
    }
    if (storedAccentColor) {
      setAccentColor(storedAccentColor)
    }

    root.classList.remove("light", "dark", "midnight", "ocean", "forest", "sunset", "lavender", "rose")
    root.classList.add(storedTheme || defaultTheme)
    root.style.setProperty("--accent-color", storedAccentColor || "#5865F2")
  }, [])

  const value = {
    theme,
    accentColor,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)

      const root = window.document.documentElement
      root.classList.remove("light", "dark", "midnight", "ocean", "forest", "sunset", "lavender", "rose")
      root.classList.add(theme)
    },
    setAccentColor: (color: string) => {
      localStorage.setItem("accent-color", color)
      setAccentColor(color)

      const root = window.document.documentElement
      root.style.setProperty("--accent-color", color)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
