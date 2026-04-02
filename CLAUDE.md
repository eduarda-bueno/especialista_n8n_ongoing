# CLAUDE.md

## 📌 Projeto

Este repositório contém workflows n8n responsáveis pela integração bidirecional entre:

- **Intercom**
- **Azure DevOps (Work Items - Issue)**

O sistema sincroniza:

- Criação de tickets
- Atualização de estado
- Comentários
- Enriquecimento de dados

A arquitetura segue o padrão:

Webhook → Normalização → Mapeamento → Integração → Atualização cruzada

---

# 🏗 Arquitetura Geral

## Fluxos existentes

### 1️⃣ Intercom Router

Responsável por receber todos os eventos do Intercom e roteá-los por `body.topic`.

Eventos tratados:

- `ticket.created`
- `ticket.state.updated`
- `ticket.note.created`
- `ticket.attribute.updated`
- `ticket.closed`

Padrão:

Webhook → Set Execution Tag (customData) → Switch → Forward HTTP

#### Set Execution Tag

Cada execução é taggeada com o `topic` e `ticket_id` via `$execution.customData.set()`. Também filtra auto-triggers: quando `ticket.attribute.updated` é disparado pelo próprio workflow (atualização de `Azure ID` ou `Azure link`), retorna `[]` para evitar execução desnecessária.

---

### 2️⃣ Intercom → Azure | Created Ticket

Responsável por:

- Receber `ticket.created`
- Buscar dados do contato
- Buscar dados da empresa
- Normalizar ambiente (iOS / Android / Web)
- Normalizar tags
- Verificar tipo do ticket (Financeiro ou outros)
- Criar Issue no Azure na area path correta
- Atualizar ticket no Intercom com:
  - Azure ID
  - Azure Link

#### Roteamento por Tipo de Ticket

Após o Payload, um IF node (`Financeiro?`) verifica `ticket_type.name`:

```
Payload
   ↓
Financeiro?
   ├── true  → HTTP Request (Azure - Create Issue Financeiro)
   │            Area Path: Ongoing\Financeiro
   │            Assigned To: karissa@kyte.com.br
   └── false → HTTP Request (Azure - Create Issue Kyte)
                Area Path: Ongoing\Kyte
```

#### Campos obrigatórios no Azure

Os seguintes Custom Fields são obrigatórios e não podem ser removidos:

- Custom.Aid
- Custom.Email
- Custom.OperationalSystem
- Custom.OSversion
- Custom.Appversion
- Custom.Priorizar

#### Tratamento de Título

O Intercom pode enviar tickets sem título (`_default_title_: null`). Para evitar erro no Azure (que exige título), o workflow usa fallback:

```javascript
// Se título for null, gera automaticamente
_default_title_ || 'Ticket Intercom #' + ticket_id
```

#### Formatação da Descrição

O Azure DevOps requer HTML para renderizar quebras de linha. O workflow converte automaticamente:

```javascript
// Converte \n para <br>
($json.description || '').replace(/\n/g, '<br>')
```

**Antes**: `Linha 1\nLinha 2` (não renderiza quebra)
**Depois**: `Linha 1<br>Linha 2` (renderiza corretamente)

---

### 3️⃣ Intercom → Azure | Sync State

Responsável por:

- Receber `ticket.state.updated`
- Mapear `ticket_state.id` → `System.State` do Azure
- Atualizar Work Item via PATCH

Mapeamento atual:

```javascript
{
  "4572477": "To Do",
  "4572478": "Doing",
  "4572479": "CS",
  "4572485": "Ready",
  "4572490": "On Hold",
  "4572484": "Done",
  "4645359": "Redoing",
  "4645360": "CS Return"
}
```

### 4️⃣ Intercom → Azure | Sync Comments

**Parte do workflow**: `Router Intercom → Azure` (ID: `7KVwkk3VZ4W-omX0e9egP`)

Responsável por:

- Receber `ticket.note.created` do Intercom
- Verificar anti-loop (ignorar comentários vindos do Azure)
- Extrair Azure ID do ticket
- Extrair nome do autor (`ticket_part.author.name`)
- Verificar se há imagens no comentário
- Fazer download e re-upload de imagens para o Azure (suporta múltiplas imagens)
- Enviar comentário para o Azure DevOps com prefixo `[Intercom]` e nome do CSer

