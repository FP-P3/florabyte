export function toSlug(name: string, id: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${base}-${id}`;
}

export function idFromSlug(slug: string) {
  const id = slug.split("-").pop() || "";
  return /^[a-f0-9]{24}$/i.test(id) ? id : null;
}
