/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 「解忧杂货店」色板 tokens (design.md §1)
        cream: "#F7F0E1",
        kraft: "#EBDCC3",
        lamp: "#E8A33D",
        wood: "#6B4A32",
        vermilion: "#B85C38",
        slate: "#4E5D5A",
        stamp: "#A63A2E",
        milk: "#DCE8E4",
        moss: "#7A8B6F",
        ink: "#3A2E24",
        night: "#2E3A46",
        "night-2": "#242F39",
        "lamp-glow": "#F2B95C",
        "night-text": "#E8DFC9",
        // theme-aware surfaces (switch with data-theme on <html>)
        page: "var(--page-bg)",
        "page-fg": "var(--page-fg)",
        paper: "var(--paper-bg)",
        "paper-fg": "var(--paper-fg)",
        // shadcn/ui tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        hand: ["'Ma Shan Zheng'", "'Noto Serif SC'", "serif"],
        serif: ["'Noto Serif SC'", "serif"],
        garamond: ["'EB Garamond'", "serif"],
        mincho: ["'Shippori Mincho B1'", "serif"],
      },
      maxWidth: {
        shop: "1120px",
        letter: "720px",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        paper: "0 2px 8px rgba(107,74,50,.12), 0 12px 32px rgba(107,74,50,.08)",
        "paper-deep": "0 4px 12px rgba(107,74,50,.18), 0 18px 48px rgba(107,74,50,.12)",
        glow: "0 0 24px rgba(242,185,92,.45), 0 0 64px rgba(242,185,92,.2)",
      },
      transitionTimingFunction: {
        shop: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
        750: "750ms",
        1200: "1200ms",
        1600: "1600ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "lamp-breathe": {
          "0%,100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.04)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "lamp-breathe": "lamp-breathe 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
