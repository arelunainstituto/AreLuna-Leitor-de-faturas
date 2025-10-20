# 🐛 Guia do Sistema de Debug

**Data:** 20 de Outubro de 2025  
**Versão:** 1.0.0  
**Status:** ✅ ATIVO

---

## 🎯 O que foi implementado?

Um **console de debug visual completo** que permite:
- ✅ Ver todos os logs em tempo real
- ✅ Filtrar por tipo (sucesso, erro, aviso, info, debug)
- ✅ Rastrear preenchimento automático de campos
- ✅ Exportar logs para análise
- ✅ Detectar erros automaticamente

---

## 🚀 Como Usar

### 1️⃣ **Abrir o Console de Debug**

**Método 1: Atalho de Teclado**
```
Ctrl + Shift + D
```

**Método 2: Botão Visual**
- Clique no botão verde no canto inferior direito:
  ```
  🐛 DEBUG CONSOLE
  Ctrl+Shift+D
  ```

**Método 3: Console JavaScript**
```javascript
window.debug.show()
```

---

### 2️⃣ **Testar Upload de QR Code**

1. **Abra o navegador:** http://localhost:8000
2. **Abra o Debug Console:** `Ctrl + Shift + D`
3. **Faça upload** do QR Code de fatura
4. **Observe os logs** em tempo real:

```
✅ [14:30:45] 🎯 INICIANDO showInvoiceProcessingInterface
ℹ️  [14:30:45] 📄 QR Content recebido: A:298255847*B:516562240*C:PT*...
✅ [14:30:45] ✅ Interface de processamento exibida
ℹ️  [14:30:45] 🔄 Chamando autoFillInvoiceForm...
ℹ️  [14:30:45] 📝 INICIANDO autoFillInvoiceForm
✅ [14:30:45] ✅ Dados parseados com sucesso
✅ [14:30:45] ✅ NIF Emitente: 298255847
✅ [14:30:45] ✅ NIF Adquirente: 516562240
✅ [14:30:45] ✅ Data Fatura: 2024-10-19
✅ [14:30:45] ✅ Total: 285.00
✅ [14:30:45] 🎉 Formulário preenchido automaticamente!
```

---

### 3️⃣ **Filtrar Logs**

Clique nos botões no topo do console:

- **✅ Success** - Operações bem-sucedidas
- **❌ Error** - Erros encontrados
- **⚠️ Warning** - Avisos importantes
- **ℹ️ Info** - Informações gerais
- **🔍 Debug** - Logs técnicos detalhados

---

### 4️⃣ **Identificar Problemas**

#### ❌ **Se aparecer erro de campo não encontrado:**

```
❌ [14:30:45] ❌ Campo não encontrado: nifEmitente
```

**Causa:** O elemento HTML não existe na página  
**Solução:** Verificar se o ID do campo está correto no HTML

#### ❌ **Se aparecer erro de parsing:**

```
❌ [14:30:45] ❌ ERRO ao preencher formulário: Cannot read property 'split' of undefined
```

**Causa:** QR Code mal formatado ou vazio  
**Solução:** Verificar qualidade da imagem do QR Code

#### ⚠️ **Se aparecer aviso de normalização:**

```
⚠️ [14:30:45] ⚠️ Dados normalizados conforme padrão AT
```

**Causa:** QR Code tinha letras minúsculas  
**Solução:** Normal, sistema corrigiu automaticamente

---

## 📊 Estatísticas em Tempo Real

No topo do console você vê:

```
Total: 45    ✅ 38    ❌ 2    ⚠️ 3    ℹ️ 12    🔍 20
```

- **Total:** Número total de logs
- **✅ Sucessos:** Operações bem-sucedidas
- **❌ Erros:** Problemas encontrados
- **⚠️ Avisos:** Alertas importantes
- **ℹ️ Info:** Informações gerais
- **🔍 Debug:** Logs técnicos

---

## 🛠️ Comandos Úteis

### Via Console JavaScript

```javascript
// Mostrar console
window.debug.show()

// Ocultar console
window.debug.hide()

// Alternar visibilidade
window.debug.toggle()

// Adicionar log manualmente
window.debug.log('Minha mensagem de debug')
window.debug.info('Informação importante')
window.debug.success('Operação bem-sucedida!')
window.debug.warning('Atenção!')
window.debug.error('Erro encontrado!')

// Limpar todos os logs
window.debug.clear()
```

---

## 📥 Exportar Logs

### Para Análise Detalhada

1. Clique no botão **📥 Export** no console
2. Um arquivo JSON será baixado: `debug-log-1729433245123.json`
3. Abra no editor de texto ou envie para suporte

### Formato do Export

```json
{
  "exportDate": "2025-10-20T14:30:45.123Z",
  "logs": [
    {
      "timestamp": "2025-10-20T14:30:45.123Z",
      "message": "🎯 INICIANDO showInvoiceProcessingInterface",
      "type": "info"
    }
  ],
  "stats": {
    "total": 45,
    "success": 38,
    "error": 2,
    "warning": 3,
    "info": 12,
    "debug": 20
  }
}
```

---

## 🔍 Fluxo de Debug - Upload de QR Code

