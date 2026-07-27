import type * as React from "react"

export type AnyItem = object
export type ItemsArray = readonly AnyItem[]
export type ItemOf<TItems extends ItemsArray> = TItems[number]

export type Accessor<TItem extends AnyItem, TValue> =
  | string
  | ((item: TItem, index: number) => TValue)

export type SelectDialogValue<
  TItem extends AnyItem,
  TMulti extends boolean,
> = TMulti extends true ? TItem[] : TItem | null

export type SelectDialogProps<
  TItems extends ItemsArray,
  TMulti extends boolean = false,
> = {
  items: TItems
  multi?: TMulti
  itemLabel?: Accessor<ItemOf<TItems>, React.ReactNode>
  itemDescription?: Accessor<ItemOf<TItems>, React.ReactNode>
  itemMedia?: Accessor<ItemOf<TItems>, React.ReactNode>
  itemValue?: Accessor<ItemOf<TItems>, string | number>
  value?: SelectDialogValue<ItemOf<TItems>, TMulti>
  defaultValue?: SelectDialogValue<ItemOf<TItems>, TMulti>
  onValueChange?: (value: SelectDialogValue<ItemOf<TItems>, TMulti>) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  search?: boolean
  searchPlaceholder?: string
  emptyText?: React.ReactNode
  saveLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  selectAllLabel?: React.ReactNode
  deselectAllLabel?: React.ReactNode
  disabled?: boolean
  className?: string
  contentClassName?: string
  bodyClassName?: string
  onConfirm?: (value: SelectDialogValue<ItemOf<TItems>, TMulti>) => void
  onCancel?: () => void
  renderItem?: (props: {
    item: ItemOf<TItems>
    index: number
    selected: boolean
    label: React.ReactNode
    description: React.ReactNode
    media: React.ReactNode
    toggle: () => void
  }) => React.ReactNode
}

export type SelectDialogRequest<
  TItems extends ItemsArray = ItemsArray,
  TMulti extends boolean = boolean,
> = Omit<
  SelectDialogProps<TItems, TMulti>,
  "open" | "onOpenChange" | "trigger" | "value" | "onValueChange"
>
