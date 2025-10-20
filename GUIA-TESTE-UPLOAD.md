# 🔍 Guia de Teste - Upload de Imagem PNG

Este guia vai ajudá-lo a diagnosticar porque o upload de imagens PNG não está funcionando.

## Passo 1: Teste Básico

1. **Abra o arquivo de teste no navegador:**
   - Navegue até: http://localhost:8000/test-upload.html
   - Ou abra diretamente o arquivo `test-upload.html` no Chrome

2. **Clique no botão de escolher arquivo** e selecione uma imagem PNG com QR Code

3. **Observe o log detalhado** que aparecerá na tela preta

## O que observar no log:

### ✅ Testes que devem passar:
- Arquivo selecionado (mostra nome, tipo, tamanho)
- Tipo de arquivo válido
- Tamanho do arquivo OK
- Imagem carregada com sucesso
- Dimensões válidas
- Imagem desenhada no canvas
- ImageData extraída

### ❓ Teste crítico:
- **TENTANDO DETECTAR QR CODE**
  - Se aparecer "QR CODE DETECTADO!" = O problema está no preenchimento dos campos
  - Se aparecer "Nenhum QR Code encontrado" = O problema está na imagem ou no QR Code

## Passo 2: Teste na Aplicação Principal

1. **Abra a aplicação principal:** http://localhost:8000

2. **Abra o Console de Desenvolvedor do Chrome:**
   - Pressione `F12` ou `Cmd+Option+I` (Mac)
   - Vá para a aba "Console"

3. **Tente fazer upload de uma imagem:**
   - Clique em "Carregar Imagem"
   - Selecione uma imagem PNG

4. **Observe as mensagens no console:**
   - Procure por linhas começando com `[DEBUG]`
   - Anote qualquer erro que aparecer

## Passo 3: Ativar o Debug Console na Aplicação

1. Na aplicação principal (http://localhost:8000)

2. **Clique no banner de debug** no canto inferior direito (deve mostrar "🐛 Debug")

3. Tente fazer upload novamente e veja as mensagens de debug

## Possíveis Problemas e Soluções:

### Problema 1: Arquivo não é carregado
**Sintomas:**
- Nada acontece ao selecionar o arquivo
- Nenhuma mensagem aparece

**Verificar:**
- O arquivo é realmente uma imagem PNG?
- O tamanho do arquivo é menor que 10MB?
- Você está clicando no botão correto?

### Problema 2: QR Code não é detectado
**Sintomas:**
- Mensagem "Nenhum QR Code encontrado"

**Soluções:**
- Use uma imagem com melhor qualidade
- Certifique-se que o QR Code está visível e não está cortado
- Tente tirar uma nova foto mais próxima do QR Code

### Problema 3: QR Code é detectado mas campos não são preenchidos
**Sintomas:**
- Mensagem de sucesso no console
- Mas os campos da interface não são preenchidos

**Isso indica:**
- O problema está na função `showInvoiceProcessingInterface()`
- Ou na função `autoFillInvoiceForm()`
- O debug console mostrará exatamente onde está o problema

## Reportar Problema

Se o problema persistir, anote as seguintes informações:

1. **Mensagens do Console (F12):**
   ```
   [Cole aqui as mensagens que aparecem no console]
   ```

2. **Mensagens do Debug Console (banner 🐛):**
   ```
   [Cole aqui as mensagens do debug console]
   ```

3. **Comportamento observado:**
   - O que você fez?
   - O que esperava que acontecesse?
   - O que realmente aconteceu?

4. **Arquivo de teste:**
   - Qual imagem você está tentando usar?
   - O QR Code funciona em outros leitores?

---

## Teste Rápido com Imagens de Exemplo

O projeto já tem algumas imagens de teste na pasta `public/`:

1. `test-qr-real.png`
2. `test-qr-complex.png`
3. `user-qr-real.png`

Tente fazer upload de cada uma e veja qual funciona.

---

**Última atualização:** 20 de Outubro de 2025