### Sequência Normal de Logs

```
1. ℹ️  QR Code detectado
2. ✅ Decodificação bem-sucedida
3. ℹ️  Normalizando dados AT
4. ✅ Dados normalizados
5. ℹ️  Exibindo resultado
6. ℹ️  Verificando se é fatura AT
7. ✅ É fatura AT portuguesa
8. ℹ️  INICIANDO showInvoiceProcessingInterface
9. ℹ️  Chamando autoFillInvoiceForm
10. ℹ️ INICIANDO autoFillInvoiceForm
11. ✅ Dados parseados com sucesso
12. ℹ️  Preenchendo identificação das partes
13. ✅ NIF Emitente: XXX
14. ✅ NIF Adquirente: YYY
15. ℹ️  Preenchendo dados do documento
16. ✅ Data Fatura: YYYY-MM-DD
17. ✅ Número Documento: ZZZ
18. ℹ️  Preenchendo valores e IVA
19. ✅ Total: 285.00
20. ✅ Formulário preenchido automaticamente!
21. ✅ Fatura salva na API: INV-123456
```

---

## 🚨 Erros Comuns e Soluções

### Erro 1: "Campo não encontrado"

```
❌ Campo não encontrado: nifEmitente
```

**Causa:** O ID do campo HTML não existe  
**Verificar:** 
```javascript
document.getElementById('nifEmitente') === null
```
**Solução:** Adicionar o campo no HTML ou corrigir o ID

---

### Erro 2: "Cannot read property"

```
❌ Cannot read property 'split' of undefined
```

**Causa:** QR Content está vazio ou null  
**Verificar:** Qualidade da imagem do QR Code  
**Solução:** Usar imagem com melhor resolução

---

### Erro 3: "Nenhum QR Code encontrado"

```
❌ Nenhum QR Code encontrado na imagem
```

**Causa:** Imagem não contém QR válido ou está muito escura  
**Soluções:**
- Aumentar iluminação ao fotografar
- Usar imagem com maior resolução
- Garantir que o QR está completo
- Tentar com a biblioteca ZXing (mais robusta)

---

## 💡 Dicas de Uso

### 1. **Sempre abrir debug ao testar**
```
Ctrl + Shift + D logo ao abrir a página
```

### 2. **Filtrar apenas erros quando houver problemas**
```
Desmarcar: Success, Info, Debug
Manter: Error, Warning
```

### 3. **Exportar logs antes de reportar bugs**
```
Clicar em 📥 Export e enviar o JSON
```

### 4. **Limpar logs entre testes**
```
Clicar em 🗑️ Clear antes de novo teste
```

### 5. **Usar console JavaScript para debug avançado**
```javascript
// Ver último log
console.log(window.debugConsole.logs[window.debugConsole.logs.length - 1])

// Ver todos os erros
console.log(window.debugConsole.logs.filter(l => l.type === 'error'))
```

---

## 📸 Como Tirar Print do Debug

### Para Reportar Problemas

1. **Abrir Debug:** `Ctrl + Shift + D`
2. **Reproduzir problema:** Upload do QR Code
3. **Esperar erros aparecerem**
4. **Tirar print:** `Cmd + Shift + 4` (Mac) ou `Win + Shift + S` (Windows)
5. **Ou exportar:** Clicar em `📥 Export`

---

## 🎓 Exemplos de Uso Avançado

### Adicionar Log Personalizado no Código

```javascript
// Em qualquer lugar do seu código
window.debug.info('Iniciando processamento personalizado');

try {
    // Seu código aqui
    window.debug.success('Processamento concluído!');
} catch (error) {
    window.debug.error(`Erro: ${error.message}`);
}
```

### Interceptar Eventos Específicos

```javascript
// Adicionar listener para QR detectado
document.addEventListener('qr-detected', (e) => {
    window.debug.success(`QR Detectado: ${e.detail.data.substring(0, 50)}...`);
});
```

### Monitorar Performance

```javascript
const start = performance.now();
// Operação demorada
const end = performance.now();
window.debug.info(`Operação levou ${(end - start).toFixed(2)}ms`);
```

---

## 🔧 Configuração Avançada

### Alterar Número Máximo de Logs

```javascript
window.debugConsole.maxLogs = 200; // Padrão: 100
```

### Forçar Mostrar em Erros

```javascript
window.addEventListener('error', () => {
    window.debug.show(); // Abre automaticamente
});
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Exportar logs:** `📥 Export` no console
2. **Tirar print:** Da tela com erro visível
3. **Enviar para:** contato@areluna.com
4. **Incluir:** Navegador, versão, passos para reproduzir

---

## ✅ Checklist de Debug

Antes de reportar problema:

- [ ] Abri o Debug Console (`Ctrl + Shift + D`)
- [ ] Reproduzi o problema
- [ ] Verifiquei se há erros vermelhos (❌)
- [ ] Exportei os logs (`📥 Export`)
- [ ] Tirei print da tela
- [ ] Anotei passos para reproduzir

---

**Sistema de Debug implementado com ❤️ para o Grupo AreLuna**  
**Versão:** 1.0.0  
**Data:** 20 de Outubro de 2025

