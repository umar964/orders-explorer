'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Download,
  Filter,
  GripVertical,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import {
  orders,
  ORDER_STATUSES,
  ORDER_REGIONS,
  ORDER_PRIORITIES,
  formatOrderAmount,
  formatOrderDate,
  type Order,
} from '@/data/orders'

type Field = 'status' | 'region' | 'channel' | 'priority' | 'product' | 'amount' | 'orderDate'
type Condition = { id: string; field: Field; operator: string; value: string }
type Group = { id: string; conditions: Condition[] }

const fields: { value: Field; label: string; type: string }[] = [
  { value: 'status', label: 'Status', type: 'select' },
  { value: 'region', label: 'Region', type: 'select' },
  { value: 'channel', label: 'Channel', type: 'select' },
  { value: 'priority', label: 'Priority', type: 'select' },
  { value: 'product', label: 'Product', type: 'text' },
  { value: 'amount', label: 'Amount', type: 'number' },
  { value: 'orderDate', label: 'Order date', type: 'date' },
]

const options: Record<string, string[]> = {
  status: ORDER_STATUSES,
  region: ORDER_REGIONS,
  channel: ['web', 'app', 'phone', 'store'],
  priority: [...ORDER_PRIORITIES],
}

const uid = () => Math.random().toString(36).slice(2, 8)


function matches(o: Order, c: Condition) {
  if (!c.value.trim()) return true

  const value = String(o[c.field] ?? '').toLowerCase()
  const target = c.value.trim().toLowerCase()

  if (c.field === 'amount') {
    const amount = o.amount
    const [min, max] = c.value.split(',').map(Number)

    if (c.operator === 'greater than') return amount > Number(c.value)
    if (c.operator === 'less than') return amount < Number(c.value)
    if (c.operator === 'between') {
      return c.value.includes(',') &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        amount >= Math.min(min, max) &&
        amount <= Math.max(min, max)
    }

    return amount === Number(c.value)
  }

  if (c.field === 'orderDate') {
    const date = new Date(o.orderDate).getTime()
    const targetDate = new Date(c.value).getTime()

    if (Number.isNaN(date) || Number.isNaN(targetDate)) return true

    if (c.operator === 'before') return date < targetDate
    if (c.operator === 'after') return date > targetDate
    if (c.operator === 'between') {
      const [start, end] = c.value.split(',')
      const startDate = new Date(start).getTime()
      const endDate = new Date(end).getTime()

      if (Number.isNaN(startDate) || Number.isNaN(endDate)) return true

      return date >= Math.min(startDate, endDate) &&
        date <= Math.max(startDate, endDate)
    }

    return o.orderDate.slice(0, 10) === c.value
  }

  if (c.operator === 'equals') return value === target
  if (c.operator === 'does not contain') return !value.includes(target)

  return value.includes(target)
}


function csv(rows: Order[]) {
  const heads = [
    'Order ID',
    'Customer',
    'Email',
    'Product',
    'Qty',
    'Amount (INR)',
    'Status',
    'Payment',
    'Region',
    'Channel',
    'Priority',
    'Order date',
    'Updated date',
    'Currency',
    'Notes',
  ]

  const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
  return [
    heads,
    ...rows.map((o) => [
      o.id,
      o.customerName,
      o.email,
      o.product,
      o.quantity,
      o.amount.toFixed(2),
      o.status,
      o.paymentMethod,
      o.region,
      o.channel,
      o.priority,
      o.orderDate,
      o.updatedAtTimestamp === null ? '' : new Date(o.updatedAtTimestamp).toISOString(),
      o.currency,
      o.notes,
    ]),
  ]
    .map((row) => row.map(esc).join(','))
    .join('\r\n')
}

