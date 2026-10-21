import type { Dictionary } from "./types";

export default {
  common: {
    appName: "Devize",
    appDescription:
      "Construction estimates with manufacturers' norms and up-to-date store prices.",
  },
  navigation: {
    home: "Dashboard",
    settings: "Settings",
    accountMenu: "Account menu",
    theme: "Theme",
    language: "Language",
    signOut: "Sign out",
  },
  theme: {
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  login: {
    title: "Sign in to Devize",
    description:
      "Build estimates with manufacturers' norms and up-to-date prices.",
    google: "Continue with Google",
  },
  username: {
    label: "Username",
    placeholder: "e.g. ionpopescu",
    rules: "3 to 32 letters or digits, no spaces.",
    invalid: "Use 3 to 32 letters or digits, with no spaces or other symbols.",
  },
  onboarding: {
    title: "Welcome!",
    description: "Choose a username to get started.",
    continue: "Continue",
    hint: "You can change it at any time in your settings.",
  },
  dashboard: {
    title: "Your estimates",
    description: "This is where you'll create and track your job estimates.",
    emptyTitle: "You have no estimates yet",
    emptyDescription:
      "The estimate builder is coming soon: manufacturers' norms, store prices and the official forms, all in one place.",
  },
  settings: {
    title: "Settings",
    description: "Manage your account.",
    general: "General",
    avatar: {
      title: "Your photo",
      description: "It's shown in your account menu.",
      change: "Change photo",
      uploadHint: "Click the photo to upload another from your files.",
      reset: "Remove",
    },
    username: {
      title: "Your username",
      description: "This is how you appear in Devize.",
      save: "Save",
    },
    deleteAccount: {
      title: "Delete account",
      description:
        "Your Devize account and all of its data will be permanently deleted.",
      warning: "This can't be undone.",
      button: "Delete account",
      confirm: "Are you sure? Click again",
    },
  },
} as const satisfies Dictionary;
