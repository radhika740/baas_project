export const ok = <T>(message: string, data?: T) => ({
  success: true as const,
  message,
  data,
});

export const paginated = <T>(
  message: string,
  data: T[],
  page: number,
  limit: number,
  total: number,
) => ({
  success: true as const,
  message,
  data,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
