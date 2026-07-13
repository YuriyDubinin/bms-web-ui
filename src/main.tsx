import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { AppProviders, setupSession } from '@app/providers';
import { useSessionStore } from '@entities/session';
import { useUIStore } from '@shared/lib';
import '@app/styles/globals.css';

// 1) Регистрируем token-провайдер и обработчик auth-ошибок ДО любых запросов.
setupSession();

// 2) Гидрация: если в localStorage есть валидный токен — поднимаем сессию и сверяем с /me.
//    Не await'им — store сам переведёт status из 'idle' в 'loading' → 'authenticated'/'unauthenticated'.
void useSessionStore.getState().hydrate();

// 3) DEV-only: пробрасываем стора на window для отладки/живой проверки сценариев.
if (import.meta.env.DEV) {
  const w = window as unknown as {
    __sessionStore?: typeof useSessionStore;
    __uiStore?: typeof useUIStore;
  };
  w.__sessionStore = useSessionStore;
  w.__uiStore = useUIStore;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
