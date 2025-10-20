/**
 * Testes para API REST de Faturas
 * @requires Jest + Supertest
 */

const request = require('supertest');
const app = require('../server');
const invoiceService = require('../services/InvoiceService');

describe('Invoice API - REST Endpoints', () => {
    
    let createdInvoiceId;
    
    // Limpar dados antes dos testes
    beforeEach(async () => {
        // Reset service for clean state
        invoiceService.invoices.clear();
    });
    
    describe('POST /api/faturas', () => {
        test('deve criar nova fatura com dados completos', async () => {
            const invoiceData = {
                nomeCliente: 'Instituto AreLuna Medicina Dentária Avançada, Lda',
                numeroFatura: 'FT 2024/001',
                dataVencimento: '2024-11-18',
                valor: 285.00,
                nifEmitente: '298255847',
                nifAdquirente: '516562240',
                paisEmitente: 'PT',
                paisAdquirente: 'PT',
                dataFatura: '2024-10-19',
                tipoDocumento: 'Fatura-Recibo',
                total: 285.00,
                moeda: 'EUR',
                status: 'pending'
            };
            
            const response = await request(app)
                .post('/api/faturas')
                .send(invoiceData)
                .expect('Content-Type', /json/)
                .expect(201);
            
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Fatura criada com sucesso');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.nomeCliente).toBe(invoiceData.nomeCliente);
            expect(response.body.data.numeroFatura).toBe(invoiceData.numeroFatura);
            
            createdInvoiceId = response.body.data.id;
        });
        
        test('deve criar fatura com dados mínimos', async () => {
            const invoiceData = {
                nomeCliente: 'Cliente Teste',
                numeroFatura: 'FT 2024/002',
                total: 100.00
            };
            
            const response = await request(app)
                .post('/api/faturas')
                .send(invoiceData)
                .expect(201);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('createdAt');
            expect(response.body.data).toHaveProperty('updatedAt');
        });
    });
    
    describe('GET /api/faturas', () => {
        beforeEach(async () => {
            // Criar algumas faturas para teste
            await invoiceService.create({
                nomeCliente: 'Cliente 1',
                numeroFatura: 'FT 2024/001',
                total: 100.00,
                status: 'pending'
            });
            
            await invoiceService.create({
                nomeCliente: 'Cliente 2',
                numeroFatura: 'FT 2024/002',
                total: 200.00,
                status: 'processed'
            });
            
            await invoiceService.create({
                nomeCliente: 'Cliente 3',
                numeroFatura: 'FT 2024/003',
                total: 300.00,
                status: 'paid'
            });
        });
        
        test('deve listar todas as faturas', async () => {
            const response = await request(app)
                .get('/api/faturas')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.total).toBeGreaterThanOrEqual(3);
        });
        
        test('deve filtrar faturas por status', async () => {
            const response = await request(app)
                .get('/api/faturas?status=pending')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.every(inv => inv.status === 'pending')).toBe(true);
        });
        
        test('deve paginar resultados', async () => {
            const response = await request(app)
                .get('/api/faturas?page=1&limit=2')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(2);
        });
    });
    
    describe('GET /api/faturas/:id', () => {
        let testInvoiceId;
        
        beforeEach(async () => {
            const invoice = await invoiceService.create({
                nomeCliente: 'Cliente Teste',
                numeroFatura: 'FT 2024/TEST',
                total: 150.00
            });
            testInvoiceId = invoice.id;
        });
        
        test('deve buscar fatura por ID', async () => {
            const response = await request(app)
                .get(`/api/faturas/${testInvoiceId}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testInvoiceId);
            expect(response.body.data.nomeCliente).toBe('Cliente Teste');
        });
        
        test('deve retornar 404 para ID inexistente', async () => {
            const response = await request(app)
                .get('/api/faturas/INV-NONEXISTENT')
                .expect(404);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Fatura não encontrada');
        });
    });
    
    describe('PUT /api/faturas/:id', () => {
        let testInvoiceId;
        
        beforeEach(async () => {
            const invoice = await invoiceService.create({
                nomeCliente: 'Cliente Original',
                numeroFatura: 'FT 2024/UPDATE',
                total: 100.00,
                status: 'pending'
            });
            testInvoiceId = invoice.id;
        });
        
        test('deve atualizar fatura existente', async () => {
            const updateData = {
                nomeCliente: 'Cliente Atualizado',
                total: 150.00
            };
            
            const response = await request(app)
                .put(`/api/faturas/${testInvoiceId}`)
                .send(updateData)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.nomeCliente).toBe('Cliente Atualizado');
            expect(response.body.data.total).toBe(150.00);
        });
        
        test('deve retornar 404 para ID inexistente', async () => {
            const response = await request(app)
                .put('/api/faturas/INV-NONEXISTENT')
                .send({ total: 200.00 })
                .expect(404);
            
            expect(response.body.success).toBe(false);
        });
    });
    
    describe('PATCH /api/faturas/:id/status', () => {
        let testInvoiceId;
        
        beforeEach(async () => {
            const invoice = await invoiceService.create({
                nomeCliente: 'Cliente Status',
                numeroFatura: 'FT 2024/STATUS',
                total: 100.00,
                status: 'pending'
            });
            testInvoiceId = invoice.id;
        });
        
        test('deve atualizar status para processed', async () => {
            const response = await request(app)
                .patch(`/api/faturas/${testInvoiceId}/status`)
                .send({ status: 'processed' })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('processed');
        });
        
        test('deve atualizar status para paid', async () => {
            const response = await request(app)
                .patch(`/api/faturas/${testInvoiceId}/status`)
                .send({ status: 'paid' })
                .expect(200);
            
            expect(response.body.data.status).toBe('paid');
        });
        
        test('deve rejeitar status inválido', async () => {
            const response = await request(app)
                .patch(`/api/faturas/${testInvoiceId}/status`)
                .send({ status: 'invalid_status' })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Status inválido');
        });
    });
    
    describe('DELETE /api/faturas/:id', () => {
        let testInvoiceId;
        
        beforeEach(async () => {
            const invoice = await invoiceService.create({
                nomeCliente: 'Cliente Delete',
                numeroFatura: 'FT 2024/DELETE',
                total: 100.00
            });
            testInvoiceId = invoice.id;
        });
        
        test('deve deletar fatura existente', async () => {
            const response = await request(app)
                .delete(`/api/faturas/${testInvoiceId}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Fatura deletada com sucesso');
            
            // Verificar se foi realmente deletada
            const checkResponse = await request(app)
                .get(`/api/faturas/${testInvoiceId}`)
                .expect(404);
            
            expect(checkResponse.body.success).toBe(false);
        });
        
        test('deve retornar 404 para ID inexistente', async () => {
            const response = await request(app)
                .delete('/api/faturas/INV-NONEXISTENT')
                .expect(404);
            
            expect(response.body.success).toBe(false);
        });
    });
    
    describe('GET /api/faturas/stats', () => {
        beforeEach(async () => {
            // Criar faturas com diferentes status
            await invoiceService.create({
                nomeCliente: 'Cliente 1',
                numeroFatura: 'FT 2024/001',
                total: 100.00,
                status: 'pending'
            });
            
            await invoiceService.create({
                nomeCliente: 'Cliente 2',
                numeroFatura: 'FT 2024/002',
                total: 200.00,
                status: 'processed'
            });
            
            await invoiceService.create({
                nomeCliente: 'Cliente 3',
                numeroFatura: 'FT 2024/003',
                total: 300.00,
                status: 'paid'
            });
        });
        
        test('deve retornar estatísticas corretas', async () => {
            const response = await request(app)
                .get('/api/faturas/stats')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.stats).toBeDefined();
            expect(response.body.stats.total).toBeGreaterThanOrEqual(3);
            expect(response.body.stats.porStatus).toBeDefined();
            expect(response.body.stats.valorTotal).toBeGreaterThan(0);
        });
    });
    
    describe('GET /api/faturas/numero/:numeroFatura', () => {
        beforeEach(async () => {
            await invoiceService.create({
                nomeCliente: 'Cliente Busca',
                numeroFatura: 'FT 2024/SEARCH',
                total: 100.00
            });
        });
        
        test('deve buscar fatura por número', async () => {
            const response = await request(app)
                .get('/api/faturas/numero/FT%202024%2FSEARCH')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.numeroFatura).toBe('FT 2024/SEARCH');
        });
        
        test('deve retornar 404 para número inexistente', async () => {
            const response = await request(app)
                .get('/api/faturas/numero/NONEXISTENT')
                .expect(404);
            
            expect(response.body.success).toBe(false);
        });
    });
});

describe('API Documentation', () => {
    test('GET /api/docs - deve retornar documentação', async () => {
        const response = await request(app)
            .get('/api/docs')
            .expect(200);
        
        // Verificar que retorna um arquivo
        expect(response.type).toBeTruthy();
    });
});

