import { parseEmojiText } from '@/domain/chat';

export function readEditor(root: Node): string {
  if (root.nodeType === Node.TEXT_NODE) return root.textContent ?? '';
  if (root instanceof HTMLImageElement)
    return root.dataset.qqface ? `[qqface:${root.dataset.qqface}]` : '';
  if (root instanceof HTMLBRElement) {
    const parent = root.parentElement;
    const placeholder =
      parent &&
      (parent.childNodes.length === 1 ||
        (root === parent.lastChild && root.previousSibling instanceof HTMLBRElement));
    return root.hasAttribute('data-editor-tail') || placeholder ? '' : '\n';
  }
  return Array.from(root.childNodes)
    .map((node, index) => {
      const block = node instanceof HTMLElement && ['DIV', 'P'].includes(node.tagName);
      return (block && index > 0 ? '\n' : '') + readEditor(node);
    })
    .join('');
}

export function editorSelection(editor: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
  const prefix = range.cloneRange();
  prefix.selectNodeContents(editor);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = readEditor(prefix.cloneContents()).length;
  prefix.setEnd(range.endContainer, range.endOffset);
  return { start, end: readEditor(prefix.cloneContents()).length };
}

export function selectEditor(editor: HTMLElement, start: number, end = start) {
  const point = (offset: number): [Node, number] => {
    let remaining = offset;
    const walk = (parent: Node): [Node, number] | null => {
      for (const [index, node] of Array.from(parent.childNodes).entries()) {
        if (node instanceof HTMLElement && ['DIV', 'P'].includes(node.tagName) && index > 0) {
          if (remaining === 0) return [parent, index];
          remaining--;
        }
        if (
          node.nodeType === Node.TEXT_NODE ||
          node instanceof HTMLImageElement ||
          node instanceof HTMLBRElement
        ) {
          const length = readEditor(node).length;
          if (node.nodeType === Node.TEXT_NODE && remaining <= length) return [node, remaining];
          if (remaining < length) return [parent, index];
          remaining -= length;
        } else {
          const result = walk(node);
          if (result) return result;
        }
      }
      return null;
    };
    const result = walk(editor);
    if (result) return result;
    return [editor, editor.childNodes.length - (editor.lastChild instanceof HTMLBRElement ? 1 : 0)];
  };
  const range = document.createRange();
  range.setStart(...point(start));
  range.setEnd(...point(end));
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function insertEditorEmoji(editor: HTMLElement, id: string, start: number, end: number) {
  editor.focus({ preventScroll: true });
  selectEditor(editor, start, end);
  const image = document.createElement('img');
  image.src = `${import.meta.env.BASE_URL}qface/${id}.apng`;
  image.alt = `[qqface:${id}]`;
  image.dataset.qqface = id;
  image.contentEditable = 'false';
  image.draggable = false;
  image.width = image.height = 24;
  // Only this locally constructed image enters insertHTML; user HTML is never accepted.
  return document.execCommand('insertHTML', false, image.outerHTML);
}

export function renderEditor(editor: HTMLElement, text: string) {
  const fragment = document.createDocumentFragment();
  for (const part of parseEmojiText(text)) {
    if (!part.id) fragment.append(document.createTextNode(part.text));
    else {
      const image = document.createElement('img');
      image.src = `${import.meta.env.BASE_URL}qface/${part.id}.apng`;
      image.alt = part.text;
      image.dataset.qqface = part.id;
      image.contentEditable = 'false';
      image.draggable = false;
      image.width = 24;
      image.height = 24;
      fragment.append(image);
    }
  }
  if (text.endsWith('\n')) {
    const tail = document.createElement('br');
    tail.dataset.editorTail = '';
    fragment.append(tail);
  }
  editor.replaceChildren(fragment);
}
