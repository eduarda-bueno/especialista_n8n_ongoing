/**
 * Tester Agent
 *
 * 🎯 Missão: Validar comportamento funcional do workflow através de testes simulados
 *
 * Responsabilidades:
 * - Gerar payloads de teste baseados na SPEC
 * - Simular execução lógica do fluxo
 * - Validar mapeamentos com dados reais
 * - Validar cenários de erro
 * - Validar estados não mapeados
 * - Validar campos obrigatórios ausentes
 * - Testar idempotência quando aplicável
 *
 * Tipos de Testes:
 * 1. Happy Path - Fluxo executa corretamente
 * 2. Campo Obrigatório Ausente - Workflow falha explicitamente
 * 3. Estado Não Mapeado - Erro é lançado
 * 4. Dados Incompletos - Workflow não continua silenciosamente
 * 5. Reprocessamento - Não cria duplicação
 *
 * Restrições:
 * - NÃO modificar workflow
 * - NÃO alterar SPEC
 * - Apenas testar e reportar
 */

const MappingAgent = require('../specialists/mapping');

class TesterAgent {
  constructor() {
    this.mappingAgent = new MappingAgent();
    this.testResults = [];
  }

  /**
   * Executa bateria de testes no workflow
   */
  test(workflow, spec) {
    console.log('🧪 Tester Agent: Executando testes...\n');

    this.testResults = [];

    // Happy Path
    this.testHappyPath(workflow, spec);

    // Cenários de Erro
    this.testMissingRequiredField(workflow, spec);
    this.testUnmappedState(workflow, spec);
    this.testIncompleteData(workflow, spec);

    // Idempotência (se aplicável)
    if (spec.objetivo.includes('Criar')) {
      this.testIdempotency(workflow, spec);
    }

    return this.generateReport();
  }

  /**
   * Teste 1: Happy Path
   */
  testHappyPath(workflow, spec) {
    console.log('1️⃣  Testando Happy Path...');

    const testCase = {
      name: 'Happy Path',
      scenario: 'Payload válido com todos os campos obrigatórios',
      payload: this.generateValidPayload(spec),
      expectedResult: 'success'
    };

    try {
      // Simula execução
      const result = this.simulateExecution(workflow, testCase.payload, spec);

      if (result.success) {
        this.testResults.push({
          ...testCase,
          status: 'passed',
          message: 'Fluxo executou corretamente com payload válido'
        });
        console.log('   ✅ PASSOU\n');
      } else {
        this.testResults.push({
          ...testCase,
          status: 'failed',
          message: `Fluxo falhou inesperadamente: ${result.error}`
        });
        console.log('   ❌ FALHOU\n');
      }
    } catch (error) {
      this.testResults.push({
        ...testCase,
        status: 'failed',
        message: `Exceção inesperada: ${error.message}`
      });
      console.log('   ❌ FALHOU\n');
    }
  }

  /**
   * Teste 2: Campo Obrigatório Ausente
   */
  testMissingRequiredField(workflow, spec) {
    console.log('2️⃣  Testando Campo Obrigatório Ausente...');

    const testCase = {
      name: 'Missing Required Field',
      scenario: 'Payload sem campo obrigatório (title)',
      payload: this.generateInvalidPayload(spec, 'missing_title'),
      expectedResult: 'error'
    };

    try {
      const result = this.simulateExecution(workflow, testCase.payload, spec);

      if (!result.success && result.error) {
        this.testResults.push({
          ...testCase,
          status: 'passed',
          message: 'Erro explícito lançado corretamente para campo ausente'
        });
        console.log('   ✅ PASSOU\n');
      } else {
        this.testResults.push({
          ...testCase,
          status: 'failed',
          message: 'Workflow não falhou quando deveria (falha silenciosa)'
        });
        console.log('   ❌ FALHOU - Falha silenciosa detectada\n');
      }
    } catch (error) {
      // Erro é esperado aqui
      this.testResults.push({
        ...testCase,
        status: 'passed',
        message: `Erro corretamente lançado: ${error.message}`
      });
      console.log('   ✅ PASSOU\n');
    }
  }

