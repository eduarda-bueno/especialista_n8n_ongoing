/**
 * Exemplo de uso do N8N Workflow Generator
 * Testa o sistema com 11 agentes especializados em múltiplos cenários
 */

const WorkflowOrchestrator = require('../src/orchestrator');

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Teste do N8N Workflow Generator v2.0        ║');
  console.log('║   Sistema com 11 Agentes Especializados      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const orchestrator = new WorkflowOrchestrator();

  // Exemplos de descrições
  const examples = [
    'Criar fluxo que sincroniza estado do ticket do Intercom para Azure',
    'Criar fluxo que envia comentários do Intercom para Azure',
    'Criar fluxo que cria issue no Azure quando ticket é criado no Intercom',
    'Sincronizar tags do Intercom para o Azure',
    'Atualizar prioridade do Azure quando ticket do Intercom mudar'
  ];

  console.log('📝 Exemplos disponíveis:');
  examples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex}`);
  });
  console.log('');

  // Gera workflow para cada exemplo
  for (let i = 0; i < examples.length; i++) {
    const description = examples[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Exemplo ${i + 1}/${examples.length}: ${description}`);
    console.log('='.repeat(60));

    try {
      // Gera workflow com todos os 11 agentes
      const result = await orchestrator.generate(description);

      // Salva workflow
      const filename = `example_${i + 1}_${Date.now()}.json`;
      const filepath = orchestrator.saveWorkflow(result.workflow, filename);

      // Mostra resultados dos 11 agentes
      console.log('\n📊 RESULTADOS DOS AGENTES:\n');

      const valStatus = result.results.validation.valid ? '✅' : '❌';
      const secStatus = result.results.security.secure ? '✅' : '❌';
      const obsStatus = result.results.observability.summary.critical === 0 ? '✅' : '⚠️';
      const testStatus = result.results.tests.allPassed ? '✅' : '❌';

      console.log(`${valStatus} Validação: ${result.results.validation.summary.totalErrors} erros, ${result.results.validation.summary.totalWarnings} avisos`);
      console.log(`${secStatus} Segurança: ${result.results.security.issues.length} problemas`);
      console.log(`${obsStatus} Observabilidade: ${result.results.observability.summary.critical} críticos, ${result.results.observability.summary.warnings} avisos`);
      console.log(`${testStatus} Testes: ${result.results.tests.summary.passed}/${result.results.tests.summary.total} passaram`);

      // Status final
      const allGood = result.results.validation.valid &&
                      result.results.security.secure &&
                      result.results.tests.allPassed;

      console.log('');
      if (allGood) {
        console.log('🎉 WORKFLOW 100% PRONTO!');
      } else {
        console.log('⚠️  Workflow gerado com ressalvas');
      }

      console.log(`📄 Arquivo: ${filepath}`);

    } catch (error) {
      console.error('❌ Erro:', error.message);
      console.error(error.stack);
    }
  }

  console.log('\n\n✨ Teste completo! Verifique a pasta workflows/ para os arquivos gerados.');
}

// Executa se for chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
