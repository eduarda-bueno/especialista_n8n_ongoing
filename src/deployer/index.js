/**
 * N8N Deployer
 *
 * Responsável por fazer deploy automático de workflows na instância n8n via API REST
 *
 * Capabilities:
 * - Criar workflows via API
 * - Ativar/desativar workflows
 * - Atualizar workflows existentes
 * - Listar workflows
 * - Validar conexão com n8n
 */

const axios = require('axios');

class N8nDeployer {
  constructor(config = {}) {
    this.n8nUrl = config.n8nUrl || process.env.N8N_URL;
    this.apiKey = config.apiKey || process.env.N8N_API_KEY;

    if (!this.n8nUrl) {
      throw new Error('N8N_URL não configurado. Configure via .env ou passe no construtor.');
    }

    if (!this.apiKey) {
      throw new Error('N8N_API_KEY não configurado. Configure via .env ou passe no construtor.');
    }

    // Remove trailing slash da URL
    this.n8nUrl = this.n8nUrl.replace(/\/$/, '');

    // Configura axios com defaults
    this.client = axios.create({
      baseURL: `${this.n8nUrl}/api/v1`,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Valida conexão com n8n
   */
  async validateConnection() {
    try {
      const response = await this.client.get('/workflows');
      return {
        connected: true,
        message: 'Conexão com n8n estabelecida com sucesso',
        workflowCount: response.data.data ? response.data.data.length : 0
      };
    } catch (error) {
      return {
        connected: false,
        message: `Falha na conexão: ${error.message}`,
        error: error.response ? error.response.data : error.message
      };
    }
  }

  /**
   * Lista todos os workflows
   */
  async listWorkflows() {
    try {
      const response = await this.client.get('/workflows');
      return {
        success: true,
        workflows: response.data.data || []
      };
    } catch (error) {
      throw new Error(`Erro ao listar workflows: ${error.message}`);
    }
  }

  /**
   * Busca workflow por nome
   */
  async findWorkflowByName(name) {
    const result = await this.listWorkflows();
    return result.workflows.find(w => w.name === name);
  }

  /**
   * Cria um novo workflow
   */
  async createWorkflow(workflow) {
    try {
      // Remove campos read-only que a API não aceita
      const cleanWorkflow = { ...workflow };
      delete cleanWorkflow.active;
      delete cleanWorkflow.id;
      delete cleanWorkflow.createdAt;
      delete cleanWorkflow.updatedAt;
      delete cleanWorkflow.tags;
      delete cleanWorkflow.versionId;
      delete cleanWorkflow.meta;

      // Limpa settings para manter apenas campos aceitos pela API
      if (cleanWorkflow.settings) {
        const { executionOrder } = cleanWorkflow.settings;
        cleanWorkflow.settings = executionOrder ? { executionOrder } : {};
      }

      const response = await this.client.post('/workflows', cleanWorkflow);
      return {
        success: true,
        workflow: response.data,
        message: `Workflow "${workflow.name}" criado com sucesso`
      };
    } catch (error) {
      throw new Error(`Erro ao criar workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Atualiza um workflow existente
   */
  async updateWorkflow(workflowId, workflow) {
    try {
      // Remove campos read-only que a API não aceita
      const cleanWorkflow = { ...workflow };
      delete cleanWorkflow.active;
      delete cleanWorkflow.id;
      delete cleanWorkflow.createdAt;
      delete cleanWorkflow.updatedAt;
      delete cleanWorkflow.tags;
      delete cleanWorkflow.versionId;
      delete cleanWorkflow.meta;

      // Limpa settings para manter apenas campos aceitos pela API
      if (cleanWorkflow.settings) {
        const { executionOrder } = cleanWorkflow.settings;
        cleanWorkflow.settings = executionOrder ? { executionOrder } : {};
      }

      const response = await this.client.put(`/workflows/${workflowId}`, cleanWorkflow);
      return {
        success: true,
        workflow: response.data,
        message: `Workflow "${workflow.name}" atualizado com sucesso`
      };
    } catch (error) {
      throw new Error(`Erro ao atualizar workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Ativa um workflow
   */
  async activateWorkflow(workflowId) {
    try {
      const response = await this.client.post(`/workflows/${workflowId}/activate`);
      return {
        success: true,
        message: `Workflow ativado com sucesso`
      };
    } catch (error) {
      throw new Error(`Erro ao ativar workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Desativa um workflow
   */
  async deactivateWorkflow(workflowId) {
    try {
      const response = await this.client.post(`/workflows/${workflowId}/deactivate`);
      return {
        success: true,
        message: `Workflow desativado com sucesso`
      };
    } catch (error) {
      throw new Error(`Erro ao desativar workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Deleta um workflow
   */
  async deleteWorkflow(workflowId) {
    try {
      await this.client.delete(`/workflows/${workflowId}`);
      return {
        success: true,
        message: `Workflow deletado com sucesso`
      };
    } catch (error) {
      throw new Error(`Erro ao deletar workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Deploy completo: cria/atualiza + ativa
   *
   * @param {Object} workflow - Workflow JSON gerado
   * @param {Object} options - Opções de deploy
   * @param {boolean} options.activate - Ativar após criar (default: true)
   * @param {boolean} options.updateIfExists - Atualizar se já existe (default: false)
   * @param {boolean} options.forceUpdate - Forçar atualização mesmo se inativo (default: false)
   */
  async deploy(workflow, options = {}) {
    const {
      activate = true,
      updateIfExists = false,
      forceUpdate = false
    } = options;

    try {
      // Verifica se workflow já existe
      const existing = await this.findWorkflowByName(workflow.name);

      let result;

      if (existing) {
        if (updateIfExists || forceUpdate) {
          console.log(`\n⚠️  Workflow "${workflow.name}" já existe`);
          console.log(`🔄 Atualizando workflow existente (ID: ${existing.id})...\n`);

          result = await this.updateWorkflow(existing.id, workflow);
          result.workflowId = existing.id;
          result.action = 'updated';
        } else {
          return {
            success: false,
            message: `Workflow "${workflow.name}" já existe. Use updateIfExists: true para atualizar.`,
            existingWorkflow: existing
          };
        }
      } else {
        console.log(`\n📦 Criando novo workflow "${workflow.name}"...\n`);
        result = await this.createWorkflow(workflow);
        result.workflowId = result.workflow.id;
        result.action = 'created';
      }

      // Ativa workflow se solicitado
      if (activate) {
        console.log(`⚡ Ativando workflow...\n`);
        await this.activateWorkflow(result.workflowId);
        result.activated = true;
      }

      // Gera URL do workflow
      result.workflowUrl = `${this.n8nUrl}/workflow/${result.workflowId}`;

      return result;

    } catch (error) {
      throw new Error(`Erro no deploy: ${error.message}`);
    }
  }

  /**
   * Deploy em lote (múltiplos workflows)
   */
  async deployBatch(workflows, options = {}) {
    const results = [];

    for (const workflow of workflows) {
      try {
        const result = await this.deploy(workflow, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          workflow: workflow.name,
          error: error.message
        });
      }
    }

    return {
      total: workflows.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = N8nDeployer;
