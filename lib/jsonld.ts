/** JSON-LD safe to embed in a script tag: "<" is escaped so "</script>" in text cannot end the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

export function jsonLdScriptTag(data: unknown): string {
  return `<script type="application/ld+json">\n${jsonLdString(data)}\n</script>`;
}
