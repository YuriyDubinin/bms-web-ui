/**
 * Базовый URL API берём из переменной окружения Vite (VITE_API_BASE_URL),
 * никогда не хардкодим. Значение уже включает суффикс `/api`
 * (например http://37.1.215.81:28080/api) — так задаёт бэкенд-документация.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';
