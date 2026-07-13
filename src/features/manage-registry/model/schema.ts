import { z } from 'zod';
import { REGISTRY_TYPES, type RegistryType } from '@entities/registry';

export const registryFormSchema = z.object({
  name: z.string().trim().min(2, 'Must be 2–100 characters').max(100, 'Must be 2–100 characters'),
  type: z.enum(REGISTRY_TYPES),
  url: z.string().trim().min(1, 'Required').max(500, 'Too long'),
  username: z.string().trim().max(255, 'Too long'),
  password: z.string().max(255, 'Too long'),
  // email теперь обязателен — используется как логин в аккаунт реестра.
  email: z.string().trim().min(1, 'Required').email('Invalid email'),
  namespace: z.string().trim().max(255, 'Too long'),
  is_default: z.boolean(),
  is_active: z.boolean(),
  insecure: z.boolean(),
  /** Только UI: пометить «очистить сохранённые креды» (edit). */
  clear_credentials: z.boolean(),
});

export type RegistryFormValues = z.infer<typeof registryFormSchema>;

/** Человекочитаемые подписи типов для селекта. */
export const REGISTRY_TYPE_LABELS: Record<RegistryType, string> = {
  DOCKERHUB: 'Docker Hub',
  GHCR: 'GitHub (GHCR)',
  GITLAB: 'GitLab',
  HARBOR: 'Harbor',
  ECR: 'AWS ECR',
  GENERIC: 'Generic',
};

export const REGISTRY_TYPE_OPTIONS = REGISTRY_TYPES.map((t) => ({
  value: t,
  label: REGISTRY_TYPE_LABELS[t],
}));

/** Преднастроенные URL по типу — UX-помощь для автоподстановки. */
export const REGISTRY_URL_PRESETS: Record<RegistryType, string> = {
  DOCKERHUB: 'https://registry-1.docker.io',
  GHCR: 'https://ghcr.io',
  GITLAB: 'https://registry.gitlab.com',
  HARBOR: '',
  ECR: '',
  GENERIC: '',
};

/** Поля формы, к которым можно привязать серверные ошибки валидации. */
export const REGISTRY_FORM_FIELDS = [
  'name',
  'type',
  'url',
  'username',
  'password',
  'email',
  'namespace',
] as const;
