import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

type Tab = 'overview' | 'logs' | 'config' | 'api';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Обзор', icon: 'LayoutDashboard' },
  { id: 'logs', label: 'Логи', icon: 'ScrollText' },
  { id: 'config', label: 'Конфигурация', icon: 'Settings2' },
  { id: 'api', label: 'API', icon: 'Code2' },
];

const METRICS = [
  { label: 'Активные матчи', value: '12', delta: '+3', icon: 'Swords', up: true },
  { label: 'Игроки онлайн', value: '847', delta: '+126', icon: 'Users', up: true },
  { label: 'Событий / мин', value: '2.4k', delta: '+12%', icon: 'Activity', up: true },
  { label: 'Задержка', value: '38ms', delta: '-4ms', icon: 'Gauge', up: true },
];

const TOOLS = [
  { name: 'get_match_state', desc: 'Текущее состояние матча: счёт, время, режим', method: 'GET', params: 'match_id' },
  { name: 'get_player_stats', desc: 'Статистика игрока: K/D, точность, очки', method: 'GET', params: 'player_id' },
  { name: 'list_live_events', desc: 'Поток событий матча в реальном времени', method: 'GET', params: 'match_id, since' },
  { name: 'get_server_status', desc: 'Здоровье и нагрузка игрового сервера', method: 'GET', params: '—' },
  { name: 'query_leaderboard', desc: 'Таблица лидеров по сезону/карте', method: 'POST', params: 'map, limit' },
];

const LOG_SEED = [
  { t: '14:22:01', lvl: 'INFO', msg: 'MCP handshake completed — client: claude-desktop' },
  { t: '14:22:03', lvl: 'INFO', msg: 'tool/call get_match_state → match_id=BF-7741' },
  { t: '14:22:03', lvl: 'OK', msg: 'response 200 · 41ms · payload 1.2kb' },
  { t: '14:22:09', lvl: 'INFO', msg: 'tool/call list_live_events → since=t-30s' },
  { t: '14:22:11', lvl: 'WARN', msg: 'game socket reconnect attempt 1/3 · region=eu-west' },
  { t: '14:22:12', lvl: 'OK', msg: 'game socket restored · ping 38ms' },
  { t: '14:22:18', lvl: 'INFO', msg: 'tool/call get_player_stats → player_id=u_99214' },
  { t: '14:22:18', lvl: 'OK', msg: 'response 200 · 27ms · cache HIT' },
];

const lvlColor: Record<string, string> = {
  INFO: 'text-sky-400',
  OK: 'text-primary',
  WARN: 'text-warning',
  ERR: 'text-destructive',
};

const Index = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [logs, setLogs] = useState(LOG_SEED);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const i = setInterval(() => {
      const d = new Date();
      setClock(d.toLocaleTimeString('ru-RU'));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (tab !== 'logs') return;
    const samples = [
      { lvl: 'INFO', msg: 'tool/call get_match_state → live poll' },
      { lvl: 'OK', msg: 'response 200 · 33ms · cache MISS' },
      { lvl: 'INFO', msg: 'event: kill_feed flushed · 14 items' },
      { lvl: 'WARN', msg: 'rate-limit soft cap 80% · client throttled' },
    ];
    const i = setInterval(() => {
      const s = samples[Math.floor(Math.random() * samples.length)];
      const t = new Date().toLocaleTimeString('ru-RU');
      setLogs((p) => [...p.slice(-40), { t, ...s }]);
    }, 2200);
    return () => clearInterval(i);
  }, [tab]);

  return (
    <div className="min-h-screen flex text-foreground">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 backdrop-blur-sm flex flex-col fixed h-screen">
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
              onClick={() => setTab(n.id)}
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
            <span className="size-2 rounded-full bg-primary pulse-dot" />
            <span className="text-primary">ONLINE</span>
            <span className="text-muted-foreground ml-auto">v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 min-h-screen grid-bg">
        {/* Topbar */}
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-background/60 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">Battlefield · region eu-west · BF-7741</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-muted-foreground hidden sm:block">{clock}</span>
            <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition glow-border">
              <Icon name="Plug" size={15} />
              Подключить
            </button>
          </div>
        </header>

        <div className="p-8 max-w-6xl">
          {tab === 'overview' && <Overview />}
          {tab === 'logs' && <Logs logs={logs} />}
          {tab === 'config' && <Config />}
          {tab === 'api' && <Api />}
        </div>
      </main>
    </div>
  );
};

