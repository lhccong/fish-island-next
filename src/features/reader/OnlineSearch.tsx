import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, LoaderCircle, Search } from 'lucide-react';
import type { Book, ReaderService, SearchPage } from '@/domain/reader';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import type { ReaderController } from './controller';
import { BookSearchResult } from './BookSearchResult';
import { useReader } from './use-reader';
import styles from './OnlineSearch.module.css';

export function OnlineSearch({
  controller,
  service,
}: {
  controller: ReaderController;
  service: ReaderService;
}) {
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [lastIndex, setLastIndex] = useState(-1);
  const [result, setResult] = useState<SearchPage>({ books: [], lastIndex: -1, hasMore: false });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [retryMore, setRetryMore] = useState(false);
  const books = useReader(controller, (state) => state.books);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const search = async (more: boolean) => {
    const key = more ? query : keyword.trim();
    if (!key) return;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    const previous = more ? result.books : [];
    const nextPage = more ? page + 1 : 1;
    if (!more) {
      setQuery(key);
      setResult({ books: [], lastIndex: -1, hasMore: false });
    }
    setStatus('loading');
    setError('');
    setRetryMore(more);
    const merge = (incoming: Book[]) => [
      ...new Map([...previous, ...incoming].map((book) => [book.id, book])).values(),
    ];
    try {
      const state = controller.getState();
      const response = await service.search(
        { baseUrl: state.settings.apiBaseUrl, accessToken: state.accessToken },
        key,
        nextPage,
        more ? lastIndex : -1,
        abort.signal,
        (batch) => {
          if (!abort.signal.aborted) setResult({ ...batch, books: merge(batch.books) });
        },
      );
      if (abort.signal.aborted) return;
      setResult({ ...response, books: merge(response.books) });
      setPage(nextPage);
      setLastIndex(response.lastIndex);
      setStatus('ready');
    } catch (error) {
      if (!abort.signal.aborted) {
        setStatus('error');
        setError(error instanceof Error ? error.message : '搜索失败，请稍后重试');
      }
    }
  };
  const hasResults = result.books.length > 0;
  return (
    <div className={styles.search}>
      <form
        className={styles.searchBar}
        onSubmit={(event) => {
          event.preventDefault();
          void search(false);
        }}
      >
        <div className={styles.field}>
          <Search size={19} aria-hidden="true" />
          <input
            aria-label="书名或作者"
            placeholder="输入书名或作者，例如：剑来"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <Button className={styles.searchButton} disabled={!keyword.trim()} type="submit">
          搜索
        </Button>
      </form>
      {error && (
        <div role="alert" className={styles.error}>
          <AlertCircle size={19} aria-hidden="true" />
          <div>
            <strong>暂时没有连接上书源</strong>
            <p>{error}</p>
          </div>
          <Button variant="secondary" onClick={() => void search(retryMore)}>
            重试搜索
          </Button>
        </div>
      )}
      {hasResults ? (
        <>
          <div className={styles.resultHeader}>
            <span>
              搜索结果 <strong>{result.books.length}</strong>
            </span>
            <small>不同书源可分别加入书架</small>
          </div>
          <ScrollArea label="在线搜索结果" className={styles.results ?? ''}>
            {result.books.map((book) => {
              const added = books.some(
                (item) =>
                  item.id === book.id ||
                  (item.url === book.url && item.sourceInfo.url === book.sourceInfo.url),
              );
              return (
                <BookSearchResult
                  key={book.id}
                  book={book}
                  added={added}
                  onAdd={() => controller.getState().addBook(book)}
                />
              );
            })}
            {result.hasMore && (
              <div className={styles.more}>
                <Button
                  variant="secondary"
                  disabled={status === 'loading'}
                  onClick={() => void search(true)}
                >
                  加载更多
                </Button>
              </div>
            )}
          </ScrollArea>
        </>
      ) : (
        status !== 'error' && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              {status === 'loading' ? (
                <LoaderCircle size={28} aria-hidden="true" />
              ) : (
                <BookOpen size={28} aria-hidden="true" />
              )}
            </span>
            <h3>
              {status === 'loading'
                ? '正在寻找好书'
                : status === 'ready'
                  ? '没有找到相关书籍'
                  : '下一本好书，从这里开始'}
            </h3>
            <p>
              {status === 'loading'
                ? '正在连接多个书源，结果会陆续出现。'
                : status === 'ready'
                  ? '试试更短的书名，或换一个作者名。'
                  : '输入书名或作者搜索，挑选你喜欢的书源。'}
            </p>
          </div>
        )
      )}
      {status === 'loading' && (
        <p className={styles.loading} role="status">
          <LoaderCircle size={15} aria-hidden="true" />
          正在搜索书源…
        </p>
      )}
    </div>
  );
}
