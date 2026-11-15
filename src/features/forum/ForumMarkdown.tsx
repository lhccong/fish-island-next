import { createElement, useMemo, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ForumImage } from './ForumImage';
import styles from './Forum.module.css';

function renderNode(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement)) return null;
  const tag = node.tagName.toLowerCase();
  if (tag === 'img') {
    const src = node.getAttribute('src') || '';
    return /^https?:\/\//i.test(src) ? (
      <ForumImage key={key} src={src} alt={node.getAttribute('alt') || ''} />
    ) : null;
  }
  if (tag === 'input') return <span key={key}>{node.hasAttribute('checked') ? '☑' : '☐'} </span>;
  const props: Record<string, unknown> = { key };
  if (tag === 'a') {
    const href = node.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) {
      props.href = href;
      props.target = '_blank';
      props.rel = 'noopener noreferrer';
    }
  }
  return createElement(
    tag === 'p' && node.querySelector('img') ? 'div' : tag,
    props,
    ...(tag === 'br' || tag === 'hr' ? [] : Array.from(node.childNodes, renderNode)),
  );
}
export function ForumMarkdown({ content }: { content: string }) {
  const nodes = useMemo(() => {
    const html = DOMPurify.sanitize(
      marked.parse(
        content.replace(
          /\[img\](https?:\/\/[^\s<>]+?)\[\/img\]/gi,
          (_match, url: string) => `<img src="${url.replaceAll('"', '&quot;')}" alt="评论图片">`,
        ),
        { async: false, gfm: true, breaks: true },
      ),
      {
        ALLOWED_TAGS: [
          'p',
          'br',
          'hr',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'strong',
          'em',
          'del',
          'a',
          'img',
          'ul',
          'ol',
          'li',
          'blockquote',
          'pre',
          'code',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'input',
          'div',
          'span',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'type', 'checked'],
      },
    );
    return Array.from(
      new DOMParser().parseFromString(html, 'text/html').body.childNodes,
      renderNode,
    );
  }, [content]);
  return <div className={styles.markdown}>{nodes}</div>;
}
