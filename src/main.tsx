import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"
import "./index.css"
import "./i18n"
import { ConfirmProvider } from "@/components/custom/confirm-dialog"
import { SelectDialogProvider } from "@/components/custom/select-dialog"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { IconSorterProvider } from "@/lib/icon-sorter-store"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ConfirmProvider>
        <SelectDialogProvider>
          <IconSorterProvider>
            <App />
          </IconSorterProvider>
        </SelectDialogProvider>
      </ConfirmProvider>
    </ThemeProvider>
  </StrictMode>
)
