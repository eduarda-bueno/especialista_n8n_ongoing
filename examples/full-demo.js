/**
 * Demonstração Completa do N8N Workflow Generator v2.0
 *
 * Mostra o funcionamento dos 11 agentes trabalhando em conjunto
 */

const WorkflowOrchestrator = require('../src/orchestrator');
const fs = require('fs');

async function fullDemo() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Demonstração Completa - Gerador v2.0        ║');
  console.log('║   11 Agentes Especializados                   ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const orchestrator = new WorkflowOrchestrator();

  // Descrição em linguagem natural
  const description = 'Criar fluxo que sincroniza estado do ticket do Intercom para Azure';

  console.log(`📝 Descrição fornecida:`);
  console.log(`   "${description}"\n`);
  console.log('Iniciando processamento pelos 11 agentes...\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Gerar workflow
    const result = await orchestrator.generate(description);

    // Salvar workflow
    const filename = `full_demo_${Date.now()}.json`;
    const filepath = orchestrator.saveWorkflow(result.workflow, filename);

    // Mostrar resumo detalhado
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              RESUMO DETALHADO                 ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📦 WORKFLOW GERADO:\n');
    console.log(`   Nome: ${result.workflow.name}`);
    console.log(`   Nodes: ${result.workflow.nodes.length}`);
    console.log(`   Conexões: ${Object.keys(result.workflow.connections).length}\n`);

    console.log('🔷 NODES CRIADOS:\n');
    result.workflow.nodes.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name}`);
      console.log(`      Tipo: ${node.type.replace('n8n-nodes-base.', '')}`);
    });
    console.log('');

    console.log('📊 RESULTADOS DA VALIDAÇÃO:\n');
    console.log(`   ✅ Validação de Estrutura:`);
    console.log(`      Erros: ${result.results.validation.summary.totalErrors}`);
    console.log(`      Avisos: ${result.results.validation.summary.totalWarnings}\n`);

    console.log(`   🔒 Análise de Segurança:`);
    console.log(`      Status: ${result.results.security.secure ? '✅ Seguro' : '❌ Inseguro'}`);
    console.log(`      Problemas: ${result.results.security.issues.length}\n`);

    console.log(`   👁️  Análise de Observabilidade:`);
    console.log(`      Críticos: ${result.results.observability.summary.critical}`);
    console.log(`      Avisos: ${result.results.observability.summary.warnings}`);
    console.log(`      OK: ${result.results.observability.summary.ok}\n`);

    console.log(`   🧪 Testes Funcionais:`);
    console.log(`      Total: ${result.results.tests.summary.total}`);
    console.log(`      Passaram: ${result.results.tests.summary.passed}`);
    console.log(`      Falharam: ${result.results.tests.summary.failed}\n`);

    // Detalhe dos testes
    if (result.results.tests.tests.length > 0) {
      console.log('   Cenários testados:\n');
      result.results.tests.tests.forEach((test, i) => {
        const status = test.status === 'passed' ? '✅' : '❌';
        console.log(`      ${i + 1}. ${status} ${test.name}`);
        console.log(`         ${test.scenario}`);
      });
      console.log('');
    }

    // Warnings se houver
    if (result.results.validation.warnings.length > 0) {
      console.log('⚠️  AVISOS DE VALIDAÇÃO:\n');
      result.results.validation.warnings.forEach((warn, i) => {
        console.log(`   ${i + 1}. ${warn}`);
      });
      console.log('');
    }

    // Status final
    console.log('═'.repeat(60));
    const allGood = result.results.validation.valid &&
                    result.results.security.secure &&
                    result.results.tests.allPassed;

    if (allGood) {
      console.log('🎉 WORKFLOW 100% PRONTO PARA PRODUÇÃO!');
    } else {
      console.log('⚠️  Workflow gerado com ressalvas - revisar relatórios');
    }
    console.log('═'.repeat(60) + '\n');

    console.log(`💾 Arquivo gerado: ${filepath}\n`);
    console.log('📥 PRÓXIMOS PASSOS:\n');
    console.log('   1. Abra o n8n');
    console.log('   2. Clique em "Import from File"');
    console.log(`   3. Selecione: ${filepath}`);
    console.log('   4. Configure credenciais (PAT Azure + Bearer Intercom)');
    console.log('   5. Ative o workflow\n');

    console.log('✨ Demonstração completa finalizada!\n');

    // Exemplo de uso dos agentes individualmente
    console.log('═'.repeat(60));
    console.log('📚 EXEMPLO: Usando Agentes Individualmente\n');

    const MappingAgent = require('../src/agents/specialists/mapping');
    const mapping = new MappingAgent();

    console.log('🗺️  Mapping Agent:\n');
    try {
      const azureState = mapping.mapIntercomStateToAzure('4572477');
      console.log(`   Intercom "4572477" → Azure "${azureState}"`);

      const intercomState = mapping.mapAzureStateToIntercom('Done');
      console.log(`   Azure "Done" → Intercom "${intercomState}"`);

      const tag = mapping.mapTicketTypeToTag('Catálogo');
      console.log(`   Ticket Type "Catálogo" → Tag "${tag}"`);
    } catch (error) {
      console.log(`   Erro: ${error.message}`);
    }

    console.log('\n🔄 Idempotency Agent:\n');
    const IdempotencyAgent = require('../src/agents/quality/idempotency');
    const idempotency = new IdempotencyAgent();

    const decision1 = idempotency.decide({
      operation: 'create',
      ticketId: '12345',
      azureId: null
    });
    console.log(`   Novo ticket sem Azure ID → ${decision1.action}`);

    const decision2 = idempotency.decide({
      operation: 'create',
      ticketId: '12345',
      azureId: '98765'
    });
    console.log(`   Ticket já tem Azure ID → ${decision2.action}`);

    console.log('\n═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erro na demonstração:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar demonstração
if (require.main === module) {
  fullDemo().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { fullDemo };
