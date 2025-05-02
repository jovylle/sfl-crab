// src/utils/artefactIcons.ts
const modules = import.meta.glob("/src/assets/icons/*.webp", {
  eager: true,
  import: "default",
})

export const artefactIcons = Object.fromEntries(
  Object.entries(modules).map(([filePath, url]) => {
    const key = filePath
      .split("/")
      .pop()! // "broken_pillar.webp"
      .replace(".webp", "") // "broken_pillar"
      .replace(/_/g, " ") // "broken pillar"
      .replace(/\b\w/g, (c) => c.toUpperCase()) // "Broken Pillar"
    return [key, url]
  })
) as Record<string, string>
