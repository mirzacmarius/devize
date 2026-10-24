/**
 * Structured data for search engines. React writes a script's string child
 * as it is, only breaking up a "</script" inside it; "<" is escaped too, so
 * no text in the data can end the script early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json">
      {JSON.stringify(data).replace(/</g, "\\u003c")}
    </script>
  );
}
