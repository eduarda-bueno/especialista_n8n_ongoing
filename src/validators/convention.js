/**
 * Validator - Convenções do CLAUDE.md
 * Valida workflows gerados contra as regras documentadas
 */

class ConventionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Valida workflow completo
   */
  validate(workflow) {
    this.errors = [];
    this.warnings = [];

    console.log('🔍 Validando workflow...\n');

    this.validateNodeNames(workflow.nodes);
    this.validateCredentials(workflow.nodes);
    this.validateMappings(workflow.nodes);
    this.validateHttpRequests(workflow.nodes);
    this.validateAzureFields(workflow.nodes);
    this.validateConnections(workflow);

    return this.generateReport();
  }

  /**
   * Valida nomes dos nodes
   */
  validateNodeNames(nodes) {
    console.log('📛 Validando nomes dos nodes...');

    const genericNames = ['Node1', 'Node2', 'Code', 'HTTP Request3'];

    nodes.forEach(node => {
      // Checa nomes genéricos
      if (genericNames.includes(node.name)) {
        this.errors.push(`Node com nome genérico não permitido: "${node.name}"`);
      }

      // Checa se tem padrão descritivo
      if (node.type === 'n8n-nodes-base.httpRequest') {
        if (!node.name.includes('HTTP Request (')) {
          this.warnings.push(`Node HTTP Request sem padrão recomendado: "${node.name}" (use "HTTP Request (Serviço - Ação)")`);
        }
      }

      if (node.type === 'n8n-nodes-base.code') {
        if (!node.name.includes('Code (') && !node.name.includes('Normalize') && !node.name.includes('Map')) {
          this.warnings.push(`Node Code sem descrição clara: "${node.name}"`);
        }
      }
    });

    console.log('  ✓ Nomes validados\n');
  }

  /**
   * Valida credenciais
   */
  validateCredentials(nodes) {
    console.log('🔐 Validando credenciais...');

    const allowedCredentials = [
      'v1oa0YcYRfpLkQgf', // Bearer Auth Intercom
      'IvNiMkEcky5nmtij', // PAT do Azure
      'IwqcIcKJZ99PPziA'  // Intercom Token (alternativo)
    ];

    nodes.forEach(node => {
      if (node.credentials) {
        Object.values(node.credentials).forEach(cred => {
          if (cred.id && !allowedCredentials.includes(cred.id)) {
            this.errors.push(`Credencial não autorizada detectada: ${cred.id} no node "${node.name}"`);
          }
        });
      }

      // Checa se tem hardcoded tokens
      if (node.parameters) {
        const params = JSON.stringify(node.parameters);
        if (params.includes('Bearer ') || params.includes('token:')) {
          this.errors.push(`Possível token hardcoded no node "${node.name}"`);
        }
      }
    });

    console.log('  ✓ Credenciais validadas\n');
  }

  /**
   * Valida mapeamentos
   */
  validateMappings(nodes) {
    console.log('🗺️  Validando mapeamentos...');

    const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');

    codeNodes.forEach(node => {
      const code = node.parameters?.jsCode || '';

      // Checa se mapeamento tem validação
      if (code.includes('const map = {') || code.includes('const tagMap = {')) {
        if (!code.includes('throw new Error') && !code.includes('if (!')) {
          this.warnings.push(`Mapeamento sem validação no node "${node.name}" - adicione throw Error para valores não reconhecidos`);
        }
      }

      // Checa se nome indica claramente que é mapeamento
      if (code.includes('const map = {') && !node.name.toLowerCase().includes('map')) {
        this.warnings.push(`Node de mapeamento sem "Map" no nome: "${node.name}"`);
      }
    });

    console.log('  ✓ Mapeamentos validados\n');
  }

  /**
   * Valida HTTP Requests
   */
  validateHttpRequests(nodes) {
    console.log('🌐 Validando HTTP requests...');

    const httpNodes = nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');

    httpNodes.forEach(node => {
      const params = node.parameters;

      // Valida Content-Type
      if (params.sendBody && params.method !== 'GET') {
        const hasContentType = params.headerParameters?.parameters?.some(
          h => h.name === 'Content-Type'
        );

        if (!hasContentType) {
          this.errors.push(`HTTP Request sem Content-Type no node "${node.name}"`);
        }
      }

      // Valida PATCH do Azure
      if (params.url?.includes('dev.azure.com') && params.method === 'PATCH') {
        const headers = params.headerParameters?.parameters || [];
        const hasPatchContentType = headers.some(
          h => h.name === 'Content-Type' && h.value === 'application/json-patch+json'
        );

        if (!hasPatchContentType) {
          this.errors.push(`PATCH Azure sem "application/json-patch+json" no node "${node.name}"`);
        }
      }

      // Valida api-version no Azure
      if (params.url?.includes('dev.azure.com') && !params.url.includes('api-version')) {
        this.errors.push(`Request Azure sem api-version no node "${node.name}"`);
      }

      // Valida body vazio
      if (params.sendBody && !params.jsonBody && !params.bodyParameters) {
        this.warnings.push(`HTTP Request com body vazio no node "${node.name}"`);
      }
    });

    console.log('  ✓ HTTP requests validados\n');
  }

  /**
   * Valida campos obrigatórios do Azure
   */
  validateAzureFields(nodes) {
    console.log('🧪 Validando campos obrigatórios do Azure...');

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
          this.warnings.push(`Campo obrigatório "${field}" não encontrado no node "${node.name}"`);
        }
      });
    });

    console.log('  ✓ Campos obrigatórios validados\n');
  }

  /**
   * Valida conexões
   */
  validateConnections(workflow) {
    console.log('🔗 Validando conexões...');

    const nodeNames = workflow.nodes.map(n => n.name);

    // Checa nodes órfãos
    workflow.nodes.forEach(node => {
      const hasIncoming = Object.values(workflow.connections).some(conn =>
        conn.main?.some(outputs =>
          outputs.some(out => out.node === node.name)
        )
      );

      const hasOutgoing = workflow.connections[node.name];
      const isWebhook = node.type === 'n8n-nodes-base.webhook';

      if (!hasIncoming && !isWebhook) {
        this.warnings.push(`Node órfão (sem conexão de entrada): "${node.name}"`);
      }
    });

    console.log('  ✓ Conexões validadas\n');
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
      this.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
      console.log('');
    }

    if (hasWarnings) {
      console.log('⚠️  AVISOS:');
      this.warnings.forEach((warn, i) => {
        console.log(`  ${i + 1}. ${warn}`);
      });
      console.log('');
    }

    if (!hasErrors && !hasWarnings) {
      console.log('✅ Workflow válido! Todas as convenções foram seguidas.\n');
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

// CLI para validação
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso: node convention.js <caminho-do-workflow.json>');
    process.exit(1);
  }

  const filepath = args[0];

  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const workflow = JSON.parse(content);

    const validator = new ConventionValidator();
    const result = validator.validate(workflow);

    process.exit(result.valid ? 0 : 1);

  } catch (error) {
    console.error('Erro ao validar:', error.message);
    process.exit(1);
  }
}

module.exports = ConventionValidator;
