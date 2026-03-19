/**
 * Orquestrador Principal
 * Coordena os 11 subagentes para gerar workflows n8n completos e validados
 *
 * Fluxo:
 * 1. Specifier    → Transforma descrição informal em SPEC estruturada
 * 2. Architect    → Define arquitetura técnica do workflow
 * 3. Builder      → Gera JSON importável do n8n
 * 4. Validator    → Valida estrutura contra Definition of Done
 * 5. Tester       → Testa comportamento funcional
 *
 * Especialistas (consultados quando necessário):
 * - Mapping       → Valida mapeamentos entre sistemas
 * - Azure         → Valida conformidade com Azure DevOps
 * - Intercom      → Valida conformidade com Intercom
 *
 * Qualidade (executados automaticamente):
 * - Idempotency   → Evita duplicações
 * - Security      → Garante segurança
 * - Observability → Garante rastreabilidade
 */

const SpecifierAgent = require('../agents/core/specifier');
const ArchitectAgent = require('../agents/core/architect');
const BuilderAgent = require('../agents/core/builder');

const ValidatorAgent = require('../agents/quality/validator');
const TesterAgent = require('../agents/quality/tester');
const SecurityAgent = require('../agents/quality/security');
const IdempotencyAgent = require('../agents/quality/idempotency');
const ObservabilityAgent = require('../agents/quality/observability');

const MappingAgent = require('../agents/specialists/mapping');
const AzureSpecialistAgent = require('../agents/specialists/azure');
const IntercomSpecialistAgent = require('../agents/specialists/intercom');

const fs = require('fs');
const path = require('path');

class WorkflowOrchestrator {
  constructor() {
    // Core Agents
    this.specifier = new SpecifierAgent();
    this.architect = new ArchitectAgent();
    this.builder = new BuilderAgent();

    // Quality Agents
    this.validator = new ValidatorAgent();
    this.tester = new TesterAgent();
    this.security = new SecurityAgent();
    this.idempotency = new IdempotencyAgent();
    this.observability = new ObservabilityAgent();

    // Specialist Agents
    this.mapping = new MappingAgent();
    this.azure = new AzureSpecialistAgent();
    this.intercom = new IntercomSpecialistAgent();
  }

  /**
   * Gera workflow completo a partir de descrição informal
   */
  async generate(informalDescription) {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   N8N Workflow Generator - Orquestrador       ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log(`📝 Descrição: "${informalDescription}"\n`);
    console.log('='.repeat(60) + '\n');

    try {
      // FASE 1: Especificação
      console.log('FASE 1: ESPECIFICAÇÃO\n');
      const spec = this.specifier.specify(informalDescription);

      // FASE 2: Arquitetura
      console.log('FASE 2: ARQUITETURA\n');
      const architecture = this.architect.design(spec);

      // FASE 3: Construção
      console.log('FASE 3: CONSTRUÇÃO\n');
      const workflow = this.builder.build(spec, architecture);

      // FASE 4: Validação de Estrutura
      console.log('FASE 4: VALIDAÇÃO DE ESTRUTURA\n');
      const validationResult = this.validator.validate(workflow, spec);

      if (!validationResult.valid) {
        console.log('❌ Validação falhou. Corrigindo...\n');
        // Em produção, aqui o Builder poderia tentar corrigir automaticamente
      }

      // FASE 5: Validação de Segurança
      console.log('FASE 5: VALIDAÇÃO DE SEGURANÇA\n');
      const securityResult = this.security.validate(workflow);

      if (!securityResult.secure) {
        throw new Error('Falhas críticas de segurança detectadas');
      }

      // FASE 6: Análise de Observabilidade
      console.log('FASE 6: ANÁLISE DE OBSERVABILIDADE\n');
      const observabilityResult = this.observability.analyze(workflow, spec);

      // FASE 7: Testes Funcionais
      console.log('FASE 7: TESTES FUNCIONAIS\n');
      const testResult = this.tester.test(workflow, spec);

      // RELATÓRIO FINAL
      this.printFinalReport({
        spec,
        architecture,
        workflow,
        validation: validationResult,
        security: securityResult,
        observability: observabilityResult,
        tests: testResult
      });

      return {
        workflow,
        results: {
          validation: validationResult,
          security: securityResult,
          observability: observabilityResult,
          tests: testResult
        }
      };

    } catch (error) {
      console.error('\n❌ Erro na geração do workflow:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  /**
   * Imprime relatório final
   */
  printFinalReport(results) {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          RELATÓRIO FINAL DE GERAÇÃO           ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log(`📦 Workflow: ${results.workflow.name}`);
    console.log(`🔷 Nodes: ${results.workflow.nodes.length}`);
    console.log(`🔗 Conexões: ${Object.keys(results.workflow.connections).length}\n`);

    // Validação
    const valStatus = results.validation.valid ? '✅' : '❌';
    console.log(`${valStatus} Validação: ${results.validation.summary.totalErrors} erros, ${results.validation.summary.totalWarnings} avisos`);

    // Segurança
    const secStatus = results.security.secure ? '✅' : '❌';
    console.log(`${secStatus} Segurança: ${results.security.issues.length} problemas`);

    // Observabilidade
    const obsStatus = results.observability.passed ? '✅' : '⚠️ ';
    console.log(`${obsStatus} Observabilidade: ${results.observability.summary.critical} críticos, ${results.observability.summary.warnings} avisos`);

    // Testes
    const testStatus = results.tests.allPassed ? '✅' : '❌';
    console.log(`${testStatus} Testes: ${results.tests.summary.passed}/${results.tests.summary.total} passaram\n`);

    // Status Geral
    const allGood = results.validation.valid &&
                    results.security.secure &&
                    results.tests.allPassed;

    if (allGood) {
      console.log('🎉 WORKFLOW PRONTO PARA USO!\n');
    } else {
      console.log('⚠️  Workflow gerado com ressalvas - revisar relatórios acima\n');
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Salva workflow em arquivo
   */
  saveWorkflow(workflow, filename) {
    const outputDir = path.join(__dirname, '../../workflows');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2), 'utf-8');

    console.log(`💾 Workflow salvo em: ${filepath}\n`);
    return filepath;
  }

  /**
   * Valida payload de entrada (usado pelos especialistas)
   */
  validateInput(payload, source) {
    if (source === 'intercom') {
      return this.intercom.validate(payload);
    }

    if (source === 'azure') {
      return this.azure.validate(payload);
    }

    throw new Error(`Fonte não suportada: ${source}`);
  }

  /**
   * Verifica idempotência (usado durante execução)
   */
  checkIdempotency(context) {
    return this.idempotency.decide(context);
  }
}

module.exports = WorkflowOrchestrator;
