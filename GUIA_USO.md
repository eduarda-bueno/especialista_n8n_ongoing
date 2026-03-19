# Guia de Uso - N8N Workflow Generator v2.0

Sistema com **11 subagentes especializados** que trabalham em conjunto para gerar workflows n8n completos, testados e validados.

## 🎯 Instalação

```bash
cd /Users/eduardabueno/repos/especialista_n8n
npm install
```

## 🚀 Uso Básico

### Modo 1: CLI Interativo (Recomendado)

```bash
npm start
```

O sistema irá guiá-lo:

```
╔════════════════════════════════════════════════╗
║   N8N Workflow Generator v2.0                 ║
║   Orquestrador com 11 Subagentes             ║
╚════════════════════════════════════════════════╝

Descreva o fluxo que deseja criar:
> Criar fluxo que sincroniza estado do ticket do Intercom para Azure
```

### Modo 2: Programático

```javascript
const WorkflowOrchestrator = require('./src/orchestrator');

const orchestrator = new WorkflowOrchestrator();

const result = await orchestrator.generate(
  'Criar fluxo que sincroniza comentários do Intercom para Azure'
);

// Salvar workflow
orchestrator.saveWorkflow(result.workflow, 'meu-workflow.json');

// Acessar resultados
console.log(result.results.validation); // Erros/avisos de validação
console.log(result.results.tests);      // Resultados dos testes
console.log(result.results.security);   // Análise de segurança
```

## 📊 O que Acontece Internamente

Quando você descreve um fluxo, **7 fases** são executadas automaticamente:

### FASE 1: ESPECIFICAÇÃO (Specifier Agent)

O Specifier analisa sua descrição e gera uma SPEC estruturada:

```
🎯 Objetivo: Sincronizar estado do ticket entre Intercom e Azure
⚡ Trigger: ticket.state.updated (Intercom)
📥 Entrada: ticket_state.id, Azure ID
🗺️  Mapeamentos: Estado Intercom → Azure
```

### FASE 2: ARQUITETURA (Architect Agent)

O Architect define a estrutura técnica:

```
🔷 Nodes:
   1. Webhook (Intercom) → Receber evento
   2. Extract Fields → Extrair dados
   3. Code (Map State) → Mapear estado
   4. HTTP Request (Azure) → Atualizar Issue
```

### FASE 3: CONSTRUÇÃO (Builder Agent)

O Builder gera o JSON do workflow:

```json
{
  "name": "Intercom → Azure | Sync State",
  "nodes": [ ... ],
  "connections": { ... }
}
```

### FASE 4: VALIDAÇÃO (Validator Agent)

Verifica conformidade com CLAUDE.md:

```
✅ Nomes dos nodes padronizados
✅ Credenciais corretas
✅ Headers HTTP válidos
⚠️  Campo Custom.Appversion não encontrado (aviso)
```

### FASE 5: SEGURANÇA (Security Agent)

Analisa segurança:

```
✅ Nenhum token hardcoded
✅ Credenciais autorizadas
✅ Headers sensíveis seguros
```

### FASE 6: OBSERVABILIDADE (Observability Agent)

Garante rastreabilidade:

```
✅ Erros explícitos implementados
✅ Campos de rastreamento presentes
ℹ️  Sugestão: habilitar logs de erro no HTTP Request
```

### FASE 7: TESTES (Tester Agent)

Executa 5 cenários de teste:

```
1️⃣  Happy Path ✅ PASSOU
2️⃣  Campo Obrigatório Ausente ✅ PASSOU (erro correto)
3️⃣  Estado Não Mapeado ✅ PASSOU (erro correto)
4️⃣  Dados Incompletos ✅ PASSOU (rejeitado)
5️⃣  Idempotência ✅ PASSOU (não duplicou)
```

## 📋 Relatório Final

Ao final, você recebe um relatório completo:

```
╔════════════════════════════════════════════════╗
║          RELATÓRIO FINAL DE GERAÇÃO           ║
╚════════════════════════════════════════════════╝

📦 Workflow: Intercom → Azure | Sync State
🔷 Nodes: 4
🔗 Conexões: 3

✅ Validação: 0 erros, 1 avisos
✅ Segurança: 0 problemas
✅ Observabilidade: 0 críticos, 2 avisos
✅ Testes: 5/5 passaram

🎉 WORKFLOW PRONTO PARA USO!

💾 Workflow salvo em: workflows/workflow_1772847860330.json
```

## 📝 Exemplos de Descrições Suportadas

### 1. Criar Issue no Azure

```
"Criar fluxo que cria issue no Azure quando ticket é criado no Intercom"
```

**O que será gerado:**
- Webhook para `ticket.created`
- Busca de dados do contato e empresa
- Normalização de ambiente (iOS/Android/Web)
- Normalização de tags
- Criação de Issue no Azure com todos os campos obrigatórios

### 2. Sincronizar Estado

