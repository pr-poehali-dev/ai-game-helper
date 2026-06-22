import json
import os
import time
import hashlib
import secrets as pysecrets
from datetime import datetime, timezone

import psycopg2

SCHEMA = 't_p92382610_ai_game_helper'
PROCESS_START = time.time()
MCP_PROTOCOL_VERSION = '2024-11-05'

# Claude.ai requires these headers on every MCP response
MCP_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Auth-Token, Authorization, Mcp-Session-Id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
}

TOOLS = [
    {
        'name': 'get_server_status',
        'description': 'Здоровье и аптайм MCP-сервера, число обработанных запросов.',
        'inputSchema': {'type': 'object', 'properties': {}},
    },
    {
        'name': 'get_api_keys_summary',
        'description': 'Сводка по выданным API-ключам: сколько активных, отозванных и суммарно запросов.',
        'inputSchema': {'type': 'object', 'properties': {}},
    },
    {
        'name': 'echo',
        'description': 'Диагностический инструмент: возвращает переданный текст обратно.',
        'inputSchema': {
            'type': 'object',
            'properties': {'text': {'type': 'string', 'description': 'Текст для эха'}},
            'required': ['text'],
        },
    },
]


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def gen_key() -> str:
    return 'mcp_live_' + hashlib.sha256(pysecrets.token_bytes(32)).hexdigest()[:40]


def ok(body: dict) -> dict:
    return {'statusCode': 200, 'headers': MCP_HEADERS, 'body': json.dumps(body, ensure_ascii=False)}


def err(code: int, msg: str) -> dict:
    return {'statusCode': code, 'headers': MCP_HEADERS, 'body': json.dumps({'error': msg})}


def fetch_status() -> dict:
    uptime = int(time.time() - PROCESS_START)
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT COUNT(*) FILTER (WHERE revoked = FALSE), "
            f"COUNT(*) FILTER (WHERE revoked = TRUE), "
            f"COALESCE(SUM(request_count), 0) FROM {SCHEMA}.api_keys"
        )
        active, revoked, total_req = cur.fetchone()
        cur.close()
    finally:
        conn.close()
    return {
        'status': 'operational',
        'server_started_at': datetime.fromtimestamp(PROCESS_START, tz=timezone.utc).isoformat(),
        'uptime_seconds': uptime,
        'protocol': MCP_PROTOCOL_VERSION,
        'transport': 'http',
        'active_keys': int(active),
        'revoked_keys': int(revoked),
        'total_requests': int(total_req),
        'tools_count': len(TOOLS),
        'now': datetime.now(tz=timezone.utc).isoformat(),
    }


def list_keys() -> list:
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, key_value, label, created_at, last_used_at, request_count, revoked "
            f"FROM {SCHEMA}.api_keys ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()
    return [
        {
            'id': r[0], 'key': r[1], 'label': r[2],
            'created_at': r[3].isoformat() if r[3] else None,
            'last_used_at': r[4].isoformat() if r[4] else None,
            'request_count': r[5], 'revoked': r[6],
        }
        for r in rows
    ]


def create_key(label: str) -> dict:
    key = gen_key()
    safe_label = (label or 'default').replace("'", "''")[:120]
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.api_keys (key_value, label) "
            f"VALUES ('{key}', '{safe_label}') RETURNING id, created_at"
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
    finally:
        conn.close()
    return {'id': row[0], 'key': key, 'label': safe_label,
            'created_at': row[1].isoformat(), 'request_count': 0, 'revoked': False}


def revoke_key(key_id: int) -> dict:
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.api_keys SET revoked = TRUE WHERE id = {int(key_id)}")
        conn.commit()
        affected = cur.rowcount
        cur.close()
    finally:
        conn.close()
    return {'revoked': affected > 0, 'id': key_id}


