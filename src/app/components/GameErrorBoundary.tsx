import { Component, type ReactNode } from 'react';
import styles from './GameErrorBoundary.module.css';

export class GameErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className={styles.error} role="alert">
        <h1>游戏暂时无法打开</h1>
        <p>加载或运行遇到了问题，已保存的成就不会因此删除。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新加载
        </button>
        <a href="/discover/games">返回游戏目录</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
