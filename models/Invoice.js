/**
 * Model de Fatura
 * Representa uma fatura processada do sistema
 */

class Invoice {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.nomeCliente = data.nomeCliente || '';
        this.numeroFatura = data.numeroFatura || '';
        this.dataVencimento = data.dataVencimento || '';
        this.valor = data.valor || 0;
        this.linhaDigitavel = data.linhaDigitavel || '';
        
        // Dados AT completos
        this.nifEmitente = data.nifEmitente || '';
        this.nifAdquirente = data.nifAdquirente || '';
        this.paisEmitente = data.paisEmitente || '';
        this.paisAdquirente = data.paisAdquirente || '';
        this.dataFatura = data.dataFatura || '';
        this.tipoDocumento = data.tipoDocumento || '';
        this.codigoDocumento = data.codigoDocumento || '';
        this.total = data.total || 0;
        this.totalIVA = data.totalIVA || 0;
        this.baseTributavel = data.baseTributavel || 0;
        this.moeda = data.moeda || 'EUR';
        
        // Metadados
        this.rawQRContent = data.rawQRContent || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.status = data.status || 'pending'; // pending, processed, paid
    }
    
    generateId() {
        return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    update(data) {
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && this.hasOwnProperty(key)) {
                this[key] = data[key];
            }
        });
        this.updatedAt = new Date().toISOString();
    }
    
    toJSON() {
        return {
            id: this.id,
            nomeCliente: this.nomeCliente,
            numeroFatura: this.numeroFatura,
            dataVencimento: this.dataVencimento,
            valor: this.valor,
            linhaDigitavel: this.linhaDigitavel,
            nifEmitente: this.nifEmitente,
            nifAdquirente: this.nifAdquirente,
            paisEmitente: this.paisEmitente,
            paisAdquirente: this.paisAdquirente,
            dataFatura: this.dataFatura,
            tipoDocumento: this.tipoDocumento,
            codigoDocumento: this.codigoDocumento,
            total: this.total,
            totalIVA: this.totalIVA,
            baseTributavel: this.baseTributavel,
            moeda: this.moeda,
            rawQRContent: this.rawQRContent,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            status: this.status
        };
    }
}

module.exports = Invoice;

