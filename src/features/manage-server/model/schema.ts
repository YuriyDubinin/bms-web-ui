import { z } from 'zod';
import {
  SERVER_AUTH_METHODS,
  SERVER_AUTH_METHOD_LABELS,
  SERVER_ENVIRONMENTS,
  SERVER_ENVIRONMENT_LABELS,
  SERVER_PROTOCOLS,
  SERVER_PROTOCOL_LABELS,
} from '@entities/server';

export const serverFormSchema = z.object({
  name: z.string().trim().min(2, 'Must be 2–100 characters').max(100, 'Must be 2–100 characters'),
  host: z.string().trim().min(1, 'Required').max(255, 'Too long'),
  // Порт держим строкой в форме (текстовый ввод), на submit приводим к числу.
  port: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && +v >= 1 && +v <= 65535), 'Must be 1–65535'),
  protocol: z.enum(SERVER_PROTOCOLS),
  username: z.string().trim().max(255, 'Too long'),
  auth_method: z.enum(SERVER_AUTH_METHODS),
  password: z.string(),
  private_key: z.string(),
  private_key_passphrase: z.string(),
  description: z.string().trim().max(1000, 'Too long'),
  environment: z.enum(SERVER_ENVIRONMENTS),
  provider: z.string().trim().max(100, 'Too long'),
  location: z.string().trim().max(100, 'Too long'),
  tags: z.array(z.string().trim().min(1).max(50, 'Tag too long')).max(30, 'Too many tags'),
  is_active: z.boolean(),
  /** Только UI: пометить «очистить сохранённый секрет» (edit). */
  clear_password: z.boolean(),
  clear_private_key: z.boolean(),
});

export type ServerFormValues = z.infer<typeof serverFormSchema>;

// Подписи (LABELS) живут в @entities/server (общие для display-уровня).
// Здесь оставляем только OPTIONS-массивы — они UX-специфичны для селектов формы.

export const SERVER_ENVIRONMENT_OPTIONS = SERVER_ENVIRONMENTS.map((e) => ({
  value: e,
  label: SERVER_ENVIRONMENT_LABELS[e],
}));

export const SERVER_PROTOCOL_OPTIONS = SERVER_PROTOCOLS.map((p) => ({
  value: p,
  label: SERVER_PROTOCOL_LABELS[p],
}));

export const SERVER_AUTH_METHOD_OPTIONS = SERVER_AUTH_METHODS.map((m) => ({
  value: m,
  label: SERVER_AUTH_METHOD_LABELS[m],
}));

/** Поля формы, к которым можно привязать серверные ошибки валидации. */
export const SERVER_FORM_FIELDS = [
  'name',
  'host',
  'port',
  'protocol',
  'username',
  'auth_method',
  'password',
  'private_key',
  'private_key_passphrase',
  'description',
  'environment',
  'provider',
  'location',
  'tags',
] as const;
