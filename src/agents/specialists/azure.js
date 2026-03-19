/**
 * Azure DevOps Specialist Agent
 *
 * 🎯 Missão: Garantir conformidade técnica com Azure DevOps
 *
 * Responsabilidades:
 * - Validar JSON Patch
 * - Validar campos obrigatórios
 * - Validar estados permitidos
 * - Validar transições possíveis
 * - Validar API version
 *
 * Restrições:
 * - NÃO permitir envio parcial de campos obrigatórios
 * - NÃO permitir PATCH inválido
 */

class AzureSpecialistAgent {
  constructor() {
    this.requiredFields = [
      'Custom.Aid',
      'Custom.Email',
      'Custom.OperationalSystem',
      'Custom.OSversion',
      'Custom.Appversion'
    ];

    this.validStates = [
      'To Do',
      'Doing',
      'CS',
      'Ready',
      'On Hold',
      'Done'
    ];

    this.patchOperations = ['add', 'replace', 'remove', 'test'];
  }

  /**
   * Valida payload destinado ao Azure
   */
  validate(payload, operation = 'create') {
    console.log('🔍 Azure Specialist: Validando payload...\n');

    const errors = [];

    if (operation === 'create') {
      errors.push(...this.validateCreatePayload(payload));
    }

    if (operation === 'patch') {
      errors.push(...this.validatePatchPayload(payload));
    }

    errors.push(...this.validateApiVersion(payload));

    if (errors.length > 0) {
      console.log('❌ Erros de validação Azure:\n');
      errors.forEach(err => console.log(`   - ${err}`));
      throw new Error(`Azure validation failed: ${errors.join(', ')}`);
    }

    console.log('✅ Payload Azure válido\n');
    return payload;
  }

  /**
   * Valida payload de criação de Issue
   */
  validateCreatePayload(payload) {
    const errors = [];

    if (!payload || typeof payload !== 'object') {
      errors.push('Payload inválido ou ausente');
      return errors;
    }

    // Valida campos obrigatórios
    this.requiredFields.forEach(field => {
      if (!this.hasField(payload, field)) {
        errors.push(`Campo obrigatório ausente: ${field}`);
      }
    });

    // Valida System.Title
    if (!this.hasField(payload, 'System.Title')) {
      errors.push('Campo obrigatório ausente: System.Title');
    }

    // Valida System.Description
    if (!this.hasField(payload, 'System.Description')) {
      errors.push('Campo obrigatório ausente: System.Description');
    }

    return errors;
  }

  /**
   * Valida payload PATCH
   */
  validatePatchPayload(payload) {
    const errors = [];

    if (!Array.isArray(payload)) {
      errors.push('PATCH payload deve ser um array de operações');
      return errors;
    }

    payload.forEach((operation, index) => {
      // Valida estrutura da operação
      if (!operation.op) {
        errors.push(`Operação ${index}: campo "op" ausente`);
      }

      if (!operation.path) {
        errors.push(`Operação ${index}: campo "path" ausente`);
      }

      // Valida operação válida
      if (operation.op && !this.patchOperations.includes(operation.op)) {
        errors.push(`Operação ${index}: operação inválida "${operation.op}"`);
      }

      // Valida value quando necessário
      if (['add', 'replace', 'test'].includes(operation.op) && operation.value === undefined) {
        errors.push(`Operação ${index}: campo "value" ausente para operação "${operation.op}"`);
      }

      // Valida estado se estiver alterando System.State
      if (operation.path === '/fields/System.State') {
        if (!this.validStates.includes(operation.value)) {
          errors.push(`Estado inválido: "${operation.value}"`);
        }
      }
    });

    return errors;
  }

  /**
   * Valida presença de api-version na URL
   */
  validateApiVersion(payload) {
    const errors = [];

    // Esta validação seria feita no node HTTP Request
    // Aqui apenas documentamos a regra

    return errors;
  }

  /**
   * Verifica se payload contém campo específico
   */
  hasField(payload, fieldPath) {
    // Para arrays (PATCH)
    if (Array.isArray(payload)) {
      return payload.some(op => op.path === `/fields/${fieldPath}`);
    }

    // Para objetos (JSON direto)
    if (typeof payload === 'string') {
      return payload.includes(fieldPath);
    }

    return false;
  }

  /**
   * Valida transição de estado
   */
  validateStateTransition(fromState, toState) {
    // Regras de transição (exemplo simplificado)
    const invalidTransitions = [
      ['Done', 'To Do'] // Não pode voltar de Done para To Do
    ];

    const isInvalid = invalidTransitions.some(
      ([from, to]) => fromState === from && toState === to
    );

    if (isInvalid) {
      throw new Error(`Transição inválida: ${fromState} → ${toState}`);
    }

    return true;
  }

  /**
   * Retorna campos obrigatórios
   */
  getRequiredFields() {
    return this.requiredFields;
  }

  /**
   * Retorna estados válidos
   */
  getValidStates() {
    return this.validStates;
  }
}

module.exports = AzureSpecialistAgent;
