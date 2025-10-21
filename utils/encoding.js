/**
 * Utilitários para correção de encoding de caracteres
 * Resolve problemas com acentos e símbolos especiais
 */

const iconv = require('iconv-lite');

/**
 * Corrige strings que foram lidas com encoding incorreto (ex: ISO-8859-1 lido como UTF-8)
 * @param {string} text - Texto com encoding corrompido
 * @returns {string} Texto corrigido
 */
function fixBrokenEncoding(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    try {
        // Tenta corrigir usando escape/unescape (para strings já corrompidas)
        return decodeURIComponent(escape(text));
    } catch (error) {
        console.warn('Erro ao corrigir encoding:', error.message);
        return text;
    }
}

/**
 * Converte texto de ISO-8859-1 (Latin1) para UTF-8
 * @param {Buffer|string} data - Dados a converter
 * @returns {string} Texto em UTF-8
 */
function latin1ToUtf8(data) {
    if (Buffer.isBuffer(data)) {
        return iconv.decode(data, 'latin1');
    }
    
    if (typeof data === 'string') {
        // Converte string para buffer assumindo latin1, depois decodifica como UTF-8
        const buffer = Buffer.from(data, 'binary');
        return iconv.decode(buffer, 'latin1');
    }
    
    return data;
}

/**
 * Detecta e corrige automaticamente o encoding de um texto
 * @param {Buffer|string} data - Dados a processar
 * @returns {string} Texto corrigido
 */
function autoFixEncoding(data) {
    if (!data) return '';
    
    // Se já é string e parece UTF-8 válido, retorna
    if (typeof data === 'string' && !hasEncodingIssues(data)) {
        return data;
    }
    
    // Se é buffer, tenta decodificar como UTF-8
    if (Buffer.isBuffer(data)) {
        try {
            const utf8Text = data.toString('utf8');
            if (!hasEncodingIssues(utf8Text)) {
                return utf8Text;
            }
        } catch (error) {
            // Falhou UTF-8, tenta Latin1
        }
        
        // Tenta Latin1
        return iconv.decode(data, 'latin1');
    }
    
    // Se é string com problemas, tenta corrigir
    if (typeof data === 'string' && hasEncodingIssues(data)) {
        return fixBrokenEncoding(data);
    }
    
    return data;
}

/**
 * Verifica se uma string tem problemas de encoding
 * @param {string} text - Texto a verificar
 * @returns {boolean} True se detectar problemas
 */
function hasEncodingIssues(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Padrões comuns de encoding corrompido
    const patterns = [
        /�/,                    // Caractere de substituição
        /Ã§/,                   // ç mal codificado
        /Ã£/,                   // ã mal codificado
        /Ã¡/,                   // á mal codificado
        /Ã©/,                   // é mal codificado
        /Ã­/,                   // í mal codificado
        /Ã³/,                   // ó mal codificado
        /Ãº/,                   // ú mal codificado
        /Ã‡/,                   // Ç mal codificado
        /â‚¬/,                  // € mal codificado
    ];
    
    return patterns.some(pattern => pattern.test(text));
}

/**
 * Corrige objeto recursivamente (útil para JSON)
 * @param {Object|Array} obj - Objeto a corrigir
 * @returns {Object|Array} Objeto com encoding corrigido
 */
function fixObjectEncoding(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        return autoFixEncoding(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => fixObjectEncoding(item));
    }
    
    if (typeof obj === 'object') {
        const fixed = {};
        for (const [key, value] of Object.entries(obj)) {
            fixed[key] = fixObjectEncoding(value);
        }
        return fixed;
    }
    
    return obj;
}

/**
 * Lê arquivo com encoding correto
 * @param {string} filePath - Caminho do arquivo
 * @param {string} encoding - Encoding esperado (padrão: 'utf8')
 * @returns {Promise<string>} Conteúdo do arquivo
 */
async function readFileWithEncoding(filePath, encoding = 'utf8') {
    const fs = require('fs').promises;
    
    try {
        // Tenta ler como UTF-8 primeiro
        const content = await fs.readFile(filePath, encoding);
        
        // Se não tem problemas, retorna
        if (!hasEncodingIssues(content)) {
            return content;
        }
        
        // Tem problemas, tenta Latin1
        const buffer = await fs.readFile(filePath);
        return iconv.decode(buffer, 'latin1');
        
    } catch (error) {
        console.error('Erro ao ler arquivo:', error.message);
        throw error;
    }
}

/**
 * Normaliza texto removendo acentos (útil para busca)
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto sem acentos
 */
function removeAccents(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Garante que uma string está em UTF-8 válido
 * @param {string} text - Texto a validar
 * @returns {string} Texto em UTF-8 válido
 */
function ensureUtf8(text) {
    if (!text || typeof text !== 'string') return text;
    
    try {
        // Converte para buffer e volta para garantir UTF-8
        const buffer = Buffer.from(text, 'utf8');
        return buffer.toString('utf8');
    } catch (error) {
        console.warn('Erro ao garantir UTF-8:', error.message);
        return text;
    }
}

module.exports = {
    fixBrokenEncoding,
    latin1ToUtf8,
    autoFixEncoding,
    hasEncodingIssues,
    fixObjectEncoding,
    readFileWithEncoding,
    removeAccents,
    ensureUtf8
};