```
"Sincronizar estado do ticket do Intercom para Azure"
```

**O que será gerado:**
- Webhook para `ticket.state.updated`
- Extração de ticket_state.id e Azure ID
- Mapeamento de estado (throw error se não mapeado)
- PATCH no Azure para atualizar System.State

### 3. Sincronizar Comentários

```
"Criar fluxo que envia comentários do Intercom para Azure"
```

**O que será gerado:**
- Webhook para `ticket.note.created`
- Extração de Azure ID e comentário
- POST no Azure para criar comentário

### 4. Sincronizar Tags

```
"Sincronizar tags do Intercom para o Azure"
```

**O que será gerado:**
- Normalização de ticket_type para Azure Tag
- Mapeamento (opcional, não lança erro)
- Atualização de System.Tags

## 🔧 Uso dos Agentes Especialistas

### Mapping Agent

Use diretamente quando precisar mapear valores:

```javascript
const MappingAgent = require('./src/agents/specialists/mapping');
const mapping = new MappingAgent();

// Mapear estado Intercom → Azure
const azureState = mapping.mapIntercomStateToAzure('4572477');
// Retorna: "To Do"

// Mapear estado Azure → Intercom
const intercomState = mapping.mapAzureStateToIntercom('Done');
// Retorna: "4572484"

// Mapear ticket type → tag
const tag = mapping.mapTicketTypeToTag('Catálogo');
// Retorna: "Ongoing catálogo"
```

### Azure Specialist Agent

Valida payloads antes de enviar para Azure:

```javascript
const AzureSpecialistAgent = require('./src/agents/specialists/azure');
const azure = new AzureSpecialistAgent();

// Validar payload de criação
azure.validate(payload, 'create');

// Validar payload de PATCH
azure.validate(patchOperations, 'patch');
```

### Intercom Specialist Agent

Valida webhooks do Intercom:

```javascript
const IntercomSpecialistAgent = require('./src/agents/specialists/intercom');
const intercom = new IntercomSpecialistAgent();

// Validar webhook
intercom.validate(webhookPayload, 'ticket.created');
```

### Idempotency Agent

Evita duplicações:

```javascript
const IdempotencyAgent = require('./src/agents/quality/idempotency');
const idempotency = new IdempotencyAgent();

const decision = idempotency.decide({
  operation: 'create',
  ticketId: '80432668',
  azureId: null
});

// Retorna: { action: 'create', reason: 'Ticket novo sem Azure ID' }
```

## 🧪 Executar Apenas os Testes

```javascript
const TesterAgent = require('./src/agents/quality/tester');
const workflow = require('./workflows/seu-workflow.json');
const spec = { /* sua SPEC */ };

const tester = new TesterAgent();
const result = tester.test(workflow, spec);

console.log(result.summary);
// { total: 5, passed: 5, failed: 0 }
```

## 🔒 Executar Apenas Análise de Segurança

```javascript
const SecurityAgent = require('./src/agents/quality/security');
const workflow = require('./workflows/seu-workflow.json');

const security = new SecurityAgent();
const result = security.validate(workflow);

if (!result.secure) {
  console.log('Problemas encontrados:', result.issues);
}
```

## 🚀 Deploy Automático no N8N (NOVO!)

O sistema agora suporta deploy direto na sua instância n8n via API REST!

### Passo 1: Configuração Inicial

Crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o `.env` e configure:

```bash
# URL da sua instância n8n (sem barra no final)
N8N_URL=https://sua-instancia.app.n8n.cloud

# API Key do n8n
N8N_API_KEY=n8n_api_xxxxxxxxxxxxx
```

**Como obter sua API Key:**
1. Abra seu n8n
2. Navegue para **Settings > API**
3. Clique em **Create API Key**
4. Copie a chave gerada (começa com `n8n_api_`)

### Passo 2: Testar Conexão

Antes do primeiro deploy, teste a conexão:

```bash
npm start test-connection
```

Você deve ver:

```
✅ Conexão estabelecida com sucesso!

📊 Workflows existentes: 5
🔗 URL: https://sua-instancia.app.n8n.cloud
```

### Passo 3: Deploy Automático

#### Opção 1: Deploy com Descrição

```bash
npm run deploy "Sincronizar estado do ticket do Intercom para Azure"
```

**O que acontece:**
1. Gera o workflow (através dos 11 agentes)
2. Valida (structure + security + tests)
3. Conecta com sua instância n8n
4. Cria o workflow via API
5. Ativa automaticamente
6. Retorna URL do workflow

#### Opção 2: Deploy de Arquivo Existente

Se você já tem um workflow JSON:

```bash
npm run deploy -- --file workflows/workflow_123456.json
```

#### Opção 3: Interativo

```bash
npm run deploy
```

O sistema vai perguntar qual fluxo você quer criar.

### Resultado do Deploy

