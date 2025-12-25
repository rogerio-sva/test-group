/*
  # Create Sending Metrics Aggregation Function

  1. New Function
    - `aggregate_sending_metrics()` - Processa dados de broadcast_queue e gera métricas
    - Agrega dados por minuto, hora e dia
    - Calcula mensagens enviadas e falhadas
    - Insere na tabela sending_metrics
    
  2. Purpose
    - Gera dados para o dashboard de monitoramento
    - Mantém histórico de performance de envio
    - Permite análise de taxa de envio ao longo do tempo
*/

-- Função para agregar métricas de envio
CREATE OR REPLACE FUNCTION aggregate_sending_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_minute_start timestamptz;
  v_hour_start timestamptz;
  v_day_start timestamptz;
  v_now timestamptz;
BEGIN
  v_now := now();
  
  -- Última hora completa (minutos)
  v_minute_start := date_trunc('minute', v_now - interval '1 minute');
  
  -- Agrega métricas por minuto (última hora)
  INSERT INTO sending_metrics (period_type, period_start, period_end, messages_sent, messages_failed, timestamp, user_id)
  SELECT 
    'minute' as period_type,
    date_trunc('minute', sent_at) as period_start,
    date_trunc('minute', sent_at) + interval '1 minute' as period_end,
    COUNT(*) FILTER (WHERE status = 'sent') as messages_sent,
    COUNT(*) FILTER (WHERE status = 'failed' AND retry_count >= max_retries) as messages_failed,
    now() as timestamp,
    user_id
  FROM broadcast_queue
  WHERE sent_at >= v_minute_start
    AND sent_at < v_now
    AND status IN ('sent', 'failed')
  GROUP BY date_trunc('minute', sent_at), user_id
  ON CONFLICT (period_type, period_start, user_id) 
  DO UPDATE SET
    messages_sent = EXCLUDED.messages_sent,
    messages_failed = EXCLUDED.messages_failed,
    timestamp = EXCLUDED.timestamp;

  -- Última hora completa (horas)
  v_hour_start := date_trunc('hour', v_now - interval '1 hour');
  
  -- Agrega métricas por hora (últimas 24 horas)
  INSERT INTO sending_metrics (period_type, period_start, period_end, messages_sent, messages_failed, timestamp, user_id)
  SELECT 
    'hour' as period_type,
    date_trunc('hour', sent_at) as period_start,
    date_trunc('hour', sent_at) + interval '1 hour' as period_end,
    COUNT(*) FILTER (WHERE status = 'sent') as messages_sent,
    COUNT(*) FILTER (WHERE status = 'failed' AND retry_count >= max_retries) as messages_failed,
    now() as timestamp,
    user_id
  FROM broadcast_queue
  WHERE sent_at >= v_hour_start
    AND sent_at < v_now
    AND status IN ('sent', 'failed')
  GROUP BY date_trunc('hour', sent_at), user_id
  ON CONFLICT (period_type, period_start, user_id) 
  DO UPDATE SET
    messages_sent = EXCLUDED.messages_sent,
    messages_failed = EXCLUDED.messages_failed,
    timestamp = EXCLUDED.timestamp;

  -- Último dia completo (dias)
  v_day_start := date_trunc('day', v_now - interval '1 day');
  
  -- Agrega métricas por dia (últimos 30 dias)
  INSERT INTO sending_metrics (period_type, period_start, period_end, messages_sent, messages_failed, timestamp, user_id)
  SELECT 
    'day' as period_type,
    date_trunc('day', sent_at) as period_start,
    date_trunc('day', sent_at) + interval '1 day' as period_end,
    COUNT(*) FILTER (WHERE status = 'sent') as messages_sent,
    COUNT(*) FILTER (WHERE status = 'failed' AND retry_count >= max_retries) as messages_failed,
    now() as timestamp,
    user_id
  FROM broadcast_queue
  WHERE sent_at >= v_day_start
    AND sent_at < v_now
    AND status IN ('sent', 'failed')
  GROUP BY date_trunc('day', sent_at), user_id
  ON CONFLICT (period_type, period_start, user_id) 
  DO UPDATE SET
    messages_sent = EXCLUDED.messages_sent,
    messages_failed = EXCLUDED.messages_failed,
    timestamp = EXCLUDED.timestamp;

  -- Atualiza rate limits baseado na atividade recente
  UPDATE sending_rate_limits
  SET 
    current_count = (
      SELECT COUNT(*)
      FROM broadcast_queue
      WHERE status = 'sent'
        AND sent_at >= CASE
          WHEN sending_rate_limits.limit_type = 'per_minute' THEN now() - interval '1 minute'
          WHEN sending_rate_limits.limit_type = 'per_hour' THEN now() - interval '1 hour'
          WHEN sending_rate_limits.limit_type = 'per_day' THEN now() - interval '1 day'
          ELSE now()
        END
    ),
    period_start = CASE
      WHEN sending_rate_limits.limit_type = 'per_minute' THEN date_trunc('minute', now())
      WHEN sending_rate_limits.limit_type = 'per_hour' THEN date_trunc('hour', now())
      WHEN sending_rate_limits.limit_type = 'per_day' THEN date_trunc('day', now())
      ELSE period_start
    END,
    updated_at = now()
  WHERE is_active = true;

END;
$$;

-- Concede permissões
GRANT EXECUTE ON FUNCTION aggregate_sending_metrics() TO service_role;

-- Cria index para otimizar queries
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_sent_at_status 
ON broadcast_queue(sent_at, status) 
WHERE status IN ('sent', 'failed');
