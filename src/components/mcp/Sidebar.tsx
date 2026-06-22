import Icon from '@/components/ui/icon';

type Tab = 'overview' | 'logs' | 'config' | 'apikey' | 'api';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Обзор', icon: 'LayoutDashboard' },
  { id: 'logs', label: 'Логи', icon: 'ScrollText' },
  { id: 'config', label: 'Конфигурация', icon: 'Settings2' },
  { id: 'apikey', label: 'API-ключ', icon: 'KeyRound' },
  { id: 'api', label: 'API', icon: 'Code2' },
];

interface SidebarProps {
  tab: Tab;
  statusErr: boolean;
  onSelect: (id: Tab) => void;
  menuOpen: boolean;
  onMenuClose: () => void;
}

const SidebarInner = ({
  tab,
  statusErr,
  onSelect,
}: Pick<SidebarProps, 'tab' | 'statusErr' | 'onSelect'>) => (
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
          onClick={() => onSelect(n.id)}
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

export const Sidebar = ({ tab, statusErr, onSelect, menuOpen, onMenuClose }: SidebarProps) => (
  <>
    {/* Desktop */}
    <aside className="w-60 shrink-0 border-r border-border bg-card/40 backdrop-blur-sm flex-col fixed h-screen z-30 hidden md:flex">
      <SidebarInner tab={tab} statusErr={statusErr} onSelect={onSelect} />
    </aside>

    {/* Mobile drawer */}
    {menuOpen && (
      <div className="fixed inset-0 z-40 md:hidden">
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onMenuClose} />
        <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card flex flex-col fade-up">
          <SidebarInner tab={tab} statusErr={statusErr} onSelect={onSelect} />
        </aside>
      </div>
    )}
  </>
);

export { NAV };
export type { Tab };
