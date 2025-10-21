# 🔤 Guia de Encoding UTF-8 e Importação de Arquivos

**Versão:** 1.0.0  
**Data:** 20 de Outubro de 2025  
**Status:** ✅ Implementado

---

## 📋 Visão Geral

Este documento descreve as soluções implementadas para corrigir problemas de encoding de caracteres (acentos e símbolos especiais) no backend Node.js/Express.

---

## 🎯 Problema Resolvido

### Antes:
```
"MEDICINA DENT�RIA AVAN�ADA"  ❌
"Servi�os de Contabilidade"  ❌
"Constru��o Civil"            ❌
```

### Depois:
```
"MEDICINA DENTÁRIA AVANÇADA"  ✅
"Serviços de Contabilidade"   ✅
"Construção Civil"             ✅
```

---

## 🛠️ Soluções Implementadas

### 1. **Middleware UTF-8 no Express**

Arquivo: `server.js`

```javascript
// Middleware para forçar UTF-8 em todas as respostas
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));
```

**Benefícios:**
- ✅ Todas as respostas JSON incluem `charset=utf-8`
- ✅ Dados recebidos são interpretados como UTF-8
- ✅ Previne corrupção de caracteres nas APIs

---

### 2. **Utilitário de Encoding**

Arquivo: `utils/encoding.js`

#### Funções Disponíveis:

##### `fixBrokenEncoding(text)`
Corrige strings que foram lidas com encoding incorreto:

```javascript
const { fixBrokenEncoding } = require('./utils/encoding');

const corrompido = "MEDICINA DENT�RIA";
const corrigido = fixBrokenEncoding(corrompido);
// Resultado: "MEDICINA DENTÁRIA"
```

##### `latin1ToUtf8(data)`
Converte dados de ISO-8859-1 (Latin1) para UTF-8:

```javascript
const { latin1ToUtf8 } = require('./utils/encoding');

const buffer = fs.readFileSync('arquivo_latin1.txt');
const textoUtf8 = latin1ToUtf8(buffer);
```

##### `autoFixEncoding(data)`
Detecta e corrige automaticamente o encoding:

```javascript
const { autoFixEncoding } = require('./utils/encoding');

const texto = autoFixEncoding(dadosDesconhecidos);
```

##### `readFileWithEncoding(filePath, encoding)`
Lê arquivo com tratamento automático de encoding:

```javascript
const { readFileWithEncoding } = require('./utils/encoding');

const conteudo = await readFileWithEncoding('fatura.xml');
// Tenta UTF-8, depois Latin1 se necessário
```

##### `hasEncodingIssues(text)`
Detecta se uma string tem problemas de encoding:

```javascript
const { hasEncodingIssues } = require('./utils/encoding');

if (hasEncodingIssues(texto)) {
    texto = fixBrokenEncoding(texto);
}
```

##### `fixObjectEncoding(obj)`
Corrige encoding recursivamente em objetos/arrays:

```javascript
const { fixObjectEncoding } = require('./utils/encoding');

const dados = {
    nome: "Servi�os",
    itens: ["Constru��o", "Repara��o"]
};

const dadosCorrigidos = fixObjectEncoding(dados);
// {
//   nome: "Serviços",
//   itens: ["Construção", "Reparação"]
// }
```

---

### 3. **Parser de XML SAF-T**

Arquivo: `services/XMLParser.js`

#### Funcionalidades:

##### Processar XML com encoding correto:
```javascript
const XMLParser = require('./services/XMLParser');

// Parse XML com correção automática
const dados = await XMLParser.parseXML('saft.xml');

// Extrair faturas
const faturas = await XMLParser.extractInvoices('saft.xml');

// Extrair cabeçalho
const header = await XMLParser.extractHeader('saft.xml');

// Validar XML SAF-T
const validacao = await XMLParser.validateSAFT('saft.xml');
```

**Características:**
- ✅ Leitura automática com UTF-8
- ✅ Fallback para Latin1 se necessário
- ✅ Correção de encoding em todos os campos
- ✅ Suporte para SAF-T versões 1.03_01 e 1.04_01

