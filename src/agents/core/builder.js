/**
 * Builder Agent
 *
 * 🎯 Missão: Gerar o JSON importável do n8n
 *
 * Responsabilidades:
 * - Criar nodes conforme arquitetura
 * - Aplicar nomeação padronizada
 * - Usar credenciais existentes
 * - Conectar corretamente os nodes
 * - Garantir JSON válido
 *
 * Restrições:
 * - NÃO hardcode de credenciais
 * - NÃO misturar responsabilidades em nodes
 * - NÃO alterar estrutura arquitetural definida
 */

const templates = require('../../templates/base');
const { v4: uuidv4 } = require('uuid');

class BuilderAgent {
  constructor() {
    this.positionX = -2800;
    this.positionY = 300;
    this.spacing = 240;
  }

  /**
   * Gera workflow JSON completo
   */
  build(spec, architecture) {
    console.log('🔨 Builder Agent: Construindo workflow JSON...\n');

    const nodes = this.buildNodes(spec, architecture);
    const connections = this.buildConnections(architecture, nodes);

    const workflow = {
      name: this.generateWorkflowName(spec),
      nodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1',
        binaryMode: 'separate',
        availableInMCP: false
      },
      tags: [{ name: 'ongoing' }]
    };

    console.log(`✅ Workflow construído: ${nodes.length} nodes, ${Object.keys(connections).length} conexões\n`);
    console.log('='.repeat(60) + '\n');