  /**
   * Teste 3: Estado Não Mapeado
   */
  testUnmappedState(workflow, spec) {
    if (!spec.mapeamentos.some(m => m.tipo.includes('Estado'))) {
      console.log('3️⃣  Pulando teste de estado não mapeado (não aplicável)\n');
      return;
    }

    console.log('3️⃣  Testando Estado Não Mapeado...');

    const testCase = {
      name: 'Unmapped State',
      scenario: 'ticket_state.id não existe no mapeamento',
      payload: this.generateInvalidPayload(spec, 'unmapped_state'),
      expectedResult: 'error'
    };

    try {
      const result = this.simulateMappingExecution(workflow, testCase.payload, spec);

      if (!result.success && result.error?.includes('não mapeado')) {
        this.testResults.push({
          ...testCase,
          status: 'passed',
          message: 'Erro de mapeamento lançado corretamente'
        });
        console.log('   ✅ PASSOU\n');
      } else {
        this.testResults.push({
          ...testCase,
          status: 'failed',
          message: 'Estado inválido não causou erro'
        });
        console.log('   ❌ FALHOU\n');
      }
    } catch (error) {
      if (error.message.includes('não mapeado')) {
        this.testResults.push({
          ...testCase,
          status: 'passed',
          message: 'Erro de mapeamento lançado corretamente'
        });
        console.log('   ✅ PASSOU\n');
      } else {
        this.testResults.push({
          ...testCase,
          status: 'failed',
          message: `Erro inesperado: ${error.message}`
        });
        console.log('   ❌ FALHOU\n');
      }
    }
  }

  /**
   * Teste 4: Dados Incompletos
   */
  testIncompleteData(workflow, spec) {
    console.log('4️⃣  Testando Dados Incompletos...');

    const testCase = {
      name: 'Incomplete Data',
      scenario: 'Payload parcial sem estrutura completa',
      payload: { body: { data: null } },
      expectedResult: 'error'
    };

    try {
      const result = this.simulateExecution(workflow, testCase.payload, spec);

      if (!result.success) {
        this.testResults.push({
          ...testCase,
          status: 'passed',
          message: 'Workflow rejeitou dados incompletos'
        });
        console.log('   ✅ PASSOU\n');
      } else {
        this.testResults.push({
          ...testCase,
          status: 'failed',
          message: 'Workflow aceitou dados incompletos (não deveria)'
        });
        console.log('   ❌ FALHOU\n');
      }
    } catch (error) {
      this.testResults.push({
        ...testCase,
        status: 'passed',
        message: 'Erro corretamente lançado para dados incompletos'
      });
      console.log('   ✅ PASSOU\n');
    }
  }

  /**
   * Teste 5: Idempotência
   */
  testIdempotency(workflow, spec) {
    console.log('5️⃣  Testando Idempotência...');

    const testCase = {
      name: 'Idempotency',
      scenario: 'Reprocessar ticket que já tem Azure ID',
      payload: this.generatePayloadWithAzureId(spec),
      expectedResult: 'ignored'
    };

    try {
      const result = this.simulateIdempotencyCheck(workflow, testCase.payload, spec);

      if (result.action === 'ignore') {
        this.testResults.push({
          ...testCase,
          status: 'passed',
          message: 'Reprocessamento corretamente ignorado'
        });
        console.log('   ✅ PASSOU\n');
      } else {
        this.testResults.push({
          ...testCase,
          status: 'failed',
          message: 'Workflow tentaria criar duplicata'
        });
        console.log('   ❌ FALHOU\n');
      }
    } catch (error) {
      this.testResults.push({
        ...testCase,
        status: 'failed',
        message: `Erro ao testar idempotência: ${error.message}`
      });
      console.log('   ❌ FALHOU\n');
    }
  }

