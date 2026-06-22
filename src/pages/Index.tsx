import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { fetchStatus, type ServerStatus } from '@/lib/api';
import { Sidebar, NAV, type Tab } from '@/components/mcp/Sidebar';
import { TabOverview } from '@/components/mcp/TabOverview';
import { TabApiKey } from '@/components/mcp/TabApiKey';
import { TabLogs, TabConfig, TabApi, type LogLine } from '@/components/mcp/TabsContent';

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
        [...p, { t, lvl: 'OK', msg: `status poll → ${s.status} · uptime ${s.uptime_seconds}s · ${s.total_requests} req` }].slice(-40),
      );
    } catch {
      setStatusErr(true);
      const t = new Date().toLocaleTimeString('ru-RU');
      setLogs((p) => [...p, { t, lvl: 'ERR', msg: 'не удалось получить статус сервера' }].slice(-40));
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

  return (
    <div className="min-h-screen flex text-foreground">
      <Sidebar
        tab={tab}
        statusErr={statusErr}
        onSelect={select}
        menuOpen={menuOpen}
        onMenuClose={() => setMenuOpen(false)}
      />

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
          {tab === 'overview' && <TabOverview status={status} statusErr={statusErr} />}
          {tab === 'logs'     && <TabLogs logs={logs} />}
          {tab === 'config'   && <TabConfig />}
          {tab === 'apikey'   && <TabApiKey />}
          {tab === 'api'      && <TabApi />}
        </div>
      </main>
    </div>
  );
};

export default Index;
