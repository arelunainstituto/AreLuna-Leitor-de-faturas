# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-10-19

### ✨ Adicionado
- **Testes Automatizados:**
  - Testes da API backend com Jest e Supertest
  - Testes de funções utilitárias do frontend
  - Configuração do Jest (`jest.config.js`)
  - Documentação de testes (`tests/README.md`)
  - Scripts npm: `test`, `test:watch`, `test:coverage`
  
- **Linting:**
  - Configuração do ESLint (`.eslintrc.js`)
  - Script `npm run lint` para verificação de código
  
- **Documentação:**
  - CHANGELOG.md (este arquivo)
  - Atualização completa do README.md
  - Documentação de testes

### 🔧 Modificado
- **Modularização do Frontend:**
  - JavaScript extraído do HTML para arquivos separados
  - Criada estrutura modular: `public/js/qr-scanner.js` e `public/js/app.js`
  - Redução de ~60% no tamanho do `index.html` (6.236 → 2.495 linhas)
  - Melhor manutenibilidade e organização do código
  
- **Metadados do Projeto:**
  - Atualização do `project.meta.json` com tecnologias reais
  - Adição de informações sobre bibliotecas e features
  
- **package.json:**
  - Adicionadas dependências de desenvolvimento (Jest, ESLint, Supertest)
  - Novos scripts: `test`, `test:watch`, `test:coverage`, `lint`
  - Script `test` agora executa Jest ao invés de arquivo obsoleto

### 🗑️ Removido
- **Limpeza de Arquivos:**
  - ~35 arquivos de teste e debug removidos da raiz do projeto
  - Arquivos de teste temporários da pasta `public/`
  - Arquivos processados da pasta `uploads/`
  - Arquivo `test.js` obsoleto

### 📝 Atualizado
- **.gitignore:**
  - Adicionadas regras para coverage
  - Adicionadas regras para cache do ESLint e Jest
  - Melhor organização e comentários
  - Proteção contra commit de arquivos de backup
  
- **README.md:**
  - Seção de arquitetura detalhada
  - Documentação de testes
  - Guidelines de contribuição
  - Informações sobre qualidade de código
  - Estrutura do projeto atualizada

### 🎯 Melhorias de Qualidade
- **Cobertura de Testes:** Meta de >75% estabelecida
- **Padrões de Código:** ESLint configurado com regras consistentes
- **Manutenibilidade:** Código modularizado e documentado
- **Documentação:** Completa e atualizada

### 📊 Estatísticas
- **Arquivos Removidos:** 35+ arquivos de teste/debug
- **Linhas Economizadas:** ~3.741 linhas no HTML
- **Testes Criados:** 20+ testes automatizados
- **Cobertura Atual:** Em implementação

## [0.9.0] - 2025-10-02 (Anterior)

### Funcionalidades Iniciais
- Scanner de QR Codes em tempo real via câmera
- Upload e processamento de imagens
- Suporte especializado para faturas AT portuguesas
- Normalização automática de dados
- Interface moderna com modo escuro
- Estatísticas e debug log detalhado

---

## Tipos de Mudanças

- `✨ Adicionado` - novas funcionalidades
- `🔧 Modificado` - mudanças em funcionalidades existentes
- `🐛 Corrigido` - correções de bugs
- `🗑️ Removido` - funcionalidades removidas
- `🔒 Segurança` - correções de vulnerabilidades
- `📝 Atualizado` - atualizações de documentação
- `⚡ Performance` - melhorias de performance
- `♻️ Refatorado` - refatorações de código

---

**Formato de Versionamento:**
- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (x.X.0): Novas funcionalidades compatíveis
- **PATCH** (x.x.X): Correções de bugs compatíveis


