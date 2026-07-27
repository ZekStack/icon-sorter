import { useEffect } from "react"
import { Link, Outlet } from "@tanstack/react-router"
import {
  ArchiveX,
  Grid2X2,
  Languages,
  ListFilter,
  Moon,
  Sun,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { useSelect } from "@/components/custom/select-dialog"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { useIconSorter } from "@/lib/icon-sorter-store"
import { cn } from "@/lib/utils"

const links = [
  { to: "/", labelKey: "nav.sort", icon: ListFilter },
  { to: "/library", labelKey: "nav.library", icon: Grid2X2 },
  { to: "/discarded", labelKey: "nav.discarded", icon: ArchiveX },
] as const

export function AppShell() {
  const { data } = useIconSorter()
  const { select } = useSelect()
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith("hu") ? "hu" : "en"
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  async function selectLanguage() {
    const languages = [
      { id: "en", label: t("language.en"), shortLabel: "EN" },
      { id: "hu", label: t("language.hu"), shortLabel: "HU" },
    ] as const
    const selected = await select({
      items: languages,
      itemValue: "id",
      itemLabel: "label",
      defaultValue: languages.find((item) => item.id === language) ?? null,
      title: t("language.label"),
      search: false,
      saveLabel: t("common.select"),
      cancelLabel: t("common.cancel"),
    })

    if (selected) {
      await i18n.changeLanguage(selected.id)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-1 px-3 sm:gap-2 sm:px-6">
          <nav className="flex items-center gap-1">
            {links.map((item) => {
              const Icon = item.icon
              const label = t(item.labelKey)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  aria-label={label}
                  title={label}
                  className={cn(
                    "flex size-9 items-center justify-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:w-auto sm:px-3",
                    "[&.active]:bg-foreground [&.active]:text-background"
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto hidden items-center gap-3 text-xs text-muted-foreground xl:flex">
            <span>{t("stats.groups", { count: data.groups.length })}</span>
            <span>{t("stats.saved", { count: data.icons.length })}</span>
            <span>
              {t("stats.discarded", { count: data.discardedIcons.length })}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1 xl:ml-2">
            <Button
              size="sm"
              variant="ghost"
              aria-label={t("language.label")}
              title={t("language.label")}
              onClick={() => void selectLanguage()}
            >
              <Languages />
              <span>{language.toUpperCase()}</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={isDark ? t("theme.light") : t("theme.dark")}
              title={isDark ? t("theme.light") : t("theme.dark")}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
