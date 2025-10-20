/**
 * Serviço de Gerenciamento de Faturas
 * Responsável por CRUD de faturas
 */

const Invoice = require('../models/Invoice');
const fs = require('fs-extra');
const path = require('path');

class InvoiceService {
    constructor() {
        this.invoices = new Map();
        this.dataFile = path.join(__dirname, '..', 'data', 'invoices.json');
        this.initialize();
    }
    
    async initialize() {
        try {
            await fs.ensureDir(path.dirname(this.dataFile));
            if (await fs.pathExists(this.dataFile)) {
                const data = await fs.readJSON(this.dataFile);
                data.forEach(invoiceData => {
                    const invoice = new Invoice(invoiceData);
                    this.invoices.set(invoice.id, invoice);
                });
                console.log(`📊 ${this.invoices.size} faturas carregadas do arquivo`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar faturas:', error.message);
        }
    }
    
    async save() {
        try {
            const data = Array.from(this.invoices.values()).map(inv => inv.toJSON());
            await fs.writeJSON(this.dataFile, data, { spaces: 2 });
            console.log(`💾 ${data.length} faturas salvas`);
        } catch (error) {
            console.error('❌ Erro ao salvar faturas:', error.message);
            throw error;
        }
    }
    
    /**
     * Criar nova fatura
     */
    async create(data) {
        const invoice = new Invoice(data);
        this.invoices.set(invoice.id, invoice);
        await this.save();
        console.log(`✅ Fatura criada: ${invoice.id}`);
        return invoice;
    }
    
    /**
     * Buscar fatura por ID
     */
    findById(id) {
        return this.invoices.get(id);
    }
    
    /**
     * Listar todas as faturas com filtros e paginação
     */
    findAll(filters = {}) {
        let results = Array.from(this.invoices.values());
        
        // Filtro por status
        if (filters.status) {
            results = results.filter(inv => inv.status === filters.status);
        }
        
        // Filtro por NIF do cliente
        if (filters.nifAdquirente) {
            results = results.filter(inv => inv.nifAdquirente === filters.nifAdquirente);
        }
        
        // Filtro por data
        if (filters.dataInicio && filters.dataFim) {
            results = results.filter(inv => {
                const dataFatura = new Date(inv.dataFatura);
                return dataFatura >= new Date(filters.dataInicio) && 
                       dataFatura <= new Date(filters.dataFim);
            });
        }
        
        // Ordenação
        const sortBy = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'desc';
        results.sort((a, b) => {
            if (sortOrder === 'asc') {
                return a[sortBy] > b[sortBy] ? 1 : -1;
            }
            return a[sortBy] < b[sortBy] ? 1 : -1;
        });
        
        // Paginação
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedResults = results.slice(startIndex, endIndex);
        
        return {
            data: paginatedResults,
            pagination: {
                total: results.length,
                page,
                limit,
                totalPages: Math.ceil(results.length / limit),
                hasNext: endIndex < results.length,
                hasPrev: startIndex > 0
            }
        };
    }
    
    /**
     * Atualizar fatura
     */
    async update(id, data) {
        const invoice = this.invoices.get(id);
        if (!invoice) {
            throw new Error('Fatura não encontrada');
        }
        
        invoice.update(data);
        await this.save();
        console.log(`✅ Fatura atualizada: ${id}`);
        return invoice;
    }
    
    /**
     * Deletar fatura
     */
    async delete(id) {
        const invoice = this.invoices.get(id);
        if (!invoice) {
            throw new Error('Fatura não encontrada');
        }
        
        this.invoices.delete(id);
        await this.save();
        console.log(`🗑️  Fatura deletada: ${id}`);
        return true;
    }
    
    /**
     * Buscar por número de fatura
     */
    findByNumero(numeroFatura) {
        return Array.from(this.invoices.values())
            .find(inv => inv.numeroFatura === numeroFatura);
    }
    
    /**
     * Estatísticas
     */
    getStats() {
        const invoices = Array.from(this.invoices.values());
        
        return {
            total: invoices.length,
            porStatus: {
                pending: invoices.filter(inv => inv.status === 'pending').length,
                processed: invoices.filter(inv => inv.status === 'processed').length,
                paid: invoices.filter(inv => inv.status === 'paid').length
            },
            valorTotal: invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
            ultimaFatura: invoices.length > 0 ? 
                invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : null
        };
    }
}

// Singleton
const invoiceService = new InvoiceService();
module.exports = invoiceService;

