"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Category = {
  category_id: string
  parent_category_id: string | null
  category_name: string
  depth: number
  sort_order: number
}

function sortCategories<T extends Category>(categories: T[]) {
  return [...categories].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.category_name.localeCompare(b.category_name, "ko-KR")
  )
}

function getAncestorIds<T extends Category>(categories: T[], selectedId?: string) {
  const byId = new Map(categories.map((category) => [category.category_id, category]))
  const ancestors = new Set<string>()
  let current = selectedId ? byId.get(selectedId) : undefined

  while (current?.parent_category_id) {
    ancestors.add(current.parent_category_id)
    current = byId.get(current.parent_category_id)
  }

  return ancestors
}

function getInitialOpenIds<T extends Category>(
  categories: T[],
  selectedCategoryId?: string
) {
  const openIds = new Set<string>()
  for (const category of categories) {
    if (category.depth === 1) openIds.add(category.category_id)
  }
  getAncestorIds(categories, selectedCategoryId).forEach((id) => openIds.add(id))
  if (selectedCategoryId) openIds.add(selectedCategoryId)
  return openIds
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener("category-tree-storage", callback)

  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener("category-tree-storage", callback)
  }
}

function getSnapshot(storageKey: string) {
  return window.localStorage.getItem(storageKey)
}

function parseOpenIds(snapshot: string | null) {
  if (!snapshot) return null

  try {
    return new Set(JSON.parse(snapshot) as string[])
  } catch {
    return null
  }
}

export function CategoryTree<T extends Category>({
  categories,
  selectedCategoryId,
  allHref,
  categoryHrefs,
  allLabel,
  storageKey = "vendor-item-db:category-tree",
}: {
  categories: T[]
  selectedCategoryId?: string
  allHref: string
  categoryHrefs: Record<string, string>
  allLabel: string
  storageKey?: string
}) {
  const byParent = useMemo(() => {
    const grouped = new Map<string | null, T[]>()
    for (const category of categories) {
      const list = grouped.get(category.parent_category_id) ?? []
      list.push(category)
      grouped.set(category.parent_category_id, list)
    }
    return grouped
  }, [categories])

  const initialOpenIds = useMemo(
    () => getInitialOpenIds(categories, selectedCategoryId),
    [categories, selectedCategoryId]
  )
  const selectedAncestorIds = useMemo(
    () => getAncestorIds(categories, selectedCategoryId),
    [categories, selectedCategoryId]
  )
  const storageSnapshot = useSyncExternalStore(
    subscribe,
    () => getSnapshot(storageKey),
    () => null
  )
  const storedOpenIds = useMemo(
    () => parseOpenIds(storageSnapshot),
    [storageSnapshot]
  )
  const visibleOpenIds = useMemo(() => {
    const next = new Set(storedOpenIds ?? initialOpenIds)
    selectedAncestorIds.forEach((id) => next.add(id))
    if (selectedCategoryId) next.add(selectedCategoryId)
    return next
  }, [initialOpenIds, selectedAncestorIds, selectedCategoryId, storedOpenIds])

  const saveOpenIds = (ids: Set<string>) => {
    window.localStorage.setItem(storageKey, JSON.stringify([...ids]))
    window.dispatchEvent(new Event("category-tree-storage"))
  }

  const toggle = (categoryId: string) => {
    const next = new Set(visibleOpenIds)
    if (next.has(categoryId)) next.delete(categoryId)
    else next.add(categoryId)
    saveOpenIds(next)
  }

  const keepCurrentOpenState = () => saveOpenIds(visibleOpenIds)

  const renderNodes = (parentId: string | null): React.ReactNode => {
    const children = sortCategories(byParent.get(parentId) ?? [])

    return children.map((category) => {
      const childCount = (byParent.get(category.category_id) ?? []).length
      const hasChildren = childCount > 0
      const isOpen = visibleOpenIds.has(category.category_id)
      const isSelected = selectedCategoryId === category.category_id
      const indent = 8 + (category.depth - 1) * 16
      const FolderIcon = isOpen ? FolderOpen : Folder

      return (
        <div key={category.category_id}>
          <div
            className={cn(
              "flex items-center gap-1 rounded-md py-1.5 pr-2 text-sm transition-colors",
              isSelected ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            )}
            style={{ paddingLeft: `${indent}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                aria-label={isOpen ? "분류 접기" : "분류 펼치기"}
                onClick={() => toggle(category.category_id)}
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-black/10",
                  isSelected && "hover:bg-white/15"
                )}
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="h-5 w-5 shrink-0" />
            )}
            <Link
              href={categoryHrefs[category.category_id] ?? allHref}
              scroll={false}
              onClick={keepCurrentOpenState}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 rounded text-left",
                isSelected ? "font-medium" : "hover:underline"
              )}
            >
              <FolderIcon
                size={16}
                className={cn(
                  "shrink-0",
                  isSelected ? "text-white" : "text-amber-600"
                )}
              />
              <span className="min-w-0 flex-1 truncate">
                {category.category_name}
              </span>
            </Link>
            {hasChildren && (
              <span
                className={cn(
                  "rounded bg-gray-100 px-1.5 text-xs",
                  isSelected ? "bg-white/15 text-white" : "text-muted-foreground"
                )}
              >
                {childCount}
              </span>
            )}
          </div>
          {hasChildren && isOpen && <div>{renderNodes(category.category_id)}</div>}
        </div>
      )
    })
  }

  return (
    <div className="space-y-1">
      <Link
        href={allHref}
        scroll={false}
        onClick={keepCurrentOpenState}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          !selectedCategoryId ? "bg-gray-900 text-white" : "hover:bg-gray-100"
        )}
      >
        <Layers size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{allLabel}</span>
      </Link>
      {renderNodes(null)}
    </div>
  )
}