#### Estrutura de Nodes

```
Prepare Azure comment1
    ↓
Extract image URLs1 (anti-loop + extração)
    ↓
Tem imagens?
    ├── Sim → Fix image URL1 → Download image1 → Upload Attachment to Azure1
    │         → Edit Fields5 → Code in JavaScript2 → Create Comment in Azure1
    └── Não → Prepare Simple Comment → Create Simple Comment
```

#### Extração de Imagens

Prioridade de extração (corrigido para evitar pegar imagens erradas):

1. **HTML do `ticket_part.body`** (comentário específico) - extrai `<img>` tags
2. **Fallback**: `ticket_part.attachments` (anexos do comentário específico)

**Importante**: Não usa mais `ticket.ticket_attributes["Anexos"]` pois esse campo acumula todos os anexos do ticket inteiro.

#### Suporte a Múltiplas Imagens

O `Fix image URL1` retorna N items (um por imagem), que são processados individualmente pelo pipeline de download/upload. O `Code in JavaScript2` agrega todas as imagens de volta em um único comentário.

#### Formato do Comentário no Azure

```
[Intercom] <b>[Nome do CSer]</b>
Texto do comentário
<img src="url_azure_1" /> <img src="url_azure_2" />
```

#### Re-upload de Imagens

As URLs do Intercom (`downloads.intercomcdn.com`) são temporárias (têm `expires` e `signature`). O workflow faz download e re-upload para o Azure (`/_apis/wit/attachments`) para que as imagens fiquem permanentemente acessíveis.

---

### 5️⃣ Intercom → Azure | Sync Attachments (ticket.attribute.updated)

**Parte do workflow**: `Router Intercom → Azure` (ID: `7KVwkk3VZ4W-omX0e9egP`)

Responsável por:

- Receber `ticket.attribute.updated` do Intercom
- Verificar se o atributo atualizado é `Anexos`
- Comparar `previous` vs `current` para identificar apenas os **novos** anexos
- Fazer download e re-upload dos novos anexos para o Azure
- Vincular os anexos ao Work Item via JSON Patch (relations)

#### Estrutura de Nodes

```
Switch (output 3: ticket.attribute.updated)
    ↓
Extract New Attachments  ← compara previous vs current, filtra novos
    ↓
Download Attachment (attr) → Azure - Upload Attachment (attr)
    ↓
Edit Fields (attr upload) → Build Patch (attr) → Azure - Link Attachment (attr)
```

#### Lógica de Detecção de Novos Anexos

```javascript
// Compara nomes dos anexos atuais vs anteriores
const currentNames = ticketPart.updated_attribute_data?.value?.label || [];
const previousNames = ticketPart.updated_attribute_data?.value?.previous || [];
const newNames = currentNames.filter(name => !previousNames.includes(name));
```

#### Filtros

- Ignora quando o atributo atualizado **não é** `Anexos` (ex: `Azure ID`, `Azure link`)
- O `Set Execution Tag` também filtra auto-triggers de `Azure ID` e `Azure link` antes do Switch

---

### 6️⃣ Intercom → Azure | Ticket Closed (ticket.closed)

**Parte do workflow**: `Router Intercom → Azure` (ID: `7KVwkk3VZ4W-omX0e9egP`)

Responsável por:

- Receber `ticket.closed` do Intercom
- Extrair Azure ID do ticket
- Atualizar o Work Item no Azure para estado `Done`

#### Estrutura de Nodes

```
Switch (output 4: ticket.closed)
    ↓
Extract Azure ID (closed)  ← valida que Azure ID existe
    ↓
HTTP Request (Azure - Set Done)  ← PATCH System.State = "Done"
```

#### Anti-Loop com Azure → Intercom

Quando o Azure muda para "Done", o workflow **Azure → Intercom | Sync State** recebe o webhook mas **ignora** o estado "Done" (retorna `[]`), evitando propagação de volta ao Intercom.

---

### 7️⃣ Azure → Intercom | Sync State

**Workflow ID**: `4r_vSdJ3l55sEXiPSK5Q-`

Responsável por:

- Receber atualização de estado no Azure
- Buscar IntercomID via Custom Field
- Mapear estado Azure → ticket_state_id Intercom
- Atualizar ticket via PUT
- **Ignorar estado "Done"** (evita loop com `ticket.closed`)

