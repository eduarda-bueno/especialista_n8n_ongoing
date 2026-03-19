/**
 * Specifier Agent
 *
 * 🎯 Missão: Transformar solicitação informal em SPEC estruturada e completa
 *
 * Responsabilidades:
 * - Refinar objetivo
 * - Identificar trigger correto
 * - Identificar integrações envolvidas
 * - Listar campos obrigatórios
 * - Identificar mapeamentos necessários
 * - Definir critérios de erro
 * - Definir saída esperada
 * - Estruturar Definition of Done
 *
 * Restrições:
 * - NÃO gerar JSON
 * - NÃO definir estrutura técnica de nodes
 * - NÃO tomar decisões arquiteturais
 */

class SpecifierAgent {
  constructor() {
    this.triggers = {
      'ticket.created': 'Criação de ticket no Intercom',
      'ticket.state.updated': 'Atualização de estado de ticket',
      'ticket.note.created': 'Criação de comentário no ticket',
      'workitem.updated': 'Atualização de Work Item no Azure'
    };

    this.integrations = ['Intercom', 'Azure DevOps'];
  }

  /**
   * Transforma descrição informal em SPEC estruturada
   */
  specify(informalDescription) {
    console.log('🎯 Specifier Agent: Analisando solicitação...\n');

    const spec = {
      objetivo: this.extractObjective(informalDescription),
      trigger: this.identifyTrigger(informalDescription),
      entradaEsperada: this.defineExpectedInput(informalDescription),
      regrasValidacao: this.defineValidationRules(informalDescription),
      integracoes: this.identifyIntegrations(informalDescription),
      mapeamentos: this.identifyMappings(informalDescription),
      criteriosErro: this.defineErrorCriteria(informalDescription),
      definitionOfDone: this.defineDoD(informalDescription)
    };

    this.printSpec(spec);
    return spec;
  }

  /**
   * Extrai o objetivo do fluxo
   */
  extractObjective(description) {
    const normalized = description.toLowerCase();

    if (normalized.includes('criar') && normalized.includes('issue')) {
      return 'Criar Issue no Azure quando ticket for criado no Intercom';
    }

    if (normalized.includes('sincronizar') && normalized.includes('estado')) {
      return 'Sincronizar estado do ticket entre Intercom e Azure';
    }

    if (normalized.includes('comentário') || normalized.includes('comment')) {
      return 'Sincronizar comentários do Intercom para Azure';
    }

    if (normalized.includes('tag')) {
      return 'Mapear e sincronizar tags do Intercom para Azure';
    }

    // Genérico
    return `Integrar ${this.extractSource(description)} com ${this.extractDestination(description)}`;
  }

  /**
   * Identifica o trigger correto
   */
  identifyTrigger(description) {
    const normalized = description.toLowerCase();

    if (normalized.includes('criar') && normalized.includes('ticket')) {
      return {
        type: 'webhook',
        event: 'ticket.created',
        source: 'Intercom',
        description: 'Webhook recebe evento de criação de ticket do Intercom'
      };
    }

    if (normalized.includes('estado') || normalized.includes('state')) {
      return {
        type: 'webhook',
        event: 'ticket.state.updated',
        source: 'Intercom',
        description: 'Webhook recebe evento de atualização de estado do Intercom'
      };
    }

    if (normalized.includes('comentário') || normalized.includes('comment')) {
      return {
        type: 'webhook',
        event: 'ticket.note.created',
        source: 'Intercom',
        description: 'Webhook recebe evento de criação de comentário no Intercom'
      };
    }

    // Fallback
    return {
      type: 'webhook',
      event: 'generic',
      source: this.extractSource(description),
      description: 'Webhook genérico'
    };
  }

  /**
   * Define entrada esperada
   */
  defineExpectedInput(description) {
    const trigger = this.identifyTrigger(description);

    if (trigger.event === 'ticket.created') {
      return {
        source: 'Intercom Webhook',
        format: 'JSON',
        camposObrigatorios: [
          'body.data.item.id',
          'body.data.item.ticket_id',
          'body.data.item.ticket_attributes._default_title_',
          'body.data.item.ticket_attributes._default_description_',
          'body.data.item.contacts.contacts[0].id',
          'body.data.item.company_id'
        ],
        exemplo: {
          body: {
            topic: 'ticket.created',
            data: {
              item: {
                id: '215473334766455',
                ticket_id: '80432668',
                ticket_attributes: {
                  _default_title_: 'Exemplo de título',
                  _default_description_: 'Exemplo de descrição'
                }
              }
            }
          }
        }
      };
    }

    if (trigger.event === 'ticket.state.updated') {
      return {
        source: 'Intercom Webhook',
        format: 'JSON',
        camposObrigatorios: [
          'body.data.item.ticket_state.id',
          'body.data.item.ticket_attributes["Azure ID"]'
        ]
      };
    }

    // Genérico
    return {
      source: trigger.source,
      format: 'JSON',
      camposObrigatorios: []
    };
  }

