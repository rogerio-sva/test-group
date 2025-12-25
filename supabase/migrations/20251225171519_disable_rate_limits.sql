/*
  # Desabilitar Sistema de Rate Limits

  1. Alterações
    - Desabilita todos os rate limits existentes
    - Remove dados de exemplo de limites
    - Mantém tabelas para histórico mas desativa funcionalidade

  2. Notas
    - Sistema não terá mais limites de envio
    - Estatísticas de envio continuam funcionando normalmente
*/

-- Desabilitar todos os rate limits
UPDATE sending_rate_limits
SET is_active = false
WHERE is_active = true;

-- Limpar contadores
UPDATE sending_rate_limits
SET current_count = 0, updated_at = now();