const Overview = () => (
  <div className="space-y-8">
    <section className="fade-up rounded-xl border border-border bg-card/50 p-6 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="relative flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="size-2.5 rounded-full bg-primary pulse-dot" />
            <span className="font-mono text-xs text-primary uppercase tracking-widest">Server operational</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Сервер <span className="text-primary glow-text">слушает</span> игровые данные
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg text-sm">
            Live-поток из Battlefield транслируется в Claude и Robokassa-клиенты через
            MCP-протокол. Аптайм 99.98% за 30 дней.
          </p>
        </div>
        <div className="font-mono text-right text-xs text-muted-foreground space-y-1">
          <div>endpoint</div>
          <div className="text-foreground">mcp://core.game/sse</div>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {METRICS.map((m, i) => (
        <div
          key={m.label}
          className="fade-up rounded-xl border border-border bg-card/50 p-5 hover:glow-border transition-all"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <Icon name={m.icon} className="text-primary" size={20} />
            <span className={`font-mono text-xs ${m.up ? 'text-primary' : 'text-destructive'}`}>{m.delta}</span>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight">{m.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
        </div>
      ))}
    </section>

    <section className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-xl border border-border bg-card/50 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="Radio" size={17} className="text-primary" /> Активные подключения
        </h3>
        <div className="space-y-3">
          {[
            { c: 'claude-desktop', ip: '10.0.4.21', t: 'SSE', s: 'streaming' },
            { c: 'robokassa-bot', ip: '10.0.4.88', t: 'HTTP', s: 'idle' },
            { c: 'cloud-worker-3', ip: '10.0.7.12', t: 'SSE', s: 'streaming' },
          ].map((c) => (
            <div key={c.c} className="flex items-center gap-3 font-mono text-sm py-2 border-b border-border/50 last:border-0">
              <span className={`size-2 rounded-full ${c.s === 'streaming' ? 'bg-primary pulse-dot' : 'bg-muted-foreground'}`} />
              <span className="text-foreground">{c.c}</span>
              <span className="text-muted-foreground">{c.ip}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{c.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="Cpu" size={17} className="text-primary" /> Нагрузка
        </h3>
        {[
          { l: 'CPU', v: 34 },
          { l: 'RAM', v: 58 },
          { l: 'Network', v: 22 },
        ].map((b) => (
          <div key={b.l} className="mb-4 last:mb-0">
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-muted-foreground">{b.l}</span>
              <span className="text-foreground">{b.v}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${b.v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const Logs = ({ logs }: { logs: typeof LOG_SEED }) => (
  <div className="fade-up rounded-xl border border-border bg-[#06100c] overflow-hidden">
    <div className="flex items-center gap-2 px-4 h-11 border-b border-border bg-card/50">
      <span className="size-3 rounded-full bg-destructive/70" />
      <span className="size-3 rounded-full bg-warning/70" />
      <span className="size-3 rounded-full bg-primary/70" />
      <span className="ml-3 font-mono text-xs text-muted-foreground">mcp-core — event stream</span>
      <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-primary">
        <span className="size-1.5 rounded-full bg-primary pulse-dot" /> live
      </span>
    </div>
    <div className="p-4 font-mono text-[13px] leading-relaxed max-h-[60vh] overflow-y-auto scrollbar-thin">
      {logs.map((l, i) => (
        <div key={i} className="flex gap-3 py-0.5 hover:bg-white/5 px-2 -mx-2 rounded">
          <span className="text-muted-foreground shrink-0">{l.t}</span>
          <span className={`shrink-0 w-10 ${lvlColor[l.lvl]}`}>{l.lvl}</span>
          <span className="text-foreground/90">{l.msg}</span>
        </div>
      ))}
    </div>
  </div>
);

const Config = () => {
  const fields = [
    { l: 'Game server host', v: 'bf.eu-west.game.net', icon: 'Server' },
    { l: 'Port', v: '27015', icon: 'Network' },
    { l: 'API ключ', v: '••••••••••••3f9a', icon: 'KeyRound' },
    { l: 'Протокол', v: 'RCON / WebSocket', icon: 'Cable' },
  ];
  return (
    <div className="fade-up grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-card/50 p-6 space-y-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon name="Gamepad2" size={18} className="text-primary" /> Подключение к игре
        </h3>
        {fields.map((f) => (
          <div key={f.l}>
            <label className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mb-1.5">
              <Icon name={f.icon} size={13} /> {f.l}
            </label>
            <div className="flex items-center px-3 h-10 rounded-md bg-secondary border border-border font-mono text-sm">
              {f.v}
            </div>
          </div>
        ))}
        <button className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition flex items-center justify-center gap-2">
          <Icon name="Save" size={15} /> Сохранить и переподключить
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 space-y-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon name="SlidersHorizontal" size={18} className="text-primary" /> Параметры сервера
        </h3>
        {[
          { l: 'Автопереподключение', on: true },
          { l: 'Кэширование ответов', on: true },
          { l: 'Подробные логи', on: false },
          { l: 'Rate limiting', on: true },
        ].map((t) => (
          <div key={t.l} className="flex items-center justify-between py-1">
            <span className="text-sm">{t.l}</span>
            <span className={`w-11 h-6 rounded-full p-0.5 transition ${t.on ? 'bg-primary' : 'bg-secondary'}`}>
              <span className={`block size-5 rounded-full bg-background transition-all ${t.on ? 'translate-x-5' : ''}`} />
            </span>
          </div>
        ))}
        <div className="pt-2">
          <label className="text-xs text-muted-foreground font-mono mb-1.5 block">Интервал опроса (мс)</label>
          <div className="flex items-center px-3 h-10 rounded-md bg-secondary border border-border font-mono text-sm">
            500
          </div>
        </div>
      </div>
    </div>
  );
};

const Api = () => (
  <div className="fade-up space-y-4">
    <div className="rounded-xl border border-border bg-card/50 p-5 flex items-center gap-4">
      <Icon name="BookOpen" size={22} className="text-primary" />
      <div>
        <h3 className="font-semibold">Инструменты MCP-сервера</h3>
        <p className="text-xs text-muted-foreground">{TOOLS.length} методов доступно для клиентов Claude и Cloud</p>
      </div>
    </div>
    {TOOLS.map((t, i) => (
      <div
        key={t.name}
        className="fade-up rounded-xl border border-border bg-card/50 p-5 hover:glow-border transition-all"
        style={{ animationDelay: `${i * 60}ms` }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${t.method === 'GET' ? 'bg-sky-500/15 text-sky-400' : 'bg-warning/15 text-warning'}`}>
            {t.method}
          </span>
          <code className="font-mono text-sm text-primary font-semibold">{t.name}</code>
          <span className="ml-auto font-mono text-xs text-muted-foreground">params: {t.params}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{t.desc}</p>
      </div>
    ))}
  </div>
);

export default Index;
