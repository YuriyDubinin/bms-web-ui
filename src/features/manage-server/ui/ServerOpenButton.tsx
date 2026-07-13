import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { IconButton, Tooltip } from '@shared/ui';
import type { Server } from '@entities/server';

export type ServerOpenButtonProps = {
  server: Server;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Главное действие на карточке/строке сервера — открыть страницу сервера
 * с вкладками Main / CI-CD. Визуально выделена акцентным **ободком и иконкой**
 * (без заливки), чтобы отличаться от ghost-иконок connect/ping/edit/delete.
 *
 * Активна только когда сервер подключён (`is_active === true`). В выключенном
 * состоянии тултип объясняет, почему действие недоступно.
 */
export function ServerOpenButton({ server, size = 'sm' }: ServerOpenButtonProps) {
  const navigate = useNavigate();
  const enabled = server.is_active;
  const tooltip = enabled ? 'Open server' : 'Server is not connected — ping or connect first';

  return (
    <Tooltip content={tooltip}>
      <IconButton
        aria-label={tooltip}
        size={size}
        disabled={!enabled}
        onClick={() => navigate(`/servers/${server.id}`)}
        // Акцентный ободок + акцентная иконка, без фона. Hover оставляем
        // тонким accent-muted, чтобы при наведении не превращался в обычную ghost-иконку.
        className="border-accent text-accent hover:bg-accent-muted hover:text-accent"
      >
        <LogIn size={13} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}
