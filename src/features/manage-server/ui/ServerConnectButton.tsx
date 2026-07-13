import { Activity, PlugZap } from 'lucide-react';
import { IconButton, Spinner, Tooltip, notify } from '@shared/ui';
import {
  describeServerCheck,
  useConnectServer,
  usePingServer,
  type Server,
} from '@entities/server';

type CheckMode = 'connect' | 'ping';

type BaseProps = {
  server: Server;
  size?: 'sm' | 'md' | 'lg';
};

const CONFIG: Record<CheckMode, { icon: typeof PlugZap; label: string }> = {
  connect: { icon: PlugZap, label: 'Connect & collect info' },
  ping: { icon: Activity, label: 'Check availability' },
};

/**
 * Кнопка SSH-проверки сохранённого сервера. mode:
 *  - connect — вход (ключ → пароль) + проверка сессии + сбор фактов (os/cpu/…);
 *  - ping — health-check, переключает is_active в обе стороны.
 * Спиннер во время запроса (вход может занять ~8–12 сек), блокировка повторных кликов, результат — тостом.
 */
function CheckButton({ server, size = 'sm', mode }: BaseProps & { mode: CheckMode }) {
  const connectMut = useConnectServer();
  const pingMut = usePingServer();
  const mut = mode === 'connect' ? connectMut : pingMut;
  const { icon: Icon, label } = CONFIG[mode];

  const handle = () => {
    if (mut.isPending) return;
    mut.mutate(server.id, {
      onSuccess: (res) => {
        const { tone, title } = describeServerCheck(res);
        notify[tone](title, { description: res.message, code: res.status });
      },
      onError: () => {
        notify.error(mode === 'connect' ? 'Connection check failed' : 'Availability check failed');
      },
    });
  };

  return (
    <Tooltip content={label}>
      <IconButton
        aria-label={label}
        size={size}
        onClick={handle}
        disabled={mut.isPending}
        aria-busy={mut.isPending || undefined}
      >
        {mut.isPending ? <Spinner size={13} label="Checking" /> : <Icon size={13} aria-hidden />}
      </IconButton>
    </Tooltip>
  );
}

export type ServerConnectButtonProps = BaseProps;

export function ServerConnectButton(props: ServerConnectButtonProps) {
  return <CheckButton {...props} mode="connect" />;
}

export function ServerPingButton(props: ServerConnectButtonProps) {
  return <CheckButton {...props} mode="ping" />;
}
