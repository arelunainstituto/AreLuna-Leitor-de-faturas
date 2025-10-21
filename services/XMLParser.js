/**
 * Serviço para parsing de arquivos XML SAF-T (Sistema de Arquivos Fiscais em formato XML)
 * Garante encoding UTF-8 correto
 */

const xml2js = require('xml2js');
const { readFileWithEncoding, autoFixEncoding, fixObjectEncoding } = require('../utils/encoding');
const fs = require('fs').promises;

class XMLParser {
    constructor() {
        this.parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            normalize: true,
            normalizeTags: false,  // Mantém case original das tags
            trim: true
        });
    }

    /**
     * Processa arquivo XML SAF-T
     * @param {string} filePath - Caminho do arquivo XML
     * @returns {Promise<Object>} Dados parseados
     */
    async parseXML(filePath) {
        try {
            console.log('📄 Lendo arquivo XML:', filePath);
            
            const fs = require('fs').promises;
            const iconv = require('iconv-lite');
            
            // Lê o arquivo como buffer primeiro
            const buffer = await fs.readFile(filePath);
            
            // Tenta detectar o encoding pela declaração XML
            const sample = buffer.slice(0, 200).toString('utf8');
            let encoding = 'utf8';
            
            // Verifica a declaração XML para encoding
            const encodingMatch = sample.match(/encoding=["']([^"']+)["']/i);
            if (encodingMatch) {
                encoding = encodingMatch[1].toLowerCase();
                console.log(`📌 Encoding detectado no XML: ${encoding}`);
                
                // Normaliza nomes de encoding
                if (encoding === 'iso-8859-1' || encoding === 'latin1') {
                    encoding = 'latin1';
                } else if (encoding === 'utf-8') {
                    encoding = 'utf8';
                }
            }
            
            // Decodifica com o encoding correto
            let xmlContent;
            if (encoding === 'latin1') {
                xmlContent = iconv.decode(buffer, 'latin1');
                console.log('🔄 Convertendo de Latin1 para UTF-8');
            } else {
                xmlContent = buffer.toString('utf8');
            }
            
            console.log('🔍 Parseando XML...');
            
            // Parsea XML
            const result = await this.parser.parseStringPromise(xmlContent);
            
            // Corrige encoding em todo o objeto (caso ainda tenha problemas)
            const fixedResult = fixObjectEncoding(result);
            
            console.log('✅ XML parseado com sucesso');
            
            return fixedResult;
            
        } catch (error) {
            console.error('❌ Erro ao parsear XML:', error.message);
            throw new Error(`Falha ao processar XML: ${error.message}`);
        }
    }

    /**
     * Extrai faturas do XML SAF-T
     * @param {string} filePath - Caminho do arquivo XML
     * @returns {Promise<Array>} Lista de faturas
     */
    async extractInvoices(filePath) {
        try {
            const data = await this.parseXML(filePath);
            
            // Navega na estrutura SAF-T
            const sourceDocuments = data?.AuditFile?.SourceDocuments;
            
            if (!sourceDocuments) {
                throw new Error('Estrutura SAF-T inválida: SourceDocuments não encontrado');
            }
            
            // Extrai faturas (SalesInvoices)
            const salesInvoices = sourceDocuments.SalesInvoices?.Invoice;
            
            if (!salesInvoices) {
                console.warn('⚠️  Nenhuma fatura encontrada no XML');
                return [];
            }
            
            // Normaliza para array
            const invoices = Array.isArray(salesInvoices) ? salesInvoices : [salesInvoices];
            
            console.log(`📊 ${invoices.length} fatura(s) extraída(s)`);
            
            // Mapeia para formato padronizado
            return invoices.map(invoice => this.normalizeInvoice(invoice));
            
        } catch (error) {
            console.error('❌ Erro ao extrair faturas:', error.message);
            throw error;
        }
    }

    /**
     * Normaliza dados da fatura
     * @param {Object} invoice - Dados brutos da fatura
     * @returns {Object} Fatura normalizada
     */
    normalizeInvoice(invoice) {
        return {
            numeroFatura: autoFixEncoding(invoice.InvoiceNo || ''),
            data: invoice.InvoiceDate || '',
            tipo: autoFixEncoding(invoice.InvoiceType || ''),
            status: autoFixEncoding(invoice.InvoiceStatus?.InvoiceStatusDate ? 'Normal' : 'Anulado'),
            
            // Cliente
            nomeCliente: autoFixEncoding(invoice.CustomerName || ''),
            nifCliente: invoice.CustomerTaxID || '',
            moradaCliente: autoFixEncoding(invoice.BillTo?.AddressDetail || ''),
            
            // Valores
            valorBase: parseFloat(invoice.DocumentTotals?.TaxPayable || 0),
            valorIVA: parseFloat(invoice.DocumentTotals?.GrossTotal || 0) - 
                      parseFloat(invoice.DocumentTotals?.TaxPayable || 0),
            valorTotal: parseFloat(invoice.DocumentTotals?.GrossTotal || 0),
            
            // Linhas
            linhas: this.extractLines(invoice.Line),
            
            // Metadados
            hash: invoice.Hash || '',
            hashControl: invoice.HashControl || '',
            periodo: invoice.Period || '',
            
            // Dados originais (para debug)
            rawData: invoice
        };
    }

    /**
     * Extrai linhas da fatura
     * @param {Object|Array} lines - Linhas da fatura
     * @returns {Array} Linhas normalizadas
     */
    extractLines(lines) {
        if (!lines) return [];
        
        const linesArray = Array.isArray(lines) ? lines : [lines];
        
        return linesArray.map(line => ({
            numero: line.LineNumber || '',
            descricao: autoFixEncoding(line.Description || ''),
            quantidade: parseFloat(line.Quantity || 0),
            precoUnitario: parseFloat(line.UnitPrice || 0),
            desconto: parseFloat(line.SettlementAmount || 0),
            taxaIVA: parseFloat(line.Tax?.TaxPercentage || 0),
            total: parseFloat(line.CreditAmount || line.DebitAmount || 0)
        }));
    }

    /**
     * Extrai dados do cabeçalho SAF-T
     * @param {string} filePath - Caminho do arquivo XML
     * @returns {Promise<Object>} Dados do cabeçalho
     */
    async extractHeader(filePath) {
        try {
            const data = await this.parseXML(filePath);
            
            const header = data?.AuditFile?.Header;
            
            if (!header) {
                throw new Error('Cabeçalho SAF-T não encontrado');
            }
            
            return {
                auditFileVersion: header.AuditFileVersion || '',
                companyID: header.CompanyID || '',
                nomeEmpresa: autoFixEncoding(header.CompanyName || ''),
                nifEmpresa: header.TaxRegistrationNumber || '',
                moradaEmpresa: autoFixEncoding(header.CompanyAddress?.AddressDetail || ''),
                anoFiscal: header.FiscalYear || '',
                dataInicio: header.StartDate || '',
                dataFim: header.EndDate || '',
                moeda: header.CurrencyCode || 'EUR',
                dataProducao: header.DateCreated || '',
                software: autoFixEncoding(header.SoftwareName || ''),
                versaoSoftware: header.SoftwareVersion || ''
            };
            
        } catch (error) {
            console.error('❌ Erro ao extrair cabeçalho:', error.message);
            throw error;
        }
    }

    /**
     * Valida arquivo XML SAF-T
     * @param {string} filePath - Caminho do arquivo XML
     * @returns {Promise<Object>} Resultado da validação
     */
    async validateSAFT(filePath) {
        try {
            const data = await this.parseXML(filePath);
            
            const errors = [];
            const warnings = [];
            
            // Valida estrutura básica
            if (!data?.AuditFile) {
                errors.push('Estrutura SAF-T inválida: AuditFile não encontrado');
            }
            
            if (!data?.AuditFile?.Header) {
                errors.push('Cabeçalho (Header) não encontrado');
            }
            
            if (!data?.AuditFile?.SourceDocuments) {
                warnings.push('SourceDocuments não encontrado');
            }
            
            // Valida versão
            const version = data?.AuditFile?.Header?.AuditFileVersion;
            if (version && !['1.04_01', '1.03_01'].includes(version)) {
                warnings.push(`Versão SAF-T não standard: ${version}`);
            }
            
            return {
                valid: errors.length === 0,
                errors,
                warnings,
                version
            };
            
        } catch (error) {
            return {
                valid: false,
                errors: [`Erro ao validar: ${error.message}`],
                warnings: []
            };
        }
    }
}

module.exports = new XMLParser();

