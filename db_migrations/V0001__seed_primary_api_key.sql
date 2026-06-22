INSERT INTO t_p92382610_ai_game_helper.api_keys (key_value, label)
VALUES ('mcp_live_' || md5(random()::text || clock_timestamp()::text) || substr(md5(random()::text), 1, 8), 'primary')
ON CONFLICT (key_value) DO NOTHING;