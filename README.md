# BMS Web UI

## Стек

- **React 18** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Vite 5** + **Tailwind CSS** с дизайн-токенами в CSS variables
- **Zustand 5** (UI- и session-стор, persist в localStorage)
- **TanStack Query 5** (server-state, retry-политика, глобальный onError)
- **React Router 6** (BrowserRouter + lazy roots)
- **React Hook Form** + **Zod** (резолвер `@hookform/resolvers/zod`)
- **Framer Motion 11** (page transitions, stagger, fade)
- **Radix UI** (Dialog, Popover, Tooltip — focus trap, ESC, body lock)
- **Sonner** для тостов, **lucide-react** иконки, **Inter** + **JetBrains Mono**
- **Vitest** + **Testing Library**

## Сборка
```
docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_BASE_URL=http://37.1.215.81:28080 \
  -t yuriydubinin100/bms-web-ui:1.0.0 \
  --load .
```

## Запуск
```
docker run -d \
  --name bms-web-ui \
  -p 23080:80 \
  yuriydubinin100/bms-web-ui:1.0.0
```

## Эндпоинты
Базовый URL при локальном запуске: `http://localhost:23080`.

## Деплой
```
docker push yuriydubinin100/bms-web-ui:1.0.0
```

```
docker pull yuriydubinin100/bms-web-ui:1.0.0
```
