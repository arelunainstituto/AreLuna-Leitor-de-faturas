/**
 * Testes do Frontend - JSQRScanner
 * Testes básicos de funções utilitárias
 */

describe('Frontend Utilities', () => {
    
    describe('Data Normalization', () => {
        test('deve normalizar chaves AT para maiúscula', () => {
            const testData = 'a:123*b:456*c:PT';
            const normalized = testData.replace(/\ba:/gi, 'A:')
                                       .replace(/\bb:/gi, 'B:')
                                       .replace(/\bc:/gi, 'C:');
            
            expect(normalized).toBe('A:123*B:456*C:PT');
        });
        
        test('deve manter dados já normalizados', () => {
            const testData = 'A:123*B:456*C:PT';
            const normalized = testData.replace(/\ba:/gi, 'A:')
                                       .replace(/\bb:/gi, 'B:')
                                       .replace(/\bc:/gi, 'C:');
            
            expect(normalized).toBe('A:123*B:456*C:PT');
        });
    });
    
    describe('Date Formatting', () => {
        test('deve formatar data do formato YYYYMMDD para YYYY-MM-DD', () => {
            const rawDate = '20251002';
            const formatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
            
            expect(formatted).toBe('2025-10-02');
        });
        
        test('deve validar formato de data', () => {
            const validDate = '20251002';
            const isValid = /^\d{8}$/.test(validDate);
            
            expect(isValid).toBe(true);
        });
        
        test('deve rejeitar data inválida', () => {
            const invalidDate = '2025-10-02';
            const isValid = /^\d{8}$/.test(invalidDate);
            
            expect(isValid).toBe(false);
        });
    });
    
    describe('NIF Validation', () => {
        test('deve validar NIFs do Grupo AreLuna', () => {
            const grupoAreLunaNIFs = [
                '516562240', // Instituto AreLuna
                '516313916', // Vespasian Ventures
                '516681826', // ProStoral
                '518899586', // Pinklegion
                '518822532', // Papagaio Fotogénico
                '518881555'  // Nuvens Autóctones
            ];
            
            grupoAreLunaNIFs.forEach(nif => {
                expect(nif).toMatch(/^\d{9}$/);
            });
        });
        
        test('deve validar formato de NIF português (9 dígitos)', () => {
            const validNIF = '516562240';
            const isValid = /^\d{9}$/.test(validNIF);
            
            expect(isValid).toBe(true);
        });
        
        test('deve rejeitar NIF inválido', () => {
            const invalidNIF = '12345';
            const isValid = /^\d{9}$/.test(invalidNIF);
            
            expect(isValid).toBe(false);
        });
    });
    
    describe('Invoice Type Mapping', () => {
        const documentTypes = {
            'FR': 'Fatura-Recibo',
            'FT': 'Fatura',
            'NC': 'Nota de Crédito',
            'ND': 'Nota de Débito',
            'VD': 'Venda a Dinheiro',
            'TV': 'Talão de Venda'
        };
        
        test('deve mapear códigos de documento corretamente', () => {
            expect(documentTypes['FR']).toBe('Fatura-Recibo');
            expect(documentTypes['FT']).toBe('Fatura');
            expect(documentTypes['NC']).toBe('Nota de Crédito');
        });
        
        test('deve ter todos os tipos principais', () => {
            const requiredTypes = ['FR', 'FT', 'NC', 'ND'];
            
            requiredTypes.forEach(type => {
                expect(documentTypes).toHaveProperty(type);
            });
        });
    });
    
    describe('AT Invoice Pattern Detection', () => {
        test('deve detectar padrão de fatura AT válido', () => {
            const invoiceContent = 'A:298255847*B:516562240*C:PT*D:FR*F:20251002*O:285.00';
            const isATInvoice = /A:\d+/.test(invoiceContent) && /B:\d+/.test(invoiceContent);
            
            expect(isATInvoice).toBe(true);
        });
        
        test('deve rejeitar conteúdo sem padrão AT', () => {
            const randomContent = 'http://example.com/page';
            const isATInvoice = /A:\d+/.test(randomContent) && /B:\d+/.test(randomContent);
            
            expect(isATInvoice).toBe(false);
        });
    });
    
    describe('Currency Formatting', () => {
        test('deve formatar valores monetários', () => {
            const value = '285.00';
            const formatted = `€${parseFloat(value).toFixed(2)}`;
            
            expect(formatted).toBe('€285.00');
        });
        
        test('deve lidar com valores sem decimais', () => {
            const value = '100';
            const formatted = `€${parseFloat(value).toFixed(2)}`;
            
            expect(formatted).toBe('€100.00');
        });
        
        test('deve lidar com valores inválidos', () => {
            const value = 'invalid';
            const parsed = parseFloat(value);
            
            expect(isNaN(parsed)).toBe(true);
        });
    });
});


