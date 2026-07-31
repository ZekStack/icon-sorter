import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { AiGroupingPage } from "@/pages/ai-grouping-page"
import { DiscardedPage } from "@/pages/discarded-page"
import { LibraryPage } from "@/pages/library-page"
import { SortPage } from "@/pages/sort-page"

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: SortPage,
})

const sortRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: SortPage,
})

const aiGroupingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai-grouping",
  component: AiGroupingPage,
})

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage,
})

const discardedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/discarded",
  component: DiscardedPage,
})

const routeTree = rootRoute.addChildren([
  sortRoute,
  aiGroupingRoute,
  libraryRoute,
  discardedRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
