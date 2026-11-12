export function plainText(content: string) {
  const doc = new DOMParser().parseFromString(
    content.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p\s*>/gi, '\n'),
    'text/html',
  );
  doc.querySelectorAll('script,style,iframe,object').forEach((node) => node.remove());
  return doc.body.textContent || '';
}
