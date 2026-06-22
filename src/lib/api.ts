const MCP_URL = 'https://functions.poehali.dev/2b5f4a1d-aaba-4016-b615-57ca37e486ee';

export interface ServerStatus {
  status: string;
  server_started_at: string;
  uptime_seconds: number;
  protocol: string;
  transport: string;
  active_keys: number;
  revoked_keys: number;
  total_requests: number;
  tools_count: number;
  now: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: { type: string; properties: Record<string, unknown> };
}

export interface ApiKey {
  id: number;
  key: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  revoked: boolean;
}

export const MCP_ENDPOINT = MCP_URL;

const get = (path: string) =>
  fetch(`${MCP_URL}${path}`, { mode: 'cors' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

const post = (body: unknown) =>
  fetch(MCP_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export async function fetchStatus(): Promise<ServerStatus> {
  return get('?action=status');
}

export async function fetchTools(): Promise<McpTool[]> {
  const d = await get('?action=tools');
  return d.tools;
}

export async function fetchKeys(): Promise<ApiKey[]> {
  const d = await get('?action=keys');
  return d.keys;
}

export async function createKey(label: string): Promise<ApiKey> {
  return post({ action: 'create', label });
}

export async function revokeKey(id: number): Promise<{ revoked: boolean; id: number }> {
  return post({ action: 'revoke', id });
}
