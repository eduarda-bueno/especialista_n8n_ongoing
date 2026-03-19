/**
 * Architect Agent
 *
 * 🎯 Missão: Definir arquitetura técnica do workflow antes da geração do JSON
 *
 * Responsabilidades:
 * - Definir separação de responsabilidades
 * - Determinar ordem dos nodes
 * - Definir pontos de normalização
 * - Definir pontos de mapeamento
 * - Definir estratégia de erro
 * - Garantir aderência ao CLAUDE.md
 *
 * Restrições:
 * - NÃO gerar JSON final
 * - NÃO alterar requisitos da SPEC
 */

class ArchitectAgent {
  constructor() {
    this.nodePatterns = {
      webhook: { order: 1, responsibility: 'Receber evento externo' },
      extract: { order: 2, responsibility: 'Extrair campos do payload' },
      normalize: { order: 3, responsibility: 'Normalizar dados (ambiente, tags, etc)' },
      map: { order: 4, responsibility: 'Mapear valores entre sistemas' },
      validate: { order: 5, responsibility: 'Validar campos obrigatórios' },
      http: { order: 6, responsibility: 'Integração externa (HTTP Request)' },
      update: { order: 7, responsibility: 'Atualização cruzada (opcional)' }
    };
  }

  /**
   * Define arquitetura baseada na SPEC
   */
  design(spec) {
    console.log('🏗️  Architect Agent: Desenhando arquitetura...\n');

    const architecture = {
      nodes: this.defineNodes(spec),
      ordem: this.defineExecutionOrder(spec),
      conexoes: this.defineConnections(spec),
      pontosValidacao: this.defineValidationPoints(spec),
      pontosMapeamento: this.defineMappingPoints(spec),
      estrategiaErro: this.defineErrorStrategy(spec)
    };

    this.printArchitecture(architecture);
    return architecture;
  }

  /**
   * Define lista de nodes necessários
   */
  defineNodes(spec) {
    const nodes = [];

    // 1. Webhook sempre primeiro
    nodes.push({
      id: 'webhook',
      type: 'n8n-nodes-base.webhook',
      name: `Webhook (${spec.trigger.source})`,
      responsibility: 'Receber evento do webhook',
      order: 1
    });

    // 2. Extract Fields (se houver campos obrigatórios)
    if (spec.entradaEsperada.camposObrigatorios.length > 0) {
      nodes.push({
        id: 'extract',
        type: 'n8n-nodes-base.set',
        name: 'Extract Fields',
        responsibility: 'Extrair campos do payload do webhook',
        order: 2
      });
    }

    // 3. Normalize (se houver necessidade)
    if (this.needsNormalization(spec)) {
      nodes.push({
        id: 'normalize',
        type: 'n8n-nodes-base.code',
        name: 'Normalize Environment',
        responsibility: 'Normalizar ambiente (iOS/Android/Web)',
        order: 3
      });
    }

    // 4. Map (se houver mapeamentos)
    spec.mapeamentos.forEach((mapping, index) => {
      nodes.push({
        id: `map_${index}`,
        type: 'n8n-nodes-base.code',
        name: `Code (Map ${mapping.tipo})`,
        responsibility: `Mapear ${mapping.tipo}`,
        order: 4 + index
      });
    });

    // 5. HTTP Request para integração
    const lastOrder = nodes.length > 0 ? Math.max(...nodes.map(n => n.order)) : 0;
    nodes.push({
      id: 'http_request',
      type: 'n8n-nodes-base.httpRequest',
      name: `HTTP Request (${spec.integracoes.find(i => i.tipo.includes('destination'))?.nome || 'Destination'} - Action)`,
      responsibility: 'Executar ação na integração destino',
      order: lastOrder + 1
    });

    return nodes;
  }

  /**
   * Define ordem de execução
   */
  defineExecutionOrder(spec) {
    const order = [
      '1. Webhook recebe evento',
      '2. Extração de campos do payload',
    ];

    if (this.needsNormalization(spec)) {
      order.push('3. Normalização de dados');
    }

    if (spec.mapeamentos.length > 0) {
      order.push(`${order.length + 1}. Mapeamento de valores`);
    }

    order.push(`${order.length + 1}. Validação de campos obrigatórios`);
    order.push(`${order.length + 1}. HTTP Request para integração`);

    return order;
  }

  /**
   * Define conexões entre nodes
   */
  defineConnections(spec) {
    const connections = [];
    const nodes = this.defineNodes(spec);

    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        type: 'main',
        index: 0
      });
    }

    return connections;
  }

  /**
   * Define pontos de validação
   */
  defineValidationPoints(spec) {
    const validationPoints = [];

    // Validação após extração
    validationPoints.push({
      after: 'extract',
      validates: spec.regrasValidacao,
      action: 'Lançar erro se validação falhar'
    });

    // Validação após mapeamento
    if (spec.mapeamentos.length > 0) {
      validationPoints.push({
        after: 'map',
        validates: ['Valores mapeados existem'],
        action: 'Lançar erro se valor não mapeado'
      });
    }

    return validationPoints;
  }

  /**
   * Define pontos de mapeamento
   */
  defineMappingPoints(spec) {
    return spec.mapeamentos.map(mapping => ({
      node: `Code (Map ${mapping.tipo})`,
      origem: mapping.origem,
      destino: mapping.destino,
      obrigatorio: mapping.obrigatorio,
      errorHandling: 'throw new Error se não mapeado'
    }));
  }

  /**
   * Define estratégia de erro
   */
  defineErrorStrategy(spec) {
    return {
      campoObrigatorioAusente: 'Lançar erro explícito e parar execução',
      valorNaoMapeado: 'Lançar erro com valor original',
      falhaIntegracao: 'Retornar erro HTTP com detalhes',
      payloadInvalido: 'Lançar erro de validação no webhook',
      principio: 'Fail fast - nunca continuar com dados inválidos'
    };
  }

  /**
   * Verifica se precisa normalização
   */
  needsNormalization(spec) {
    return spec.mapeamentos.some(m =>
      m.tipo.includes('Ambiente') ||
      m.tipo.includes('Environment') ||
      m.tipo.includes('Platform')
    );
  }

  /**
   * Imprime arquitetura
   */
  printArchitecture(architecture) {
    console.log('📐 PLANO ARQUITETURAL:\n');

    console.log('🔷 Nodes:');
    architecture.nodes.forEach(node => {
      console.log(`   ${node.order}. ${node.name}`);
      console.log(`      └─ ${node.responsibility}`);
    });

    console.log('\n📊 Ordem de Execução:');
    architecture.ordem.forEach(step => console.log(`   ${step}`));

    console.log('\n🔗 Conexões:');
    architecture.conexoes.forEach(conn => {
      console.log(`   ${conn.from} → ${conn.to}`);
    });

    console.log('\n✅ Pontos de Validação:', architecture.pontosValidacao.length);
    console.log('🗺️  Pontos de Mapeamento:', architecture.pontosMapeamento.length);

    console.log('\n❌ Estratégia de Erro:');
    console.log(`   Princípio: ${architecture.estrategiaErro.principio}`);

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = ArchitectAgent;
