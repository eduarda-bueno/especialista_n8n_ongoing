/**
 * Demo Rápido - Gera um workflow de exemplo
 * Usando o novo sistema com 11 agentes
 */

const WorkflowOrchestrator = require('../src/orchestrator');

async function demo() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Demo Rápido - N8N Workflow Generator v2.0   ║');
  console.log('║   Sistema com 11 Agentes Especializados      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const orchestrator = new WorkflowOrchestrator();

  // Descrição do fluxo
  const description = 'Criar fluxo que sincroniza estado do ticket do Intercom para Azure';

  console.log(`📝 Descrição: "${description}"\n`);

  try {
    // Gera workflow com todos os 11 agentes
    const result = await orchestrator.generate(description);

    // Salva workflow
    const filename = `quick_demo_${Date.now()}.json`;
    const filepath = orchestrator.saveWorkflow(result.workflow, filename);

    // Mostra resumo
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              RESUMO DO WORKFLOW               ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log(`📦 Workflow: ${result.workflow.name}`);
    console.log(`🔷 Nodes: ${result.workflow.nodes.length}`);
    console.log(`🔗 Conexões: ${Object.keys(result.workflow.connections).length}\n`);

    // Resultados das validações
    const valStatus = result.results.validation.valid ? '✅' : '❌';
    const secStatus = result.results.security.secure ? '✅' : '❌';
    const testStatus = result.results.tests.allPassed ? '✅' : '❌';

    console.log('📊 RESULTADOS:\n');
    console.log(`${valStatus} Validação: ${result.results.validation.summary.totalErrors} erros, ${result.results.validation.summary.totalWarnings} avisos`);
    console.log(`${secStatus} Segurança: ${result.results.security.issues.length} problemas`);
    console.log(`${testStatus} Testes: ${result.results.tests.summary.passed}/${result.results.tests.summary.total} passaram\n`);

    // Status final
    const allGood = result.results.validation.valid &&
                    result.results.security.secure &&
                    result.results.tests.allPassed;

    if (allGood) {
      console.log('🎉 WORKFLOW 100% PRONTO PARA USO!\n');
    } else {
      console.log('⚠️  Workflow gerado com ressalvas\n');
    }

    console.log(`💾 Arquivo: ${filepath}`);
    console.log('\n✨ Importe este arquivo no n8n!\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
  }
}

// Executa
demo().catch(console.error);