def touch_key(key_value: str):
    safe = key_value.replace("'", "''")[:64]
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.api_keys SET request_count = request_count + 1, "
            f"last_used_at = CURRENT_TIMESTAMP WHERE key_value = '{safe}' AND revoked = FALSE"
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()


def handle_tool_call(name: str, args: dict):
    if name == 'get_server_status':
        return fetch_status()
    if name == 'get_api_keys_summary':
        s = fetch_status()
        return {'active_keys': s['active_keys'], 'revoked_keys': s['revoked_keys'], 'total_requests': s['total_requests']}
    if name == 'echo':
        return {'echo': args.get('text', '')}
    return {'error': f'unknown tool: {name}'}


def handle_jsonrpc(req: dict, api_key: str) -> dict:
    method = req.get('method', '')
    rid = req.get('id')
    if api_key:
        touch_key(api_key)

    if method == 'initialize':
        result = {
            'protocolVersion': MCP_PROTOCOL_VERSION,
            'capabilities': {'tools': {'listChanged': False}},
            'serverInfo': {'name': 'game-core-mcp', 'version': '0.1.0'},
        }
    elif method == 'notifications/initialized':
        # client ack — no response needed, return empty 200
        return {'statusCode': 200, 'headers': MCP_HEADERS, 'body': ''}
    elif method == 'tools/list':
        result = {'tools': TOOLS}
    elif method == 'tools/call':
        params = req.get('params', {})
        data = handle_tool_call(params.get('name', ''), params.get('arguments', {}))
        result = {'content': [{'type': 'text', 'text': json.dumps(data, ensure_ascii=False)}]}
    elif method == 'ping':
        result = {}
    else:
        return ok({'jsonrpc': '2.0', 'id': rid, 'error': {'code': -32601, 'message': f'Method not found: {method}'}})

    return ok({'jsonrpc': '2.0', 'id': rid, 'result': result})


def handler(event, context):
    '''MCP-сервер игровых данных. Поддерживает Streamable HTTP (MCP 2024-11-05) для Claude.ai и Cloud-клиентов.'''
    method = event.get('httpMethod', 'GET')
    headers_in = event.get('headers') or {}
    params = event.get('queryStringParameters') or {}
    api_key = (headers_in.get('X-Auth-Token') or headers_in.get('x-auth-token') or
               headers_in.get('Authorization') or headers_in.get('authorization') or '').replace('Bearer ', '')

    # CORS preflight
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': MCP_HEADERS, 'body': ''}

    # HEAD — Claude.ai uses this to discover/validate the MCP endpoint
    if method == 'HEAD':
        return {'statusCode': 200, 'headers': MCP_HEADERS, 'body': ''}

    if method == 'GET':
        action = params.get('action', '')
        if action == 'status':
            return ok(fetch_status())
        if action == 'tools':
            return ok({'tools': TOOLS})
        if action == 'keys':
            return ok({'keys': list_keys()})
        # No action param → MCP discovery probe, return server info
        return ok({
            'name': 'game-core-mcp',
            'version': '0.1.0',
            'protocolVersion': MCP_PROTOCOL_VERSION,
            'status': 'operational',
            'capabilities': {'tools': {'listChanged': False}},
        })

    if method == 'POST':
        raw_body = event.get('body') or '{}'
        body = json.loads(raw_body)

        # MCP JSON-RPC 2.0
        if body.get('jsonrpc') == '2.0':
            return handle_jsonrpc(body, api_key)

        # Batch JSON-RPC (array)
        if isinstance(body, list):
            responses = [
                json.loads(handle_jsonrpc(req, api_key)['body'])
                for req in body
                if isinstance(req, dict)
            ]
            return ok(responses)

        # Dashboard API actions
        action = body.get('action')
        if action == 'create':
            return ok(create_key(body.get('label', 'default')))
        if action == 'revoke':
            return ok(revoke_key(body.get('id')))
        return err(400, 'unknown action')

    return err(405, 'method not allowed')
