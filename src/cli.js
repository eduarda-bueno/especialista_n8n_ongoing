#!/usr/bin/env node

/**
 * CLI do N8N Workflow Generator v2.0
 *
 * Comandos:
 * - npm start [descrição]              → Gera workflow
 * - npm run deploy [descrição]         → Gera + valida + deploya no n8n
 * - npm run deploy --file workflow.json → Deploya arquivo JSON existente
 */

require('dotenv').config();
const readline = require('readline');
const WorkflowOrchestrator = require('./orchestrator');
const N8nDeployer = require('./deployer');
const fs = require('fs');
const path = require('path');

// Parse argumentos
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  // Detecta comando
  if (command === 'deploy') {
    await deployCommand(args.slice(1));
  } else if (command === 'test-connection') {
    await testConnectionCommand();
  } else {
    await generateCommand(args);
  }
}

/**
 * Comando: Gerar workflow
 */
async function generateCommand(args) {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   N8N Workflow Generator v2.0                 ║');
  console.log('║   Orquestrador com 11 Subagentes             ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  let description = args.join(' ');

  // Se não passou descrição, solicita interativamente
  if (!description) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    description = await new Promise(resolve => {
      rl.question('Descreva o fluxo que deseja criar:\n> ', answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  if (!description || description.trim() === '') {
    console.error('❌ Erro: Descrição do fluxo é obrigatória');
    process.exit(1);
  }

  console.log(`\n📝 Descrição: "${description}"\n`);
  console.log('Processando através dos 11 agentes...\n');

  try {
    const orchestrator = new WorkflowOrchestrator();
    const result = await orchestrator.generate(description);

    // Salva workflow
    const filename = `workflow_${Date.now()}.json`;
    const filepath = orchestrator.saveWorkflow(result.workflow, filename);

    // Mostra resumo
    showResults(result, filepath);

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Comando: Deploy no n8n
 */
async function deployCommand(args) {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   N8N Workflow Generator v2.0                 ║');
  console.log('║   Deploy Automático                           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // Verifica configuração n8n
    if (!process.env.N8N_URL || !process.env.N8N_API_KEY) {
      console.error('❌ Configuração n8n não encontrada!\n');
      console.error('Configure o arquivo .env com:');
      console.error('  N8N_URL=https://sua-instancia.app.n8n.cloud');
      console.error('  N8N_API_KEY=n8n_api_xxxxx\n');
      console.error('Veja o arquivo .env.example para referência.');
      process.exit(1);
    }

    const deployer = new N8nDeployer();

    // Testa conexão
    console.log('🔌 Testando conexão com n8n...\n');
    const connection = await deployer.validateConnection();

    if (!connection.connected) {
      console.error('❌ Falha na conexão com n8n:');
      console.error(`   ${connection.message}\n`);
      process.exit(1);
    }

    console.log('✅ Conectado ao n8n com sucesso!');
    console.log(`   Workflows existentes: ${connection.workflowCount}\n`);

    let workflow;
    let result;

    // Verifica se é deploy de arquivo existente
    if (args[0] === '--file') {
      const filepath = args[1];
      if (!filepath) {
        console.error('❌ Erro: Especifique o arquivo JSON');
        console.error('   Uso: npm run deploy -- --file workflow.json');
        process.exit(1);
      }

      console.log(`📂 Carregando workflow de: ${filepath}\n`);
      const fullPath = path.resolve(filepath);
      workflow = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

    } else {
      // Gera workflow novo
      let description = args.join(' ');

      if (!description) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        description = await new Promise(resolve => {
          rl.question('Descreva o fluxo que deseja criar e deployer:\n> ', answer => {
            rl.close();
            resolve(answer);
          });
        });
      }

      if (!description || description.trim() === '') {
        console.error('❌ Erro: Descrição do fluxo é obrigatória');
        process.exit(1);
      }

      console.log(`📝 Descrição: "${description}"\n`);
      console.log('Processando através dos 11 agentes...\n');

      const orchestrator = new WorkflowOrchestrator();
      result = await orchestrator.generate(description);
      workflow = result.workflow;

      // Mostra resultados da validação
      console.log('═'.repeat(60));
      showResults(result);
      console.log('═'.repeat(60) + '\n');
    }

    // Deploy no n8n
    console.log('🚀 Iniciando deploy no n8n...\n');

    const deployResult = await deployer.deploy(workflow, {
      activate: true,
      updateIfExists: true
    });

    if (deployResult.success) {
      console.log('═'.repeat(60));
      console.log('🎉 DEPLOY REALIZADO COM SUCESSO!\n');
      console.log(`📦 Workflow: ${workflow.name}`);
      console.log(`🆔 ID: ${deployResult.workflowId}`);
      console.log(`⚡ Status: ${deployResult.activated ? 'Ativo' : 'Inativo'}`);
      console.log(`🔗 URL: ${deployResult.workflowUrl}\n`);
      console.log('═'.repeat(60) + '\n');
    } else {
      console.error('❌ Falha no deploy:', deployResult.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Erro no deploy:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Comando: Testar conexão com n8n
 */
async function testConnectionCommand() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Teste de Conexão com n8n                    ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  if (!process.env.N8N_URL || !process.env.N8N_API_KEY) {
    console.error('❌ Configuração n8n não encontrada no .env\n');
    process.exit(1);
  }

  try {
    const deployer = new N8nDeployer();
    const result = await deployer.validateConnection();

    if (result.connected) {
      console.log('✅ Conexão estabelecida com sucesso!\n');
      console.log(`📊 Workflows existentes: ${result.workflowCount}`);
      console.log(`🔗 URL: ${process.env.N8N_URL}\n`);
    } else {
      console.error('❌ Falha na conexão:\n');
      console.error(`   ${result.message}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

/**
 * Mostra resultados da geração
 */
function showResults(result, filepath = null) {
  const valStatus = result.results.validation.valid ? '✅' : '❌';
  const secStatus = result.results.security.secure ? '✅' : '❌';
  const obsStatus = result.results.observability.summary.critical === 0 ? '✅' : '⚠️';
  const testStatus = result.results.tests.allPassed ? '✅' : '❌';

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║          RELATÓRIO FINAL DE GERAÇÃO           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`📦 Workflow: ${result.workflow.name}`);
  console.log(`🔷 Nodes: ${result.workflow.nodes.length}`);
  console.log(`🔗 Conexões: ${Object.keys(result.workflow.connections).length}\n`);

  console.log('📊 RESULTADOS:\n');
  console.log(`${valStatus} Validação: ${result.results.validation.summary.totalErrors} erros, ${result.results.validation.summary.totalWarnings} avisos`);
  console.log(`${secStatus} Segurança: ${result.results.security.issues.length} problemas`);
  console.log(`${obsStatus} Observabilidade: ${result.results.observability.summary.critical} críticos, ${result.results.observability.summary.warnings} avisos`);
  console.log(`${testStatus} Testes: ${result.results.tests.summary.passed}/${result.results.tests.summary.total} passaram\n`);

  const allGood = result.results.validation.valid &&
                  result.results.security.secure &&
                  result.results.tests.allPassed;

  if (allGood) {
    console.log('🎉 WORKFLOW 100% PRONTO PARA USO!\n');
  } else {
    console.log('⚠️  Workflow gerado com ressalvas\n');
  }

  if (filepath) {
    console.log(`💾 Workflow salvo em: ${filepath}\n`);
  }
}

// Executa CLI
main().catch(console.error);
