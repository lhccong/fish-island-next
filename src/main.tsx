import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/app/styles/global.css';
import '@/app/styles/color-modes.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
import '@/app/styles/reader-tokens.css';
import '@/app/styles/pet-tokens.css';
import '@/app/styles/farm-tokens.css';
import '@/app/styles/pixel-tokens.css';
