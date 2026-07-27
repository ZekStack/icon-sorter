import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
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

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage,
})

const routeTree = rootRoute.addChildren([sortRoute, libraryRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
