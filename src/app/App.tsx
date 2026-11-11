import { BrowserRouter, Route, Routes } from 'react-router';
import { InitializationPage } from '@/app/pages/InitializationPage';
import { SkinProvider } from '@/app/providers/SkinProvider';

export function App() {
  return (
    <BrowserRouter>
      <SkinProvider>
        <Routes>
          <Route path="/" element={<InitializationPage />} />
          <Route
            path="*"
            element={
              <main>
                <h1>页面不存在</h1>
                <a href="/">返回首页</a>
              </main>
            }
          />
        </Routes>
      </SkinProvider>
    </BrowserRouter>
  );
}