    return workflow;
  }

  /**
   * Constrói todos os nodes baseados na arquitetura
   */
  buildNodes(spec, architecture) {
    const nodes = [];

    architecture.nodes.forEach(nodeSpec => {
      let node = null;

      switch (nodeSpec.type) {
        case 'n8n-nodes-base.webhook':
          node = this.buildWebhookNode(spec, nodeSpec);
          break;

        case 'n8n-nodes-base.set':
          node = this.buildExtractNode(spec, nodeSpec);
          break;

        case 'n8n-nodes-base.code':
          node = this.buildCodeNode(spec, nodeSpec);
          break;

        case 'n8n-nodes-base.httpRequest':
          node = this.buildHttpRequestNode(spec, nodeSpec);
          break;
      }

      if (node) {
        nodes.push(node);
      }
    });

    return nodes;
  }

  /**
   * Constrói Webhook Node
   */
  buildWebhookNode(spec, nodeSpec) {
    const path = this.generateWebhookPath(spec);

    return {
      parameters: {
        path,
        httpMethod: 'POST',
        responseMode: 'onReceived',
        options: {}
      },
      id: uuidv4(),
      name: nodeSpec.name,
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2.1,
      position: this.nextPosition(),
      webhookId: uuidv4()
    };
  }

  /**
   * Constrói Extract Fields Node
   */
  buildExtractNode(spec, nodeSpec) {
    const assignments = this.generateAssignments(spec);

    return {
      parameters: {
        assignments: {
          assignments
        },
        options: {}
      },
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: this.nextPosition(),
      id: uuidv4(),
      name: nodeSpec.name
    };
  }

  /**
   * Constrói Code Node (normalização ou mapeamento)
   */
  buildCodeNode(spec, nodeSpec) {
    let jsCode = '';

    if (nodeSpec.name.includes('Normalize')) {
      jsCode = this.generateNormalizationCode(spec);
    } else if (nodeSpec.name.includes('Map')) {
      jsCode = this.generateMappingCode(spec, nodeSpec);
    }

    return {
      parameters: {
        jsCode
      },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: this.nextPosition(),
      id: uuidv4(),
      name: nodeSpec.name
    };
  }

  /**
   * Constrói HTTP Request Node
   */
  buildHttpRequestNode(spec, nodeSpec) {
    const integration = spec.integracoes.find(i => i.tipo.includes('destination'));

    if (!integration) {
      throw new Error('Nenhuma integração de destino encontrada na SPEC');
    }

    if (integration.nome === 'Azure DevOps') {
      return this.buildAzureHttpRequest(spec, nodeSpec);
    }

    if (integration.nome === 'Intercom') {
      return this.buildIntercomHttpRequest(spec, nodeSpec);
    }

    throw new Error(`Integração não suportada: ${integration.nome}`);
  }

  /**
   * Constrói HTTP Request para Azure
   */
  buildAzureHttpRequest(spec, nodeSpec) {
    const { url, method, body } = this.determineAzureEndpoint(spec);

    const headers = method === 'PATCH'
      ? templates.COMMON_HEADERS.azurePatch
      : templates.COMMON_HEADERS.azureJson;

    return {
      parameters: {
        url,
        method,
        authentication: 'genericCredentialType',
        genericAuthType: 'httpBasicAuth',
        sendHeaders: true,
        headerParameters: {
          parameters: headers
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: body,
        options: {}
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: this.nextPosition(),
      id: uuidv4(),
      name: nodeSpec.name,
      credentials: {
        httpBasicAuth: templates.CREDENTIALS.azurePAT
      }
    };
  }

  /**
   * Determina endpoint do Azure baseado na SPEC
   */
  determineAzureEndpoint(spec) {
    if (spec.objetivo.includes('Criar Issue')) {
      return {
        url: 'https://dev.azure.com/KyteLand/Ongoing/_apis/wit/workitems/$Issue?api-version=7.0',
        method: 'PATCH',
        body: this.generateAzureCreateIssueBody()
      };
    }

    if (spec.objetivo.includes('estado') || spec.objetivo.includes('state')) {
      return {
        url: '=https://dev.azure.com/KyteLand/Ongoing/_apis/wit/workitems/{{$json.azure_id}}?api-version=7.1',
        method: 'PATCH',
        body: '=[{"op": "add","path": "/fields/System.State","value": "{{ $json.newAzureState }}"}]'
      };
    }

    if (spec.objetivo.includes('comentário') || spec.objetivo.includes('comment')) {
      return {
        url: '=https://dev.azure.com/KyteLand/Ongoing/_apis/wit/workItems/{{$json.azure_id}}/comments?api-version=7.1-preview.3',
        method: 'POST',
        body: '={ "text": "[Intercom] {{$json.comment}}" }'
      };
    }

    // Fallback
    return {
      url: 'https://dev.azure.com/KyteLand/Ongoing/_apis/wit/workitems/$Issue?api-version=7.0',
      method: 'POST',
      body: '{}'
    };
  }

  /**
   * Gera body para criação de Issue no Azure
   */
  generateAzureCreateIssueBody() {
    return `={{ JSON.stringify([
  {op: "add", path:"/fields/System.AreaPath", value: "Ongoing\\\\Kyte"},
  { op: "add", path: "/fields/System.Title", value: $json.title },
  { op: "add", path: "/fields/System.Description", value: $json.description },
  { op: "add", path: "/fields/Custom.Aid", value: $json.aid || "-" },
  { op: "add", path: "/fields/Custom.Email", value: $json.email || "-" },
  { op: "add", path: "/fields/Custom.LinkCatalog", value: $json.catalogUrl || "-" },
  { op: "add", path: "/fields/Custom.IntercomID", value: $json.intercomId || "-" },
  { op: "add", path: "/fields/Custom.AppVersion", value: $json.appVersion || "-" },
  { op: "add", path: "/fields/Custom.OperationalSystem", value: $json.platform },
  { op: "add", path: "/fields/Custom.OSversion", value: $json.osVersion || "-" },
  { op: "add", path: "/fields/Custom.ConversationLink", value: $json.conversationLink },
  { op: "add", path: "/fields/Custom.IntercomCreatedBy", value: $json.createdBy || "-" },
  { op: "add", path: "/fields/Custom.IntercomTicketID", value: $json.ticketId || "-" },
  { op: "add", path: "/fields/System.Tags", value: ['n8n', $json.azureTag].filter(Boolean).join('; ')}
]) }}`;
  }

  /**
   * Constrói HTTP Request para Intercom
   */
  buildIntercomHttpRequest(spec, nodeSpec) {
    return {
      parameters: {
        url: '=https://api.intercom.io/tickets/{{$json.intercom_id}}',
        method: 'PATCH',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpBearerAuth',
        sendHeaders: true,
        headerParameters: {
          parameters: templates.COMMON_HEADERS.intercom
        },
        options: {}
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: this.nextPosition(),
      id: uuidv4(),
      name: nodeSpec.name,
      credentials: {
        httpBearerAuth: templates.CREDENTIALS.intercomBearer
      }
    };
  }

  /**
   * Gera assignments para Extract Fields
   */
  generateAssignments(spec) {
    const assignments = [];

    spec.entradaEsperada.camposObrigatorios.forEach(field => {
      const fieldName = this.extractFieldName(field);
      assignments.push({
        id: uuidv4(),
        name: fieldName,
        value: `={{ $json.${field} }}`,
        type: 'string'
      });
    });

    return assignments;
  }

  /**
   * Extrai nome do campo
   */
  extractFieldName(fieldPath) {
    const parts = fieldPath.split('.');
    return parts[parts.length - 1].replace(/[[\]'"]/g, '');
  }

  /**
   * Gera código de normalização
   */
  generateNormalizationCode(spec) {
    return `const c = $json;

// last seen por canal
const iosSeen = Number(c.ios_last_seen_at || 0);
const androidSeen = Number(c.android_last_seen_at || 0);
const webSeen = c.browser ? Number(c.last_seen_at || 0) : 0;

const maxSeen = Math.max(iosSeen, androidSeen, webSeen);

let platform = 'unknown';
let operationalSystem = null;
let osVersion = null;
let appVersion = null;

if (maxSeen === iosSeen && iosSeen > 0) {
  platform = 'ios';
  operationalSystem = 'iOS';
  osVersion = c.ios_os_version || null;
  appVersion = c.ios_app_version || null;
} else if (maxSeen === androidSeen && androidSeen > 0) {
  platform = 'android';
  operationalSystem = 'Android';
  osVersion = c.android_os_version || null;
  appVersion = c.android_app_version || null;
} else if (maxSeen === webSeen && webSeen > 0) {
  platform = 'Web';
  operationalSystem = c.os || null;
  osVersion = c.browser_version || null;
}

return [{ json: { ...c, platform, operationalSystem, osVersion, appVersion } }];`;
  }

  /**
   * Gera código de mapeamento
   */
  generateMappingCode(spec, nodeSpec) {
    const mapping = spec.mapeamentos.find(m => nodeSpec.name.includes(m.tipo));

    if (!mapping) {
      return '// Mapeamento não especificado\nreturn [$json];';
    }

    if (mapping.tipo.includes('Estado')) {
      return `const map = {
  "4572477": "To Do",
  "4572478": "Doing",
  "4572479": "CS",
  "4572485": "Ready",
  "4572490": "On Hold",
  "4572484": "Done",
};

const newAzureState = map[String($json.ticket_state)];

if (!newAzureState) {
  throw new Error("ticket_state não mapeado: " + $json.ticket_state);
}

return [{ ...$json, newAzureState }];`;
    }

    if (mapping.tipo.includes('Tag')) {
      return `const item = $input.first()?.json?.body?.data?.item ?? {};
const type = item?.ticket_type?.name ?? null;

const tagMap = {
  "Assinaturas/Pagamentos": "Ongoing payments",
  "Catálogo": "Ongoing catálogo",
  "Estatística": "Ongoing estatística",
  "Estoque": "Ongoing estoque",
  "Fiado": "Ongoing fiado",
  "Finanças": "Ongoing finanças",
  "Variantes": "Ongoing variantes",
  "Problemas gerais": "Ongoing geral"
};

const normalizedType = type?.trim?.();
const azureTag = normalizedType && tagMap.hasOwnProperty(normalizedType)
  ? tagMap[normalizedType]
  : null;

return [{ json: { azureTag } }];`;
    }

    return '// Mapeamento genérico\nreturn [$json];';
  }

  /**
   * Gera path do webhook
   */
  generateWebhookPath(spec) {
    return spec.trigger.event.replace('.', '-');
  }

  /**
   * Gera nome do workflow
   */
  generateWorkflowName(spec) {
    const source = spec.integracoes.find(i => i.tipo.includes('source'))?.nome || 'Source';
    const dest = spec.integracoes.find(i => i.tipo.includes('destination'))?.nome || 'Destination';

    return `${source} → ${dest} | ${this.extractAction(spec.objetivo)}`;
  }

  /**
   * Extrai ação do objetivo
   */
  extractAction(objective) {
    if (objective.includes('Criar')) return 'Create Ticket';
    if (objective.includes('Sincronizar estado')) return 'Sync State';
    if (objective.includes('comentário')) return 'Sync Comments';
    if (objective.includes('tag')) return 'Sync Tags';
    return 'Integration';
  }

  /**
   * Constrói conexões entre nodes
   */
  buildConnections(architecture, nodes) {
    const connections = {};

    architecture.conexoes.forEach(conn => {
      const fromNode = nodes.find(n => n.name.includes(conn.from) || conn.from.includes('webhook'));
      const toNode = nodes.find(n => n.name.includes(conn.to) || conn.to === nodes[nodes.indexOf(fromNode) + 1]?.id);

      if (fromNode && toNode) {
        connections[fromNode.name] = {
          main: [[{
            node: toNode.name,
            type: 'main',
            index: 0
          }]]
        };
      }
    });

    return connections;
  }

  /**
   * Gera próxima posição para node
   */
  nextPosition() {
    const pos = [this.positionX, this.positionY];
    this.positionX += this.spacing;
    return pos;
  }
}

module.exports = BuilderAgent;
