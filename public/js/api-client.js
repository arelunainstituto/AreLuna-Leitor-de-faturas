/**
 * Cliente API para Gerenciamento de Faturas
 * Módulo reaproveitável para integração com backend REST
 * 
 * @version 1.0.0
 * @author Grupo AreLuna
 */

class InvoiceAPIClient {
    constructor(baseURL = '/api/faturas') {
        this.baseURL = baseURL;
    }
    
    /**
     * Método auxiliar para fazer requisições
     */
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    /**
     * GET /api/faturas
     * Listar todas as faturas
     */
    async list(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `?${params}` : '';
        return this.request(endpoint);
    }
    
    /**
     * GET /api/faturas/:id
     * Buscar fatura por ID
     */
    async get(id) {
        return this.request(`/${id}`);
    }
    
    /**
     * POST /api/faturas
     * Criar nova fatura
     */
    async create(invoiceData) {
        return this.request('', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });
    }
    
    /**
     * PUT /api/faturas/:id
     * Atualizar fatura
     */
    async update(id, invoiceData) {
        return this.request(`/${id}`, {
            method: 'PUT',
            body: JSON.stringify(invoiceData)
        });
    }
    
    /**
     * PATCH /api/faturas/:id/status
     * Atualizar status da fatura
     */
    async updateStatus(id, status) {
        return this.request(`/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }
    
    /**
     * DELETE /api/faturas/:id
     * Deletar fatura
     */
    async delete(id) {
        return this.request(`/${id}`, {
            method: 'DELETE'
        });
    }
    
    /**
     * GET /api/faturas/stats
     * Obter estatísticas
     */
    async stats() {
        return this.request('/stats');
    }
    
    /**
     * GET /api/faturas/numero/:numeroFatura
     * Buscar por número
     */
    async getByNumber(numeroFatura) {
        return this.request(`/numero/${numeroFatura}`);
    }
}

// Exportar instância global
window.invoiceAPI = new InvoiceAPIClient();

