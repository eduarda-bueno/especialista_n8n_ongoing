/**
 * Gerador de Nodes N8N
 * Usa templates base e gera nodes completos seguindo convenções
 */

const templates = require('../templates/base');

class NodeGenerator {
  constructor() {
    this.positionX = 200;
    this.positionY = 300;
    this.spacing = 240;
  }

  /**
   * Gera próxima posição para node
   */
  nextPosition(offsetY = 0) {
    const pos = [this.positionX, this.positionY + offsetY];
    this.positionX += this.spacing;
    return pos;
  }

  /**
   * Reseta posicionamento
   */
  resetPosition() {
    this.positionX = 200;
    this.positionY = 300;
  }

  /**
   * Gera webhook para receber eventos
   */
  generateWebhook({ path, method = 'POST', name }) {
    return templates.webhookNode({
      path,
      httpMethod: method,
      name: name || `Webhook (${path})`,
      position: this.nextPosition()
    });
  }

  /**
   * Gera HTTP request para Intercom
   */
  generateIntercomRequest({ endpoint, name, method = 'GET' }) {
    return templates.httpRequestNode({
      url: `https://api.intercom.io${endpoint}`,
      method,
      name: name || `HTTP Request (Intercom - ${endpoint})`,
      headers: templates.COMMON_HEADERS.intercom,
      credentials: {
        type: 'httpBearerAuth',
        value: {
          httpBearerAuth: templates.CREDENTIALS.intercomBearer
        }
      },
      position: this.nextPosition()
    });
  }

  /**
   * Gera HTTP request para Azure
   */
  generateAzureRequest({ endpoint, name, method = 'GET', body = null }) {
    const headers = method === 'PATCH'
      ? templates.COMMON_HEADERS.azurePatch
      : templates.COMMON_HEADERS.azureJson;

    return templates.httpRequestNode({
      url: `https://dev.azure.com/KyteLand/Ongoing/_apis${endpoint}`,
      method,
      name: name || `HTTP Request (Azure - ${endpoint})`,
      headers,
      body,
      credentials: {
        type: 'httpBasicAuth',
        value: {
          httpBasicAuth: templates.CREDENTIALS.azurePAT
        }
      },
      position: this.nextPosition()
    });
  }

  /**
   * Gera node de extração de campos
   */
  generateExtraction({ fields, name }) {
    return templates.editFieldsNode({
      name: name || 'Extract Fields',
      assignments: fields,
      position: this.nextPosition()
    });
  }

  /**
   * Gera node de normalização com código
   */
  generateNormalization({ name, code }) {
    return templates.codeNode({
      name: name || 'Normalize Data',
      jsCode: code,
      position: this.nextPosition()
    });
  }

  /**
   * Gera node de mapeamento de estados Intercom → Azure
   */
  generateStateMapping() {
    const mappingCode = `const map = {
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

    return this.generateNormalization({
      name: 'Code (Map State Intercom → Azure)',
      code: mappingCode
    });
  }

  /**
   * Gera node de mapeamento de tags
   */
  generateTagMapping() {
    const mappingCode = `const item = $input.first()?.json?.body?.data?.item ?? {};
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

    return this.generateNormalization({
      name: 'Normalize Tags',
      code: mappingCode
    });
  }

  /**
   * Gera node de payload para criação de Issue no Azure
   */
  generateAzureIssuePayload() {
    const payloadCode = `JSON.stringify([
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
])`;

    return this.generateAzureRequest({
      endpoint: '/wit/workitems/$Issue?api-version=7.0',
      name: 'HTTP Request (Azure - Create Issue)',
      method: 'PATCH',
      body: `={{ ${payloadCode} }}`
    });
  }

  /**
   * Gera node de merge
   */
  generateMerge({ name, mode = 'combine' }) {
    return templates.mergeNode({
      name: name || 'Merge',
      mode,
      position: this.nextPosition()
    });
  }

  /**
   * Gera node de switch/router
   */
  generateRouter({ name, value, rules }) {
    return templates.switchNode({
      name: name || 'Switch (Router)',
      value,
      rules,
      position: this.nextPosition()
    });
  }
}

module.exports = NodeGenerator;
