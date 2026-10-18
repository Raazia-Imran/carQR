export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export function demand(
  condition: unknown,
  status: number,
  code: string,
): asserts condition {
  if (!condition) throw new AppError(status, code);
}
