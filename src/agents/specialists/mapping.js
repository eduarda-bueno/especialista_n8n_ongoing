/**
 * Mapping Agent
 *
 * 🎯 Missão: Centralizar e validar todos os mapeamentos entre sistemas
 *
 * Responsabilidades:
 * - Validar estado Azure ↔ Intercom
 * - Validar ticket_type → Tag Azure
 * - Garantir consistência bidirecional
 * - Impedir estados não mapeados
 *
 * ⚠ Regra obrigatória:
 * Se valor não estiver mapeado: throw new Error("Valor não mapeado: " + original);
 */

class MappingAgent {
  constructor() {
    // Mapeamento Intercom → Azure
    this.stateIntercomToAzure = {
      "4572477": "To Do",
      "4572478": "Doing",
      "4572479": "CS",
      "4572485": "Ready",
      "4572490": "On Hold",
      "4572484": "Done"
    };

    // Mapeamento Azure → Intercom (reverso)
    this.stateAzureToIntercom = this.reverseMap(this.stateIntercomToAzure);

    // Mapeamento Ticket Type → Azure Tag
    this.ticketTypeToTag = {
      "Assinaturas/Pagamentos": "Ongoing payments",
      "Catálogo": "Ongoing catálogo",
      "Estatística": "Ongoing estatística",
      "Estoque": "Ongoing estoque",
      "Fiado": "Ongoing fiado",
      "Finanças": "Ongoing finanças",
      "Variantes": "Ongoing variantes",
      "Problemas gerais": "Ongoing geral"
    };
  }

  /**
   * Mapeia estado do Intercom para Azure
   */
  mapIntercomStateToAzure(intercomStateId) {
    const azureState = this.stateIntercomToAzure[String(intercomStateId)];

    if (!azureState) {
      throw new Error(`Valor não mapeado (Intercom → Azure): ${intercomStateId}`);
    }

    return azureState;
  }

  /**
   * Mapeia estado do Azure para Intercom
   */
  mapAzureStateToIntercom(azureState) {
    const intercomStateId = this.stateAzureToIntercom[azureState];

    if (!intercomStateId) {
      throw new Error(`Valor não mapeado (Azure → Intercom): ${azureState}`);
    }

    return intercomStateId;
  }

  /**
   * Mapeia Ticket Type para Azure Tag
   */
  mapTicketTypeToTag(ticketType) {
    const normalizedType = ticketType?.trim?.();

    if (!normalizedType) {
      return null; // Tag é opcional
    }

    const azureTag = this.ticketTypeToTag[normalizedType];

    if (!azureTag && normalizedType) {
      console.warn(`⚠️  Ticket type não mapeado: "${ticketType}"`);
      return null; // Não lançar erro, pois tag é opcional
    }

    return azureTag;
  }

  /**
   * Valida se valor existe no mapeamento
   */
  validateMapping(value, mapName) {
    const map = this[mapName];

    if (!map) {
      throw new Error(`Mapa não encontrado: ${mapName}`);
    }

    return Object.keys(map).includes(String(value));
  }

  /**
   * Reverte mapeamento (cria mapeamento bidirecional)
   */
  reverseMap(originalMap) {
    const reversed = {};
    for (const [key, value] of Object.entries(originalMap)) {
      reversed[value] = key;
    }
    return reversed;
  }

  /**
   * Retorna todos os estados válidos
   */
  getValidIntercomStates() {
    return Object.keys(this.stateIntercomToAzure);
  }

  /**
   * Retorna todos os estados Azure válidos
   */
  getValidAzureStates() {
    return Object.values(this.stateIntercomToAzure);
  }

  /**
   * Retorna todos os ticket types válidos
   */
  getValidTicketTypes() {
    return Object.keys(this.ticketTypeToTag);
  }
}

module.exports = MappingAgent;
