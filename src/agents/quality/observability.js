/**
 * Observability Agent
 *
 * 🎯 Missão: Garantir que falhas sejam visíveis e rastreáveis
 *
 * Responsabilidades:
 * - Garantir erros explícitos
 * - Impedir falhas silenciosas
 * - Sugerir pontos de log
 * - Garantir rastreabilidade
 */

class ObservabilityAgent {
  constructor() {
    this.checks = [];
  }

  /**
   * Analisa workflow para observabilidade
   */
  analyze(workflow, spec) {
    console.log('👁️  Observability Agent: Analisando rastreabilidade...\n');

    this.checks = [];

    this.checkErrorHandling(workflow);
    this.checkLogPoints(workflow);
    this.checkTraceability(workflow, spec);
    this.checkSilentFailures(workflow);

    return this.generateChecklist();
  }

  /**
   * Verifica tratamento de erros
   */
  checkErrorHandling(workflow) {
    const codeNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');

    codeNodes.forEach(node => {
      const code = node.parameters?.jsCode || '';

      // Verifica se tem throw Error para casos inválidos
      const hasMappingCode = code.includes('const map = {') || code.includes('const tagMap = {');
      const hasErrorHandling = code.includes('throw new Error');

      if (hasMappingCode && !hasErrorHandling) {
        this.checks.push({
          status: 'warning',
          node: node.name,
          message: `Mapeamento sem throw Error - falhas podem passar silenciosamente`,
          recommendation: 'Adicionar: throw new Error("Valor não mapeado: " + value)',
          type: 'error_handling'
        });
      } else if (hasMappingCode && hasErrorHandling) {
        this.checks.push({
          status: 'ok',
          node: node.name,
          message: 'Erro explícito implementado',
          type: 'error_handling'
        });
      }
    });
  }

  /**
   * Verifica pontos de log
   */
  checkLogPoints(workflow) {
    const criticalNodes = workflow.nodes.filter(n =>
      n.type === 'n8n-nodes-base.httpRequest' ||
      n.type === 'n8n-nodes-base.code'
    );

    // Sugere logs em pontos críticos
    criticalNodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        this.checks.push({
          status: 'info',
          node: node.name,
          message: 'Ponto de integração externa',
          recommendation: 'Considere habilitar logs de erro no n8n para este node',
          type: 'log_point'
        });
      }
    });
  }

  /**
   * Verifica rastreabilidade
   */
  checkTraceability(workflow, spec) {
    // Verifica se há campos de rastreamento
    const hasWebhook = workflow.nodes.some(n => n.type === 'n8n-nodes-base.webhook');
    const hasIdFields = this.hasTraceableIds(workflow);

    if (!hasIdFields) {
      this.checks.push({
        status: 'warning',
        node: 'general',
        message: 'Faltam campos de rastreamento (ticket_id, intercom_id, azure_id)',
        recommendation: 'Incluir IDs de rastreamento em nodes de extração',
        type: 'traceability'
      });
    } else {
      this.checks.push({
        status: 'ok',
        node: 'general',
        message: 'Campos de rastreamento presentes',
        type: 'traceability'
      });
    }
  }

  /**
   * Verifica falhas silenciosas
   */
  checkSilentFailures(workflow) {
    const codeNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');

    codeNodes.forEach(node => {
      const code = node.parameters?.jsCode || '';

      // Verifica try-catch sem re-throw
      if (code.includes('try {') && code.includes('catch')) {
        if (!code.includes('throw') && !code.includes('console.error')) {
          this.checks.push({
            status: 'critical',
            node: node.name,
            message: 'try-catch pode suprimir erros silenciosamente',
            recommendation: 'Re-lançar erro ou fazer log explícito no catch',
            type: 'silent_failure'
          });
        }
      }

      // Verifica validações sem throw
      if (code.includes('if (!') && !code.includes('throw')) {
        this.checks.push({
          status: 'warning',
          node: node.name,
          message: 'Validação sem throw Error',
          recommendation: 'Lançar erro quando validação falhar',
          type: 'silent_failure'
        });
      }
    });
  }

  /**
   * Verifica se tem IDs rastreáveis
   */
  hasTraceableIds(workflow) {
    const extractNodes = workflow.nodes.filter(n =>
      n.type === 'n8n-nodes-base.set' &&
      n.name.toLowerCase().includes('extract')
    );

    if (extractNodes.length === 0) return false;

    const hasIds = extractNodes.some(node => {
      const assignments = node.parameters?.assignments?.assignments || [];
      return assignments.some(a =>
        ['ticketId', 'intercomId', 'azureId', 'ticket_id', 'id'].includes(a.name)
      );
    });

    return hasIds;
  }

  /**
   * Gera checklist de observabilidade
   */
  generateChecklist() {
    console.log('═══════════════════════════════════════════════');
    console.log('📋 CHECKLIST DE OBSERVABILIDADE\n');

    const critical = this.checks.filter(c => c.status === 'critical');
    const warnings = this.checks.filter(c => c.status === 'warning');
    const ok = this.checks.filter(c => c.status === 'ok');
    const info = this.checks.filter(c => c.status === 'info');

    if (critical.length > 0) {
      console.log('🔴 CRÍTICO:');
      critical.forEach(c => {
        console.log(`   [${c.node}] ${c.message}`);
        console.log(`   → ${c.recommendation}\n`);
      });
    }

    if (warnings.length > 0) {
      console.log('⚠️  AVISOS:');
      warnings.forEach(c => {
        console.log(`   [${c.node}] ${c.message}`);
        if (c.recommendation) console.log(`   → ${c.recommendation}`);
        console.log('');
      });
    }

    if (ok.length > 0) {
      console.log('✅ OK:');
      ok.forEach(c => console.log(`   [${c.node}] ${c.message}`));
      console.log('');
    }

    if (info.length > 0) {
      console.log('ℹ️  INFO:');
      info.forEach(c => {
        console.log(`   [${c.node}] ${c.message}`);
        if (c.recommendation) console.log(`   → ${c.recommendation}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════\n');

    return {
      passed: critical.length === 0,
      checks: this.checks,
      summary: {
        critical: critical.length,
        warnings: warnings.length,
        ok: ok.length,
        info: info.length
      }
    };
  }
}

module.exports = ObservabilityAgent;
