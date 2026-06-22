import json
import os
import time
import hashlib
import secrets as pysecrets
from datetime import datetime, timezone

import psycopg2

SCHEMA = 't_p92382610_ai_game_helper'
PROCESS_START = time.time()

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

TOOLS = [
    {
        'name': 'get_server_status',
        'description': 'Здоровье и аптайм MCP-сервера, число подключённых клиентов и обработанных запросов.',
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
        'protocol': 'mcp-2024-11-05',
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
    result = []
    for r in rows:
        result.append({
            'id': r[0],
            'key': r[1],
            'label': r[2],
            'created_at': r[3].isoformat() if r[3] else None,
            'last_used_at': r[4].isoformat() if r[4] else None,
            'request_count': r[5],
            'revoked': r[6],
        })
    return result


def create_key(label: str) -> dict:
    key = gen_key()
    safe_label = (label or 'default').replace("'", "''")[:120]
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.api_keys (key_value, label) VALUES ('{key}', '{safe_label}') RETURNING id, created_at"
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
    finally:
        conn.close()
    return {'id': row[0], 'key': key, 'label': safe_label, 'created_at': row[1].isoformat(), 'request_count': 0, 'revoked': False}


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


def jsonrpc(req: dict, api_key: str) -> dict:
    method = req.get('method')
    rid = req.get('id')
    if api_key:
        touch_key(api_key)

    if method == 'initialize':
        result = {
            'protocolVersion': '2024-11-05',
            'capabilities': {'tools': {}},
            'serverInfo': {'name': 'game-core-mcp', 'version': '0.1.0'},
        }
    elif method == 'tools/list':
        result = {'tools': TOOLS}
    elif method == 'tools/call':
        params = req.get('params', {})
        data = handle_tool_call(params.get('name', ''), params.get('arguments', {}))
        result = {'content': [{'type': 'text', 'text': json.dumps(data, ensure_ascii=False)}]}
    elif method == 'ping':
        result = {}
    else:
        return {'jsonrpc': '2.0', 'id': rid, 'error': {'code': -32601, 'message': f'Method not found: {method}'}}

    return {'jsonrpc': '2.0', 'id': rid, 'result': result}


def handler(event, context):
    '''Реальный MCP-сервер игровых данных: статус, инструменты, управление API-ключами и JSON-RPC эндпоинт для Claude.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    api_key = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''

    if method == 'GET':
        action = params.get('action', 'status')
        if action == 'status':
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(fetch_status())}
        if action == 'tools':
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'tools': TOOLS})}
        if action == 'keys':
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'keys': list_keys()})}
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'unknown action'})}

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        if body.get('jsonrpc') == '2.0':
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(jsonrpc(body, api_key))}
        action = body.get('action')
        if action == 'create':
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(create_key(body.get('label', 'default')))}
        if action == 'revoke':
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(revoke_key(body.get('id')))}
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'unknown action'})}

    return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'method not allowed'})}
