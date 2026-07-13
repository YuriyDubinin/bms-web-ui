import { Activity, PlugZap } from 'lucide-react';
import { IconButton, Spinner, Tooltip, notify } from '@shared/ui';
import {
  describeRegistryCheck,
  useConnectRegistry,
  usePingRegistry,
  type Registry,
} from '@entities/registry';

type CheckMode = 'connect' | 'ping';

type BaseProps = {
  registry: Registry;
  size?: 'sm' | 'md' | 'lg';
};

const CONFIG: Record<CheckMode, { icon: typeof PlugZap; label: string }> = {
  connect: { icon: PlugZap, label: 'Connect & activate' },
  ping: { icon: Activity, label: 'Health check' },
};

/**
 * Кнопка проверки сохранённого реестра. mode:
 *  - connect — логин по email+password, при успехе включает запись;
 *  - ping — health-check, переключает is_active в обе стороны.
 * Спиннер во время запроса, блокировка повторных кликов, результат — тостом.
 */
function CheckButton({ registry, size = 'sm', mode }: BaseProps & { mode: CheckMode }) {
  const connectMut = useConnectRegistry();
  const pingMut = usePingRegistry();
  const mut = mode === 'connect' ? connectMut : pingMut;
  const { icon: Icon, label } = CONFIG[mode];

  const handle = () => {
    if (mut.isPending) return;
    mut.mutate(registry.id, {
      onSuccess: (res) => {
        const { tone, title } = describeRegistryCheck(res);
        notify[tone](title, { description: res.message, code: res.status });
      },
      onError: () => {
        notify.error(mode === 'connect' ? 'Connection check failed' : 'Health check failed');
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

export type RegistryConnectButtonProps = BaseProps;

export function RegistryConnectButton(props: RegistryConnectButtonProps) {
  return <CheckButton {...props} mode="connect" />;
}

export function RegistryPingButton(props: RegistryConnectButtonProps) {
  return <CheckButton {...props} mode="ping" />;
}
