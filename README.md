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

## 🚀 Funcionalidades

- ✅ **Scanner em tempo real** via câmera do dispositivo
- ✅ **Upload de imagens** (PNG, JPG, GIF, BMP, WebP)
- ✅ **Decodificação automática** de QR Codes
- ✅ **Suporte especializado** para faturas AT portuguesas
- ✅ **Normalização automática** de dados (correção de maiúsculas/minúsculas)
- ✅ **Interface web moderna** e responsiva
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
├── server.js           # Servidor HTTP simples
├── package.json        # Dependências e scripts
├── README.md          # Documentação
├── .gitignore         # Arquivos ignorados pelo Git
├── public/            # Interface web
│   ├── index.html     # Scanner principal
│   ├── favicon.ico    # Ícone do projeto
│   └── favicon.svg    # Ícone vetorial
└── uploads/           # Pasta temporária (auto-criada)
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
npm start      # Iniciar servidor local
npm test       # Testes (se disponíveis)
```

### Dependências

- **Nenhuma dependência externa** para o frontend
- **Node.js** apenas para servidor local
- **jsQR** incluído via CDN

## 🔒 Segurança e Privacidade

- ✅ **100% local** - nenhum dado é enviado para servidores externos
- ✅ **Sem armazenamento** permanente de imagens
- ✅ **Processamento em tempo real** no navegador
- ✅ **Código aberto** e auditável
- ✅ **Sem cookies** ou tracking

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Grupo AreLuna

Desenvolvido com ❤️ pelo **Grupo AreLuna**

- 🌐 Website: [areluna.com](https://areluna.com)
- 📧 Email: contato@areluna.com
- 🐙 GitHub: [@GrupoAreLuna](https://github.com/GrupoAreLuna)

---

⭐ **Se este projeto foi útil, considere dar uma estrela no GitHub!**