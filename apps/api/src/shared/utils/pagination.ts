import { z } from 'zod'

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function paginatedResponse<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null
  return { data, nextCursor, hasMore }
}