  /**
   * Define regras de validação
   */
  defineValidationRules(description) {
    const rules = [];

    const normalized = description.toLowerCase();

    if (normalized.includes('criar') && normalized.includes('issue')) {
      rules.push('Ticket ID deve existir');
      rules.push('Título não pode ser vazio');
      rules.push('Contato deve existir');
      rules.push('Email do contato é obrigatório');
      rules.push('AID (custom_attributes.aid) é obrigatório');
    }

    if (normalized.includes('estado') || normalized.includes('state')) {
      rules.push('ticket_state.id deve estar mapeado');
      rules.push('Azure ID deve existir no ticket');
    }

    if (normalized.includes('comentário')) {
      rules.push('Azure ID deve existir');
      rules.push('Comentário não pode ser vazio');
    }

    return rules;
  }

  /**
   * Identifica integrações envolvidas
   */
  identifyIntegrations(description) {
    const integrations = [];
    const normalized = description.toLowerCase();

    if (normalized.includes('intercom')) {
      integrations.push({
        nome: 'Intercom',
        tipo: normalized.includes('para azure') ? 'source' : 'source/destination',
        credencial: 'Bearer Auth Intercom'
      });
    }

    if (normalized.includes('azure')) {
      integrations.push({
        nome: 'Azure DevOps',
        tipo: 'destination',
        credencial: 'PAT do Azure'
      });
    }

    return integrations;
  }

  /**
   * Identifica mapeamentos necessários
   */
  identifyMappings(description) {
    const mappings = [];
    const normalized = description.toLowerCase();

    if (normalized.includes('estado') || normalized.includes('state')) {
      mappings.push({
        tipo: 'Estado Intercom → Azure',
        origem: 'ticket_state.id',
        destino: 'System.State',
        obrigatorio: true
      });
    }

    if (normalized.includes('tag')) {
      mappings.push({
        tipo: 'Ticket Type → Azure Tag',
        origem: 'ticket_type.name',
        destino: 'System.Tags',
        obrigatorio: false
      });
    }

    if (normalized.includes('criar') && normalized.includes('ticket')) {
      mappings.push({
        tipo: 'Normalização de Ambiente',
        origem: 'contact (ios/android/web)',
        destino: 'Custom.OperationalSystem',
        obrigatorio: true
      });
    }

    return mappings;
  }

  /**
   * Define critérios de erro
   */
  defineErrorCriteria(description) {
    return [
      'Falha na validação de campos obrigatórios',
      'Valor não mapeado encontrado',
      'Credenciais inválidas ou ausentes',
      'Timeout na API externa',
      'Payload malformado'
    ];
  }

  /**
   * Define Definition of Done
   */
  defineDoD(description) {
    return {
      funcional: [
        'Workflow processa payload corretamente',
        'Integrações respondem com sucesso',
        'Mapeamentos retornam valores corretos',
        'Campos obrigatórios são preenchidos'
      ],
      tecnico: [
        'JSON importável no n8n',
        'Credenciais corretas utilizadas',
        'Nomes de nodes padronizados',
        'Mapeamentos isolados em Code Nodes',
        'Headers HTTP corretos',
        'Sem hardcoded secrets'
      ],
      qualidade: [
        'Sem nodes órfãos',
        'Erros explícitos para cenários inválidos',
        'Separação clara de responsabilidades',
        'Workflow validado contra CLAUDE.md'
      ]
    };
  }

  /**
   * Extrai origem da descrição
   */
  extractSource(description) {
    if (description.toLowerCase().includes('intercom')) return 'Intercom';
    if (description.toLowerCase().includes('azure')) return 'Azure';
    return 'Unknown';
  }

  /**
   * Extrai destino da descrição
   */
  extractDestination(description) {
    const parts = description.toLowerCase().split(/para|→/);
    if (parts.length > 1) {
      if (parts[1].includes('azure')) return 'Azure';
      if (parts[1].includes('intercom')) return 'Intercom';
    }
    return 'Unknown';
  }

  /**
   * Imprime SPEC estruturada
   */
  printSpec(spec) {
    console.log('📋 SPEC ESTRUTURADA:\n');
    console.log(`🎯 Objetivo: ${spec.objetivo}`);
    console.log(`\n⚡ Trigger: ${spec.trigger.event} (${spec.trigger.source})`);
    console.log(`   ${spec.trigger.description}`);

    console.log(`\n📥 Entrada Esperada:`);
    console.log(`   Source: ${spec.entradaEsperada.source}`);
    console.log(`   Campos obrigatórios: ${spec.entradaEsperada.camposObrigatorios.length}`);

    console.log(`\n✅ Regras de Validação: ${spec.regrasValidacao.length}`);
    spec.regrasValidacao.forEach(rule => console.log(`   - ${rule}`));

    console.log(`\n🔗 Integrações: ${spec.integracoes.length}`);
    spec.integracoes.forEach(int => {
      console.log(`   - ${int.nome} (${int.tipo})`);
    });

    console.log(`\n🗺️  Mapeamentos: ${spec.mapeamentos.length}`);
    spec.mapeamentos.forEach(map => {
      console.log(`   - ${map.tipo}`);
    });

    console.log(`\n❌ Critérios de Erro: ${spec.criteriosErro.length}`);

    console.log(`\n✅ Definition of Done:`);
    console.log(`   Funcional: ${spec.definitionOfDone.funcional.length} critérios`);
    console.log(`   Técnico: ${spec.definitionOfDone.tecnico.length} critérios`);
    console.log(`   Qualidade: ${spec.definitionOfDone.qualidade.length} critérios`);

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = SpecifierAgent;
