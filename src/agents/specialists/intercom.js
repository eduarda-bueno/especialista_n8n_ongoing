/**
 * Intercom Specialist Agent
 *
 * 🎯 Missão: Garantir conformidade técnica com Intercom
 *
 * Responsabilidades:
 * - Validar estrutura do webhook
 * - Validar ticket_state.id
 * - Validar ticket_attributes
 * - Validar contacts e companies
 * - Validar estrutura de atualização de ticket
 */

class IntercomSpecialistAgent {
  constructor() {
    this.validTopics = [
      'ticket.created',
      'ticket.state.updated',
      'ticket.note.created',
      'ticket.attribute.updated'
    ];

    this.validStateIds = [
      '4572477', // To Do
      '4572478', // Doing
      '4572479', // CS
      '4572485', // Ready
      '4572490', // On Hold
      '4572484'  // Done
    ];
  }

  /**
   * Valida payload do Intercom
   */
  validate(payload, expectedTopic = null) {
    console.log('🔍 Intercom Specialist: Validando payload...\n');

    const errors = [];

    errors.push(...this.validateWebhookStructure(payload));

    if (expectedTopic) {
      errors.push(...this.validateTopic(payload, expectedTopic));
    }

    if (payload.body?.topic === 'ticket.created') {
      errors.push(...this.validateTicketCreated(payload));
    }

    if (payload.body?.topic === 'ticket.state.updated') {
      errors.push(...this.validateTicketStateUpdated(payload));
    }

    if (payload.body?.topic === 'ticket.note.created') {
      errors.push(...this.validateTicketNoteCreated(payload));
    }

    if (errors.length > 0) {
      console.log('❌ Erros de validação Intercom:\n');
      errors.forEach(err => console.log(`   - ${err}`));
      throw new Error(`Intercom validation failed: ${errors.join(', ')}`);
    }

    console.log('✅ Payload Intercom válido\n');
    return payload;
  }

  /**
   * Valida estrutura básica do webhook
   */
  validateWebhookStructure(payload) {
    const errors = [];

    if (!payload) {
      errors.push('Payload ausente');
      return errors;
    }

    if (!payload.body) {
      errors.push('body ausente no payload');
    }

    if (!payload.body?.type || payload.body.type !== 'notification_event') {
      errors.push('body.type deve ser "notification_event"');
    }

    if (!payload.body?.data) {
      errors.push('body.data ausente');
    }

    if (!payload.body?.data?.item) {
      errors.push('body.data.item ausente');
    }

    if (!payload.body?.topic) {
      errors.push('body.topic ausente');
    }

    return errors;
  }

  /**
   * Valida topic do webhook
   */
  validateTopic(payload, expectedTopic) {
    const errors = [];
    const actualTopic = payload.body?.topic;

    if (actualTopic !== expectedTopic) {
      errors.push(`Topic incorreto: esperado "${expectedTopic}", recebido "${actualTopic}"`);
    }

    if (!this.validTopics.includes(actualTopic)) {
      errors.push(`Topic não suportado: "${actualTopic}"`);
    }

    return errors;
  }

  /**
   * Valida evento ticket.created
   */
  validateTicketCreated(payload) {
    const errors = [];
    const item = payload.body?.data?.item;

    if (!item) return errors;

    // Valida campos obrigatórios
    if (!item.id) {
      errors.push('item.id ausente');
    }

    if (!item.ticket_id) {
      errors.push('item.ticket_id ausente');
    }

    if (!item.ticket_attributes) {
      errors.push('item.ticket_attributes ausente');
    }

    if (!item.ticket_attributes?._default_title_) {
      errors.push('item.ticket_attributes._default_title_ ausente');
    }

    if (!item.ticket_attributes?._default_description_) {
      errors.push('item.ticket_attributes._default_description_ ausente');
    }

    // Valida contacts
    if (!item.contacts || !item.contacts.contacts || item.contacts.contacts.length === 0) {
      errors.push('item.contacts.contacts vazio ou ausente');
    }

    // Valida company_id (opcional, mas comum)
    if (!item.company_id) {
      console.warn('⚠️  item.company_id ausente (opcional)');
    }

    return errors;
  }

  /**
   * Valida evento ticket.state.updated
   */
  validateTicketStateUpdated(payload) {
    const errors = [];
    const item = payload.body?.data?.item;

    if (!item) return errors;

    if (!item.ticket_state) {
      errors.push('item.ticket_state ausente');
    }

    if (!item.ticket_state?.id) {
      errors.push('item.ticket_state.id ausente');
    }

    // Valida se o state ID é válido
    if (item.ticket_state?.id && !this.validStateIds.includes(String(item.ticket_state.id))) {
      errors.push(`ticket_state.id inválido: "${item.ticket_state.id}"`);
    }

    // Valida se tem Azure ID (necessário para sincronização)
    if (!item.ticket_attributes?.['Azure ID']) {
      console.warn('⚠️  Azure ID ausente em ticket_attributes');
    }

    return errors;
  }

  /**
   * Valida evento ticket.note.created
   */
  validateTicketNoteCreated(payload) {
    const errors = [];
    const item = payload.body?.data?.item;

    if (!item) return errors;

    if (!item.ticket_part) {
      errors.push('item.ticket_part ausente');
    }

    if (!item.ticket_part?.body) {
      errors.push('item.ticket_part.body (comentário) ausente');
    }

    // Valida Azure ID no ticket
    if (!item.ticket?.ticket_attributes?.['Azure ID']) {
      errors.push('Azure ID ausente - necessário para sincronizar comentário');
    }

    return errors;
  }

  /**
   * Valida estrutura de atualização de ticket
   */
  validateTicketUpdate(updatePayload) {
    const errors = [];

    if (!updatePayload || typeof updatePayload !== 'object') {
      errors.push('Payload de atualização inválido');
      return errors;
    }

    // Valida ticket_attributes se presente
    if (updatePayload.ticket_attributes) {
      if (typeof updatePayload.ticket_attributes !== 'object') {
        errors.push('ticket_attributes deve ser um objeto');
      }
    }

    // Valida ticket_state_id se presente
    if (updatePayload.ticket_state_id) {
      if (!this.validStateIds.includes(String(updatePayload.ticket_state_id))) {
        errors.push(`ticket_state_id inválido: "${updatePayload.ticket_state_id}"`);
      }
    }

    return errors;
  }

  /**
   * Retorna topics válidos
   */
  getValidTopics() {
    return this.validTopics;
  }

  /**
   * Retorna state IDs válidos
   */
  getValidStateIds() {
    return this.validStateIds;
  }
}

module.exports = IntercomSpecialistAgent;
