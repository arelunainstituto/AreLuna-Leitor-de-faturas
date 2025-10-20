# 📚 API REST - Documentação Completa

**Versão:** 1.0.0  
**Base URL:** `http://localhost:8000/api`  
**Formato:** JSON

---

## 🔗 Endpoints Disponíveis

### 1. Listar Faturas
```http
GET /api/faturas
```

**Descrição:** Retorna lista paginada de faturas com filtros opcionais.

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `status` | string | Não | Filtrar por status: `pending`, `processed`, `paid` |
| `nifAdquirente` | string | Não | Filtrar por NIF do cliente |
| `dataInicio` | date | Não | Data inicial (formato: YYYY-MM-DD) |
| `dataFim` | date | Não | Data final (formato: YYYY-MM-DD) |
| `page` | integer | Não | Número da página (padrão: 1) |
| `limit` | integer | Não | Itens por página (padrão: 10, máx: 100) |
| `sortBy` | string | Não | Campo para ordenação (padrão: `createdAt`) |
| `sortOrder` | string | Não | Ordem: `asc` ou `desc` (padrão: `desc`) |

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:8000/api/faturas?status=pending&page=1&limit=10"
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "INV-1729354812345-abc123",
      "nomeCliente": "Instituto AreLuna Medicina Dentária Avançada, Lda",
      "numeroFatura": "FT 2024/001",
      "dataVencimento": "2024-11-18",
      "valor": 285.00,
      "nifEmitente": "298255847",
      "nifAdquirente": "516562240",
      "dataFatura": "2024-10-19",
      "tipoDocumento": "Fatura-Recibo",
      "total": 285.00,
      "moeda": "EUR",
      "status": "pending",
      "createdAt": "2024-10-19T10:30:00.000Z",
      "updatedAt": "2024-10-19T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 2. Buscar Fatura por ID
```http
GET /api/faturas/:id
```

**Descrição:** Retorna uma fatura específica pelo ID.

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | ID único da fatura |

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:8000/api/faturas/INV-1729354812345-abc123"
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "INV-1729354812345-abc123",
    "nomeCliente": "Instituto AreLuna Medicina Dentária Avançada, Lda",
    "numeroFatura": "FT 2024/001",
    "dataVencimento": "2024-11-18",
    "valor": 285.00,
    "linhaDigitavel": "",
    "nifEmitente": "298255847",
    "nifAdquirente": "516562240",
    "paisEmitente": "PT",
    "paisAdquirente": "PT",
    "dataFatura": "2024-10-19",
    "tipoDocumento": "Fatura-Recibo",
    "codigoDocumento": "JJM864ZT-28",
    "total": 285.00,
    "totalIVA": 0.00,
    "baseTributavel": 285.00,
    "moeda": "EUR",
    "rawQRContent": "A:298255847*B:516562240*C:PT*D:FR*E:N*F:20241019*G:FR ATSIRE01FR/28*H:JJM864ZT-28*I:PT*J:285.00*N:0.00*O:285.00*Q:0*R:0000",
    "status": "pending",
    "createdAt": "2024-10-19T10:30:00.000Z",
    "updatedAt": "2024-10-19T10:30:00.000Z"
  }
}
```

**Erro (404 Not Found):**
```json
{
  "success": false,
  "message": "Fatura não encontrada"
}
```

---

### 3. Criar Nova Fatura
```http
POST /api/faturas
```

**Descrição:** Cria uma nova fatura no sistema (dados do QR Code ou manual).

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "nomeCliente": "Instituto AreLuna Medicina Dentária Avançada, Lda",
  "numeroFatura": "FT 2024/001",
  "dataVencimento": "2024-11-18",
  "valor": 285.00,
  "linhaDigitavel": "",
  "nifEmitente": "298255847",
  "nifAdquirente": "516562240",
  "paisEmitente": "PT",
  "paisAdquirente": "PT",
  "dataFatura": "2024-10-19",
  "tipoDocumento": "Fatura-Recibo",
  "codigoDocumento": "JJM864ZT-28",
  "total": 285.00,
  "totalIVA": 0.00,
  "baseTributavel": 285.00,
  "moeda": "EUR",
  "rawQRContent": "A:298255847*B:516562240*...",
  "status": "pending"
}
```

