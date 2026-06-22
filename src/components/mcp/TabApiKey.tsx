import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { fetchKeys, createKey, revokeKey, MCP_ENDPOINT, type ApiKey } from '@/lib/api';

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* permissions policy в iframe — падаем на fallback */
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
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

export const TabApiKey = () => {
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

  useEffect(() => { load(); }, [load]);

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
    ? `{\n  "mcpServers": {\n    "game-core": {\n      "url": "${MCP_ENDPOINT}",\n      "headers": { "X-Auth-Token": "${revealed[primary.id] ? primary.key : mask(primary.key)}" }\n    }\n  }\n}`
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
