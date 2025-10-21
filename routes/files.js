/**
 * Rotas para upload e processamento de arquivos XML e CSV
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const XMLParser = require('../services/XMLParser');
const CSVParser = require('../services/CSVParser');
const InvoiceService = require('../services/InvoiceService');

// Configuração do Multer para upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.xml', '.csv'].includes(ext)) {
            return cb(new Error('Apenas arquivos XML ou CSV são permitidos'));
        }
        cb(null, true);
    }
});

/**
 * POST /api/files/upload/xml
 * Upload e processamento de arquivo XML SAF-T
 */
router.post('/upload/xml', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo foi enviado'
            });
        }

        console.log('📤 Arquivo XML recebido:', req.file.originalname);

        const filePath = req.file.path;

        // Valida XML SAF-T
        const validation = await XMLParser.validateSAFT(filePath);
        
        if (!validation.valid) {
            await fs.remove(filePath);
            return res.status(400).json({
                success: false,
                message: 'Arquivo XML inválido',
                errors: validation.errors
            });
        }

        // Extrai cabeçalho
        const header = await XMLParser.extractHeader(filePath);

        // Extrai faturas
        const invoices = await XMLParser.extractInvoices(filePath);

        // Salva faturas no serviço
        const savedInvoices = [];
        for (const invoice of invoices) {
            try {
                const saved = await InvoiceService.createInvoice({
                    nomeCliente: invoice.nomeCliente,
                    numeroFatura: invoice.numeroFatura,
                    nifAdquirente: invoice.nifCliente,
                    nifEmitente: header.nifEmpresa,
                    data: invoice.data,
                    tipoDocumento: invoice.tipo,
                    valorBase: invoice.valorBase,
                    valorIVA: invoice.valorIVA,
                    valorTotal: invoice.valorTotal,
                    status: invoice.status,
                    rawQRContent: '', // Não veio de QR
                    origem: 'XML SAF-T'
                });
                savedInvoices.push(saved);
            } catch (error) {
                console.warn('⚠️  Erro ao salvar fatura:', invoice.numeroFatura, error.message);
            }
        }

        // Remove arquivo temporário
        await fs.remove(filePath);

        res.json({
            success: true,
            message: `${savedInvoices.length} fatura(s) importada(s) com sucesso`,
            data: {
                header,
                invoicesCount: invoices.length,
                savedCount: savedInvoices.length,
                invoices: savedInvoices
            }
        });

    } catch (error) {
        console.error('❌ Erro ao processar XML:', error);
        
        // Remove arquivo em caso de erro
        if (req.file && req.file.path) {
            await fs.remove(req.file.path).catch(() => {});
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao processar arquivo XML',
            error: error.message
        });
    }
});

/**
 * POST /api/files/upload/csv
 * Upload e processamento de arquivo CSV
 */
router.post('/upload/csv', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo foi enviado'
            });
        }

        console.log('📤 Arquivo CSV recebido:', req.file.originalname);

        const filePath = req.file.path;
        const { delimiter = ',', mapping } = req.body;

        // Parsea mapeamento se fornecido
        let columnMapping = null;
        if (mapping) {
            try {
                columnMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
            } catch (error) {
                console.warn('⚠️  Erro ao parsear mapeamento, usando padrão');
            }
        }

        // Extrai faturas do CSV
        const invoices = await CSVParser.extractInvoices(filePath, columnMapping);

        // Salva faturas no serviço
        const savedInvoices = [];
        for (const invoice of invoices) {
            try {
                const saved = await InvoiceService.createInvoice({
                    nomeCliente: invoice.nomeCliente || '',
                    numeroFatura: invoice.numeroFatura || '',
                    nifAdquirente: invoice.nifCliente || '',
                    data: invoice.data || new Date().toISOString().split('T')[0],
                    tipoDocumento: invoice.tipo || 'Fatura',
                    valorTotal: invoice.valorTotal || 0,
                    status: 'pendente',
                    rawQRContent: '',
                    origem: 'CSV'
                });
                savedInvoices.push(saved);
            } catch (error) {
                console.warn('⚠️  Erro ao salvar fatura:', invoice.numeroFatura, error.message);
            }
        }

        // Remove arquivo temporário
        await fs.remove(filePath);

        res.json({
            success: true,
            message: `${savedInvoices.length} fatura(s) importada(s) com sucesso`,
            data: {
                invoicesCount: invoices.length,
                savedCount: savedInvoices.length,
                invoices: savedInvoices
            }
        });

    } catch (error) {
        console.error('❌ Erro ao processar CSV:', error);
        
        // Remove arquivo em caso de erro
        if (req.file && req.file.path) {
            await fs.remove(req.file.path).catch(() => {});
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao processar arquivo CSV',
            error: error.message
        });
    }
});

/**
 * POST /api/files/validate/xml
 * Valida arquivo XML SAF-T sem importar
 */
router.post('/validate/xml', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo foi enviado'
            });
        }

        const filePath = req.file.path;

        // Valida XML
        const validation = await XMLParser.validateSAFT(filePath);

        // Extrai informações básicas
        let header = null;
        let invoiceCount = 0;

        if (validation.valid) {
            try {
                header = await XMLParser.extractHeader(filePath);
                const invoices = await XMLParser.extractInvoices(filePath);
                invoiceCount = invoices.length;
            } catch (error) {
                console.warn('⚠️  Erro ao extrair informações:', error.message);
            }
        }

        // Remove arquivo
        await fs.remove(filePath);

        res.json({
            success: validation.valid,
            validation,
            header,
            invoiceCount
        });

    } catch (error) {
        console.error('❌ Erro ao validar XML:', error);
        
        if (req.file && req.file.path) {
            await fs.remove(req.file.path).catch(() => {});
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao validar arquivo XML',
            error: error.message
        });
    }
});

/**
 * GET /api/files/export/csv
 * Exporta faturas para CSV
 */
router.get('/export/csv', async (req, res) => {
    try {
        const { status, dataInicio, dataFim } = req.query;

        // Busca faturas com filtros
        const invoices = await InvoiceService.getInvoices({
            status,
            dataInicio,
            dataFim,
            limit: 10000 // Sem limite para exportação
        });

        if (invoices.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhuma fatura encontrada para exportar'
            });
        }

        // Prepara dados para CSV
        const csvData = invoices.data.map(invoice => ({
            'Número Fatura': invoice.numeroFatura,
            'Data': invoice.data,
            'Cliente': invoice.nomeCliente,
            'NIF Cliente': invoice.nifAdquirente,
            'NIF Emitente': invoice.nifEmitente,
            'Tipo': invoice.tipoDocumento,
            'Valor Base': invoice.valorBase,
            'IVA': invoice.valorIVA,
            'Total': invoice.valorTotal,
            'Status': invoice.status,
            'Criado em': invoice.createdAt
        }));

        // Gera nome do arquivo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `faturas_${timestamp}.csv`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);

        // Exporta para CSV
        await CSVParser.exportToCSV(csvData, filePath, {
            encoding: 'utf8',
            includeHeaders: true
        });

        // Envia arquivo
        res.download(filePath, fileName, async (err) => {
            // Remove arquivo após download
            await fs.remove(filePath).catch(() => {});
            
            if (err) {
                console.error('❌ Erro ao enviar arquivo:', err);
            }
        });

    } catch (error) {
        console.error('❌ Erro ao exportar CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao exportar faturas',
            error: error.message
        });
    }
});

module.exports = router;