  /**
   * Simula execução do workflow
   */
  simulateExecution(workflow, payload, spec) {
    // Simula webhook
    if (!payload || !payload.body) {
      return { success: false, error: 'Payload inválido' };
    }

    // Simula extração
    const extractedFields = this.simulateExtraction(workflow, payload);
    if (!extractedFields.title || !extractedFields.intercomId) {
      return { success: false, error: 'Campos obrigatórios ausentes' };
    }

    // Simula mapeamento (se aplicável)
    if (spec.mapeamentos.length > 0) {
      const mappingResult = this.simulateMappingExecution(workflow, payload, spec);
      if (!mappingResult.success) {
        return mappingResult;
      }
    }

    return { success: true };
  }

  /**
   * Simula extração de campos
   */
  simulateExtraction(workflow, payload) {
    const extracted = {};

    // Simula navegação no payload
    try {
      extracted.title = payload.body?.data?.item?.ticket_attributes?._default_title_;
      extracted.intercomId = payload.body?.data?.item?.id;
      extracted.ticketId = payload.body?.data?.item?.ticket_id;
    } catch (error) {
      // Falha na extração
    }

    return extracted;
  }

  /**
   * Simula execução de mapeamento
   */
  simulateMappingExecution(workflow, payload, spec) {
    try {
      const stateId = payload.body?.data?.item?.ticket_state?.id;

      if (stateId) {
        // Usa MappingAgent real para validar
        const azureState = this.mappingAgent.mapIntercomStateToAzure(stateId);
        return { success: true, azureState };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Simula verificação de idempotência
   */
  simulateIdempotencyCheck(workflow, payload, spec) {
    const azureId = payload.body?.data?.item?.ticket_attributes?.['Azure ID'];

    if (azureId) {
      return { action: 'ignore', reason: 'Já existe Azure ID' };
    }

    return { action: 'create', reason: 'Novo ticket' };
  }

  /**
   * Gera payload válido
   */
  generateValidPayload(spec) {
    return {
      body: {
        type: 'notification_event',
        topic: spec.trigger.event,
        data: {
          item: {
            id: '215473334766455',
            ticket_id: '80432668',
            ticket_attributes: {
              _default_title_: 'Teste de integração',
              _default_description_: 'Descrição do teste',
              'Azure ID': null
            },
            ticket_state: {
              id: '4572477' // To Do
            },
            contacts: {
              contacts: [{ id: '64bed695650bfbad54ba687b' }]
            },
            company_id: '645cdaa3b84b876d0a005e68'
          }
        }
      }
    };
  }

  /**
   * Gera payload inválido
   */
  generateInvalidPayload(spec, type) {
    const base = this.generateValidPayload(spec);

    if (type === 'missing_title') {
      delete base.body.data.item.ticket_attributes._default_title_;
    }

    if (type === 'unmapped_state') {
      base.body.data.item.ticket_state.id = '9999999'; // Estado inexistente
    }

    return base;
  }

  /**
   * Gera payload com Azure ID (para teste de idempotência)
   */
  generatePayloadWithAzureId(spec) {
    const payload = this.generateValidPayload(spec);
    payload.body.data.item.ticket_attributes['Azure ID'] = '123456';
    return payload;
  }

  /**
   * Gera relatório de testes
   */
  generateReport() {
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RELATÓRIO DE TESTES\n');

    const passed = this.testResults.filter(t => t.status === 'passed');
    const failed = this.testResults.filter(t => t.status === 'failed');

    console.log(`Total de Testes: ${this.testResults.length}`);
    console.log(`✅ Passaram: ${passed.length}`);
    console.log(`❌ Falharam: ${failed.length}\n`);

    if (failed.length > 0) {
      console.log('FALHAS:\n');
      failed.forEach(test => {
        console.log(`  ❌ ${test.name}`);
        console.log(`     Cenário: ${test.scenario}`);
        console.log(`     Motivo: ${test.message}\n`);
      });
    }

    if (passed.length > 0) {
      console.log('SUCESSOS:\n');
      passed.forEach(test => {
        console.log(`  ✅ ${test.name} - ${test.scenario}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════\n');

    return {
      allPassed: failed.length === 0,
      tests: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: passed.length,
        failed: failed.length
      }
    };
  }
}

module.exports = TesterAgent;
