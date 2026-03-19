/**
 * Templates base extraídos do Router Intercom → Azure
 * Seguem as convenções do CLAUDE.md
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Template de Webhook Node
 */
function webhookNode({ path, httpMethod = 'POST', name, position }) {
  return {
    parameters: {
      path,
      httpMethod,
      responseMode: 'onReceived',
      options: {}
    },
    id: uuidv4(),
    name: name || 'Webhook',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2.1,
    position: position || [200, 300],
    webhookId: uuidv4()
  };
}

/**
 * Template de HTTP Request Node
 */
function httpRequestNode({
  url,
  method = 'GET',
  name,
  headers = [],
  body = null,
  credentials = {},
  position
}) {
  const node = {
    parameters: {
      url,
      method,
      authentication: 'genericCredentialType',
      sendHeaders: true,
      headerParameters: {
        parameters: headers
      },
      options: {}
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.3,
    position: position || [400, 300],
    id: uuidv4(),
    name: name || 'HTTP Request'
  };

  // Adiciona credenciais se fornecidas
  if (credentials.type) {
    node.parameters.genericAuthType = credentials.type;
    node.credentials = credentials.value;
  }

  // Adiciona body se fornecido
  if (body) {
    node.parameters.sendBody = true;
    node.parameters.specifyBody = 'json';
    node.parameters.jsonBody = body;
  }

  return node;
}

/**
 * Template de Set/Edit Fields Node
 */
function editFieldsNode({ name, assignments, position }) {
  return {
    parameters: {
      assignments: {
        assignments: assignments.map(a => ({
          id: uuidv4(),
          name: a.name,
          value: a.value,
          type: a.type || 'string'
        }))
      },
      options: {}
    },
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: position || [600, 300],
    id: uuidv4(),
    name: name || 'Edit Fields'
  };
}

/**
 * Template de Code Node (para mapeamentos)
 */
function codeNode({ name, jsCode, position }) {
  return {
    parameters: {
      jsCode
    },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: position || [800, 300],
    id: uuidv4(),
    name: name || 'Code'
  };
}

/**
 * Template de Switch Node
 */
function switchNode({ name, value, rules, position }) {
  return {
    parameters: {
      dataType: 'string',
      value1: value,
      rules: {
        rules: rules.map(r => ({ value2: r }))
      }
    },
    id: uuidv4(),
    name: name || 'Switch',
    type: 'n8n-nodes-base.switch',
    typeVersion: 2,
    position: position || [300, 300]
  };
}

/**
 * Template de IF Node
 */
function ifNode({ name, conditions, position }) {
  return {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 3
        },
        conditions,
        combinator: 'and'
      },
      options: {}
    },
    type: 'n8n-nodes-base.if',
    typeVersion: 2.3,
    position: position || [700, 300],
    id: uuidv4(),
    name: name || 'If'
  };
}

/**
 * Template de Merge Node
 */
function mergeNode({ name, mode = 'combine', position }) {
  return {
    parameters: {
      mode,
      combineBy: 'combineAll',
      options: {}
    },
    type: 'n8n-nodes-base.merge',
    typeVersion: 3.2,
    position: position || [900, 300],
    id: uuidv4(),
    name: name || 'Merge'
  };
}

/**
 * Credenciais padrão (IDs reais do sistema)
 */
const CREDENTIALS = {
  intercomBearer: {
    id: 'v1oa0YcYRfpLkQgf',
    name: 'Bearer Auth Intercom'
  },
  azurePAT: {
    id: 'IvNiMkEcky5nmtij',
    name: 'PAT do Azure'
  }
};

/**
 * Headers comuns
 */
const COMMON_HEADERS = {
  intercom: [
    { name: 'Accept', value: 'application/json' },
    { name: 'Intercom-Version', value: '2.14' }
  ],
  azureJson: [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Accept', value: 'application/json' }
  ],
  azurePatch: [
    { name: 'Content-Type', value: 'application/json-patch+json' }
  ]
};

module.exports = {
  webhookNode,
  httpRequestNode,
  editFieldsNode,
  codeNode,
  switchNode,
  ifNode,
  mergeNode,
  CREDENTIALS,
  COMMON_HEADERS
};
