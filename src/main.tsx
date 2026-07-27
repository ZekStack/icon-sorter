import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"
import "./index.css"
import "./i18n"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { IconSorterProvider } from "@/lib/icon-sorter-store"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <IconSorterProvider>
        <App />
      </IconSorterProvider>
    </ThemeProvider>
  </StrictMode>
)