```
╔════════════════════════════════════════════════╗
║   N8N Workflow Generator v2.0                 ║
║   Deploy Automático                           ║
╚════════════════════════════════════════════════╝

🔌 Testando conexão com n8n...

✅ Conectado ao n8n com sucesso!
   Workflows existentes: 12

📝 Descrição: "Sincronizar estado do ticket do Intercom para Azure"

Processando através dos 11 agentes...

═══════════════════════════════════════════════
📊 RESULTADOS:

✅ Validação: 0 erros, 0 avisos
✅ Segurança: 0 problemas
✅ Observabilidade: 0 críticos, 1 avisos
✅ Testes: 5/5 passaram
═══════════════════════════════════════════════

🚀 Iniciando deploy no n8n...

📦 Criando novo workflow "Intercom → Azure | Sync State"...

⚡ Ativando workflow...

═══════════════════════════════════════════════
🎉 DEPLOY REALIZADO COM SUCESSO!

📦 Workflow: Intercom → Azure | Sync State
🆔 ID: 45
⚡ Status: Ativo
🔗 URL: https://sua-instancia.app.n8n.cloud/workflow/45

═══════════════════════════════════════════════
```

### Atualização de Workflows

Se o workflow já existe, o sistema pergunta se você quer atualizar:

```
⚠️  Workflow "Intercom → Azure | Sync State" já existe
🔄 Atualizando workflow existente (ID: 45)...

✅ Workflow atualizado com sucesso!
```

### Opções Avançadas de Deploy

```javascript
const N8nDeployer = require('./src/deployer');

const deployer = new N8nDeployer({
  n8nUrl: 'https://sua-instancia.app.n8n.cloud',
  apiKey: 'n8n_api_xxx'
});

// Deploy com opções
await deployer.deploy(workflow, {
  activate: true,          // Ativar após criar (default: true)
  updateIfExists: true,    // Atualizar se já existe (default: false)
  forceUpdate: false       // Forçar atualização (default: false)
});
```

### Gerenciamento de Workflows

Você também pode gerenciar workflows existentes:

```javascript
const deployer = new N8nDeployer();

// Listar todos os workflows
const { workflows } = await deployer.listWorkflows();

// Buscar workflow por nome
const workflow = await deployer.findWorkflowByName('Sync State');

// Desativar workflow
await deployer.deactivateWorkflow(workflowId);

// Deletar workflow
await deployer.deleteWorkflow(workflowId);
```

---

## 📦 Importar Workflow no N8N (Método Manual)

Se preferir importar manualmente sem usar o deploy automático:

1. Execute o gerador (CLI ou programático)
2. Localize o arquivo gerado em `workflows/`
3. Abra o n8n
4. Clique em **"+"** → **"Import from File"**
5. Selecione o arquivo JSON
6. Configure credenciais:
   - **PAT do Azure**: Personal Access Token
   - **Bearer Auth Intercom**: Token do Intercom
7. Ative o workflow

## ⚙️ Configurações Avançadas

### Desabilitar Testes Automáticos

```javascript
// Em desenvolvimento futuro
const result = await orchestrator.generate(description, {
  skipTests: true
});
```

### Adicionar Custom Fields no Azure

Edite `src/agents/specialists/azure.js`:

```javascript
this.requiredFields = [
  'Custom.Aid',
  'Custom.Email',
  'Custom.NovoC ampo' // Adicione aqui
];
```

### Adicionar Novo Mapeamento

Edite `src/agents/specialists/mapping.js`:

```javascript
this.ticketTypeToTag = {
  "Catálogo": "Ongoing catálogo",
  "Novo Tipo": "Ongoing novo" // Adicione aqui
};
```

## 🐛 Troubleshooting

### Erro: "Cannot find module 'uuid'"

```bash
npm install uuid
```

### Erro: "Validation failed"

Revise o relatório de validação. Geralmente são:
- Campos obrigatórios ausentes
- Credenciais incorretas
- Headers faltando

### Erro: "Security validation failed"

Procure por:
- Tokens hardcoded no código
- Credenciais não autorizadas
- Headers de autorização em texto plano

### Workflow importado mas não funciona

1. Verifique as credenciais no n8n
2. Confirme que o webhook está ativo
3. Teste com payload de exemplo (veja `src/agents/quality/tester.js`)

## 📚 Próximos Passos

- [ ] Adicionar suporte para Azure → Intercom (bidirecional completo)
- [ ] Interface web para geração visual
- [ ] Deploy direto via API do n8n
- [ ] Suporte para router (múltiplos webhooks)
- [ ] Templates customizáveis por usuário

## 💡 Dicas

- Use descrições claras e objetivas
- Mencione origem e destino explicitamente
- Especifique a operação (criar, sincronizar, atualizar)
- O sistema é inteligente, mas quanto mais claro, melhor

## 🤝 Suporte

Dúvidas? Consulte:
- `README.md` - Visão geral da arquitetura
- `CLAUDE.md` - Convenções técnicas
- Código dos agentes em `src/agents/` - Documentação inline
