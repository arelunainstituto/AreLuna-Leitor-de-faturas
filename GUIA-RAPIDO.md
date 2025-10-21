# 🚀 Guia Rápido - Leitor de Faturas AreLuna

**Repositório:** https://github.com/arelunainstituto/AreLuna-Leitor-de-faturas  
**Versão:** 1.1.0  
**Última atualização:** 21/10/2025

---

## ⚡ Início Rápido

```bash
# 1. Clonar o repositório
git clone https://github.com/arelunainstituto/AreLuna-Leitor-de-faturas.git
cd AreLuna-Leitor-de-faturas

# 2. Instalar dependências
npm install

# 3. Iniciar servidor
npm start

# 4. Abrir no navegador
open http://localhost:8080
```

---

## 🎯 Funcionalidade Principal

### **📱 LEITOR DE QR CODE DE FATURAS PORTUGUESAS**

✅ Scanner em tempo real via câmera  
✅ Upload de imagens com QR Code  
✅ Extração automática de dados AT  
✅ Encoding UTF-8 (acentos preservados)  
✅ Interface moderna e responsiva  

---

## 📋 Como Usar

### **Opção 1: Scanner por Câmera**
1. Acesse http://localhost:8080
2. Clique em **"Iniciar Câmera"**
3. Aponte para o QR Code da fatura
4. Dados extraídos automaticamente

### **Opção 2: Upload de Imagem**
1. Acesse http://localhost:8080
2. Clique em **"Carregar Imagem"**
3. Selecione foto/screenshot do QR Code
4. Veja o resumo da fatura

---

## 🔤 Suporte UTF-8

### **Import de Arquivos:**

```bash
# CSV com acentos
curl -X POST http://localhost:8080/api/files/upload/csv \
  -F "file=@faturas.csv"

# SAF-T XML com acentos
curl -X POST http://localhost:8080/api/files/upload/xml \
  -F "file=@saft.xml"
```

**Caracteres suportados:** á, é, í, ó, ú, ã, õ, ç, Á, É, Í, Ó, Ú, Ã, Õ, Ç

---

## 🌐 API REST

### **Endpoints Principais:**

```bash
# Listar faturas
GET http://localhost:8080/api/faturas

# Criar fatura
POST http://localhost:8080/api/faturas
Content-Type: application/json
{
  "nomeCliente": "João Silva",
  "numeroFatura": "FT001/2024",
  "total": 285.00
}

# Buscar fatura
GET http://localhost:8080/api/faturas/{id}

# Atualizar status
PATCH http://localhost:8080/api/faturas/{id}/status
Content-Type: application/json
{
  "status": "pago"
}

# Upload SAF-T XML
POST http://localhost:8080/api/files/upload/xml
Content-Type: multipart/form-data
file: @saft.xml

# Upload CSV
POST http://localhost:8080/api/files/upload/csv
Content-Type: multipart/form-data
file: @faturas.csv

# Exportar CSV
GET http://localhost:8080/api/files/export/csv
```

**Documentação completa:** http://localhost:8080/api/docs

---

## 🐛 Debug

### **Ativar Console de Debug:**
- Pressione **Ctrl+Shift+D** na interface
- Veja logs detalhados do processamento
- Identifique problemas de leitura

### **Ver Logs do Servidor:**
```bash
# Console normal
npm start

# Modo desenvolvimento (auto-restart)
npm run dev
```

---

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes com cobertura
npm run test:coverage

# Testes em modo watch
npm run test:watch

# Verificar código (ESLint)
npm run lint
```

---

## 📊 Dados Extraídos do QR Code AT

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **A** | NIF Emitente | 516562240 |
| **B** | NIF Adquirente | 293300054 |
| **C** | País Emitente | PT |
| **D** | Tipo Documento | FR (Fatura-Recibo) |
| **E** | Estado | N (Normal) |
| **F** | Data | 20250330 |
| **G** | Identificação | FR P/5004 |
| **H** | Hash AT | JFZ67XGJ-5004 |
| **O** | Total | 188.90 € |

---

## 📁 Estrutura do Projeto

```
AreLuna-Leitor-de-faturas/
├── server.js              # Backend Node.js/Express
├── package.json           # Dependências
├── public/                # Frontend
│   ├── index.html         # Interface principal
│   └── js/
│       ├── qr-scanner.js  # Lógica do scanner
│       ├── app.js         # Inicialização
│       └── debug-console.js  # Sistema de debug
├── models/                # Modelos de dados
├── services/              # Lógica de negócio
│   ├── InvoiceService.js  # CRUD de faturas
│   ├── XMLParser.js       # Parser SAF-T
│   └── CSVParser.js       # Parser CSV
├── routes/                # Rotas da API
│   ├── invoices.js        # API de faturas
│   └── files.js           # API de arquivos
├── utils/                 # Utilitários
│   └── encoding.js        # Funções UTF-8
├── tests/                 # Testes automatizados
├── docs/                  # Documentação
│   ├── API.md             # Docs da API
│   └── ENCODING-UTF8.md   # Docs de encoding
└── data/                  # Dados persistentes
    └── invoices.json      # Armazenamento
