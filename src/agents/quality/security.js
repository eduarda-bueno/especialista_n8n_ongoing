/**
 * Security Agent
 *
 * 🎯 Missão: Garantir segurança e conformidade
 *
 * Responsabilidades:
 * - Verificar ausência de tokens hardcoded
 * - Garantir uso correto de credenciais
 * - Impedir exposição de secrets
 * - Validar headers sensíveis
 */

class SecurityAgent {
  constructor() {
    this.sensitivePatterns = [
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/,
      /token["\s:]+[A-Za-z0-9\-._~+/]+=*/i,
      /api[_-]?key["\s:]+[A-Za-z0-9\-._~+/]+=*/i,
      /password["\s:]+.+/i,
      /secret["\s:]+[A-Za-z0-9\-._~+/]+=*/i
    ];

    this.allowedCredentialIds = [
      'v1oa0YcYRfpLkQgf', // Bearer Auth Intercom
      'IvNiMkEcky5nmtij', // PAT do Azure
      'IwqcIcKJZ99PPziA'  // Intercom Token
    ];
  }

  /**
   * Valida segurança do workflow
   */
  validate(workflow) {
    console.log('🔒 Security Agent: Validando segurança...\n');

    const issues = [];

    issues.push(...this.checkHardcodedSecrets(workflow));
    issues.push(...this.checkCredentialUsage(workflow));
    issues.push(...this.checkSensitiveHeaders(workflow));
    issues.push(...this.checkExposedData(workflow));

    if (issues.length > 0) {
      console.log('⚠️  Problemas de segurança encontrados:\n');
      issues.forEach(issue => console.log(`   ${issue.severity}: ${issue.message}`));
      console.log('');

      const critical = issues.filter(i => i.severity === 'CRITICAL');
      if (critical.length > 0) {
        throw new Error(`Falha de segurança crítica: ${critical[0].message}`);
      }
    } else {
      console.log('✅ Nenhum problema de segurança encontrado\n');
    }

    console.log('='.repeat(60) + '\n');

    return {
      secure: issues.filter(i => i.severity === 'CRITICAL').length === 0,
      issues
    };
  }

  /**
   * Verifica secrets hardcoded
   */
  checkHardcodedSecrets(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      const content = JSON.stringify(node.parameters || {});

      this.sensitivePatterns.forEach(pattern => {
        if (pattern.test(content)) {
          issues.push({
            severity: 'CRITICAL',
            node: node.name,
            message: `Possível secret hardcoded detectado em "${node.name}"`,
            type: 'hardcoded_secret'
          });
        }
      });
    });

    return issues;
  }

  /**
   * Verifica uso correto de credenciais
   */
  checkCredentialUsage(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const params = node.parameters;

        // Verifica se HTTP Request tem credenciais
        if (!node.credentials && !params.authentication) {
          issues.push({
            severity: 'WARNING',
            node: node.name,
            message: `HTTP Request sem autenticação em "${node.name}"`,
            type: 'missing_auth'
          });
        }

        // Verifica se credenciais são permitidas
        if (node.credentials) {
          Object.values(node.credentials).forEach(cred => {
            if (cred.id && !this.allowedCredentialIds.includes(cred.id)) {
              issues.push({
                severity: 'CRITICAL',
                node: node.name,
                message: `Credencial não autorizada em "${node.name}": ${cred.id}`,
                type: 'unauthorized_credential'
              });
            }
          });
        }
      }
    });

    return issues;
  }

  /**
   * Verifica headers sensíveis
   */
  checkSensitiveHeaders(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const headers = node.parameters?.headerParameters?.parameters || [];

        headers.forEach(header => {
          // Verifica se Authorization está hardcoded
          if (header.name.toLowerCase() === 'authorization') {
            if (header.value && !header.value.startsWith('={{')) {
              issues.push({
                severity: 'CRITICAL',
                node: node.name,
                message: `Header Authorization hardcoded em "${node.name}"`,
                type: 'hardcoded_auth_header'
              });
            }
          }

          // Verifica outros headers sensíveis
          const sensitiveHeaders = ['x-api-key', 'api-key', 'token'];
          if (sensitiveHeaders.includes(header.name.toLowerCase())) {
            if (header.value && !header.value.startsWith('={{')) {
              issues.push({
                severity: 'WARNING',
                node: node.name,
                message: `Header sensível "${header.name}" possivelmente hardcoded em "${node.name}"`,
                type: 'sensitive_header'
              });
            }
          }
        });
      }
    });

    return issues;
  }

  /**
   * Verifica exposição de dados sensíveis
   */
  checkExposedData(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.code') {
        const code = node.parameters?.jsCode || '';

        // Verifica se há console.log com dados sensíveis
        if (code.includes('console.log')) {
          issues.push({
            severity: 'INFO',
            node: node.name,
            message: `console.log encontrado em "${node.name}" - verificar se não expõe dados sensíveis`,
            type: 'console_log'
          });
        }
      }
    });

    return issues;
  }
}

module.exports = SecurityAgent;
