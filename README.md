# BMS Web UI

## Стек

- **React 18** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Vite 5** + **Tailwind CSS** с дизайн-токенами в CSS variables (**Inter** + **JetBrains Mono**)
- **Vitest** + **Testing Library**

Пустой каркас: только сборка/деплой и дизайн-токены. Функционал (роутинг, стейт-менеджмент, формы, API-слой и т.д.) будет собран заново поверх этой базы.

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
