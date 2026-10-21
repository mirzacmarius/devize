export default {
  common: {
    appName: "Devize",
    appDescription:
      "Devize de construcții cu norme de la producători și prețuri la zi din magazine.",
  },
  navigation: {
    home: "Panou",
    settings: "Setări",
    accountMenu: "Meniul contului",
    theme: "Temă",
    language: "Limbă",
    signOut: "Deconectare",
  },
  theme: {
    light: "Luminoasă",
    dark: "Întunecată",
    system: "Sistem",
  },
  login: {
    title: "Intră în Devize",
    description: "Creează devize cu norme de la producători și prețuri la zi.",
    google: "Continuă cu Google",
  },
  username: {
    label: "Nume de utilizator",
    placeholder: "ex. ionpopescu",
    rules: "Între 3 și 32 de litere sau cifre, fără spații.",
    invalid:
      "Folosește între 3 și 32 de litere sau cifre, fără spații sau alte semne.",
  },
  onboarding: {
    title: "Bun venit!",
    description: "Alege un nume de utilizator ca să începem.",
    continue: "Continuă",
    hint: "Îl poți schimba oricând din setări.",
  },
  dashboard: {
    title: "Devizele tale",
    description: "Aici vei crea și urmări devizele lucrărilor tale.",
    emptyTitle: "Încă nu ai niciun deviz",
    emptyDescription:
      "Constructorul de devize vine în curând: norme de la producători, prețuri din magazine și formularele oficiale, într-un singur loc.",
  },
  settings: {
    title: "Setări",
    description: "Gestionează-ți contul.",
    general: "General",
    avatar: {
      title: "Fotografia ta",
      description: "Apare în meniul contului tău.",
      change: "Schimbă fotografia",
      uploadHint: "Apasă pe fotografie ca să încarci alta din fișierele tale.",
      reset: "Elimină",
    },
    username: {
      title: "Numele tău de utilizator",
      description: "Așa apari în Devize.",
      save: "Salvează",
    },
    deleteAccount: {
      title: "Șterge contul",
      description:
        "Contul tău Devize și toate datele lui vor fi șterse definitiv.",
      warning: "Acțiunea nu poate fi anulată.",
      button: "Șterge contul",
      confirm: "Sigur? Apasă din nou",
    },
  },
} as const;