**Campos Obrigatórios:**
- `nomeCliente` (string)
- `numeroFatura` (string)
- `total` (number)

**Exemplo de Requisição:**
```bash
curl -X POST "http://localhost:8000/api/faturas" \
  -H "Content-Type: application/json" \
  -d '{
    "nomeCliente": "Instituto AreLuna",
    "numeroFatura": "FT 2024/001",
    "dataFatura": "2024-10-19",
    "total": 285.00,
    "status": "pending"
  }'
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "message": "Fatura criada com sucesso",
  "data": {
    "id": "INV-1729354812345-abc123",
    "nomeCliente": "Instituto AreLuna",
    "numeroFatura": "FT 2024/001",
    "...": "...",
    "createdAt": "2024-10-19T10:30:00.000Z",
    "updatedAt": "2024-10-19T10:30:00.000Z"
  }
}
```

---

### 4. Atualizar Fatura
```http
PUT /api/faturas/:id
```

**Descrição:** Atualiza uma fatura existente.

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | ID único da fatura |

**Body:** Campos a serem atualizados (mesma estrutura do POST)

**Exemplo de Requisição:**
```bash
curl -X PUT "http://localhost:8000/api/faturas/INV-1729354812345-abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "valor": 300.00
  }'
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Fatura atualizada com sucesso",
  "data": {
    "id": "INV-1729354812345-abc123",
    "...": "...",
    "status": "paid",
    "updatedAt": "2024-10-19T11:00:00.000Z"
  }
}
```

---

### 5. Atualizar Status
```http
PATCH /api/faturas/:id/status
```

**Descrição:** Atualiza apenas o status da fatura.

**Body:**
```json
{
  "status": "processed"
}
```

**Valores Permitidos:** `pending`, `processed`, `paid`

**Exemplo de Requisição:**
```bash
curl -X PATCH "http://localhost:8000/api/faturas/INV-1729354812345-abc123/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "paid"}'
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Status atualizado com sucesso",
  "data": {
    "id": "INV-1729354812345-abc123",
    "status": "paid",
    "updatedAt": "2024-10-19T11:00:00.000Z"
  }
}
```

---

### 6. Deletar Fatura
```http
DELETE /api/faturas/:id
```

**Descrição:** Remove uma fatura do sistema.

**Exemplo de Requisição:**
```bash
curl -X DELETE "http://localhost:8000/api/faturas/INV-1729354812345-abc123"
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Fatura deletada com sucesso"
}
```

---

### 7. Buscar por Número
```http
GET /api/faturas/numero/:numeroFatura
```

**Descrição:** Busca fatura pelo número do documento.

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:8000/api/faturas/numero/FT%202024%2F001"
```

---

### 8. Estatísticas
```http
GET /api/faturas/stats
```

**Descrição:** Retorna estatísticas gerais das faturas.

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:8000/api/faturas/stats"
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "porStatus": {
      "pending": 20,
      "processed": 15,
      "paid": 10
    },
    "valorTotal": 12750.00,
    "ultimaFatura": {
      "id": "INV-1729354812345-abc123",
      "numeroFatura": "FT 2024/045",
      "createdAt": "2024-10-19T10:30:00.000Z"
    }
  }
}
```

---

## 🔐 Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| `200` | OK - Requisição bem-sucedida |
| `201` | Created - Recurso criado com sucesso |
| `400` | Bad Request - Erro de validação |
| `404` | Not Found - Recurso não encontrado |
| `500` | Internal Server Error - Erro no servidor |

---

## 📦 Modelo de Dados - Fatura

