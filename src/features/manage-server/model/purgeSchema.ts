import { z } from 'zod';

/** Регэкспы бэка (см. описание POST /api/servers/remote/images/purge). */
const IMAGE_RE = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?(\/[a-z0-9]([a-z0-9._-]*[a-z0-9])?)*$/;
const TAG_RE = /^[a-zA-Z0-9_][a-zA-Z0-9._-]*$/;
const CONTAINER_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export const purgeFormSchema = z.object({
  image: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(255, 'Max 255 characters')
    .regex(IMAGE_RE, 'Invalid image name'),
  tag: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(128, 'Max 128 characters')
    .regex(TAG_RE, 'Invalid tag (no leading . or -)'),
  /** Опционально: точное имя контейнера. Пусто → поиск только по образу. */
  container_name: z
    .string()
    .trim()
    .max(255, 'Max 255 characters')
    .refine((v) => v === '' || CONTAINER_NAME_RE.test(v), 'Invalid container name'),
});

export type PurgeFormValues = z.infer<typeof purgeFormSchema>;
