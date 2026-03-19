/**
 * Demonstração de Deploy Automático
 *
 * Este exemplo mostra como usar o N8nDeployer para fazer deploy
 * automático de workflows na sua instância n8n
 */

require('dotenv').config();
const WorkflowOrchestrator = require('../src/orchestrator');
const N8nDeployer = require('../src/deployer');

async function deployDemo() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Demonstração - Deploy Automático           ║');
  console.log('║   Gerar + Validar + Deployer no n8n          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Verifica configuração
  if (!process.env.N8N_URL || !process.env.N8N_API_KEY) {
    console.error('❌ Configure o arquivo .env com suas credenciais n8n');
    console.error('   Veja .env.example para referência\n');
    process.exit(1);
  }

  try {
    // 1. Testa conexão com n8n
    console.log('ETAPA 1: Testando conexão com n8n\n');
    const deployer = new N8nDeployer();
    const connection = await deployer.validateConnection();

    if (!connection.connected) {
      console.error('❌ Falha na conexão:', connection.message);
      process.exit(1);
    }

    console.log('✅ Conectado ao n8n!');
    console.log(`   Workflows existentes: ${connection.workflowCount}\n`);

    // 2. Gera workflow
    console.log('ETAPA 2: Gerando workflow\n');
    const description = 'Criar fluxo que sincroniza estado do ticket do Intercom para Azure';
    console.log(`📝 Descrição: "${description}"\n`);

    const orchestrator = new WorkflowOrchestrator();
    const result = await orchestrator.generate(description);

    console.log('═'.repeat(60));
    console.log('✅ Workflow gerado e validado!\n');

    // 3. Deploy no n8n
    console.log('ETAPA 3: Deploy no n8n\n');

    const deployResult = await deployer.deploy(result.workflow, {
      activate: true,
      updateIfExists: true
    });

    if (deployResult.success) {
      console.log('═'.repeat(60));
      console.log('🎉 DEPLOY REALIZADO COM SUCESSO!\n');
      console.log(`📦 Workflow: ${result.workflow.name}`);
      console.log(`🆔 ID: ${deployResult.workflowId}`);
      console.log(`🔄 Ação: ${deployResult.action === 'created' ? 'Criado' : 'Atualizado'}`);
      console.log(`⚡ Status: ${deployResult.activated ? 'Ativo' : 'Inativo'}`);
      console.log(`🔗 URL: ${deployResult.workflowUrl}\n`);
      console.log('═'.repeat(60) + '\n');
      console.log('✨ Acesse o link acima para ver seu workflow no n8n!');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exemplo 2: Deploy de múltiplos workflows
async function deployBatchDemo() {
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║   Deploy em Lote (Múltiplos Workflows)       ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const descriptions = [
    'Sincronizar estado do ticket do Intercom para Azure',
    'Criar fluxo que envia comentários do Intercom para Azure',
    'Sincronizar tags do Intercom para o Azure'
  ];

  const orchestrator = new WorkflowOrchestrator();
  const deployer = new N8nDeployer();
  const workflows = [];

  // Gera todos os workflows
  console.log('📝 Gerando workflows...\n');
  for (const desc of descriptions) {
    const result = await orchestrator.generate(desc);
    workflows.push(result.workflow);
  }

  // Deploy em lote
  console.log(`\n🚀 Deploy de ${workflows.length} workflows...\n`);
  const batchResult = await deployer.deployBatch(workflows, {
    activate: true,
    updateIfExists: true
  });

  console.log('═'.repeat(60));
  console.log('📊 RESULTADO DO DEPLOY EM LOTE\n');
  console.log(`Total: ${batchResult.total}`);
  console.log(`✅ Sucesso: ${batchResult.successful}`);
  console.log(`❌ Falhas: ${batchResult.failed}\n`);

  batchResult.results.forEach((result, i) => {
    if (result.success) {
      console.log(`${i + 1}. ✅ ${result.workflow?.name || 'Workflow'}`);
      console.log(`   🔗 ${result.workflowUrl}`);
    } else {
      console.log(`${i + 1}. ❌ ${result.workflow}`);
      console.log(`   Erro: ${result.error}`);
    }
  });
  console.log('═'.repeat(60) + '\n');
}

// Exemplo 3: Gerenciamento de workflows
async function manageWorkflowsDemo() {
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║   Gerenciamento de Workflows                  ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const deployer = new N8nDeployer();

  // Lista workflows
  console.log('📋 Listando workflows...\n');
  const { workflows } = await deployer.listWorkflows();

  console.log(`Total de workflows: ${workflows.length}\n`);
  workflows.slice(0, 5).forEach((w, i) => {
    const status = w.active ? '⚡ Ativo' : '⏸️  Inativo';
    console.log(`${i + 1}. ${w.name} (ID: ${w.id})`);
    console.log(`   ${status}\n`);
  });

  // Busca workflow específico
  console.log('🔍 Buscando workflow "Sync State"...\n');
  const workflow = await deployer.findWorkflowByName('Sync State');

  if (workflow) {
    console.log(`✅ Encontrado: ${workflow.name}`);
    console.log(`   ID: ${workflow.id}`);
    console.log(`   Status: ${workflow.active ? 'Ativo' : 'Inativo'}\n`);
  } else {
    console.log('❌ Workflow não encontrado\n');
  }
}

// Executa demonstrações
async function main() {
  try {
    await deployDemo();

    // Descomente para testar deploy em lote
    // await deployBatchDemo();

    // Descomente para testar gerenciamento
    // await manageWorkflowsDemo();

  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { deployDemo, deployBatchDemo, manageWorkflowsDemo };
