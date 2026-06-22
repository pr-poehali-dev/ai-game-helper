import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { fetchTools, MCP_ENDPOINT, type McpTool } from '@/lib/api';

interface LogLine {
  t: string;
  lvl: string;
  msg: string;
}

const lvlColor: Record<string, string> = {
  INFO: 'text-sky-400',
  OK: 'text-primary',
  WARN: 'text-warning',
  ERR: 'text-destructive',
};

// ── Logs ─────────────────────────────────────────────────────────────────────

export const TabLogs = ({ logs }: { logs: LogLine[] }) => (
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

export type { LogLine };

// ── Config ────────────────────────────────────────────────────────────────────

export const TabConfig = () => (
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

// ── Api docs ──────────────────────────────────────────────────────────────────

export const TabApi = () => {
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
