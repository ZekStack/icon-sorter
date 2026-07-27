import i18n from "i18next"
import { initReactI18next } from "react-i18next"

const LANGUAGE_STORAGE_KEY = "icon-sorter.language"

const resources = {
  en: {
    translation: {
      nav: {
        sort: "Sort",
        library: "Library",
        discarded: "Discarded",
      },
      stats: {
        groups: "{{count}} groups",
        saved: "{{count}} saved",
        discarded: "{{count}} discarded",
      },
      theme: {
        light: "Switch to light mode",
        dark: "Switch to dark mode",
      },
      language: {
        label: "Language",
        en: "English",
        hu: "Hungarian",
      },
      common: {
        add: "Add",
        save: "Save",
        cancel: "Cancel",
        search: "Search",
        remove: "Remove",
        discard: "Discard",
        restore: "Restore",
      },
      keywords: {
        placeholder: "door, entrance, access",
        remove: "Remove {{name}} keyword bucket",
        removeConfirm:
          "Remove the {{name}} keyword bucket from every saved and discarded icon?",
      },
      sort: {
        complete: "Every icon is sorted.",
        completeDescription:
          "Open the library or discarded page to review the result.",
        remaining: "{{count}} remaining",
        assign: "Assign and continue",
        discard: "Discard icon",
        discardAria: "Discard {{name}}",
        group: "Group",
        firstGroup: "Create the first group before assigning this icon.",
        newGroup: "New group",
        addGroup: "Add group",
        keywords: "Keywords",
        keywordBucket: "Keyword bucket",
        color: "Icon color",
        colorValue: "Hex color",
      },
      library: {
        search: "Search names, groups, or keywords",
        newGroup: "New group",
        addGroup: "Add group",
        export: "Export JSON",
        visible: "{{count}} visible",
        savedTotal: "{{count}} saved total",
        noGroups: "No groups yet. Create one here or start sorting icons.",
        noMatches: "No matching icons in this group.",
        emptyGroup: "This group is empty.",
        saveGroup: "Save",
        cancelGroupEdit: "Cancel group editing",
        renameGroup: "Rename {{name}}",
        removeGroup: "Remove {{name}}",
        removeGroupConfirm:
          "Remove {{name}}? Its {{count}} saved icon(s) will return to the sorting queue.",
        editDialog: "Edit {{name}}",
        commaKeywords: "Comma-separate multiple keywords.",
        closeEditor: "Close editor",
        saveKeywords: "Save keywords",
        keywordCount_one: "{{count}} keyword",
        keywordCount_other: "{{count}} keywords",
        moveIcon: "Move {{name}}",
        editKeywords: "Edit {{name}} keywords",
        removeIcon: "Remove {{name}} and return it to the queue",
        discardIcon: "Discard {{name}}",
        keywordBuckets: "Keyword buckets",
      },
      discarded: {
        search: "Search discarded icons",
        visible: "{{count}} visible",
        total: "{{count}} discarded total",
        empty: "No discarded icons.",
        noMatches: "No discarded icons match this search.",
        restoreIcon: "Restore {{name}}",
        restoresToLibrary: "Restores to library",
        restoresToQueue: "Restores to queue",
      },
    },
  },
  hu: {
    translation: {
      nav: {
        sort: "Rendezés",
        library: "Könyvtár",
        discarded: "Elvetett",
      },
      stats: {
        groups: "{{count}} csoport",
        saved: "{{count}} mentett",
        discarded: "{{count}} elvetett",
      },
      theme: {
        light: "Váltás világos módra",
        dark: "Váltás sötét módra",
      },
      language: {
        label: "Nyelv",
        en: "Angol",
        hu: "Magyar",
      },
      common: {
        add: "Hozzáadás",
        save: "Mentés",
        cancel: "Mégse",
        search: "Keresés",
        remove: "Eltávolítás",
        discard: "Elvetés",
        restore: "Visszaállítás",
      },
      keywords: {
        placeholder: "ajtó, bejárat, hozzáférés",
        remove: "{{name}} kulcsszómező eltávolítása",
        removeConfirm:
          "Eltávolítod a(z) {{name}} kulcsszómezőt minden mentett és elvetett ikonból?",
      },
      sort: {
        complete: "Minden ikon rendezve van.",
        completeDescription:
          "Az eredményt a könyvtárban vagy az elvetett ikonoknál ellenőrizheted.",
        remaining: "{{count}} van hátra",
        assign: "Hozzárendelés és tovább",
        discard: "Ikon elvetése",
        discardAria: "{{name}} elvetése",
        group: "Csoport",
        firstGroup: "Az ikon hozzárendelése előtt hozz létre egy csoportot.",
        newGroup: "Új csoport",
        addGroup: "Csoport hozzáadása",
        keywords: "Kulcsszavak",
        keywordBucket: "Kulcsszómező",
        color: "Ikon színe",
        colorValue: "Hex szín",
      },
      library: {
        search: "Keresés név, csoport vagy kulcsszó alapján",
        newGroup: "Új csoport",
        addGroup: "Csoport hozzáadása",
        export: "JSON exportálása",
        visible: "{{count}} látható",
        savedTotal: "Összesen {{count}} mentett",
        noGroups:
          "Még nincs csoport. Hozz létre egyet itt vagy kezdd el a rendezést.",
        noMatches: "Nincs találat ebben a csoportban.",
        emptyGroup: "Ez a csoport üres.",
        saveGroup: "Mentés",
        cancelGroupEdit: "Csoport szerkesztésének megszakítása",
        renameGroup: "{{name}} átnevezése",
        removeGroup: "{{name}} eltávolítása",
        removeGroupConfirm:
          "Eltávolítod a(z) {{name}} csoportot? A benne lévő {{count}} mentett ikon visszakerül a rendezési sorba.",
        editDialog: "{{name}} szerkesztése",
        commaKeywords: "Több kulcsszót vesszővel válassz el.",
        closeEditor: "Szerkesztő bezárása",
        saveKeywords: "Kulcsszavak mentése",
        keywordCount_one: "{{count}} kulcsszó",
        keywordCount_other: "{{count}} kulcsszó",
        moveIcon: "{{name}} áthelyezése",
        editKeywords: "{{name}} kulcsszavainak szerkesztése",
        removeIcon:
          "{{name}} eltávolítása és visszaküldése a rendezési sorba",
        discardIcon: "{{name}} elvetése",
        keywordBuckets: "Kulcsszómezők",
      },
      discarded: {
        search: "Keresés az elvetett ikonok között",
        visible: "{{count}} látható",
        total: "Összesen {{count}} elvetett",
        empty: "Nincs elvetett ikon.",
        noMatches: "Nincs a keresésnek megfelelő elvetett ikon.",
        restoreIcon: "{{name}} visszaállítása",
        restoresToLibrary: "Visszaáll a könyvtárba",
        restoresToQueue: "Visszaáll a rendezési sorba",
      },
    },
  },
} as const

function getInitialLanguage() {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (storedLanguage === "hu" || storedLanguage === "en") {
    return storedLanguage
  }

  return navigator.language.toLowerCase().startsWith("hu") ? "hu" : "en"
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
})

i18n.on("languageChanged", (language) => {
  const normalizedLanguage = language.startsWith("hu") ? "hu" : "en"
  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage)
  document.documentElement.lang = normalizedLanguage
})

document.documentElement.lang = i18n.language.startsWith("hu") ? "hu" : "en"

export default i18n
