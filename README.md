# N8N Workflow Generator v2.0

Sistema orquestrador com **11 subagentes especializados** para gerar workflows n8n em JSON a partir de descrições em linguagem natural.

## 🏗️ Arquitetura

```
Orquestrador
│
├── Core Agents (Fluxo Principal)
│   ├── Specifier    → Transforma descrição informal em SPEC estruturada
│   ├── Architect    → Define arquitetura técnica do workflow
│   └── Builder      → Gera JSON importável do n8n
│
├── Specialist Agents (Conhecimento Específico)
│   ├── Mapping            → Centraliza mapeamentos entre sistemas
│   ├── Azure Specialist   → Valida conformidade com Azure DevOps
│   └── Intercom Specialist→ Valida conformidade com Intercom
│
└── Quality Agents (Garantias de Qualidade)
    ├── Validator      → Valida estrutura contra Definition of Done
    ├── Tester         → Testa comportamento funcional
    ├── Security       → Garante segurança e conformidade
    ├── Idempotency    → Evita duplicações
    └── Observability  → Garante rastreabilidade
```

## 📂 Estrutura do Projeto

```
src/
├── orchestrator/          # Orquestrador principal
│   └── index.js          # Coordena os 11 agentes
│
├── agents/
│   ├── core/             # Agentes do fluxo principal
│   │   ├── specifier.js  # Analisa e estrutura requisitos
│   │   ├── architect.js  # Define arquitetura técnica
│   │   └── builder.js    # Gera JSON do workflow
│   │
│   ├── specialists/      # Agentes especialistas
│   │   ├── mapping.js    # Mapeamentos entre sistemas
│   │   ├── azure.js      # Especialista Azure DevOps
│   │   └── intercom.js   # Especialista Intercom
│   │
│   └── quality/          # Agentes de qualidade
│       ├── validator.js  # Validação de estrutura
│       ├── tester.js     # Testes funcionais
│       ├── security.js   # Validação de segurança
│       ├── idempotency.js# Anti-duplicação
│       └── observability.js # Rastreabilidade
│
├── templates/            # Templates de nodes reutilizáveis
│   └── base.js
│
├── generators/           # Geradores auxiliares
│   └── node.js
│
└── validators/           # (legacy - migrado para agents/quality/)

workflows/                # Workflows gerados (output)
examples/                 # Exemplos de uso
```

## 🎯 Descrição dos Agentes

### Core Agents

#### 1. Specifier Agent
**Missão**: Transformar solicitação informal em SPEC estruturada

- Refina objetivo
- Identifica trigger correto
- Lista campos obrigatórios
- Identifica mapeamentos necessários
- Define Definition of Done

**Entrada**: "Criar fluxo que sincroniza estado do Intercom para Azure"

**Saída**: SPEC estruturada com objetivo, trigger, validações, integrações, etc.

#### 2. Architect Agent
**Missão**: Definir arquitetura técnica do workflow

- Define separação de responsabilidades
- Determina ordem dos nodes
- Define pontos de normalização/mapeamento
- Define estratégia de erro

**Entrada**: SPEC validada

**Saída**: Plano arquitetural com lista de nodes e conexões

#### 3. Builder Agent
**Missão**: Gerar JSON importável do n8n

- Cria nodes conforme arquitetura
- Aplica nomeação padronizada
- Usa credenciais existentes
- Conecta corretamente os nodes

**Entrada**: Plano arquitetural

**Saída**: Workflow JSON pronto para importar

### Specialist Agents

#### 4. Mapping Agent
**Missão**: Centralizar mapeamentos entre sistemas

- Mapeia estados Intercom ↔ Azure
- Mapeia ticket types → Azure tags
- **Regra**: `throw new Error` se valor não mapeado

#### 5. Azure Specialist Agent
**Missão**: Garantir conformidade com Azure DevOps

- Valida JSON Patch
- Valida campos obrigatórios
- Valida estados permitidos
- Valida API version

#### 6. Intercom Specialist Agent
**Missão**: Garantir conformidade com Intercom

- Valida estrutura do webhook
- Valida ticket_state.id
- Valida ticket_attributes
- Valida contacts e companies

### Quality Agents

#### 7. Validator Agent
**Missão**: Garantir que workflow atende ao Definition of Done

- Verifica separação de responsabilidades
- Verifica campos obrigatórios do Azure
- Verifica ausência de hardcoded secrets
- Verifica mapeamentos isolados

#### 8. Tester Agent
**Missão**: Validar comportamento funcional

Testes executados:
1. ✅ Happy Path - Payload válido
2. ❌ Campo obrigatório ausente
3. ❌ Estado não mapeado
4. ❌ Dados incompletos
5. 🔄 Idempotência (reprocessamento)

#### 9. Security Agent
**Missão**: Garantir segurança e conformidade

- Verifica tokens hardcoded
- Valida uso de credenciais
- Impede exposição de secrets
- Valida headers sensíveis

#### 10. Idempotency Agent
**Missão**: Evitar duplicações

- Verifica existência antes de criar
- Garante atualização determinística
- Decide: **Criar** / **Atualizar** / **Ignorar**

#### 11. Observability Agent
**Missão**: Garantir rastreabilidade

- Garante erros explícitos
- Impede falhas silenciosas
- Sugere pontos de log
- Valida campos de rastreamento

## 🚀 Como Usar

### Modo Interativo (CLI)

```bash
npm start
```

Você será solicitado a descrever o fluxo:

```
Descreva o fluxo que deseja criar:
> Criar fluxo que sincroniza estado do ticket do Intercom para Azure
```

### Modo Programático

```javascript
const WorkflowOrchestrator = require('./src/orchestrator');

const orchestrator = new WorkflowOrchestrator();

const result = await orchestrator.generate(
  'Criar fluxo que sincroniza comentários do Intercom para Azure'
);

orchestrator.saveWorkflow(result.workflow, 'meu-workflow.json');
```

## 📊 Fluxo de Execução

```
1️⃣  ESPECIFICAÇÃO
    └─ Specifier Agent analisa descrição informal

2️⃣  ARQUITETURA
    └─ Architect Agent define estrutura técnica

3️⃣  CONSTRUÇÃO
    └─ Builder Agent gera JSON do workflow

4️⃣  VALIDAÇÃO DE ESTRUTURA
    └─ Validator Agent verifica conformidade

5️⃣  VALIDAÇÃO DE SEGURANÇA
    └─ Security Agent verifica tokens/credenciais

6️⃣  ANÁLISE DE OBSERVABILIDADE
    └─ Observability Agent verifica rastreabilidade

7️⃣  TESTES FUNCIONAIS
    └─ Tester Agent executa 5 cenários de teste

═══════════════════════════════════════════════
📋 RELATÓRIO FINAL

✅ Validação: 0 erros, 1 avisos
✅ Segurança: 0 problemas
✅ Observabilidade: 0 críticos, 2 avisos
✅ Testes: 5/5 passaram

🎉 WORKFLOW PRONTO PARA USO!
```

## 📝 Exemplos de Descrições

```javascript
// Criar ticket
"Criar fluxo que cria issue no Azure quando ticket é criado no Intercom"

// Sincronizar estado
"Sincronizar estado do ticket do Intercom para Azure"

// Sincronizar comentários
"Criar fluxo que envia comentários do Intercom para Azure"

// Sincronizar tags
"Sincronizar tags do Intercom para o Azure"
```

## 🎯 Convenções Seguidas (CLAUDE.md)

✅ Nomes descritivos nos nodes
✅ Credenciais reutilizadas (PAT do Azure, Bearer Auth Intercom)
✅ Mapeamentos isolados em Code Nodes
✅ Validação de campos obrigatórios
✅ Headers HTTP corretos
✅ Separação clara: Extração → Normalização → Mapeamento → Integração
✅ Erros explícitos (nunca falhas silenciosas)
✅ JSON Patch correto para Azure
✅ API version obrigatório

## 🧪 Testes Automáticos

Cada workflow gerado é testado automaticamente:

- ✅ **Happy Path**: Workflow executa com dados válidos
- ❌ **Campo Ausente**: Erro explícito quando campo obrigatório falta
- ❌ **Valor Não Mapeado**: Erro quando estado não está no mapa
- ❌ **Dados Incompletos**: Workflow não continua silenciosamente
- 🔄 **Idempotência**: Não cria duplicatas

## 🚀 Deploy Automático (NOVO!)

Agora você pode fazer deploy direto na sua instância n8n via API, sem importação manual!

### Configuração Inicial

1. Copie o arquivo `.env.example` para `.env`
2. Configure suas credenciais:

```bash
N8N_URL=https://sua-instancia.app.n8n.cloud
N8N_API_KEY=n8n_api_xxxxxxxxxxxxx
```

**Como obter sua API Key:**
1. Abra seu n8n
2. Vá em **Settings > API**
3. Clique em **Create API Key**
4. Copie a chave gerada

### Uso do Deploy Automático

#### Deploy com Descrição

```bash
npm run deploy "Sincronizar estado do ticket do Intercom para Azure"
```

O sistema vai:
1. ✅ Gerar o workflow (11 agentes)
2. ✅ Validar (Structure + Security + Tests)
3. ✅ Conectar com sua instância n8n
4. ✅ Criar o workflow via API
5. ✅ Ativar automaticamente

#### Deploy de Arquivo Existente

```bash
npm run deploy -- --file workflows/meu-workflow.json
```

#### Testar Conexão

```bash
npm start test-connection
```

### Resultado do Deploy

```
🎉 DEPLOY REALIZADO COM SUCESSO!

📦 Workflow: Intercom → Azure | Sync State
🆔 ID: 123
⚡ Status: Ativo
🔗 URL: https://sua-instancia.app.n8n.cloud/workflow/123
```

O workflow fica **imediatamente disponível** no seu n8n, já ativo e pronto para usar!

---

## 📦 Importar no N8N (Método Manual)

Se preferir importar manualmente (sem deploy automático):

1. Execute o gerador
2. Encontre o arquivo JSON em `workflows/`
3. No n8n: **Import from File**
4. Selecione o arquivo gerado
5. Ajuste credenciais (se necessário)
6. Ative o workflow

## 🔧 Desenvolvimento

### Adicionar Novo Agente

```javascript
// 1. Criar arquivo em src/agents/[tipo]/nome.js
class NovoAgent {
  execute(input) {
    // Lógica do agente
    return result;
  }
}

// 2. Adicionar no orquestrador
const NovoAgent = require('../agents/tipo/novo');

this.novoAgent = new NovoAgent();

// 3. Integrar no fluxo
const resultado = this.novoAgent.execute(dados);
```

## 📚 Referências

- `CLAUDE.md` - Convenções e arquitetura completa
- `Router Intercom → Azure.json` - Workflow de referência
- `GUIA_USO.md` - Guia detalhado de uso

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Add nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

MIT