#### Mapeamento atual (Azure → Intercom)

```javascript
{
  "To Do": "4572477",
  "Doing": "4572478",
  "CS": "4572479",
  "Done": "4572484",
  "Ready": "4572485",
  "On Hold": "4572490",
  "Redoing": "4645359",
  "CS Return": "4645360"
}
```

---

### 8️⃣ Azure → Intercom | Comments

**Workflow ID**: `ZOvAU7bOgiRleHfgRax0Z`

Responsável por:

- Receber webhook de comentário do Azure DevOps (`workitem.commented`)
- Extrair texto do comentário e autor
- Verificar se tem Intercom ID vinculado
- Processar imagens (converter para links clicáveis)
- Criar nota no ticket do Intercom

#### Estrutura de Nodes

```
Webhook (Azure Comment)
    ↓
Extract Comment
    ↓
Tem Intercom ID e Comentário?
    ↓
Check Images
    ↓
Tem Imagens? ─── Sim ──→ (rota não utilizada - ver limitações)
    │
    └── Não ──→ Format Comment → Create Note
```

#### Campos extraídos do webhook Azure

- `$json.body.resource.id` → workItemId
- `$json.body.resource.fields['System.History']` → commentText (HTML)
- `$json.body.resource.fields['System.ChangedBy']` → commentAuthor
- `$json.body.resource.fields['Custom.IntercomID']` → intercomId

#### Tratamento de Imagens

**Limitação da API Intercom**: A API de tickets do Intercom **não suporta upload de arquivos binários**. Tentativas com `attachment_files` e `formBinaryData` resultam em array vazio de attachments.

**Solução implementada**: Imagens são convertidas em links clicáveis no texto do comentário.

```javascript
// Check Images node - converte <img> em links
processedText = processedText.replace(imgRegex, (match, url) => {
    imageCount++;
    const cleanUrl = url.replace(/&amp;/g, "&");
    return '<br><a href="' + cleanUrl + '" target="_blank">📷 Ver imagem ' + imageCount + '</a><br>';
});
```

#### Configuração do Admin

As notas são criadas usando o admin **Kyter**:

- **admin_id**: `6511614`
- **email**: dev@kyte.com.br

#### Anti-Loop (implementado)

O node `Check Images` verifica se o comentário contém o prefixo `[Intercom]` para evitar reprocessar comentários que vieram do Intercom:

```javascript
// No Check Images node
if (commentText.includes("[Intercom]")) {
    return []; // Ignora comentário que veio do Intercom
}
```

---

# 🔄 Mecanismo Anti-Loop

A sincronização bidirecional de comentários requer um mecanismo para evitar loops infinitos.

## Padrão Implementado

| Direção | Formato enviado | Onde verifica | O que verifica |
|---------|-----------------|---------------|----------------|
| Intercom → Azure | `[Intercom] <b>[CSer]</b><br>texto` | `Check Images` (Azure → Intercom) | `commentText.includes("[Intercom]")` |
| Azure → Intercom | `<b>[Autor]</b><br>texto` | `Extract image URLs1` (Intercom → Azure) | `html.includes('<b>[') && html.includes(']</b>')` |

## Fluxo

```
Intercom → Azure: "[Intercom] <b>[Deborah]</b><br>Mensagem do CSer"
                        ↓
Azure → Intercom: Ignora (contém [Intercom])

Azure → Intercom: "<b>[João Dev]</b><br>Resposta do dev"
                        ↓
Intercom → Azure: Ignora (contém <b>[ ]</b>)
```

---

# 🧱 Convenções Obrigatórias

Estas regras devem ser seguidas em qualquer novo workflow gerado ou modificado neste repositório.

---

## 📛 Nomeação de Nodes

Seguir padrão consistente e descritivo.

### Estrutura recomendada:

- Webhook (Origem)
- Edit Fields
- Normalize *
- Payload
- Code (Mapping - descrição)
- HTTP Request (Serviço - ação)

### Exemplos corretos:

- HTTP Request (Azure - Create Issue)
- HTTP Request (Intercom - ticket)
- HTTP Request (Azure - Update State)
- Code (Map Azure State)
- Code (Normalize Environment)

❌ Não usar nomes genéricos como:
- Node1
- Code
- HTTP Request3

---

## 🔐 Credenciais

Sempre reutilizar credenciais existentes:

