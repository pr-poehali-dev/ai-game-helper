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

export async function fetchStatus(): Promise<ServerStatus> {
  const r = await fetch(`${MCP_URL}?action=status`);
  return r.json();
}

export async function fetchTools(): Promise<McpTool[]> {
  const r = await fetch(`${MCP_URL}?action=tools`);
  const d = await r.json();
  return d.tools;
}

export async function fetchKeys(): Promise<ApiKey[]> {
  const r = await fetch(`${MCP_URL}?action=keys`);
  const d = await r.json();
  return d.keys;
}

export async function createKey(label: string): Promise<ApiKey> {
  const r = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', label }),
  });
  return r.json();
}

export async function revokeKey(id: number): Promise<{ revoked: boolean; id: number }> {
  const r = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'revoke', id }),
  });
  return r.json();
}
