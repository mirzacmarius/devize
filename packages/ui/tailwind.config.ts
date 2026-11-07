import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
        departure: ["var(--font-departure-mono)"],
      },
      // Devize type styles. Big means thin: display, title-page and kpi are 300.
      // Inside the app a screen's title is title-screen and the total of a
      // document is hero; a strip's lead is kpi, `figure` the step below.
      fontSize: {
        display: [
          "60px",
          { lineHeight: "64px", letterSpacing: "-0.02em", fontWeight: "300" },
        ],
        "title-page": [
          "34px",
          { lineHeight: "40px", letterSpacing: "-0.015em", fontWeight: "300" },
        ],
        "title-screen": [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.016em", fontWeight: "400" },
        ],
        hero: [
          "40px",
          {
            lineHeight: "44px",
            letterSpacing: "-0.01em",
            fontWeight: "var(--weight-figure)",
          },
        ],
        kpi: [
          "32px",
          {
            lineHeight: "36px",
            letterSpacing: "-0.01em",
            fontWeight: "var(--weight-figure)",
          },
        ],
        // The figures of a strip or a rail: one size wherever they stand.
        stat: [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.012em", fontWeight: "400" },
        ],
        figure: [
          "20px",
          { lineHeight: "26px", letterSpacing: "-0.01em", fontWeight: "400" },
        ],
        "title-card": [
          "16px",
          { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "550" },
        ],
        "body-lg": ["15px", { lineHeight: "22px" }],
        body: ["14px", { lineHeight: "20px" }],
        meta: ["13px", { lineHeight: "18px", fontWeight: "430" }],
        pill: ["13px", { lineHeight: "20px", fontWeight: "500" }],
        // The uppercase eyebrow of the marketing site.
        label: [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.06em", fontWeight: "500" },
        ],
        // A name for what follows, inside the app: table heads, groups, facts.
        caption: ["13px", { lineHeight: "18px", fontWeight: "450" }],
        code: ["13px", { lineHeight: "20px" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        control: "hsl(var(--border-control))",
        edge: "hsl(var(--border-field))",
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
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
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
          border: "hsl(var(--card-border))",
        },
        // Devize surfaces, text and signal colors (see globals.css)
        shell: "hsl(var(--shell))",
        panel: "hsl(var(--panel))",
        sunken: "hsl(var(--sunken))",
        field: "hsl(var(--field))",
        selected: "hsl(var(--selected))",
        "nav-active": "hsl(var(--nav-active))",
        scrim: "hsl(var(--scrim))",
        tile: "hsl(var(--tile))",
        backdrop: "hsl(var(--backdrop))",
        tick: "hsl(var(--tick))",
        meter: "hsl(var(--meter))",
        ink: {
          DEFAULT: "hsl(var(--ink))",
          2: "hsl(var(--ink-2))",
          3: "hsl(var(--ink-3))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--on-brand))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          soft: "hsl(var(--success-soft))",
          dot: "hsl(var(--success-dot))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
          dot: "hsl(var(--warning-dot))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          soft: "hsl(var(--danger-soft))",
          solid: "hsl(var(--danger-solid))",
          "solid-foreground": "hsl(var(--on-danger-solid))",
          border: "hsl(var(--danger-border))",
        },
        "neutral-dot": "hsl(var(--neutral-dot))",
        ai: {
          DEFAULT: "hsl(var(--ai))",
          soft: "hsl(var(--ai-soft))",
          border: "hsl(var(--ai-border))",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
      },
      boxShadow: {
        raised: "var(--shadow-raised)",
        card: "var(--shadow-card)",
        panel: "var(--shadow-panel)",
        overlay: "var(--shadow-overlay)",
      },
      spacing: {
        sidebar: "256px",
        rail: "288px",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
