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
      iconType: {
        filter: "Filter by icon type",
        all: "All",
        HugeIcon: "Hugeicons",
        HsHIcon: "HsH",
      },
      common: {
        add: "Add",
        save: "Save",
        cancel: "Cancel",
        search: "Search",
        select: "Select",
        remove: "Remove",
        discard: "Discard",
        restore: "Restore",
      },
      keywords: {
        placeholder: "door, entrance, access",
        remove: "Remove {{name}} keyword bucket",
        removeTitle: "Remove the {{name}} keyword bucket?",
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
        selectGroup: "Select a group",
        selectGroupDescription: "Choose where this icon should be stored.",
        noGroupSelected: "No group selected",
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
        import: "Import JSON",
        export: "Export JSON",
        importTitle: "Replace the current library?",
        importDescription:
          "Import {{name}} and replace all currently saved groups, icons, keywords, and discarded icons.",
        importSuccess:
          "Imported {{groups}} groups, {{icons}} saved icons, and {{discardedIcons}} discarded icons.",
        importUnsupported:
          "This save does not declare both supported icon types.",
        importInvalid: "The selected file is not a valid icon-sorter save.",
        visible: "{{count}} visible",
        savedTotal: "{{count}} saved total",
        noGroups: "No groups yet. Create one here or start sorting icons.",
        noMatches: "No matching icons in this group.",
        emptyGroup: "This group is empty.",
        saveGroup: "Save",
        cancelGroupEdit: "Cancel group editing",
        renameGroup: "Rename {{name}}",
        removeGroup: "Remove {{name}}",
        removeGroupTitle: "Remove the {{name}} group?",
        removeGroupConfirm:
          "Remove {{name}}? Its {{count}} saved icon(s) will return to the sorting queue.",
        editDialog: "Edit {{name}}",
        commaKeywords: "Comma-separate multiple keywords.",
        closeEditor: "Close editor",
        saveKeywords: "Save keywords",
        keywordCount_one: "{{count}} keyword",
        keywordCount_other: "{{count}} keywords",
        moveIcon: "Move {{name}}",
        moveIconDescription: "Select the destination group for this icon.",
        editKeywords: "Edit {{name}} keywords",
        removeIcon: "Remove {{name}} and return it to the queue",
        removeIconTitle: "Remove {{name}}?",
        removeIconDescription:
          "The icon will be removed from the library and returned to the sorting queue.",
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
      iconType: {
        filter: "Szűrés ikontípus szerint",
        all: "Mind",
        HugeIcon: "Hugeicons",
        HsHIcon: "HsH",
      },
      common: {
        add: "Hozzáadás",
        save: "Mentés",
        cancel: "Mégse",
        search: "Keresés",
        select: "Kiválasztás",
        remove: "Eltávolítás",
        discard: "Elvetés",
        restore: "Visszaállítás",
      },
      keywords: {
        placeholder: "ajtó, bejárat, hozzáférés",
        remove: "{{name}} kulcsszómező eltávolítása",
        removeTitle: "Eltávolítod a(z) {{name}} kulcsszómezőt?",
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
        selectGroup: "Csoport kiválasztása",
        selectGroupDescription:
          "Válaszd ki, melyik csoportba kerüljön az ikon.",
        noGroupSelected: "Nincs kiválasztott csoport",
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
        import: "JSON importálása",
        export: "JSON exportálása",
        importTitle: "Lecseréled a jelenlegi könyvtárat?",
        importDescription:
          "A(z) {{name}} importálása lecseréli az összes jelenlegi csoportot, ikont, kulcsszót és elvetett ikont.",
        importSuccess:
          "Importálva: {{groups}} csoport, {{icons}} mentett ikon és {{discardedIcons}} elvetett ikon.",
        importUnsupported:
          "Ez a mentés nem tartalmazza mindkét támogatott ikontípust.",
        importInvalid: "A kiválasztott fájl nem érvényes icon-sorter mentés.",
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
        removeGroupTitle: "Eltávolítod a(z) {{name}} csoportot?",
        removeGroupConfirm:
          "Eltávolítod a(z) {{name}} csoportot? A benne lévő {{count}} mentett ikon visszakerül a rendezési sorba.",
        editDialog: "{{name}} szerkesztése",
        commaKeywords: "Több kulcsszót vesszővel válassz el.",
        closeEditor: "Szerkesztő bezárása",
        saveKeywords: "Kulcsszavak mentése",
        keywordCount_one: "{{count}} kulcsszó",
        keywordCount_other: "{{count}} kulcsszó",
        moveIcon: "{{name}} áthelyezése",
        moveIconDescription: "Válaszd ki az ikon célcsoportját.",
        editKeywords: "{{name}} kulcsszavainak szerkesztése",
        removeIcon: "{{name}} eltávolítása és visszaküldése a rendezési sorba",
        removeIconTitle: "Eltávolítod a(z) {{name}} ikont?",
        removeIconDescription:
          "Az ikon kikerül a könyvtárból, és visszakerül a rendezési sorba.",
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
