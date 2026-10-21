import type { Dictionary } from "./types";

export default {
  common: {
    appName: "Devize",
    appDescription:
      "Construction estimates with manufacturers' norms and up-to-date store prices.",
  },
  navigation: {
    main: "Main navigation",
    work: "Work",
    account: "Account",
    estimates: "Estimates",
    catalog: "Catalog",
    clients: "Clients",
    rates: "Rates",
    settings: "Settings",
    admin: "Admin",
    openMenu: "Open menu",
    closeMenu: "Close menu",
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
  estimates: {
    title: "Estimates",
    description: "Your jobs' estimates, from draft to accepted offer.",
    emptyTitle: "You have no estimates yet",
    emptyDescription:
      "The estimate builder is coming soon: manufacturers' norms, store prices and the official forms, all in one place.",
  },
  catalog: {
    title: "Catalog",
    description:
      "Base norms and manufacturer norms, with their resources and products.",
    emptyTitle: "The catalog is coming soon",
    emptyDescription:
      "You'll search norms by code or by work and see what each one consumes: labour, materials, equipment and transport.",
  },
  clients: {
    title: "Clients",
    description: "Your clients and the offers sent to each of them.",
    emptyTitle: "The client list is coming soon",
    emptyDescription:
      "You'll keep your clients' details here and see which offers they received and which they accepted.",
  },
  rates: {
    title: "Rates",
    description:
      "Your company's labour and equipment rates and the percentages in the summary.",
    emptyTitle: "Rates are coming soon",
    emptyDescription:
      "You'll set hourly rates per trade, equipment rates and the default percentages: CAM, indirect costs and profit.",
  },
  settings: {
    title: "Settings",
    description: "Manage your account.",
    sections: "Settings sections",
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
