# JSQRScanner - Grupo AreLuna

🔍 **Scanner de QR Codes em Tempo Real com Suporte a Faturas AT**

Um scanner de QR Codes moderno e completo que funciona tanto via câmera em tempo real quanto por upload de imagens. Desenvolvido especialmente para processar faturas fiscais portuguesas (formato AT) com normalização automática de dados.

## ⭐ Características Principais

- 📱 **Scanner em tempo real** via câmera do dispositivo
- 📁 **Upload de imagens** com QR Codes
- 🇵🇹 **Suporte especializado** para faturas AT portuguesas
- 🔄 **Normalização automática** de dados (maiúsculas/minúsculas)
- 📊 **Estatísticas detalhadas** de performance
- 🎯 **Interface moderna** e responsiva
- 🔒 **100% local** - sem envio de dados externos
- 🌐 **API REST** completa para integração com apps externos
- 💾 **Armazenamento** automático de faturas processadas
- 📚 **Documentação OpenAPI** completa

## 🚀 Funcionalidades

### Scanner de QR Codes
- ✅ **Scanner em tempo real** via câmera do dispositivo
- ✅ **Upload de imagens** (PNG, JPG, GIF, BMP, WebP)
- ✅ **Decodificação automática** de QR Codes
- ✅ **Suporte especializado** para faturas AT portuguesas
- ✅ **Normalização automática** de dados (correção de maiúsculas/minúsculas)
- ✅ **Múltiplas estratégias** de decodificação (fallback automático)

### API REST para Integração
- ✅ **Endpoints RESTful** (GET, POST, PUT, PATCH, DELETE)
- ✅ **Armazenamento** automático de faturas processadas
- ✅ **Filtros e paginação** de resultados
- ✅ **Estatísticas** em tempo real
- ✅ **Busca** por ID ou número de fatura
- ✅ **Gerenciamento de status** (pending, processed, paid)
- ✅ **Compatível** com Zapier, Integromat e apps móveis

### Interface e Performance
- ✅ **Interface web moderna** e responsiva
- ✅ **Modo escuro** integrado
- ✅ **Estatísticas de performance** em tempo real
- ✅ **Debug log** detalhado
- ✅ **Processamento 100% local** (sem dependências externas)

## 📋 Pré-requisitos

- Node.js >= 16.0.0
- npm ou yarn

## ⚡ Instalação Rápida

```bash
# 1. Clonar o repositório
git clone https://github.com/GrupoAreLuna/JSQRScanner.git
cd JSQRScanner

# 2. Instalar dependências
npm install

# 3. Iniciar o serviço
npm start
```

O scanner estará disponível em: **http://localhost:8000**  
A API REST estará disponível em: **http://localhost:8000/api/faturas**  
Documentação da API: **http://localhost:8000/api/docs**

## 🎯 Como Usar

### 📱 Scanner em Tempo Real
1. Acesse http://localhost:8000
2. Clique em **"Iniciar Câmera"**
3. Aponte a câmera para o QR Code
4. O resultado aparecerá automaticamente

### 📁 Upload de Imagem
1. Acesse http://localhost:8000
2. Clique em **"Choose File"** na seção Upload
3. Selecione uma imagem com QR Code
4. Visualize o conteúdo decodificado
5. Fatura salva automaticamente via API

### 🌐 Usar a API REST
```bash
# Listar faturas
curl http://localhost:8000/api/faturas

# Criar fatura
curl -X POST http://localhost:8000/api/faturas \
  -H "Content-Type: application/json" \
  -d '{"nomeCliente":"Cliente","numeroFatura":"FT001","total":285.00}'

# Buscar fatura
curl http://localhost:8000/api/faturas/{id}

# Atualizar status
curl -X PATCH http://localhost:8000/api/faturas/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}'
```

Veja [docs/API.md](docs/API.md) para documentação completa.

### 🇵🇹 Faturas AT Portuguesas
- **Normalização automática** de dados (maiúsculas/minúsculas)
- **Interpretação completa** dos campos AT
- **Validação** de formato
- **Avisos** quando normalização é aplicada
  -F "file=@sua-imagem.png"
## 📊 Estatísticas e Debug

O JSQRScanner inclui:
- **Contador de QR Codes** detectados
- **Taxa de sucesso/erro** em tempo real
- **Tempo médio** de processamento
- **Debug log** detalhado com timestamps
- **Exportação de logs** para análise

## 📁 Estrutura do Projeto

```
JSQRScanner/
├── server.js           # Servidor Express (Backend)
├── package.json        # Dependências e scripts
├── README.md          # Documentação principal
├── .gitignore         # Arquivos ignorados pelo Git
├── jest.config.js     # Configuração de testes
├── .eslintrc.js       # Configuração de linting
├── project.meta.json  # Metadados do projeto
├── public/            # Frontend
│   ├── index.html     # Interface principal (~2.5K linhas)
│   ├── js/            # JavaScript modularizado
│   │   ├── qr-scanner.js  # Classe principal do scanner
│   │   └── app.js         # Inicialização da aplicação
│   ├── favicon.ico    # Ícone do projeto
│   ├── favicon.svg    # Ícone vetorial
│   └── tailwind.css   # Estilos compilados
├── tests/             # Testes automatizados
│   ├── server.test.js     # Testes da API
│   ├── frontend.test.js   # Testes de funções utilitárias
│   ├── fixtures/          # Arquivos de teste
│   └── README.md          # Documentação dos testes
├── src/               # Fontes (pré-build)
│   └── styles/
│       └── tailwind.css   # Estilos fonte
└── uploads/           # Pasta temporária (auto-criada, gitignored)
```

