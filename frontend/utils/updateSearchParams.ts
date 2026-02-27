export function updateSearchParams(
  current: URLSearchParams,
  updates: { [key: string]: string | boolean | string[] | undefined }
): string {
  const params = new URLSearchParams(current.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) return;

    if (typeof value === "boolean") {
      if (value) params.set(key, "true");
      else params.delete(key);
      return;
    }

    if (Array.isArray(value)) {
      params.delete(key);
      value.forEach((v) => {
        if (v) params.append(key, v);
      });
      return;
    }

    if (value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}