```

---

## 🔧 Scripts NPM

```bash
npm start              # Iniciar servidor
npm run dev            # Modo desenvolvimento
npm test               # Executar testes
npm run test:watch     # Testes em modo watch
npm run test:coverage  # Cobertura de testes
npm run lint           # Verificar código
npm run build:css      # Compilar Tailwind CSS
```

---

## 🌟 Funcionalidades

### **✅ Scanner QR Code**
- Câmera em tempo real
- Upload de imagens
- Múltiplas estratégias de decodificação
- jsQR library

### **✅ Processamento AT**
- Extração de campos fiscais
- Validação de NIF
- Formatação de datas
- Cálculos de IVA

### **✅ Encoding UTF-8**
- Acentos portugueses
- Import SAF-T XML
- Import CSV
- Conversão automática

### **✅ API REST**
- CRUD completo
- Filtros e busca
- Paginação
- Estatísticas

### **✅ Interface Moderna**
- Navbar horizontal
- Dark mode
- Responsivo (mobile/desktop)
- Debug console

---

## 🔒 Segurança

✅ 100% local (sem envio para servidores externos)  
✅ Sem armazenamento permanente de imagens  
✅ Processamento em tempo real no navegador  
✅ Código aberto e auditável  
✅ Helmet + CORS configurados  
✅ Validação de entrada  

---

## 📚 Documentação Completa

| Documento | Descrição |
|-----------|-----------|
| `README.md` | Documentação principal |
| `GUIA-RAPIDO.md` | Este guia (referência rápida) |
| `GUIA-DEBUG.md` | Como usar o debug console |
| `docs/API.md` | Documentação da API REST |
| `docs/ENCODING-UTF8.md` | Encoding UTF-8 técnico |
| `IMPLEMENTACAO-ENCODING.md` | Guia de implementação |
| `Debug/` | Histórico de correções |

---

## 🐛 Troubleshooting

### **QR Code não detectado?**
- Melhorar iluminação
- Aproximar/afastar câmera
- Usar imagem de maior qualidade
- Verificar debug console (Ctrl+Shift+D)

### **Acentos incorretos?**
- Verificar encoding do arquivo fonte
- Usar UTF-8 na exportação
- Consultar `docs/ENCODING-UTF-8.md`

### **Câmera não inicia?**
- Permitir acesso à câmera no navegador
- Verificar se outra app usa a câmera
- Usar upload de imagem como alternativa

### **Erro ao importar XML/CSV?**
- Verificar formato do arquivo
- Ver logs do servidor no terminal
- Testar validação: `POST /api/files/validate/xml`

---

## 📦 Dependências Principais

```json
{
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "pino": "^8.17.2",
  "xml2js": "^0.6.2",
  "csv-parser": "^3.2.0",
  "iconv-lite": "^0.6.3",
  "jsqr": "^1.4.0"
}
```

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFuncionalidade`)
3. Escreva testes
4. Execute testes (`npm test`)
5. Verifique lint (`npm run lint`)
6. Commit (`git commit -m 'feat: Nova funcionalidade'`)
7. Push (`git push origin feature/NovaFuncionalidade`)
8. Abra Pull Request

---

## 🔗 Links Úteis

- **GitHub:** https://github.com/arelunainstituto/AreLuna-Leitor-de-faturas
- **API Docs:** http://localhost:8080/api/docs
- **Health Check:** http://localhost:8080/health
- **Scanner:** http://localhost:8080

---

## ✅ Checklist de Deploy

- [ ] Clonar repositório
- [ ] `npm install`
- [ ] Configurar `.env` (se necessário)
- [ ] `npm test` (verificar testes)
- [ ] `npm start`
- [ ] Testar scanner em http://localhost:8080
- [ ] Testar API em http://localhost:8080/api/faturas
- [ ] Verificar encoding UTF-8
- [ ] Testar import XML/CSV
- [ ] Configurar permissões de câmera

---

## 🎯 Resumo

**Foco Principal:** Scanner de QR Code de Faturas Portuguesas (AT)  
**Funcionalidades Extras:** UTF-8, API REST, Import XML/CSV  
**Status:** ✅ Operacional  
**Encoding:** ✅ UTF-8 correto  
**GitHub:** ✅ Sincronizado  

---

**📱 LEITOR DE QR CODE ARELUNA - PRONTO PARA USO! 🚀**

---

**© 2025 Grupo AreLuna** | **Licença:** MIT

