/**
 * Rotas REST para Gerenciamento de Faturas
 * API RESTful para integração com apps externos
 */

const express = require('express');
const router = express.Router();
const invoiceService = require('../services/InvoiceService');

/**
 * GET /api/faturas
 * Listar todas as faturas com filtros e paginação
 * 
 * Query params:
 * - status: pending|processed|paid
 * - nifAdquirente: NIF do cliente
 * - dataInicio: Data inicial (YYYY-MM-DD)
 * - dataFim: Data final (YYYY-MM-DD)
 * - page: Número da página (padrão: 1)
 * - limit: Itens por página (padrão: 10)
 * - sortBy: Campo para ordenação (padrão: createdAt)
 * - sortOrder: asc|desc (padrão: desc)
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            nifAdquirente: req.query.nifAdquirente,
            dataInicio: req.query.dataInicio,
            dataFim: req.query.dataFim,
            page: req.query.page,
            limit: req.query.limit,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        };
        
        const result = invoiceService.findAll(filters);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar faturas',
            error: error.message
        });
    }
});

/**
 * GET /api/faturas/stats
 * Obter estatísticas das faturas
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = invoiceService.getStats();
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: error.message
        });
    }
});

/**
 * GET /api/faturas/:id
 * Buscar fatura por ID
 */
router.get('/:id', async (req, res) => {
    try {
        const invoice = invoiceService.findById(req.params.id);
        
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Fatura não encontrada'
            });
        }
        
        res.json({
            success: true,
            data: invoice.toJSON()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar fatura',
            error: error.message
        });
    }
});

/**
 * POST /api/faturas
 * Criar nova fatura (a partir de QR Code ou manualmente)
 * 
 * Body:
 * {
 *   "nomeCliente": "Nome do Cliente",
 *   "numeroFatura": "FT 2024/001",
 *   "dataVencimento": "2024-12-31",
 *   "valor": 285.00,
 *   "linhaDigitavel": "...",
 *   "nifEmitente": "123456789",
 *   "nifAdquirente": "987654321",
 *   "dataFatura": "2024-10-19",
 *   "tipoDocumento": "Fatura-Recibo",
 *   "total": 285.00,
 *   "rawQRContent": "A:123*B:456*...",
 *   "status": "pending"
 * }
 */
router.post('/', async (req, res) => {
    try {
        const invoice = await invoiceService.create(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Fatura criada com sucesso',
            data: invoice.toJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Erro ao criar fatura',
            error: error.message
        });
    }
});

/**
 * PUT /api/faturas/:id
 * Atualizar fatura existente
 * 
 * Body: Campos a serem atualizados
 */
router.put('/:id', async (req, res) => {
    try {
        const invoice = await invoiceService.update(req.params.id, req.body);
        
        res.json({
            success: true,
            message: 'Fatura atualizada com sucesso',
            data: invoice.toJSON()
        });
    } catch (error) {
        if (error.message === 'Fatura não encontrada') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(400).json({
            success: false,
            message: 'Erro ao atualizar fatura',
            error: error.message
        });
    }
});

/**
 * PATCH /api/faturas/:id/status
 * Atualizar apenas o status da fatura
 * 
 * Body: { "status": "processed" | "paid" | "pending" }
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['pending', 'processed', 'paid'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Use: pending, processed ou paid'
            });
        }
        
        const invoice = await invoiceService.update(req.params.id, { status });
        
        res.json({
            success: true,
            message: 'Status atualizado com sucesso',
            data: invoice.toJSON()
        });
    } catch (error) {
        if (error.message === 'Fatura não encontrada') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(400).json({
            success: false,
            message: 'Erro ao atualizar status',
            error: error.message
        });
    }
});

/**
 * DELETE /api/faturas/:id
 * Deletar fatura
 */
router.delete('/:id', async (req, res) => {
    try {
        await invoiceService.delete(req.params.id);
        
        res.json({
            success: true,
            message: 'Fatura deletada com sucesso'
        });
    } catch (error) {
        if (error.message === 'Fatura não encontrada') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar fatura',
            error: error.message
        });
    }
});

/**
 * GET /api/faturas/numero/:numeroFatura
 * Buscar fatura por número
 */
router.get('/numero/:numeroFatura', async (req, res) => {
    try {
        const invoice = invoiceService.findByNumero(req.params.numeroFatura);
        
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Fatura não encontrada'
            });
        }
        
        res.json({
            success: true,
            data: invoice.toJSON()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar fatura',
            error: error.message
        });
    }
});

module.exports = router;

