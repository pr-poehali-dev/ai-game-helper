import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import {
  fetchStatus,
  fetchTools,
  fetchKeys,
  createKey,
  revokeKey,
  MCP_ENDPOINT,
  type ServerStatus,
  type McpTool,
  type ApiKey,
} from '@/lib/api';

type Tab = 'overview' | 'logs' | 'config' | 'apikey' | 'api';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Обзор', icon: 'LayoutDashboard' },
  { id: 'logs', label: 'Логи', icon: 'ScrollText' },
  { id: 'config', label: 'Конфигурация', icon: 'Settings2' },
  { id: 'apikey', label: 'API-ключ', icon: 'KeyRound' },
  { id: 'api', label: 'API', icon: 'Code2' },
];

const lvlColor: Record<string, string> = {
  INFO: 'text-sky-400',
  OK: 'text-primary',
  WARN: 'text-warning',
  ERR: 'text-destructive',
};

interface LogLine {
  t: string;
  lvl: string;
  msg: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallthrough */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

const Index = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [clock, setClock] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [statusErr, setStatusErr] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchStatus();
      setStatus(s);
      setStatusErr(false);
      const t = new Date().toLocaleTimeString('ru-RU');
      setLogs((p) =>
        [
          ...p.slice(-40),
          { t, lvl: 'OK', msg: `status poll → ${s.status} · uptime ${s.uptime_seconds}s · ${s.total_requests} req` },
        ].slice(-40),
      );
    } catch {
      setStatusErr(true);
      const t = new Date().toLocaleTimeString('ru-RU');
      setLogs((p) => [...p.slice(-40), { t, lvl: 'ERR', msg: 'не удалось получить статус сервера' }]);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const i = setInterval(loadStatus, 5000);
    return () => clearInterval(i);
  }, [loadStatus]);

  useEffect(() => {
    const i = setInterval(() => setClock(new Date().toLocaleTimeString('ru-RU')), 1000);
    return () => clearInterval(i);
  }, []);

  const select = (id: Tab) => {
    setTab(id);
    setMenuOpen(false);
  };

  const SidebarContent = (
    <>
      <div className="px-5 h-16 flex items-center gap-3 border-b border-border">
        <div className="size-9 rounded-md bg-primary/15 glow-border flex items-center justify-center">
          <Icon name="Hexagon" className="text-primary" size={20} />
        </div>
        <div className="leading-tight">
          <div className="font-mono font-bold text-sm tracking-tight">MCP·CORE</div>
          <div className="text-[10px] text-muted-foreground font-mono">game-data server</div>
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => select(n.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
              tab === n.id
                ? 'bg-primary/12 text-primary glow-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Icon name={n.icon} size={17} />
            {n.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`size-2 rounded-full ${statusErr ? 'bg-destructive' : 'bg-primary pulse-dot'}`} />
          <span className={statusErr ? 'text-destructive' : 'text-primary'}>{statusErr ? 'OFFLINE' : 'ONLINE'}</span>
          <span className="text-muted-foreground ml-auto">v0.1.0</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 backdrop-blur-sm flex-col fixed h-screen z-30 hidden md:flex">
        {SidebarContent}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card flex flex-col fade-up">
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 md:ml-60 min-h-screen grid-bg w-full">
        <header className="h-16 border-b border-border px-4 sm:px-8 flex items-center justify-between bg-background/60 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden size-9 rounded-md border border-border flex items-center justify-center text-muted-foreground shrink-0"
            >
              <Icon name="Menu" size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
                {NAV.find((n) => n.id === tab)?.label}
              </h1>
              <p className="text-xs text-muted-foreground font-mono truncate">MCP game-data · live</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <span className="font-mono text-sm text-muted-foreground hidden lg:block">{clock}</span>
            <button
              onClick={() => setTab('apikey')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition glow-border"
            >
              <Icon name="Plug" size={15} />
              <span className="hidden sm:inline">Подключить</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-6xl">
          {tab === 'overview' && <Overview status={status} statusErr={statusErr} />}
          {tab === 'logs' && <Logs logs={logs} />}
          {tab === 'config' && <Config />}
          {tab === 'apikey' && <ApiKeyPanel />}
          {tab === 'api' && <Api />}
        </div>
      </main>
    </div>
  );
};

const Overview = ({ status, statusErr }: { status: ServerStatus | null; statusErr: boolean }) => {
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

const Logs = ({ logs }: { logs: LogLine[] }) => (
  <div className="fade-up rounded-xl border border-border bg-[#06100c] overflow-hidden">
    <div className="flex items-center gap-2 px-4 h-11 border-b border-border bg-card/50">
      <span className="size-3 rounded-full bg-destructive/70" />
      <span className="size-3 rounded-full bg-warning/70" />
      <span className="size-3 rounded-full bg-primary/70" />
      <span className="ml-3 font-mono text-xs text-muted-foreground hidden sm:inline">mcp-core — live poll log</span>
      <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-primary">
        <span className="size-1.5 rounded-full bg-primary pulse-dot" /> live
      </span>
    </div>
    <div className="p-4 font-mono text-xs sm:text-[13px] leading-relaxed max-h-[60vh] overflow-y-auto overflow-x-auto scrollbar-thin">
      {logs.length === 0 && <div className="text-muted-foreground">ожидание событий…</div>}
      {logs.map((l, i) => (
        <div key={i} className="flex gap-2 sm:gap-3 py-0.5 hover:bg-white/5 px-2 -mx-2 rounded whitespace-nowrap sm:whitespace-normal">
          <span className="text-muted-foreground shrink-0">{l.t}</span>
          <span className={`shrink-0 w-10 ${lvlColor[l.lvl]}`}>{l.lvl}</span>
          <span className="text-foreground/90">{l.msg}</span>
        </div>
      ))}
    </div>
  </div>
);

const Config = () => (
  <div className="fade-up grid lg:grid-cols-2 gap-4">
    <div className="rounded-xl border border-border bg-card/50 p-5 sm:p-6 space-y-5">
      <h3 className="font-semibold flex items-center gap-2">
        <Icon name="Cable" size={18} className="text-primary" /> Параметры подключения
      </h3>
      {[
        { l: 'Remote MCP server URL', v: MCP_ENDPOINT, icon: 'Link' },
        { l: 'Транспорт', v: 'HTTP / JSON-RPC 2.0', icon: 'Network' },
        { l: 'Протокол', v: 'mcp-2024-11-05', icon: 'Boxes' },
        { l: 'Авторизация', v: 'X-Auth-Token: <api-key>', icon: 'KeyRound' },
      ].map((f) => (
        <div key={f.l}>
          <label className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mb-1.5">
            <Icon name={f.icon} size={13} /> {f.l}
          </label>
          <div className="flex items-center px-3 h-10 rounded-md bg-secondary border border-border font-mono text-xs sm:text-sm overflow-x-auto scrollbar-thin">
            <span className="whitespace-nowrap">{f.v}</span>
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-xl border border-border bg-card/50 p-5 sm:p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Icon name="Info" size={18} className="text-primary" /> Как подключить в Claude
      </h3>
      <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
        <li>Откройте <span className="text-foreground">Settings → Connectors → Add custom connector</span></li>
        <li>В поле <span className="text-foreground">Remote MCP server URL</span> вставьте адрес выше</li>
        <li>OAuth-поля оставьте пустыми</li>
        <li>Нажмите <span className="text-foreground">Add</span> — сервер появится в списке инструментов</li>
      </ol>
    </div>
  </div>
);

const ApiKeyPanel = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | 'cfg' | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await fetchKeys());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async (text: string, id: number | 'cfg') => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const k = await createKey('claude-connector');
      setRevealed((r) => ({ ...r, [k.id]: true }));
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    await revokeKey(id);
    await load();
  };

  const active = keys.filter((k) => !k.revoked);
  const primary = active[0];
  const mask = (k: string) => k.slice(0, 9) + '•'.repeat(24) + k.slice(-4);

  const cfg = primary
    ? `{
  "mcpServers": {
    "game-core": {
      "url": "${MCP_ENDPOINT}",
      "headers": { "X-Auth-Token": "${revealed[primary.id] ? primary.key : mask(primary.key)}" }
    }
  }
}`
    : '';

  return (
    <div className="fade-up space-y-4 max-w-3xl">
      <section className="rounded-xl border border-border bg-card/50 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-md bg-primary/15 glow-border flex items-center justify-center shrink-0">
              <Icon name="KeyRound" className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">API-ключи MCP</h3>
              <p className="text-xs text-muted-foreground">Настоящие ключи из базы — работают для подключения</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Icon name={creating ? 'Loader' : 'Plus'} size={15} className={creating ? 'animate-spin' : ''} />
            Новый ключ
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {loading && <div className="text-sm text-muted-foreground font-mono">загрузка ключей…</div>}
          {!loading && active.length === 0 && (
            <div className="text-sm text-muted-foreground">Активных ключей нет. Создайте новый.</div>
          )}
          {active.map((k) => (
            <div key={k.id} className="rounded-lg border border-border bg-secondary/40 p-3">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/15 text-primary">{k.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {k.request_count} запросов · создан {new Date(k.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center px-3 h-10 rounded-md bg-background border border-border font-mono text-xs sm:text-sm overflow-x-auto scrollbar-thin">
                  <span className="whitespace-nowrap">{revealed[k.id] ? k.key : mask(k.key)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                    className="h-10 px-3 rounded-md border border-border bg-secondary hover:bg-muted transition flex items-center justify-center"
                  >
                    <Icon name={revealed[k.id] ? 'EyeOff' : 'Eye'} size={16} />
                  </button>
                  <button
                    onClick={() => handleCopy(k.key, k.id)}
                    className="h-10 px-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition flex items-center justify-center gap-2 grow sm:grow-0"
                  >
                    <Icon name={copiedId === k.id ? 'Check' : 'Copy'} size={16} />
                    {copiedId === k.id ? 'Готово' : 'Копировать'}
                  </button>
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="h-10 px-3 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 transition flex items-center justify-center"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {primary && (
        <section className="rounded-xl border border-border bg-[#06100c] overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-10 border-b border-border bg-card/50">
            <Icon name="FileJson" size={15} className="text-primary" />
            <span className="font-mono text-xs text-muted-foreground">claude_desktop_config.json</span>
            <button
              onClick={() => handleCopy(cfg, 'cfg')}
              className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <Icon name={copiedId === 'cfg' ? 'Check' : 'Copy'} size={14} />
              {copiedId === 'cfg' ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <pre className="p-4 font-mono text-xs sm:text-[13px] text-foreground/90 overflow-x-auto scrollbar-thin">{cfg}</pre>
        </section>
      )}

      <section className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex gap-3">
        <Icon name="TriangleAlert" className="text-warning shrink-0" size={18} />
        <p className="text-sm text-muted-foreground">
          Храните ключ в секрете. Кнопка <span className="text-foreground">с корзиной</span> мгновенно отзывает ключ —
          он перестаёт работать.
        </p>
      </section>
    </div>
  );
};

const Api = () => {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetchTools()
      .then(setTools)
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-up space-y-4">
      <div className="rounded-xl border border-border bg-card/50 p-5 flex items-center gap-4">
        <Icon name="BookOpen" size={22} className="text-primary shrink-0" />
        <div>
          <h3 className="font-semibold">Инструменты MCP-сервера</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? 'загрузка…' : `${tools.length} реальных методов · отдаются сервером`}
          </p>
        </div>
      </div>

      {err && <div className="text-sm text-destructive font-mono">Не удалось загрузить инструменты с сервера.</div>}

      {tools.map((t, i) => (
        <div
          key={t.name}
          className="fade-up rounded-xl border border-border bg-card/50 p-5 hover:glow-border transition-all"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-primary/15 text-primary">TOOL</span>
            <code className="font-mono text-sm text-primary font-semibold break-all">{t.name}</code>
            <span className="w-full sm:w-auto sm:ml-auto font-mono text-xs text-muted-foreground">
              params: {Object.keys(t.inputSchema?.properties ?? {}).join(', ') || '—'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{t.description}</p>
        </div>
      ))}
    </div>
  );
};

export default Index;
