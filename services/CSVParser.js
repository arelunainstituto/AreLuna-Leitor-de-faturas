/**
 * Serviço para parsing de arquivos CSV
 * Garante encoding UTF-8 correto
 */

const fs = require('fs');
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const { autoFixEncoding, fixObjectEncoding, hasEncodingIssues } = require('../utils/encoding');

class CSVParser {
    /**
     * Processa arquivo CSV com encoding correto
     * @param {string} filePath - Caminho do arquivo CSV
     * @param {Object} options - Opções de parsing
     * @returns {Promise<Array>} Dados do CSV
     */
    async parseCSV(filePath, options = {}) {
        const {
            delimiter = ',',
            encoding = 'utf8',
            headers = true,
            skipEmptyLines = true
        } = options;

        return new Promise((resolve, reject) => {
            const results = [];
            
            try {
                console.log('📄 Lendo arquivo CSV:', filePath);
                
                // Cria stream com detecção automática de encoding
                const stream = fs.createReadStream(filePath)
                    .pipe(iconv.decodeStream(encoding))
                    .pipe(csv({
                        separator: delimiter,
                        skipLines: 0,
                        headers: headers,
                        mapHeaders: ({ header }) => header.trim(),
                        mapValues: ({ value }) => autoFixEncoding(value.trim())
                    }));

                stream
                    .on('data', (row) => {
                        // Corrige encoding de cada linha
                        const fixedRow = fixObjectEncoding(row);
                        
                        // Pula linhas vazias se necessário
                        if (skipEmptyLines && this.isEmptyRow(fixedRow)) {
                            return;
                        }
                        
                        results.push(fixedRow);
                    })
                    .on('end', () => {
                        console.log(`✅ CSV parseado com sucesso: ${results.length} linha(s)`);
                        resolve(results);
                    })
                    .on('error', (error) => {
                        console.error('❌ Erro ao parsear CSV:', error.message);
                        reject(new Error(`Falha ao processar CSV: ${error.message}`));
                    });
                    
            } catch (error) {
                console.error('❌ Erro ao abrir CSV:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Tenta detectar automaticamente o encoding do CSV
     * @param {string} filePath - Caminho do arquivo
     * @returns {Promise<string>} Encoding detectado
     */
    async detectEncoding(filePath) {
        return new Promise((resolve, reject) => {
            const buffer = Buffer.alloc(4096);
            
            fs.open(filePath, 'r', (err, fd) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                fs.read(fd, buffer, 0, 4096, 0, (err, bytesRead) => {
                    fs.close(fd, () => {});
                    
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    const sample = buffer.slice(0, bytesRead).toString('utf8');
                    
                    // Verifica se tem problemas de encoding
                    if (hasEncodingIssues(sample)) {
                        console.log('🔍 Detectado encoding não-UTF8, usando latin1');
                        resolve('latin1');
                    } else {
                        console.log('✅ Detectado encoding UTF-8');
                        resolve('utf8');
                    }
                });
            });
        });
    }

    /**
     * Processa CSV com detecção automática de encoding
     * @param {string} filePath - Caminho do arquivo
     * @param {Object} options - Opções de parsing
     * @returns {Promise<Array>} Dados do CSV
     */
    async parseCSVAuto(filePath, options = {}) {
        try {
            // Tenta detectar encoding
            const encoding = await this.detectEncoding(filePath);
            console.log(`📊 Usando encoding: ${encoding}`);
            
            // Parsea com encoding detectado
            return await this.parseCSV(filePath, { ...options, encoding });
            
        } catch (error) {
            console.error('❌ Erro ao processar CSV:', error.message);
            
            // Fallback: tenta com UTF-8
            console.log('🔄 Tentando com UTF-8 como fallback...');
            return await this.parseCSV(filePath, { ...options, encoding: 'utf8' });
        }
    }

    /**
     * Extrai faturas de um CSV
     * @param {string} filePath - Caminho do arquivo
     * @param {Object} mapping - Mapeamento de colunas
     * @returns {Promise<Array>} Lista de faturas
     */
    async extractInvoices(filePath, mapping = null) {
        try {
            const data = await this.parseCSVAuto(filePath);
            
            // Mapeamento padrão de colunas (pode ser customizado)
            const defaultMapping = {
                numeroFatura: ['Numero', 'NumeroFatura', 'Invoice', 'InvoiceNo'],
                data: ['Data', 'Date', 'DataFatura'],
                nomeCliente: ['Cliente', 'Customer', 'NomeCliente', 'CustomerName'],
                nifCliente: ['NIF', 'TaxID', 'NIPC'],
                valorTotal: ['Total', 'Valor', 'ValorTotal', 'Amount'],
                tipo: ['Tipo', 'Type', 'TipoDocumento']
            };
            
            const columnMapping = mapping || defaultMapping;
            
            return data.map(row => this.normalizeInvoice(row, columnMapping));
            
        } catch (error) {
            console.error('❌ Erro ao extrair faturas do CSV:', error.message);
            throw error;
        }
    }

    /**
     * Normaliza linha do CSV para formato de fatura
     * @param {Object} row - Linha do CSV
     * @param {Object} mapping - Mapeamento de colunas
     * @returns {Object} Fatura normalizada
     */
    normalizeInvoice(row, mapping) {
        const invoice = {};
        
        // Para cada campo esperado, procura no row usando o mapping
        for (const [field, possibleNames] of Object.entries(mapping)) {
            const names = Array.isArray(possibleNames) ? possibleNames : [possibleNames];
            
            for (const name of names) {
                if (row[name] !== undefined) {
                    invoice[field] = row[name];
                    break;
                }
            }
        }
        
        // Converte valores numéricos
        if (invoice.valorTotal) {
            invoice.valorTotal = this.parseNumber(invoice.valorTotal);
        }
        
        return invoice;
    }

    /**
     * Parsea número considerando formato português (vírgula decimal)
     * @param {string} value - Valor a parsear
     * @returns {number} Número parseado
     */
    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        
        // Remove espaços e símbolos de moeda
        let cleaned = value.toString()
            .replace(/[€$\s]/g, '')
            .trim();
        
        // Detecta formato: se tem ponto E vírgula, vírgula é decimal
        if (cleaned.includes('.') && cleaned.includes(',')) {
            // Formato: 1.234,56
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (cleaned.includes(',')) {
            // Formato: 1234,56
            cleaned = cleaned.replace(',', '.');
        }
        
        return parseFloat(cleaned) || 0;
    }

    /**
     * Verifica se uma linha está vazia
     * @param {Object} row - Linha a verificar
     * @returns {boolean} True se vazia
     */
    isEmptyRow(row) {
        if (!row || typeof row !== 'object') return true;
        
        return Object.values(row).every(value => 
            !value || value.toString().trim() === ''
        );
    }

    /**
     * Exporta dados para CSV
     * @param {Array} data - Dados a exportar
     * @param {string} filePath - Caminho do arquivo de saída
     * @param {Object} options - Opções de exportação
     * @returns {Promise<void>}
     */
    async exportToCSV(data, filePath, options = {}) {
        const {
            delimiter = ',',
            includeHeaders = true,
            encoding = 'utf8'
        } = options;

        return new Promise((resolve, reject) => {
            try {
                if (!data || data.length === 0) {
                    reject(new Error('Nenhum dado para exportar'));
                    return;
                }
                
                const headers = Object.keys(data[0]);
                const lines = [];
                
                // Adiciona cabeçalho
                if (includeHeaders) {
                    lines.push(headers.join(delimiter));
                }
                
                // Adiciona linhas
                data.forEach(row => {
                    const values = headers.map(header => {
                        const value = row[header] || '';
                        // Escapa valores que contêm delimitador ou quebra de linha
                        return this.escapeCSVValue(value.toString(), delimiter);
                    });
                    lines.push(values.join(delimiter));
                });
                
                const csvContent = lines.join('\n');
                
                // Escreve arquivo com encoding correto
                const buffer = iconv.encode(csvContent, encoding);
                
                fs.writeFile(filePath, buffer, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`✅ CSV exportado: ${filePath}`);
                        resolve();
                    }
                });
                
            } catch (error) {
                console.error('❌ Erro ao exportar CSV:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Escapa valor para CSV
     * @param {string} value - Valor a escapar
     * @param {string} delimiter - Delimitador usado
     * @returns {string} Valor escapado
     */
    escapeCSVValue(value, delimiter) {
        if (!value) return '';
        
        const str = value.toString();
        
        // Se contém delimitador, quebra de linha ou aspas, envolve em aspas
        if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        
        return str;
    }
}

module.exports = new CSVParser();