- `PAT do Azure`
- `Bearer Auth Intercom`

### Proibido:

- Criar novas credenciais automaticamente
- Hardcode de token no JSON
- Inserir segredo em campo de texto
- Alterar credenciais sem justificativa técnica

---

## 🗺 Mapeamentos

Todos os mapeamentos devem:

- Estar isolados em um Code Node dedicado
- Ser claramente nomeados
- Validar entradas
- Lançar erro quando valor não for reconhecido

### Padrão obrigatório:

js
if (!valorMapeado) {
  throw new Error("Valor não mapeado: " + original);
}

❌ Nunca embutir mapeamento diretamente dentro do HTTP Request.

---

## 🧩 Estrutura Lógica Recomendada

Todo workflow deve respeitar a seguinte separação clara de responsabilidades:

1. Extração  
2. Normalização  
3. Mapeamento  
4. Integração  
5. Atualização cruzada  

Cada etapa deve estar em um node separado.

### Boas práticas

- Um node para extrair campos do webhook
- Um node para normalizar dados
- Um node exclusivo para mapeamento
- Um node exclusivo para integração HTTP
- Um node final para atualização cruzada (quando aplicável)

### ❌ Não fazer

- Misturar normalização com integração
- Misturar mapeamento com payload final
- Criar lógica complexa dentro do HTTP Request
- Compactar toda lógica em um único Code Node

---

## 🧪 Validação de Campos Obrigatórios

Antes de enviar dados ao Azure, validar explicitamente:

- Custom.Aid
- Custom.Email
- Custom.OperationalSystem
- Custom.OSversion
- Custom.Appversion
- Custom.Priorizar

Se algum estiver ausente:

- Lançar erro explícito
- Não permitir envio parcial
- Não substituir por valor arbitrário sem regra definida

---

## 🌐 HTTP Requests

Regras obrigatórias para todos os HTTP nodes:

- Sempre definir `Content-Type` correto
- Usar `application/json-patch+json` para PATCH no Azure
- Nunca enviar body vazio
- Nunca remover `api-version` do endpoint
- Nunca hardcode de token no body ou head

# ⚠️ Limitações Conhecidas

## API Intercom - Tickets

### Upload de Arquivos

A API de tickets do Intercom **não suporta upload de arquivos binários** via `attachment_files`.

