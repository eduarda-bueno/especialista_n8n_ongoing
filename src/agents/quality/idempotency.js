/**
 * Idempotency Agent
 *
 * 🎯 Missão: Evitar duplicações e inconsistências
 *
 * Responsabilidades:
 * - Verificar existência de Issue antes de criar
 * - Garantir atualização determinística
 * - Evitar reprocessamento indevido
 *
 * Decisão: Criar / Atualizar / Ignorar
 */

class IdempotencyAgent {
  constructor() {
    this.processedItems = new Map(); // Cache simples (em produção, usar Redis)
  }

  /**
   * Decide se deve Criar, Atualizar ou Ignorar
   */
  decide(context) {
    console.log('🔄 Idempotency Agent: Analisando contexto...\n');

    const { operation, ticketId, azureId, intercomId } = context;

    if (operation === 'create') {
      return this.decideCreate(ticketId, azureId);
    }

    if (operation === 'update') {
      return this.decideUpdate(ticketId, azureId);
    }

    if (operation === 'sync') {
      return this.decideSync(ticketId, intercomId, azureId);
    }

    return {
      action: 'create', // Fallback seguro
      reason: 'Operação não especificada'
    };
  }

  /**
   * Decide se deve criar Issue
   */
  decideCreate(ticketId, azureId) {
    // Se já tem Azure ID, não criar novamente
    if (azureId) {
      console.log(`⚠️  Ticket ${ticketId} já tem Azure ID: ${azureId}`);
      return {
        action: 'ignore',
        reason: 'Issue já existe no Azure',
        azureId
      };
    }

    // Verifica cache de processamento
    if (this.wasRecentlyProcessed(ticketId, 'create')) {
      console.log(`⚠️  Ticket ${ticketId} foi processado recentemente`);
      return {
        action: 'ignore',
        reason: 'Ticket processado recentemente (possível duplicação de webhook)',
        cacheHit: true
      };
    }

    // Pode criar
    this.markAsProcessed(ticketId, 'create');
    console.log(`✅ Pode criar Issue para ticket ${ticketId}`);

    return {
      action: 'create',
      reason: 'Ticket novo sem Azure ID'
    };
  }

  /**
   * Decide se deve atualizar Issue
   */
  decideUpdate(ticketId, azureId) {
    // Sem Azure ID, não pode atualizar
    if (!azureId) {
      console.log(`⚠️  Ticket ${ticketId} sem Azure ID - não pode atualizar`);
      return {
        action: 'ignore',
        reason: 'Sem Azure ID para atualizar',
        error: true
      };
    }

    // Verifica se foi atualizado recentemente
    if (this.wasRecentlyProcessed(`${ticketId}-${azureId}`, 'update')) {
      console.log(`⚠️  Ticket ${ticketId} foi atualizado recentemente`);
      return {
        action: 'ignore',
        reason: 'Atualização recente (evitar loop)',
        cacheHit: true
      };
    }

    // Pode atualizar
    this.markAsProcessed(`${ticketId}-${azureId}`, 'update');
    console.log(`✅ Pode atualizar Issue ${azureId} do ticket ${ticketId}`);

    return {
      action: 'update',
      reason: 'Atualização válida',
      azureId
    };
  }

  /**
   * Decide se deve sincronizar (bidirecional)
   */
  decideSync(ticketId, intercomId, azureId) {
    if (!intercomId || !azureId) {
      return {
        action: 'ignore',
        reason: 'IDs incompletos para sincronização',
        error: true
      };
    }

    const syncKey = `${intercomId}-${azureId}`;

    if (this.wasRecentlyProcessed(syncKey, 'sync')) {
      console.log(`⚠️  Sincronização ${syncKey} recente - evitando loop`);
      return {
        action: 'ignore',
        reason: 'Sincronização recente (anti-loop)',
        cacheHit: true
      };
    }

    this.markAsProcessed(syncKey, 'sync');
    console.log(`✅ Pode sincronizar ${syncKey}`);

    return {
      action: 'sync',
      reason: 'Sincronização válida'
    };
  }

  /**
   * Verifica se item foi processado recentemente
   */
  wasRecentlyProcessed(key, operation) {
    const cacheKey = `${operation}:${key}`;
    const processed = this.processedItems.get(cacheKey);

    if (!processed) return false;

    // Considera "recente" se foi nos últimos 5 minutos
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return processed.timestamp > fiveMinutesAgo;
  }

  /**
   * Marca item como processado
   */
  markAsProcessed(key, operation) {
    const cacheKey = `${operation}:${key}`;
    this.processedItems.set(cacheKey, {
      timestamp: Date.now(),
      operation
    });

    // Cleanup automático após 10 minutos
    setTimeout(() => {
      this.processedItems.delete(cacheKey);
    }, 10 * 60 * 1000);
  }

  /**
   * Limpa cache (útil para testes)
   */
  clearCache() {
    this.processedItems.clear();
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return {
      cacheSize: this.processedItems.size,
      items: Array.from(this.processedItems.entries()).map(([key, value]) => ({
        key,
        ...value
      }))
    };
  }
}

module.exports = IdempotencyAgent;