---

### 4. **Parser de CSV**

Arquivo: `services/CSVParser.js`

#### Funcionalidades:

##### Processar CSV com encoding correto:
```javascript
const CSVParser = require('./services/CSVParser');

// Parse CSV com detecção automática de encoding
const dados = await CSVParser.parseCSVAuto('faturas.csv');

// Parse com encoding específico
const dados = await CSVParser.parseCSV('faturas.csv', {
    encoding: 'latin1',
    delimiter: ';'
});

// Extrair faturas
const faturas = await CSVParser.extractInvoices('faturas.csv');

// Exportar para CSV
await CSVParser.exportToCSV(dados, 'saida.csv', {
    encoding: 'utf8'
});
```

**Características:**
- ✅ Detecção automática de encoding (UTF-8 ou Latin1)
- ✅ Suporte a diferentes delimitadores (`,` `;` `|`)
- ✅ Correção automática de caracteres
- ✅ Parsing de números com formato português (1.234,56)

---

## 🌐 API Endpoints

### Upload de XML SAF-T

**POST** `/api/files/upload/xml`

```bash
curl -X POST http://localhost:3030/api/files/upload/xml \
  -F "file=@saft.xml"
```

**Resposta:**
```json
{
  "success": true,
  "message": "15 fatura(s) importada(s) com sucesso",
  "data": {
    "header": {
      "nomeEmpresa": "MEDICINA DENTÁRIA AVANÇADA",
      "nifEmpresa": "123456789",
      "anoFiscal": "2024"
    },
    "invoicesCount": 15,
    "savedCount": 15,
    "invoices": [...]
  }
}
```

---

### Upload de CSV

**POST** `/api/files/upload/csv`

```bash
curl -X POST http://localhost:3030/api/files/upload/csv \
  -F "file=@faturas.csv" \
  -F "delimiter=;"
```

**Com mapeamento de colunas:**
```bash
curl -X POST http://localhost:3030/api/files/upload/csv \
  -F "file=@faturas.csv" \
  -F 'mapping={"numeroFatura":["Num"],"nomeCliente":["Cliente"]}'
```

---

### Validar XML

**POST** `/api/files/validate/xml`

```bash
curl -X POST http://localhost:3030/api/files/validate/xml \
  -F "file=@saft.xml"
```

**Resposta:**
```json
{
  "success": true,
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "version": "1.04_01"
  },
  "header": {...},
  "invoiceCount": 15
}
```

---

### Exportar para CSV

**GET** `/api/files/export/csv`

```bash
# Exportar todas as faturas
curl -O http://localhost:3030/api/files/export/csv

# Com filtros
curl -O "http://localhost:3030/api/files/export/csv?status=pago&dataInicio=2024-01-01"
```

---

## 🗄️ PostgreSQL UTF-8

### Verificar Encoding do Banco:

```sql
SHOW SERVER_ENCODING;
-- Deve retornar: UTF8
```

### Criar Banco com UTF-8:

```sql
CREATE DATABASE faturas
  WITH ENCODING 'UTF8'
  LC_COLLATE = 'pt_PT.UTF-8'
  LC_CTYPE = 'pt_PT.UTF-8'
  TEMPLATE = template0;
```

### Verificar Encoding de Tabela:

```sql
SELECT pg_encoding_to_char(encoding) 
FROM pg_database 
WHERE datname = 'faturas';
```

---

## 🧪 Testes

### Teste 1: Upload de XML com Acentos

```bash
# Criar arquivo de teste
cat > test_saft.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<AuditFile>
  <Header>
    <CompanyName>MEDICINA DENTÁRIA AVANÇADA</CompanyName>
  </Header>
</AuditFile>
EOF

# Upload
curl -X POST http://localhost:3030/api/files/upload/xml \
  -F "file=@test_saft.xml"

# Verificar resposta (deve conter acentos corretos)
```