## 🔧 Tecnologias Utilizadas

- **HTML5** + **CSS3** + **JavaScript ES6+**
- **WebRTC** para acesso à câmera
- **Canvas API** para processamento de imagens
- **jsQR** para decodificação de QR Codes
- **Node.js** para servidor local
- **Responsive Design** com Flexbox/Grid

## 🔍 Exemplo de Uso - Faturas AT

Para faturas fiscais portuguesas, o QR Code contém dados estruturados como:

```
A:298255847*B:516562240*C:PT*D:FR*E:N*F:20251002*G:FR ATSIRE01FR/28*H:JJM864ZT-28*I:PT*J:285.00*N:0.00*O:285.00*Q:0*R:0000
```

**Interpretação automática dos campos:**
- **A**: NIF do emitente (298255847)
- **B**: NIF do adquirente (516562240)
- **C**: País (PT - Portugal)
- **D**: Tipo de documento (FR - Fatura-Recibo)
- **F**: Data (20251002 = 02/10/2025)
- **O**: Total com IVA (€285,00)

O sistema **normaliza automaticamente** dados com letras minúsculas e exibe avisos quando necessário.

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
npm start           # Iniciar servidor em produção
npm run dev         # Iniciar servidor em modo desenvolvimento (com nodemon)
npm test            # Executar testes automatizados
npm run test:watch  # Executar testes em modo watch
npm run test:coverage  # Executar testes com relatório de cobertura
npm run build:css   # Compilar Tailwind CSS
npm run lint        # Verificar código com ESLint
```

### Arquitetura

#### **Backend:**
- **Framework:** Express.js 4.18.2
- **Upload:** Multer (com validação de tipo e tamanho)
- **Segurança:** Helmet + CORS
- **Logging:** Pino (logging estruturado)
- **Compressão:** Compression middleware

#### **Frontend:**
- **Arquitetura:** Modular (JavaScript separado do HTML)
- **Biblioteca QR:** jsQR 1.4.0 (via CDN)
- **Estilos:** TailwindCSS 4.1.14
- **Processamento:** Canvas API + WebRTC

#### **Testes:**
- **Framework:** Jest 29.7.0
- **API Testing:** Supertest 6.3.4
- **Linting:** ESLint 8.57.0
- **Cobertura:** LCOV + HTML reports

## 🔒 Segurança e Privacidade

- ✅ **100% local** - nenhum dado é enviado para servidores externos
- ✅ **Sem armazenamento** permanente de imagens
- ✅ **Processamento em tempo real** no navegador
- ✅ **Código aberto** e auditável
- ✅ **Sem cookies** ou tracking

## 🧪 Testes

O projeto inclui testes automatizados para backend e frontend:

```bash
# Executar todos os testes
npm test

# Testes com cobertura
npm run test:coverage

# Testes em modo watch (desenvolvimento)
npm run test:watch
```

**Cobertura de Testes:**
- ✅ Health check endpoints
- ✅ Upload e processamento de QR Codes
- ✅ Normalização de dados AT
- ✅ Validação de NIFs
- ✅ Formatação de datas e valores
- ✅ Tratamento de erros

Veja [tests/README.md](tests/README.md) para mais detalhes.

## 📝 Qualidade de Código

### Linting
```bash
npm run lint
```

O projeto usa ESLint com regras configuradas para:
- Indentação consistente (4 espaços)
- Uso de aspas simples
- Ponto e vírgula obrigatório
- Detecção de variáveis não utilizadas

### Melhores Práticas
- ✅ **Modularização:** JavaScript separado do HTML
- ✅ **Testes:** Cobertura > 75%
- ✅ **Segurança:** Helmet + validação de entrada
- ✅ **Performance:** Compression + caching
- ✅ **Logging:** Estruturado com Pino

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Escreva testes** para suas mudanças
4. **Execute os testes** (`npm test`)
5. **Verifique o lint** (`npm run lint`)
6. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
7. Push para a branch (`git push origin feature/AmazingFeature`)
8. Abra um Pull Request

### Guidelines de Contribuição
- Mantenha cobertura de testes > 75%
- Siga as regras do ESLint
- Documente funções públicas com JSDoc
- Teste em múltiplos navegadores

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Grupo AreLuna

Desenvolvido com ❤️ pelo **Grupo AreLuna**

- 🌐 Website: [areluna.com](https://areluna.com)
- 📧 Email: contato@areluna.com
- 🐙 GitHub: [@GrupoAreLuna](https://github.com/GrupoAreLuna)

---

⭐ **Se este projeto foi útil, considere dar uma estrela no GitHub!**