export default function Page() {
  const [groups, setGroups] = useState<Group[]>([])
  const [sort, setSort] = useState<{ field: keyof Order; dir: 'asc' | 'desc' }>({
    field: 'createdAtTimestamp',
    dir: 'desc',
  })
  const [pin, setPin] = useState<keyof Order>('id')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focused, setFocused] = useState(0)
  const [detail, setDetail] = useState<Order | null>(null)
  const [search, setSearch] = useState('')
  const [scroll, setScroll] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const rowH = 44

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const text = search.trim().toLowerCase()
        if (
          text &&
          !`${o.id} ${o.customerName} ${o.email} ${o.product} ${o.notes}`
            .toLowerCase()
            .includes(text)
        ) {
          return false
        }

        // Conditions within one group are OR; separate groups are AND.
        return groups.every(
          (group) =>
            group.conditions.length === 0 ||
            group.conditions.some((condition) => matches(o, condition)),
        )
      }),
    [groups, search],
  )

  const sorted = useMemo(() => {
    const field = sort.field
    return [...filtered].sort((a, b) => {
      // Missing updatedAt values always sort last.
      if (field === 'updatedAtTimestamp') {
        if (a.updatedAtTimestamp === null && b.updatedAtTimestamp !== null) return 1
        if (a.updatedAtTimestamp !== null && b.updatedAtTimestamp === null) return -1
      }

      let comparison = 0
      const av = a[field]
      const bv = b[field]

      if (typeof av === 'number' && typeof bv === 'number') {
        comparison = av - bv
      } else {
        comparison = String(av ?? '').localeCompare(String(bv ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      }

      return (comparison || a.id.localeCompare(b.id)) * (sort.dir === 'asc' ? 1 : -1)
    })
  }, [filtered, sort])

  const visible = useMemo(() => {
  const viewportHeight = scroller.current?.clientHeight ?? 560
  const start = Math.max(0, Math.floor(scroll / rowH) - 6)

  return {
    start,
    end: Math.min(
      sorted.length,
      start + Math.ceil(viewportHeight / rowH) + 12,
    ),
  }
}, [scroll, sorted.length, rowH])

  const toggleSelect = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (detail) {
        if (event.key === 'Escape') setDetail(null)
        return
      }

      if (
        !scroller.current ||
        ['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(
          (event.target as HTMLElement).tagName,
        )
      ) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setFocused((index) => Math.min(sorted.length - 1, index + 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setFocused((index) => Math.max(0, index - 1))
      }
      if (event.key === 'Enter' && sorted[focused]) setDetail(sorted[focused])
      if (event.key === ' ' && sorted[focused]) {
        event.preventDefault()
        toggleSelect(sorted[focused].id)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail, focused, sorted, toggleSelect])

  useEffect(() => {
    if (!scroller.current || !sorted.length) return

    const top = focused * rowH
    if (top < scroller.current.scrollTop) scroller.current.scrollTop = top
    if (top + rowH > scroller.current.scrollTop + scroller.current.clientHeight) {
      scroller.current.scrollTop = top - scroller.current.clientHeight + rowH
    }
  }, [focused, sorted.length])

  const addCondition = (groupId: string) =>
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                { id: uid(), field: 'status', operator: 'equals', value: '' },
              ],
            }
          : group,
      ),
    )

  const update = (groupId: string, conditionId: string, key: keyof Condition, value: string) =>
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map((condition) =>
                condition.id === conditionId
                  ? {
                      ...condition,
                      [key]: value,
                      ...(key === 'field' ? { value: '' } : {}),
                    }
                  : condition,
              ),
            }
          : group,
      ),
    )

  const doSort = (field: keyof Order) =>
    setSort((current) =>
      current.field === field
        ? { field, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    )

  const exportCsv = () => {
    if (!selected.size) return

    const rows = orders.filter((order) => selected.has(order.id))
    const blob = new Blob(['\ufeff', csv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const columns: [keyof Order, string][] = [
    ['id', 'Order ID'],
    ['customerName', 'Customer'],
    ['email', 'Email'],
    ['amount', 'Amount (INR)'],
    ['status', 'Status'],
    ['region', 'Region'],
    ['channel', 'Channel'],
    ['priority', 'Priority'],
    ['createdAtTimestamp', 'Order date'],
  ]


  const getColumnWidth = (key: keyof Order) => {
  switch (key) {
    case 'id':
      return 'w-[125px]'
    case 'customerName':
      return 'w-[185px]'
    case 'email':
      return 'w-[245px]'
    case 'amount':
      return 'w-[120px]'
    case 'status':
      return 'w-[120px]'
    case 'region':
      return 'w-[100px]'
    case 'channel':
      return 'w-[90px]'
    case 'priority':
      return 'w-[90px]'
    case 'createdAtTimestamp':
      return 'w-[130px]'
    case 'notes':
      return 'w-[150px]'
    default:
      return 'w-[100px]'
  }
}

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#17202b]">
      <header className="border-b border-[#e4e8ec] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[#1c6b5c] font-bold text-white">
              O
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Orders Explorer</h1>
              <p className="text-xs text-[#77818c]">
                Review, filter, and export your order operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#697582]">
              <strong className="text-[#17202b]">{orders.length.toLocaleString()}</strong> total
              orders
            </span>
            <button
              onClick={exportCsv}
              disabled={!selected.size}
              className="inline-flex items-center gap-2 rounded-md bg-[#1c6b5c] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#155547] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={15} />
              Export selected {selected.size ? `(${selected.size})` : ''}
            </button>
            <button
              aria-label="More options"
              className="rounded-md border border-[#dfe4e8] p-2 text-[#697582] hover:bg-[#f5f7f8]"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-8 py-7">
        <section className="rounded-xl border border-[#e0e5e9] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f2] px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#1c6b5c]" />
                <h2 className="text-sm font-semibold">Filter orders</h2>
                <span className="rounded-full bg-[#eef7f4] px-2 py-0.5 text-[11px] font-medium text-[#1c6b5c]">
                  {filtered.length.toLocaleString()} matching
                </span>
              </div>
              <p className="mt-1 text-xs text-[#84909b]">Build a query to narrow down your results</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setGroups((current) => [
                    ...current,
                    {
                      id: uid(),
                      conditions: [{ id: uid(), field: 'status', operator: 'equals', value: '' }],
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-[#dfe4e8] px-3 py-1.5 text-xs font-medium hover:bg-[#f6f8f9]"
              >
                <Plus size={14} /> Add group
              </button>
              <button
                onClick={() =>
                  setGroups((current) =>
                    current.length
                      ? current.map((group, index) =>
                          index === 0
                            ? {
                                ...group,
                                conditions: [
                                  ...group.conditions,
                                  { id: uid(), field: 'status', operator: 'equals', value: '' },
                                ],
                              }
                            : group,
                        )
                      : [
                          {
                            id: uid(),
                            conditions: [
                              { id: uid(), field: 'status', operator: 'equals', value: '' },
                            ],
                          },
                        ],
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-[#f0f4f3] px-3 py-1.5 text-xs font-medium text-[#1c6b5c] hover:bg-[#e5eeeb]"
              >
                <Plus size={14} /> Add condition
              </button>
              {groups.length > 0 && (
                <button
                  onClick={() => setGroups([])}
                  className="px-2 py-1.5 text-xs font-medium text-[#84909b] hover:text-[#17202b]"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-5">
            {groups.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-[#dce3e7] bg-[#fbfcfc] px-4 py-3 text-sm text-[#84909b]">
                <SlidersHorizontal size={15} /> No filters applied. Add a condition to get started.
              </div>
            ) : (
              groups.map((group, groupIndex) => (
                <div key={group.id} className="rounded-lg border border-[#e5e9ec] bg-[#fbfcfc] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#84909b]">
                      Group {groupIndex + 1}{' '}
                      <span className="font-normal normal-case">· OR logic</span>
                    </span>
                    {groups.length > 1 && (
                      <button
                        aria-label={`Remove group ${groupIndex + 1}`}
                        onClick={() => setGroups((current) => current.filter((item) => item.id !== group.id))}
                        className="text-[#84909b] hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.conditions.map((condition) => (
                      <div key={condition.id} className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label="Filter field"
                          value={condition.field}
                          onChange={(event) =>
                            update(group.id, condition.id, 'field', event.target.value as Field)
                          }
                          className="h-8 rounded-md border border-[#dfe4e8] bg-white px-2 text-xs"
                        >
                          {fields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="Filter operator"
                          value={condition.operator}
                          onChange={(event) =>
                            update(group.id, condition.id, 'operator', event.target.value)
                          }
                          className="h-8 rounded-md border border-[#dfe4e8] bg-white px-2 text-xs"
                        >
                          {fields.find((field) => field.value === condition.field)?.type === 'select' ? (
                            <>
                              <option value="equals">equals</option>
                              <option value="does not contain">does not contain</option>
                            </>
                          ) : fields.find((field) => field.value === condition.field)?.type === 'number' ? (
                            <>
                              <option value="equals">equals</option>
                              <option value="greater than">greater than</option>
                              <option value="less than">less than</option>
                            </>
                          ) : fields.find((field) => field.value === condition.field)?.type === 'date' ? (
                            <>
                              <option value="equals">on</option>
                              <option value="before">before</option>
                              <option value="after">after</option>
                            </>
                          ) : (
                            <>
                              <option value="contains">contains</option>
                              <option value="equals">equals</option>
                              <option value="does not contain">does not contain</option>
                            </>
                          )}
                        </select>
                        {options[condition.field] ? (
                          <select
                            aria-label="Filter value"
                            value={condition.value}
                            onChange={(event) =>
                              update(group.id, condition.id, 'value', event.target.value)
                            }
                            className="h-8 min-w-40 rounded-md border border-[#dfe4e8] bg-white px-2 text-xs"
                          >
                            <option value="">Choose value…</option>
                            {options[condition.field].map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label="Filter value"
                            type={condition.field === 'orderDate' ? 'date' : condition.field === 'amount' ? 'number' : 'text'}
                            value={condition.value}
                            onChange={(event) =>
                              update(group.id, condition.id, 'value', event.target.value)
                            }
                            placeholder="Enter value…"
                            className="h-8 min-w-40 rounded-md border border-[#dfe4e8] bg-white px-2 text-xs outline-none focus:border-[#1c6b5c]"
                          />
                        )}
                        <button
                          aria-label="Remove condition"
                          onClick={() =>
                            setGroups((current) =>
                              current
                                .map((item) =>
                                  item.id === group.id
                                    ? {
                                        ...item,
                                        conditions: item.conditions.filter(
                                          (entry) => entry.id !== condition.id,
                                        ),
                                      }
                                    : item,
                                )
                                .filter((item) => item.conditions.length > 0),
                            )
                          }
                          className="rounded p-1 text-[#a0a9b1] hover:bg-[#f1f3f4] hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addCondition(group.id)}
                    className="mt-3 text-xs font-medium text-[#1c6b5c] hover:underline"
                  >
                    + Add OR condition
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border border-[#e0e5e9] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f2] px-5 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold">
                Orders <span className="ml-1 font-normal text-[#84909b]">{filtered.length.toLocaleString()}</span>
              </span>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2 text-[#9ba5ad]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search orders…"
                  aria-label="Search orders"
                  className="h-8 w-56 rounded-md border border-[#dfe4e8] pl-8 pr-3 text-xs outline-none focus:border-[#1c6b5c]"
                />
              </div>
              {selected.size > 0 && (
                <span className="text-xs text-[#1c6b5c]">
                  {selected.size} selected · {sorted.filter((order) => selected.has(order.id)).length} visible
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                disabled={!selected.size}
                className="text-xs font-medium text-[#77818c] hover:text-[#17202b] disabled:opacity-40"
              >
                Clear selection
              </button>
              <button
                onClick={() => setPin((current) => (current === 'id' ? 'customerName' : 'id'))}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#dfe4e8] px-2.5 py-1.5 text-xs font-medium hover:bg-[#f6f8f9]"
              >
                <Pin size={13} /> Pin {pin === 'id' ? 'customer' : 'ID'}
              </button>
            </div>
          </div>
   
    <div
        ref={scroller}
        onScroll={(event) => setScroll(event.currentTarget.scrollTop)}
        tabIndex={0}
        aria-label="Orders table. Use arrow keys to move through rows, Enter for details, and Space to select."
        className="relative h-[560px] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden outline-none"
      >
        <div className="w-full min-w-0">
          <div className="sticky top-0 z-20 flex h-10 items-center border-b border-[#e5e9ec] bg-[#fbfcfc] text-[11px] font-semibold uppercase tracking-wide text-[#84909b]">
            <div className="flex w-12 shrink-0 items-center justify-center">
              <input
                type="checkbox"
                aria-label="Select all filtered orders"
                checked={sorted.length > 0 && sorted.every((order) => selected.has(order.id))}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? new Set(sorted.map((order) => order.id))
                      : new Set(),
                  )
                }
              />
            </div>

       {columns.map(([key, label]) => {
  const isPinned = key === pin
  const width = getColumnWidth(key)

  return (
    <div
      key={key}
      role="button"
      tabIndex={0}
      onClick={() => doSort(key)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          doSort(key)
        }
      }}
      className={`relative flex h-full shrink-0 cursor-pointer items-center gap-1 border-l border-[#edf0f2] px-2 ${width} ${
        isPinned ? 'sticky left-12 z-30 bg-[#fbfcfc]' : ''
      } ${key === 'amount' ? 'justify-end' : ''}`}
    >
      <span className="truncate">{label}</span>

      {sort.field === key &&
        (sort.dir === 'asc' ? (
          <ArrowUp size={12} />
        ) : (
          <ArrowDown size={12} />
        ))}

      {isPinned && <span className="ml-auto text-[#1c6b5c]">•</span>}

      <GripVertical
        size={12}
        className="absolute right-0 shrink-0 text-[#c7ced3]"
      />
    </div>
  )
})}
          </div>

          <div style={{ height: sorted.length * rowH, position: 'relative' }}>
            {sorted.slice(visible.start, visible.end).map((order, index) => {
              const rowIndex = visible.start + index

              return (
                <div
                  key={order.id}
                  onClick={() => setFocused(rowIndex)}
                  onDoubleClick={() => setDetail(order)}
                  className={`absolute left-0 right-0 flex h-11 items-center border-b border-[#f0f2f3] text-xs transition-colors ${
                    rowIndex === focused
                      ? 'bg-[#f0f7f5] ring-1 ring-inset ring-[#b5d8cf]'
                      : 'hover:bg-[#fafcfc]'
                  }`}
                  style={{ top: rowIndex * rowH }}
                >
                  <div className="flex w-12 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleSelect(order.id)}
                      aria-label={`Select ${order.id}`}
                    />
                  </div>

                  {columns.map(([key]) => {
                    const isPinned = key === pin

                    const width =
                      key === 'id' ? 'w-[125px]' :
                      key === 'customerName' ? 'w-[150px]' :
                      key === 'email' ? 'w-[195px]' :
                      key === 'amount' ? 'w-[110px]' :
                      key === 'status' ? 'w-[120px]' :
                      key === 'region' ? 'w-[115px]' :
                      key === 'channel' ? 'w-[105px]' :
                      key === 'priority' ? 'w-[105px]' :
                      key === 'createdAtTimestamp' ? 'w-[145px]' :
                      key === 'notes' ? 'w-[130px]' :
                      'w-[100px]'

                    let cell: React.ReactNode = String(order[key] ?? '—')

                    if (key === 'amount') {
                      cell = formatOrderAmount(order.amount)
                    }

                    if (key === 'createdAtTimestamp') {
                      cell = formatOrderDate(order.createdAtTimestamp)
                    }

                    if (key === 'status') {
                      cell = (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            order.status === 'delivered'
                              ? 'bg-[#e9f6f0] text-[#27704f]'
                              : order.status === 'pending'
                                ? 'bg-[#fff4dc] text-[#946b12]'
                                : order.status === 'cancelled'
                                  ? 'bg-[#fbeceb] text-[#a34842]'
                                  : 'bg-[#eef3ff] text-[#315caa]'
                          }`}
                        >
                          {order.status}
                        </span>
                      )
                    }

                    if (key === 'notes') {
                      cell = order.notes
                        ? `${order.notes.slice(0, 70)}${order.notes.length > 70 ? '…' : ''}`
                        : '—'
                    }

                    return (
                      <div
                        key={key}
                        className={`flex h-full min-w-0 shrink-0 items-center truncate border-l border-[#f4f5f6] px-2 ${width} ${
                          isPinned ? 'sticky left-12 z-10 bg-inherit' : ''
                        } ${key === 'id' ? 'font-medium text-[#1c6b5c]' : ''} ${
                          key === 'amount' ? 'justify-end font-medium' : ''
                        }`}
                        title={key === 'notes' ? order.notes : String(order[key] ?? '—')}
                      >
                        <span className="truncate">{cell}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
    

  {sorted.length === 0 && (
    <div className="absolute inset-0 top-10 flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium">No orders match your filters.</p>
        <p className="mt-1 text-xs text-[#84909b]">
          Try adjusting your conditions or clear all filters.
        </p>
        <button
          onClick={() => {
            setGroups([])
            setSearch('')
          }}
          className="mt-3 rounded-md bg-[#1c6b5c] px-3 py-1.5 text-xs font-medium text-white"
        >
          Clear all filters
        </button>
      </div>
    </div>
  )}
</div>

        </section>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setDetail(null)}>
          <aside
            onClick={(event) => event.stopPropagation()}
            className="h-full w-full max-w-md overflow-auto bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#1c6b5c]">ORDER DETAILS</p>
                <h2 className="mt-1 text-xl font-semibold">{detail.id}</h2>
              </div>
              <button
                onClick={() => setDetail(null)}
                aria-label="Close order details"
                className="rounded-md p-2 text-[#84909b] hover:bg-[#f3f5f6]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5">
              {Object.entries(detail).map(([key, value]) => {
                let displayValue: string
                if (key === 'amount') displayValue = formatOrderAmount(Number(value))
                else if (key === 'createdAtTimestamp' || key === 'updatedAtTimestamp') {
                  displayValue = formatOrderDate(typeof value === 'number' ? value : null)
                } else if (key === 'notes') displayValue = String(value || '—')
                else displayValue = String(value ?? 'Not provided')

                return (
                  <div key={key} className={key === 'notes' ? 'col-span-2' : ''}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9aa3aa]">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{displayValue}</p>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
