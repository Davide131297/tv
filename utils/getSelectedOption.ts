export function getSelectedOption<T extends string>(
  params: URLSearchParams,
  key: string,
  validValues: T[],
  fallback: T
): T {
  const value = params.get(key);
  return value && validValues.includes(value as T) ? (value as T) : fallback;
}
