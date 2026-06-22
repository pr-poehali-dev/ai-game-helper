import Icon from '@/components/ui/icon';
import { MCP_ENDPOINT, type ServerStatus } from '@/lib/api';

function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

interface Props {
  status: ServerStatus | null;
  statusErr: boolean;
}

export const TabOverview = ({ status, statusErr }: Props) => {
  const metrics = [
    { label: 'Аптайм', value: status ? fmtUptime(status.uptime_seconds) : '—', icon: 'Timer' },
    { label: 'Всего запросов', value: status ? String(status.total_requests) : '—', icon: 'Activity' },
    { label: 'Активные ключи', value: status ? String(status.active_keys) : '—', icon: 'KeyRound' },
    { label: 'Инструментов', value: status ? String(status.tools_count) : '—', icon: 'Wrench' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="fade-up rounded-xl border border-border bg-card/50 p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`size-2.5 rounded-full ${statusErr ? 'bg-destructive' : 'bg-primary pulse-dot'}`} />
              <span className={`font-mono text-xs uppercase tracking-widest ${statusErr ? 'text-destructive' : 'text-primary'}`}>
                {statusErr ? 'Server unreachable' : `Server ${status?.status ?? '...'}`}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              MCP-сервер <span className="text-primary glow-text">в эфире</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm">
              Данные ниже приходят напрямую с работающего сервера в реальном времени.
              Протокол {status?.protocol ?? 'mcp'} · транспорт {status?.transport ?? 'http'}.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground space-y-1 sm:text-right">
            <div>endpoint</div>
            <div className="text-foreground break-all max-w-[220px]">{MCP_ENDPOINT}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="fade-up rounded-xl border border-border bg-card/50 p-4 sm:p-5 hover:glow-border transition-all"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <Icon name={m.icon} className="text-primary mb-4" size={20} />
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card/50 p-5 sm:p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="ServerCog" size={17} className="text-primary" /> Системная информация
        </h3>
        <div className="space-y-2.5 font-mono text-xs sm:text-sm">
          {[
            ['Запущен', status ? new Date(status.server_started_at).toLocaleString('ru-RU') : '—'],
            ['Серверное время', status ? new Date(status.now).toLocaleString('ru-RU') : '—'],
            ['Отозванных ключей', status ? String(status.revoked_keys) : '—'],
            ['Протокол', status?.protocol ?? '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-foreground text-right break-all">{v}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
