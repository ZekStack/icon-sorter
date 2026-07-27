import { createContext } from "react"

import type {
  ItemOf,
  ItemsArray,
  SelectDialogRequest,
  SelectDialogValue,
} from "./select-dialog-types"

export type SelectDialogContextValue = {
  select: <TItems extends ItemsArray, TMulti extends boolean = false>(
    props: SelectDialogRequest<TItems, TMulti>
  ) => Promise<SelectDialogValue<ItemOf<TItems>, TMulti> | undefined>
}

export const SelectDialogContext =
  createContext<SelectDialogContextValue | null>(null)
