import { Link, Outlet } from "@tanstack/react-router"
import { Grid2X2, ListFilter } from "lucide-react"

import { useIconSorter } from "@/lib/icon-sorter-store"
import { cn } from "@/lib/utils"

const links = [
  { to: "/", label: "Sort", icon: ListFilter },
  { to: "/library", label: "Library", icon: Grid2X2 },
] as const

export function AppShell() {
  const { data } = useIconSorter()

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-6">
          <nav className="flex items-center gap-1">
            {links.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    "[&.active]:bg-foreground [&.active]:text-background"
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>{data.groups.length} groups</span>
            <span>{data.icons.length} saved</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
