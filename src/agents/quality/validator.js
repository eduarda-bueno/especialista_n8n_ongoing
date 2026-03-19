/**
 * Workflow Validator Agent
 *
 * 🎯 Missão: Garantir que o workflow atende ao Definition of Done
 *
 * Responsabilidades:
 * - Verificar separação de responsabilidades
 * - Verificar campos obrigatórios do Azure
 * - Verificar ausência de hardcoded secrets
 * - Verificar mapeamentos isolados
 * - Verificar headers corretos
 * - Verificar ausência de nodes órfãos
 *
 * Restrições:
 * - NÃO modificar workflow
 * - Apenas validar
 */

class ValidatorAgent {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Valida workflow completo
   */
  validate(workflow, spec) {
    console.log('✅ Validator Agent: Validando workflow...\n');

    this.errors = [];
    this.warnings = [];

    this.validateNodeNames(workflow.nodes);
    this.validateCredentials(workflow.nodes);
    this.validateMappings(workflow.nodes);
    this.validateHttpRequests(workflow.nodes);
    this.validateAzureFields(workflow.nodes, spec);
    this.validateConnections(workflow);
    this.validateDefinitionOfDone(workflow, spec);

    return this.generateReport();
  }

  /**
   * Valida nomes dos nodes
   */
  validateNodeNames(nodes) {
    const genericNames = ['Node1', 'Node2', 'Code', 'HTTP Request3'];

    nodes.forEach(node => {
      if (genericNames.includes(node.name)) {
        this.errors.push(`Node com nome genérico não permitido: "${node.name}"`);
      }

      if (node.type === 'n8n-nodes-base.httpRequest') {
        if (!node.name.includes('HTTP Request (')) {
          this.warnings.push(`Node HTTP Request sem padrão: "${node.name}"`);
        }
      }

      if (node.type === 'n8n-nodes-base.code') {
        if (!node.name.includes('Code (') && !node.name.includes('Normalize') && !node.name.includes('Map')) {
          this.warnings.push(`Node Code sem descrição: "${node.name}"`);
        }
      }
    });
  }

  /**
   * Valida credenciais
   */
  validateCredentials(nodes) {
    const allowedCredentials = [
      'v1oa0YcYRfpLkQgf',
      'IvNiMkEcky5nmtij',
      'IwqcIcKJZ99PPziA'
    ];

    nodes.forEach(node => {
      if (node.credentials) {
        Object.values(node.credentials).forEach(cred => {
          if (cred.id && !allowedCredentials.includes(cred.id)) {
            this.errors.push(`Credencial não autorizada: ${cred.id} no node "${node.name}"`);
          }
        });
      }

      if (node.parameters) {
        const params = JSON.stringify(node.parameters);
        if (params.includes('Bearer ') || params.includes('token:')) {
          this.errors.push(`Possível token hardcoded no node "${node.name}"`);
        }
      }
    });
  }

  /**
   * Valida mapeamentos
   */
  validateMappings(nodes) {
    const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');

    codeNodes.forEach(node => {
      const code = node.parameters?.jsCode || '';

      if (code.includes('const map = {') || code.includes('const tagMap = {')) {
        if (!code.includes('throw new Error') && !code.includes('if (!')) {
          this.warnings.push(`Mapeamento sem validação no node "${node.name}"`);
        }
      }
    });
  }

  /**
   * Valida HTTP Requests
   */
  validateHttpRequests(nodes) {
    const httpNodes = nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');

    httpNodes.forEach(node => {
      const params = node.parameters;

      if (params.sendBody && params.method !== 'GET') {
        const hasContentType = params.headerParameters?.parameters?.some(
          h => h.name === 'Content-Type'
        );

        if (!hasContentType) {
          this.errors.push(`HTTP Request sem Content-Type: "${node.name}"`);
        }
      }

      if (params.url?.includes('dev.azure.com') && params.method === 'PATCH') {
        const headers = params.headerParameters?.parameters || [];
        const hasPatchContentType = headers.some(
          h => h.name === 'Content-Type' && h.value === 'application/json-patch+json'
        );

        if (!hasPatchContentType) {
          this.errors.push(`PATCH Azure sem "application/json-patch+json": "${node.name}"`);
        }
      }

      if (params.url?.includes('dev.azure.com') && !params.url.includes('api-version')) {
        this.errors.push(`Request Azure sem api-version: "${node.name}"`);
      }
    });
  }

  /**
   * Valida campos obrigatórios do Azure
   */
  validateAzureFields(nodes, spec) {
    const requiredFields = [
      'Custom.Aid',
      'Custom.Email',
      'Custom.OperationalSystem',
      'Custom.OSversion',
      'Custom.Appversion'
    ];

    const azureCreateNodes = nodes.filter(n =>
      n.type === 'n8n-nodes-base.httpRequest' &&
      n.parameters?.url?.includes('dev.azure.com') &&
      n.parameters?.url?.includes('workitems/$Issue')
    );

    azureCreateNodes.forEach(node => {
      const body = node.parameters?.jsonBody || '';

      requiredFields.forEach(field => {
        if (!body.includes(field)) {
          this.warnings.push(`Campo obrigatório "${field}" não encontrado em "${node.name}"`);
        }
      });
    });
  }

  /**
   * Valida conexões
   */
  validateConnections(workflow) {
    const nodeNames = workflow.nodes.map(n => n.name);

    workflow.nodes.forEach(node => {
      const hasIncoming = Object.values(workflow.connections).some(conn =>
        conn.main?.some(outputs =>
          outputs.some(out => out.node === node.name)
        )
      );

      const isWebhook = node.type === 'n8n-nodes-base.webhook';

      if (!hasIncoming && !isWebhook) {
        this.warnings.push(`Node órfão: "${node.name}"`);
      }
    });
  }

  /**
   * Valida Definition of Done
   */
  validateDefinitionOfDone(workflow, spec) {
    const dod = spec.definitionOfDone;

    // Valida critérios técnicos
    if (!workflow.name) {
      this.errors.push('Workflow sem nome');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      this.errors.push('Workflow sem nodes');
    }

    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      this.warnings.push('Workflow sem conexões');
    }

    // Valida separação de responsabilidades
    const hasWebhook = workflow.nodes.some(n => n.type === 'n8n-nodes-base.webhook');
    const hasExtract = workflow.nodes.some(n => n.name.includes('Extract'));
    const hasHttp = workflow.nodes.some(n => n.type === 'n8n-nodes-base.httpRequest');

    if (!hasWebhook) {
      this.errors.push('Falta node Webhook');
    }

    if (!hasHttp) {
      this.errors.push('Falta node HTTP Request');
    }
  }

  /**
   * Gera relatório de validação
   */
  generateReport() {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;

    console.log('═══════════════════════════════════════════════');
    console.log('📋 RELATÓRIO DE VALIDAÇÃO\n');

    if (hasErrors) {
      console.log('❌ ERROS:');
      this.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      console.log('');
    }

    if (hasWarnings) {
      console.log('⚠️  AVISOS:');
      this.warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
      console.log('');
    }

    if (!hasErrors && !hasWarnings) {
      console.log('✅ Workflow válido!\n');
    }

    console.log('═══════════════════════════════════════════════\n');

    return {
      valid: !hasErrors,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length
      }
    };
  }
}

module.exports = ValidatorAgent;