### Teste 2: CSV com Caracteres Especiais

```bash
# Criar CSV de teste
cat > test.csv << 'EOF'
Numero,Cliente,Valor
FT001,João da Silva,100.50
FT002,María José,200.75
FT003,Construção Civil Ltda,300.00
EOF

# Upload
curl -X POST http://localhost:3030/api/files/upload/csv \
  -F "file=@test.csv"
```

### Teste 3: Correção de String Corrompida

```javascript
const { fixBrokenEncoding } = require('./utils/encoding');

// Teste
const corrompido = "Constru��o";
const corrigido = fixBrokenEncoding(corrompido);

console.assert(corrigido === "Construção", "Correção falhou!");
```

---

## 🚨 Troubleshooting

### Problema: Caracteres ainda aparecem corrompidos

**Solução 1:** Verificar encoding do arquivo fonte

```bash
file -i arquivo.xml
# Deve mostrar: text/xml; charset=utf-8
```

**Solução 2:** Converter arquivo para UTF-8

```bash
iconv -f ISO-8859-1 -t UTF-8 arquivo_latin1.xml > arquivo_utf8.xml
```

**Solução 3:** Usar função de correção

```javascript
const { autoFixEncoding } = require('./utils/encoding');
const corrigido = autoFixEncoding(dadosCorrompidos);
```

---

### Problema: CSV não importa corretamente

**Verificar:**
1. Delimitador correto (`,` `;` `|`)
2. Encoding do arquivo
3. Mapeamento de colunas

**Solução:**
```bash
# Especificar delimitador
curl -X POST http://localhost:3030/api/files/upload/csv \
  -F "file=@faturas.csv" \
  -F "delimiter=;"

# Com mapeamento custom
curl -X POST http://localhost:3030/api/files/upload/csv \
  -F "file=@faturas.csv" \
  -F 'mapping={"numeroFatura":["Numero","Num","Invoice"]}'
```

---

### Problema: PostgreSQL retorna encoding errado

**Verificar variáveis de ambiente:**
```bash
echo $LANG
echo $LC_ALL
# Devem conter UTF-8 (ex: en_US.UTF-8)
```

**Configurar se necessário:**
```bash
export LANG=pt_PT.UTF-8
export LC_ALL=pt_PT.UTF-8
```

---

## 📚 Referências

### Padrões de Encoding:
- UTF-8: Padrão universal, suporta todos os caracteres
- ISO-8859-1 (Latin1): Usado em sistemas antigos, suporta caracteres portugueses
- Windows-1252: Variante do Latin1 usada no Windows

### Bibliotecas Utilizadas:
- `iconv-lite`: Conversão entre encodings
- `csv-parser`: Parsing de CSV com suporte a encoding
- `xml2js`: Parsing de XML com UTF-8

### Documentação Externa:
- [Node.js Buffer Encoding](https://nodejs.org/api/buffer.html#buffers-and-character-encodings)
- [iconv-lite Documentation](https://github.com/ashtuchkin/iconv-lite)
- [SAF-T PT Specification](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/SAFT_PT/)

---

## ✅ Checklist de Implementação

- [x] Middleware UTF-8 no Express
- [x] Utilitário de encoding completo
- [x] Parser de XML SAF-T
- [x] Parser de CSV
- [x] Rotas de upload e validação
- [x] Exportação para CSV
- [x] Documentação completa
- [x] Testes de encoding

---

## 🎉 Resultado Final

**Antes:**
- ❌ Acentos corrompidos
- ❌ Símbolos especiais quebrados
- ❌ Importação de XML/CSV falhando

**Depois:**
- ✅ Encoding UTF-8 em todo o fluxo
- ✅ Correção automática de strings corrompidas
- ✅ Suporte completo a XML SAF-T e CSV
- ✅ Detecção automática de encoding
- ✅ Validação e exportação funcionando perfeitamente

---

**📧 Suporte:** Para dúvidas ou problemas, consulte a documentação ou entre em contato.

