type CategoryLike = {
  category_id: string
  parent_category_id: string | null
  category_name: string
  depth: number
  sort_order: number
}

/**
 * Given a pre-filtered list of active categories, removes any whose parent
 * is absent from the list (meaning the parent is inactive). Repeats until
 * the set is stable, so grandchild orphans are caught too.
 */
export function filterEffectivelyActive<T extends CategoryLike>(categories: T[]): T[] {
  let current = categories
  while (true) {
    const ids = new Set(current.map((c) => c.category_id))
    const next = current.filter(
      (c) => c.parent_category_id === null || ids.has(c.parent_category_id)
    )
    if (next.length === current.length) return next
    current = next
  }
}

export function flattenCategories<T extends CategoryLike>(categories: T[]) {
  const byParent = new Map<string | null, T[]>()

  for (const category of categories) {
    const list = byParent.get(category.parent_category_id) ?? []
    list.push(category)
    byParent.set(category.parent_category_id, list)
  }

  for (const list of byParent.values()) {
    list.sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        a.category_name.localeCompare(b.category_name, "ko-KR")
    )
  }

  const result: T[] = []
  const visit = (parentId: string | null) => {
    for (const category of byParent.get(parentId) ?? []) {
      result.push(category)
      visit(category.category_id)
    }
  }

  visit(null)
  return result
}

export function getCategoryDescendantIds<T extends CategoryLike>(
  categories: T[],
  categoryId?: string
) {
  if (!categoryId) return undefined

  const ids = new Set([categoryId])
  let changed = true

  while (changed) {
    changed = false
    for (const category of categories) {
      if (
        category.parent_category_id &&
        ids.has(category.parent_category_id) &&
        !ids.has(category.category_id)
      ) {
        ids.add(category.category_id)
        changed = true
      }
    }
  }

  return Array.from(ids)
}

export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: "asc" | "desc"
) {
  const modifier = direction === "asc" ? 1 : -1
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * modifier
  }
  return String(a).localeCompare(String(b), "ko-KR") * modifier
}