Referências:
- [Intercom Community - Reply ticket attachments](https://community.intercom.com/api-webhooks-23/intercom-api-reply-ticket-attachments-8137)
- [Intercom Community - Create Ticket with Attachments](https://community.intercom.com/api-webhooks-23/create-a-ticket-with-attachments-6483)

**Alternativas**:
1. Usar `attachment_urls` com URLs **publicamente acessíveis** (requer storage externo)
2. Converter imagens em links clicáveis no corpo do comentário (solução atual)

### attachment_urls

O parâmetro `attachment_urls` aceita até 10 URLs, mas elas **devem ser publicamente acessíveis**. URLs do Azure DevOps requerem autenticação e não funcionam diretamente.

---

# ✅ Definition of Done (DoD)

Um workflow só é considerado pronto quando TODOS os critérios abaixo forem atendidos:

- Webhook configurado corretamente
- Payload validado e estruturado
- Mapeamentos isolados em Code Nodes dedicados
- Headers HTTP corretamente definidos
- Campos obrigatórios do Azure respeitados
- Nenhuma credencial hardcoded
- JSON importável no n8n sem erro
- Nenhum node órfão
- Nenhuma duplicação de lógica
- Nomeação de nodes padronizada
- Separação clara entre:
  - Extração
  - Normalização
  - Mapeamento
  - Integração
  - Atualização cruzada

---

# 🤖 N8N Workflow Generator

Este repositório inclui um **sistema automatizado de geração de workflows** que usa **11 agentes especializados** para criar workflows n8n a partir de descrições em linguagem natural.

## Arquitetura do Gerador

```
Orquestrador
│
├── Core Agents (Fluxo Principal)
│   ├── Specifier    → Transforma descrição em SPEC estruturada
│   ├── Architect    → Define arquitetura técnica
│   └── Builder      → Gera JSON importável
│
├── Specialist Agents (Conhecimento Específico)
│   ├── Mapping            → Centraliza mapeamentos entre sistemas
│   ├── Azure Specialist   → Valida conformidade com Azure DevOps
│   └── Intercom Specialist→ Valida conformidade com Intercom
│
└── Quality Agents (Garantias de Qualidade)
    ├── Validator      → Valida estrutura contra DoD
    ├── Tester         → Testa comportamento funcional
    ├── Security       → Garante segurança
    ├── Idempotency    → Evita duplicações
    └── Observability  → Garante rastreabilidade
```

## Como o Gerador Segue as Convenções

O gerador **automaticamente aplica** todas as convenções deste documento:

### 📛 Nomeação Automática

O **Builder Agent** aplica os padrões:
- `Webhook (Intercom)`
- `Extract Fields`
- `Code (Map State Intercom → Azure)`
- `HTTP Request (Azure - Create Issue)`

### 🔐 Credenciais Seguras

O **Security Agent** garante:
- Apenas credenciais autorizadas (`PAT do Azure`, `Bearer Auth Intercom`)
- Nenhum token hardcoded
- Nenhum secret exposto

### 🗺 Mapeamentos Validados

O **Mapping Agent** centraliza e valida:
```javascript
// Sempre com validação obrigatória
if (!valorMapeado) {
  throw new Error("Valor não mapeado: " + original);
}
```

### 🧩 Separação de Responsabilidades

O **Architect Agent** define estrutura:
1. Webhook → Extração
2. Normalização (se necessário)
3. Mapeamento (se necessário)
4. Integração HTTP
5. Atualização cruzada (se aplicável)

### 🧪 Validação Automática de Campos

O **Azure Specialist Agent** valida campos obrigatórios:
- Custom.Aid
- Custom.Email
- Custom.OperationalSystem
- Custom.OSversion
- Custom.Appversion

### 🌐 HTTP Requests Corretos

O **Builder Agent** garante:
- `Content-Type` correto
- `application/json-patch+json` para PATCH
- `api-version` sempre presente
- Nenhum body vazio

### ✅ Definition of Done Automatizado

O **Validator Agent** verifica TODOS os critérios do DoD antes de aprovar o workflow.

## Agentes Especializados

### 1️⃣ Specifier Agent

**Entrada**: Descrição informal
```
"Criar fluxo que sincroniza estado do Intercom para Azure"
```

**Saída**: SPEC estruturada com:
- Objetivo claro
- Trigger identificado (`ticket.state.updated`)
- Campos obrigatórios listados
- Mapeamentos necessários
- Regras de validação
- Definition of Done

### 2️⃣ Architect Agent

**Entrada**: SPEC estruturada

**Saída**: Plano arquitetural com:
- Lista de nodes (ordem correta)
- Conexões entre nodes
- Pontos de validação
- Pontos de mapeamento
- Estratégia de erro (fail fast)

### 3️⃣ Builder Agent

**Entrada**: Plano arquitetural

**Saída**: JSON válido do n8n seguindo:
- Todas as convenções de nomeação
- Credenciais corretas
- Headers apropriados
- Estrutura de separação de responsabilidades

### 4️⃣ Mapping Agent

**Responsabilidade**: Centralizar mapeamentos

Estados Intercom ↔ Azure:
```javascript
{
  "4572477": "To Do",
  "4572478": "Doing",
  "4572479": "CS",
  "4572485": "Ready",
  "4572490": "On Hold",
  "4572484": "Done",
  "4645359": "Redoing",
  "4645360": "CS Return"
}
```

Ticket Types → Azure Tags:
```javascript
{
  "Assinaturas/Pagamentos": "Ongoing payments",
  "Catálogo": "Ongoing catálogo",
  "Estatística": "Ongoing estatística",
  // ...
}
```

**Regra obrigatória**: `throw new Error` se valor não mapeado

### 5️⃣ Azure Specialist Agent

Valida conformidade com Azure DevOps:
- JSON Patch correto
- Campos obrigatórios presentes
- Estados válidos
- API version presente
- Transições de estado permitidas

### 6️⃣ Intercom Specialist Agent

Valida conformidade com Intercom:
- Estrutura do webhook válida
- `ticket_state.id` válido
- `ticket_attributes` presente
- `contacts` e `companies` válidos

### 7️⃣ Validator Agent

Valida contra Definition of Done:
- ✅ Nomeação padronizada
- ✅ Credenciais corretas
- ✅ Mapeamentos isolados
- ✅ Headers corretos
- ✅ Sem nodes órfãos
- ✅ Separação de responsabilidades

### 8️⃣ Tester Agent

Executa 5 cenários de teste:
1. **Happy Path** - Payload válido executa corretamente
2. **Campo Ausente** - Erro explícito quando campo obrigatório falta
3. **Estado Não Mapeado** - Erro lançado corretamente
4. **Dados Incompletos** - Workflow não continua silenciosamente
5. **Idempotência** - Não cria duplicatas

### 9️⃣ Security Agent

Garante segurança:
- Nenhum token hardcoded
- Credenciais autorizadas
- Headers sensíveis seguros
- Sem exposição de secrets

### 🔟 Idempotency Agent

Evita duplicações:
- Verifica existência antes de criar
- Decide: **Criar** / **Atualizar** / **Ignorar**
- Evita loops de sincronização

### 1️⃣1️⃣ Observability Agent

Garante rastreabilidade:
- Erros explícitos (nunca falhas silenciosas)
- Campos de rastreamento presentes (ticket_id, intercom_id, azure_id)
- Sugestões de pontos de log

## Como Usar o Gerador

### CLI Interativo

```bash
npm start
```

```
Descreva o fluxo que deseja criar:
> Criar fluxo que sincroniza estado do ticket do Intercom para Azure
```

### Programático

```javascript
const WorkflowOrchestrator = require('./src/orchestrator');

const orchestrator = new WorkflowOrchestrator();

const result = await orchestrator.generate(
  'Criar fluxo que envia comentários do Intercom para Azure'
);

orchestrator.saveWorkflow(result.workflow, 'meu-workflow.json');
```

## Fluxo de Geração (7 Fases)

1. **ESPECIFICAÇÃO** - Specifier analisa descrição
2. **ARQUITETURA** - Architect define estrutura
3. **CONSTRUÇÃO** - Builder gera JSON
4. **VALIDAÇÃO** - Validator verifica DoD
5. **SEGURANÇA** - Security verifica tokens/credenciais
6. **OBSERVABILIDADE** - Observability verifica rastreabilidade
7. **TESTES** - Tester executa 5 cenários

## Garantias do Gerador

Workflows gerados pelo sistema **sempre**:

✅ Seguem todas as convenções deste documento
✅ Têm nomes descritivos nos nodes
✅ Usam credenciais corretas
✅ Têm mapeamentos isolados com validação
✅ Têm headers HTTP corretos
✅ Respeitam campos obrigatórios do Azure
✅ Não têm tokens hardcoded
✅ Não têm nodes órfãos
✅ Têm separação clara de responsabilidades
✅ São testados automaticamente (5 cenários)
✅ São validados contra Definition of Done
✅ São seguros (análise de segurança)
✅ São rastreáveis (erros explícitos)

## Exemplos de Descrições Suportadas

```javascript
// Criar Issue
"Criar fluxo que cria issue no Azure quando ticket é criado no Intercom"

// Sincronizar Estado
"Sincronizar estado do ticket do Intercom para Azure"

// Sincronizar Comentários
"Criar fluxo que envia comentários do Intercom para Azure"

// Sincronizar Tags
"Sincronizar tags do Intercom para o Azure"
```

## Diferença: Manual vs Gerador

### Workflow Manual
- Você cria nodes manualmente
- Precisa lembrar de todas as convenções
- Validação manual
- Testes manuais
- Pode ter erros de conformidade

### Workflow Gerado
- Gerado automaticamente a partir de descrição
- Convenções aplicadas automaticamente
- Validação automática (Validator Agent)
- Testes automáticos (Tester Agent - 5 cenários)
- Garantia de conformidade 100%

## Quando Usar o Gerador

✅ **Use o gerador quando:**
- Criar novos fluxos de integração
- Quiser garantia de conformidade
- Quiser testes automatizados
- Precisar de workflows rapidamente
- Quiser seguir best practices

⚠️ **Edite manualmente quando:**
- Customização muito específica necessária
- Lógica de negócio complexa não suportada
- Precisa de nodes/integrações não suportados

## Documentação Adicional

- `README.md` - Arquitetura completa do gerador
- `GUIA_USO.md` - Guia detalhado com exemplos
- `src/agents/` - Código-fonte dos agentes com documentação inline

---