```typescript
interface Invoice {
  // Identificação
  id: string;                    // ID único gerado automaticamente
  
  // Dados Básicos
  nomeCliente: string;           // Nome do cliente/adquirente
  numeroFatura: string;          // Número do documento fiscal
  dataVencimento: string;        // Data de vencimento (YYYY-MM-DD)
  valor: number;                 // Valor principal
  linhaDigitavel: string;        // Linha digitável (se disponível)
  
  // Dados AT
  nifEmitente: string;           // NIF do emitente
  nifAdquirente: string;         // NIF do adquirente
  paisEmitente: string;          // País do emitente (PT)
  paisAdquirente: string;        // País do adquirente
  dataFatura: string;            // Data da fatura (YYYY-MM-DD)
  tipoDocumento: string;         // Tipo de documento (FR, FT, NC, etc)
  codigoDocumento: string;       // Código único AT
  
  // Valores
  total: number;                 // Valor total com IVA
  totalIVA: number;              // Total de IVA
  baseTributavel: number;        // Base tributável
  moeda: string;                 // Moeda (EUR)
  
  // Metadados
  rawQRContent: string;          // Conteúdo bruto do QR Code
  status: 'pending' | 'processed' | 'paid';  // Status da fatura
  createdAt: string;             // Data de criação (ISO 8601)
  updatedAt: string;             // Data de atualização (ISO 8601)
}
```

---

## 🚀 Exemplos de Integração

### JavaScript (Frontend)
```javascript
// Listar faturas
const response = await fetch('/api/faturas?status=pending&page=1&limit=10');
const data = await response.json();
console.log(data.data); // Array de faturas

// Criar fatura
const newInvoice = {
  nomeCliente: "Cliente XYZ",
  numeroFatura: "FT 2024/001",
  total: 285.00,
  dataFatura: "2024-10-19",
  status: "pending"
};

const createResponse = await fetch('/api/faturas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newInvoice)
});

const created = await createResponse.json();
console.log(created.data.id); // ID da nova fatura
```

### Node.js
```javascript
const axios = require('axios');

// Buscar fatura
const invoice = await axios.get('http://localhost:8000/api/faturas/INV-123');
console.log(invoice.data.data);

// Atualizar status
await axios.patch(`http://localhost:8000/api/faturas/${invoice.data.data.id}/status`, {
  status: 'paid'
});
```

### cURL
```bash
# Listar faturas pendentes
curl "http://localhost:8000/api/faturas?status=pending"

# Criar fatura
curl -X POST "http://localhost:8000/api/faturas" \
  -H "Content-Type: application/json" \
  -d '{"nomeCliente":"Cliente","numeroFatura":"FT001","total":100}'

# Atualizar status
curl -X PATCH "http://localhost:8000/api/faturas/INV-123/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}'
```

---

## 🔗 Integração com Zapier/Integromat

### Webhook URL
Use qualquer endpoint da API como webhook:
```
POST http://localhost:8000/api/faturas
```

### Campos para Mapeamento
- **Nome do Cliente:** `nomeCliente`
- **Número da Fatura:** `numeroFatura`
- **Valor:** `total`
- **Data:** `dataFatura`
- **Status:** `status` (pending/processed/paid)

---

## 📱 Integração Mobile (React Native / Flutter)

```javascript
// React Native Example
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const InvoiceAPI = {
  list: (filters) => axios.get(`${API_BASE_URL}/faturas`, { params: filters }),
  get: (id) => axios.get(`${API_BASE_URL}/faturas/${id}`),
  create: (data) => axios.post(`${API_BASE_URL}/faturas`, data),
  update: (id, data) => axios.put(`${API_BASE_URL}/faturas/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE_URL}/faturas/${id}`)
};
```

---

## ⚠️ Notas Importantes

1. **Persistência:** Os dados são salvos em arquivo JSON local (`data/invoices.json`)
2. **IDs:** Gerados automaticamente no formato `INV-timestamp-random`
3. **Datas:** Sempre em formato ISO 8601 (YYYY-MM-DD)
4. **Moeda:** Valores numéricos (sem símbolo de moeda)
5. **Status:** Apenas 3 valores permitidos: `pending`, `processed`, `paid`

---

## 🛠️ Ferramentas de Teste

### Postman
Importe esta collection para testar todos os endpoints:
```json
{
  "info": { "name": "Invoice API", "schema": "..." },
  "item": [ "..." ]
}
```

### Thunder Client (VS Code)
```json
{
  "clientName": "Thunder Client",
  "collectionName": "Invoice API",
  "requests": [ "..." ]
}
```

---

## 📞 Suporte

- **Documentação Completa:** `/docs/API.md`
- **Health Check:** `GET /health`
- **Email:** contato@areluna.com
- **GitHub:** [@GrupoAreLuna](https://github.com/GrupoAreLuna)

