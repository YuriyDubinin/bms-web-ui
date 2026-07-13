import { z } from 'zod';
import { DEPLOY_RESTART_POLICIES } from '@entities/server';

/** Регэкспы бэка (см. описание POST /api/servers/remote/deploy). */
const IMAGE_RE = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?(\/[a-z0-9]([a-z0-9._-]*[a-z0-9])?)*$/;
const TAG_RE = /^[a-zA-Z0-9_][a-zA-Z0-9._-]*$/;
const CONTAINER_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/** Порт в форме держим строкой (текстовый ввод), на submit приводим к числу. */
const portFieldSchema = z
  .string()
  .trim()
  .refine((v) => /^\d+$/.test(v) && +v >= 1 && +v <= 65535, '1–65535');

export const deployFormSchema = z.object({
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
  container_name: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(255, 'Max 255 characters')
    .regex(CONTAINER_NAME_RE, 'Invalid container name'),
  ports: z
    .array(
      z.object({
        host: portFieldSchema,
        container: portFieldSchema,
      }),
    )
    .min(1, 'At least one port')
    .max(20, 'Max 20 ports')
    .superRefine((arr, ctx) => {
      const seen = new Set<string>();
      arr.forEach((p, i) => {
        if (!/^\d+$/.test(p.host)) return;
        if (seen.has(p.host)) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'host'],
            message: 'Host port must be unique',
          });
        }
        seen.add(p.host);
      });
    }),
  restart_policy: z.enum(DEPLOY_RESTART_POLICIES),
});

export type DeployFormValues = z.infer<typeof deployFormSchema>;
