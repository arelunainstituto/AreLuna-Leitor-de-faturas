/**
 * JSQRScanner - Scanner de QR Codes em Tempo Real
 * Especializado em faturas fiscais portuguesas (formato AT)
 * 
 * @class JSQRScanner
 * @version 1.0.0
 * @author Grupo AreLuna
 * @license MIT
 * 
 * Features:
 * - Scanner em tempo real via câmera
 * - Upload e processamento de imagens
 * - Normalização automática de dados AT
 * - Múltiplas estratégias de decodificação
 * - Estatísticas e debug log
 */

class JSQRScanner {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.video = document.getElementById('preview');
        this.canvas = document.getElementById('qr-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.scanInterval = null;
        this.logHistory = [];
        this.stats = {
            detected: 0,
            success: 0,
            errors: 0,
            totalTime: 0,
            scanCount: 0
        };
        
        this.initializeElements();
        this.bindEvents();
        this.getCameraDevices();
        this.log('Sistema pronto para processar imagens');
    }

    initializeElements() {
        // Set canvas size
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    async getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            const cameraSelect = document.getElementById('cameraSelect');
            cameraSelect.innerHTML = '<option value="">Selecionar Câmera</option>';
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Câmera ${index + 1}`;
                cameraSelect.appendChild(option);
            });
            
            if (videoDevices.length > 0) {
                this.log(`${videoDevices.length} câmera(s) detectada(s)`);
            }
        } catch (error) {
            this.log(`Erro ao listar câmeras: ${error.message}`, 'error');
        }
    }

    bindEvents() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('stopCamera').addEventListener('click', () => this.stopCamera());
        document.getElementById('cameraSelect').addEventListener('change', (e) => this.switchCamera(e.target.value));
        document.getElementById('fileInput2').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('fileInputScanner').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('clearLog').addEventListener('click', () => this.clearLog());
        document.getElementById('exportLog').addEventListener('click', () => this.exportLog());
        document.getElementById('generateReport').addEventListener('click', () => this.generateDebugReport());
        
        // Debug log filter buttons
        document.querySelectorAll('.log-filter').forEach(button => {
            button.addEventListener('click', (e) => this.filterLogs(e.target.dataset.level));
        });
        
        const copyBtn = document.getElementById('copyBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyToClipboard());
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadResult());
        
        // Invoice Processing Events
        this.bindInvoiceProcessingEvents();
    }

    bindInvoiceProcessingEvents() {
        // Checkbox toggles for showing/hiding options
        document.getElementById('efetuarPagamento').addEventListener('change', (e) => {
            document.getElementById('bankingOptions').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('registrarIVA').addEventListener('change', (e) => {
            document.getElementById('ivaOptions').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('categorizarFatura').addEventListener('change', (e) => {
            document.getElementById('categoryOptions').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('contasPagar').addEventListener('change', (e) => {
            document.getElementById('payableOptions').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('criarAlerta').addEventListener('change', (e) => {
            document.getElementById('alertOptions').style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                this.updateAlertPreview();
            }
        });

        // Add event listeners for alert preview updates
        ['tipoAlerta', 'antecedenciaAlerta', 'alertEmail', 'alertSMS', 'alertPush'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateAlertPreview());
            }
        });

        // Action buttons
        document.getElementById('cancelProcessing').addEventListener('click', () => this.cancelInvoiceProcessing());
        document.getElementById('saveAsDraft').addEventListener('click', () => this.saveInvoiceAsDraft());
        document.getElementById('processInvoice').addEventListener('click', () => this.processInvoiceData());
    }

    async startCamera() {
        try {
            this.log('Iniciando câmera...');
            
            const cameraSelect = document.getElementById('cameraSelect');
            const deviceId = cameraSelect.value;
            
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            await this.video.play();
            
            this.isScanning = true;
            document.getElementById('startCamera').disabled = true;
            document.getElementById('stopCamera').disabled = false;
            document.getElementById('scanStatus').textContent = 'Escaneando...';
            document.getElementById('scanStatus').className = 'text-lg text-green-600 font-medium';
            
            // Show video, hide placeholder
            this.video.style.display = 'block';
            document.getElementById('camera-placeholder').style.display = 'none';
            
            this.scanInterval = setInterval(() => this.scanFrame(), 100);
            this.log('Câmera iniciada com sucesso', 'success');
        } catch (error) {
            this.log(`Erro ao iniciar câmera: ${error.message}`, 'error');
        }
    }

    stopCamera() {
        this.isScanning = false;
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.video.style.display = 'none';
        document.getElementById('camera-placeholder').style.display = 'flex';
        
        document.getElementById('startCamera').disabled = false;
        document.getElementById('stopCamera').disabled = true;
        document.getElementById('scanStatus').textContent = 'Clique em "Iniciar Câmera" para começar';
        document.getElementById('scanStatus').className = 'text-lg';
        
        this.log('Câmera parada', 'info');
    }

    switchCamera(deviceId) {
        if (this.isScanning) {
            this.stopCamera();
            setTimeout(() => this.startCamera(), 500);
        }
    }

    scanFrame() {
        if (!this.isScanning || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            return;
        }
        
        const startTime = performance.now();
        
        try {
            // Draw video frame to canvas
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get image data
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Scan for QR codes using jsQR
            const code = jsQR(imageData.data, this.canvas.width, this.canvas.height);
            
            if (code) {
                const endTime = performance.now();
                const scanTime = Math.round(endTime - startTime);
                
                this.handleScanSuccess(code.data, scanTime);
                this.stopCamera(); // Stop scanning after successful detection
            }
        } catch (error) {
            this.log(`Erro durante escaneamento: ${error.message}`, 'error');
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('[DEBUG] Starting file processing for:', file.name, 'type:', file.type, 'size:', file.size);
        this.log(`Processando arquivo: ${file.name}`);
        const startTime = performance.now();
        
        try {
            const imageData = await this.fileToImageData(file);
            console.log('[DEBUG] Got imageData, attempting QR detection...');
            
            // Try jsQR with different options
            let code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (!code) {
                console.log('[DEBUG] First attempt failed, trying with inversion...');
                code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "onlyInvert",
                });
            }
            
            if (!code) {
                console.log('[DEBUG] Second attempt failed, trying with both...');
                code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth",
                });
            }
            
            const endTime = performance.now();
            const scanTime = Math.round(endTime - startTime);
            
            if (code && code.data) {
                console.log('[DEBUG] QR Code detected:', code.data);
                this.handleScanSuccess(code.data, scanTime);
            } else {
                console.log('[DEBUG] No QR code found in image after all attempts');
                this.handleScanError('Nenhum QR Code encontrado na imagem', scanTime);
            }
        } catch (error) {
            console.error('[DEBUG] Error processing file:', error);
            const endTime = performance.now();
            const scanTime = Math.round(endTime - startTime);
            this.handleScanError(error.message, scanTime);
        }
    }

    fileToImageData(file) {
        return new Promise((resolve, reject) => {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                reject(new Error('Arquivo deve ser uma imagem válida'));
                return;
            }
            
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande (máximo 10MB)'));
                return;
            }
            
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // Set timeout for image loading
            const timeout = setTimeout(() => {
                reject(new Error('Timeout ao carregar imagem'));
            }, 10000);
            
            img.onload = () => {
                clearTimeout(timeout);
                
                try {
                    // Validate image dimensions
                    if (img.width === 0 || img.height === 0) {
                        reject(new Error('Imagem com dimensões inválidas'));
                        return;
                    }
                    
                    console.log('[DEBUG] Image loaded:', img.width, 'x', img.height);
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    console.log('[DEBUG] ImageData created:', imageData.width, 'x', imageData.height, 'data length:', imageData.data.length);
                    
                    // Clean up object URL
                    URL.revokeObjectURL(img.src);
                    
                    resolve(imageData);
                } catch (error) {
                    reject(new Error(`Erro ao processar imagem: ${error.message}`));
                }
            };
            
            img.onerror = (error) => {
                clearTimeout(timeout);
                URL.revokeObjectURL(img.src);
                reject(new Error('Formato de imagem não suportado ou arquivo corrompido'));
            };
            
            try {
                img.src = URL.createObjectURL(file);
            } catch (error) {
                reject(new Error('Erro ao criar URL da imagem'));
            }
        });
    }

    handleScanSuccess(data, scanTime = 0) {
        console.log('[DEBUG] handleScanSuccess called with data:', data);
        console.log('[DEBUG] Data type:', typeof data);
        console.log('[DEBUG] Data length:', data ? data.length : 'null/undefined');
        
        // Show progress bar
        this.showProgressBar();
        
        this.stats.detected++;
        this.stats.success++;
        this.stats.totalTime += scanTime;
        this.stats.scanCount++;
        
        // Increment QR stats
        this.incrementQRStats();
        
        // Step 1: Reading QR Code
        this.updateProgressStep(1, 'Lendo QR Code...', 25);
        
        setTimeout(() => {
            // Step 2: Decoding data
            this.updateProgressStep(2, 'Decodificando dados...', 50);
            
            // Normalizar dados AT se necessário
            const normalizationResult = this.normalizeATData(data);
            console.log('[DEBUG] Normalization result:', normalizationResult);
            const finalData = normalizationResult.normalizedData;
            const wasNormalized = normalizationResult.wasNormalized;
            console.log('[DEBUG] Final data:', finalData);
            console.log('[DEBUG] Was normalized:', wasNormalized);
            
            setTimeout(() => {
                // Step 3: Validating information
                this.updateProgressStep(3, 'Validando informações...', 75);
                
                this.updateStatistics();
                console.log('[DEBUG] Calling showResult with:', finalData, true, wasNormalized);
                this.showResult(finalData, true, wasNormalized);
                this.log(`QR Code decodificado com sucesso (${scanTime}ms)`, 'success');
                
                if (wasNormalized) {
                    this.log('Dados normalizados conforme padrão AT (chaves convertidas para maiúsculas)', 'warning');
                }
                
                setTimeout(() => {
                    // Step 4: Preparing summary
                    this.updateProgressStep(4, 'Preparando resumo...', 100);
                    
                    setTimeout(() => {
                        // Hide progress bar and show results
                        this.hideProgressBar();
                        
                        // Check if it's an AT invoice and show processing interface
                        if (this.isATInvoice(finalData)) {
                            this.showInvoiceProcessingInterface(finalData);
                        }
                        
                        document.getElementById('lastOperation').textContent = `Sucesso - ${new Date().toLocaleTimeString()}`;
                    }, 500);
                }, 300);
            }, 400);
        }, 300);
    }

    normalizeATData(data) {
        // Padrões AT que devem estar em maiúscula
        const atPatterns = [
            { pattern: /\ba:/gi, replacement: 'A:' },
            { pattern: /\bb:/gi, replacement: 'B:' },
            { pattern: /\bc:/gi, replacement: 'C:' },
            { pattern: /\bd:/gi, replacement: 'D:' },
            { pattern: /\be:/gi, replacement: 'E:' },
            { pattern: /\bf:/gi, replacement: 'F:' },
            { pattern: /\bg:/gi, replacement: 'G:' },
            { pattern: /\bh:/gi, replacement: 'H:' },
            { pattern: /\bi:/gi, replacement: 'I:' },
            { pattern: /\bj:/gi, replacement: 'J:' },
            { pattern: /\bk:/gi, replacement: 'K:' },
            { pattern: /\bl:/gi, replacement: 'L:' },
            { pattern: /\bm:/gi, replacement: 'M:' },
            { pattern: /\bn:/gi, replacement: 'N:' },
            { pattern: /\bo:/gi, replacement: 'O:' },
            { pattern: /\bp:/gi, replacement: 'P:' },
            { pattern: /\bq:/gi, replacement: 'Q:' },
            { pattern: /\br:/gi, replacement: 'R:' },
            { pattern: /\bs:/gi, replacement: 'S:' },
            { pattern: /\bt:/gi, replacement: 'T:' },
            { pattern: /\bu:/gi, replacement: 'U:' },
            { pattern: /\bv:/gi, replacement: 'V:' },
            { pattern: /\bw:/gi, replacement: 'W:' },
            { pattern: /\bx:/gi, replacement: 'X:' },
            { pattern: /\by:/gi, replacement: 'Y:' },
            { pattern: /\bz:/gi, replacement: 'Z:' }
        ];

        let normalizedData = data;
        let wasNormalized = false;
        
        // Aplicar normalizações
        atPatterns.forEach(({ pattern, replacement }) => {
            const originalData = normalizedData;
            normalizedData = normalizedData.replace(pattern, replacement);
            if (originalData !== normalizedData) {
                wasNormalized = true;
            }
        });

        return { normalizedData, wasNormalized };
    }

    handleScanError(message, scanTime) {
        this.stats.errors++;
        this.stats.totalTime += scanTime;
        this.stats.scanCount++;
        
        this.updateStatistics();
        this.showResult(message, false);
        this.log(`Erro: ${message} (${scanTime}ms)`, 'error');
        document.getElementById('lastOperation').textContent = `Erro - ${new Date().toLocaleTimeString()}`;
    }

    updateStatistics() {
        document.getElementById('scanCount').textContent = this.stats.detected;
        document.getElementById('successCount').textContent = this.stats.success;
        document.getElementById('errorCount').textContent = this.stats.errors;
        
        const avgTime = this.stats.scanCount > 0 ? Math.round(this.stats.totalTime / this.stats.scanCount) : 0;
        document.getElementById('avgTime').textContent = `${avgTime}ms`;
    }

    showResult(content, isSuccess, wasNormalized = false) {
        console.log('showResult called with:', { content, isSuccess, wasNormalized });
        
        const resultsDiv = document.getElementById('results');
        const successDiv = document.getElementById('successResult');
        const errorDiv = document.getElementById('errorResult');
        
        console.log('Elements found:', { 
            resultsDiv: !!resultsDiv, 
            successDiv: !!successDiv, 
            errorDiv: !!errorDiv 
        });
        
        if (!resultsDiv || !successDiv || !errorDiv) {
            console.error('Required elements not found!');
            return;
        }
        
        resultsDiv.style.display = 'block';
        
        if (isSuccess) {
            const qrContentElement = document.getElementById('qrContent');
            console.log('qrContentElement found:', !!qrContentElement);
            
            if (qrContentElement) {
                qrContentElement.textContent = content;
                console.log('Content set to qrContentElement:', content);
                
                // Adicionar indicador de normalização se aplicável
                const qrContentDiv = qrContentElement.parentElement;
                let normalizationIndicator = qrContentDiv.querySelector('.normalization-indicator');
                
                if (wasNormalized) {
                    if (!normalizationIndicator) {
                        normalizationIndicator = document.createElement('div');
                        normalizationIndicator.className = 'normalization-indicator mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800';
                        normalizationIndicator.innerHTML = '⚠️ <strong>Dados normalizados:</strong> Chaves convertidas para maiúscula conforme padrão AT';
                        qrContentDiv.appendChild(normalizationIndicator);
                    }
                } else if (normalizationIndicator) {
                    normalizationIndicator.remove();
                }
            }
            
            successDiv.classList.remove('hidden');
            errorDiv.classList.add('hidden');
            console.log('Success result shown');
        } else {
            document.getElementById('errorMessage').textContent = content;
            errorDiv.classList.remove('hidden');
            successDiv.classList.add('hidden');
            this.hideInvoiceProcessingInterface();
            console.log('Error result shown');
        }
    }

    isATInvoice(content) {
        // Check if the content contains AT invoice patterns
        return content.includes('A:') || content.includes('B:') || content.includes('C:') || 
               content.includes('D:') || content.includes('E:') || content.includes('F:') ||
               content.includes('G:') || content.includes('H:') || content.includes('I:');
    }

    showInvoiceProcessingInterface(qrContent) {
        window.debug.info('🎯 INICIANDO showInvoiceProcessingInterface');
        window.debug.log(`📄 QR Content recebido: ${qrContent.substring(0, 100)}...`);
        
        // First show the invoice summary card
        this.showInvoiceSummary(qrContent);
        
        const invoiceInterface = document.getElementById('invoiceProcessing');
        if (invoiceInterface) {
            invoiceInterface.style.display = 'block';
            window.debug.success('✅ Interface de processamento exibida');
        } else {
            window.debug.error('❌ Elemento invoiceProcessing não encontrado!');
        }
        
        // Auto-fill form with QR data
        window.debug.info('🔄 Chamando autoFillInvoiceForm...');
        this.autoFillInvoiceForm(qrContent);
        
        this.log('Interface de processamento de fatura exibida', 'info');
    }

    showInvoiceSummary(qrContent) {
        try {
            const invoiceData = this.parseATInvoiceData(qrContent);
            
            // Populate summary card
            document.getElementById('summaryNifEmitente').textContent = invoiceData.nifEmitente || '-';
            document.getElementById('summaryNifAdquirente').textContent = invoiceData.nifAdquirente || '-';
            document.getElementById('summaryDataFatura').textContent = this.formatDate(invoiceData.dataFatura) || '-';
            document.getElementById('summaryTotal').textContent = invoiceData.total ? `€${parseFloat(invoiceData.total).toFixed(2)}` : '-';
            document.getElementById('summaryTipoDocumento').textContent = this.getDocumentTypeDescription(invoiceData.tipoDocumento) || '-';
            
            // Show the summary card
            document.getElementById('invoiceSummary').style.display = 'block';
            
            // Add event listeners for summary card buttons
            document.getElementById('proceedToForm').onclick = () => {
                document.getElementById('invoiceSummary').style.display = 'none';
                document.getElementById('invoiceProcessing').scrollIntoView({ behavior: 'smooth' });
            };
            
            document.getElementById('scanAnother').onclick = () => {
                this.resetInterface();
                document.querySelector('.max-w-4xl').scrollIntoView({ behavior: 'smooth' });
            };
            
            this.log('Cartão de resumo da fatura exibido', 'success');
        } catch (error) {
            this.log(`Erro ao exibir resumo da fatura: ${error.message}`, 'error');
        }
    }

    resetInterface() {
        // Hide all result sections
        document.getElementById('results').style.display = 'none';
        document.getElementById('invoiceSummary').style.display = 'none';
        document.getElementById('invoiceProcessing').style.display = 'none';
        
        // Reset form
        this.resetInvoiceForm();
        
        // Clear QR content display
        document.getElementById('qrContent').textContent = '';
        
        this.log('Interface reiniciada para nova leitura', 'info');
    }

    hideInvoiceProcessingInterface() {
        const invoiceInterface = document.getElementById('invoiceProcessing');
        invoiceInterface.style.display = 'none';
        
        // Reset form
        this.resetInvoiceForm();
    }

    autoFillInvoiceForm(qrContent) {
        try {
            window.debug.info('📝 INICIANDO autoFillInvoiceForm');
            
            const invoiceData = this.parseATInvoiceData(qrContent);
            window.debug.success('✅ Dados parseados com sucesso');
            window.debug.log(`📊 Dados da fatura: ${JSON.stringify(invoiceData, null, 2).substring(0, 200)}...`);
            
            // Lista de campos para preencher
            const fields = [
                { id: 'nifEmitente', value: invoiceData.nifEmitente, label: 'NIF Emitente' },
                { id: 'nifAdquirente', value: invoiceData.nifAdquirente, label: 'NIF Adquirente' },
                { id: 'paisEmitente', value: invoiceData.paisEmitente, label: 'País Emitente' },
                { id: 'paisAdquirente', value: invoiceData.paisAdquirente, label: 'País Adquirente' },
                { id: 'tipoAdquirente', value: invoiceData.tipoAdquirente, label: 'Tipo Adquirente' }
            ];
            
            // Preencher e logar cada campo
            fields.forEach(field => {
                const element = document.getElementById(field.id);
                if (element) {
                    element.value = field.value || '';
                    window.debug.success(`✅ ${field.label}: ${field.value || '(vazio)'}`);
                } else {
                    window.debug.error(`❌ Campo não encontrado: ${field.id}`);
                }
            });
            
            // Campos antigos mantidos para compatibilidade
            const nifEmitenteEl = document.getElementById('nifEmitente');
            if (nifEmitenteEl) nifEmitenteEl.value = invoiceData.nifEmitente || '';
            const nifAdquirenteEl = document.getElementById('nifAdquirente');
            if (nifAdquirenteEl) nifAdquirenteEl.value = invoiceData.nifAdquirente || '';
            const paisEmitenteEl = document.getElementById('paisEmitente');
            if (paisEmitenteEl) paisEmitenteEl.value = invoiceData.paisEmitente || '';
            const paisAdquirenteEl = document.getElementById('paisAdquirente');
            if (paisAdquirenteEl) paisAdquirenteEl.value = invoiceData.paisAdquirente || '';
            const tipoAdquirenteEl = document.getElementById('tipoAdquirente');
            if (tipoAdquirenteEl) tipoAdquirenteEl.value = invoiceData.tipoAdquirente || '';
            
            // Auto-fill company name for acquirer if it's a Grupo AreLuna company
            if (invoiceData.nifAdquirente) {
                const companyName = this.lookupCompanyByNIF(invoiceData.nifAdquirente);
                if (companyName) {
                    // Check if there's a nomeAdquirente field and fill it
                    const nomeAdquirenteField = document.getElementById('nomeAdquirente');
                    if (nomeAdquirenteField) {
                        nomeAdquirenteField.value = companyName;
                    }
                    this.log(`Nome da empresa identificado: ${companyName}`, 'success');
                }
            }
            
            // Dados do Documento
            window.debug.info('📅 Preenchendo dados do documento...');
            const docFields = [
                { id: 'dataFatura', value: invoiceData.dataFatura, label: 'Data Fatura' },
                { id: 'tipoDocumento', value: invoiceData.tipoDocumento, label: 'Tipo Documento' },
                { id: 'numeroDocumento', value: invoiceData.numeroDocumento, label: 'Número Documento' },
                { id: 'codigoDocumento', value: invoiceData.codigoDocumento, label: 'Código Documento' }
            ];
            
            docFields.forEach(field => {
                const el = document.getElementById(field.id);
                if (el) {
                    el.value = field.value || '';
                    window.debug.success(`✅ ${field.label}: ${field.value || '(vazio)'}`);
                } else {
                    window.debug.error(`❌ Campo não encontrado: ${field.id}`);
                }
            });
            
            // Valores e IVA
            window.debug.info('💰 Preenchendo valores e IVA...');
            const valueFields = [
                { id: 'moeda', value: invoiceData.moeda, label: 'Moeda' },
                { id: 'valoresIVATaxas', value: invoiceData.valoresIVATaxas, label: 'Valores IVA Taxas' },
                { id: 'baseTributavel', value: invoiceData.baseTributavel, label: 'Base Tributável' },
                { id: 'iva', value: invoiceData.iva, label: 'IVA' },
                { id: 'total', value: invoiceData.total, label: 'Total' },
                { id: 'totalIVA', value: invoiceData.totalIVA, label: 'Total IVA' },
                { id: 'retencao', value: invoiceData.retencao, label: 'Retenção' }
            ];
            
            valueFields.forEach(field => {
                const el = document.getElementById(field.id);
                if (el) {
                    el.value = field.value || '';
                    window.debug.success(`✅ ${field.label}: ${field.value || '(vazio)'}`);
                } else {
                    window.debug.error(`❌ Campo não encontrado: ${field.id}`);
                }
            });
            
            // IVA por Taxa
            document.getElementById('baseIva6').value = invoiceData.baseIva6 || '';
            document.getElementById('iva6').value = invoiceData.iva6 || '';
            document.getElementById('baseIva13').value = invoiceData.baseIva13 || '';
            document.getElementById('iva13').value = invoiceData.iva13 || '';
            document.getElementById('baseIva23').value = invoiceData.baseIva23 || '';
            document.getElementById('iva23').value = invoiceData.iva23 || '';
            
            // Códigos de Isenção e Motivos
            document.getElementById('ivaIsento').value = invoiceData.ivaIsento || '';
            document.getElementById('ivaRegimeEspecial').value = invoiceData.ivaRegimeEspecial || '';
            document.getElementById('codigoIsencao').value = invoiceData.codigoIsencao || '';
            document.getElementById('motivoIsencao').value = invoiceData.motivoIsencao || '';
            
            // Campos Adicionais
            document.getElementById('nomeEmitente').value = invoiceData.nomeEmitente || '';
            document.getElementById('moradaEmitente').value = invoiceData.moradaEmitente || '';
            document.getElementById('iban').value = invoiceData.iban || '';
            
            // Set default values for additional fields
            document.getElementById('descricao').value = invoiceData.descricao || `Fatura ${invoiceData.tipoDocumento || 'AT'} - ${invoiceData.dataFatura || new Date().toLocaleDateString()}`;
            document.getElementById('referenciaInterna').value = `REF-${Date.now()}`;
            
            // Auto-set due date (30 days from invoice date)
            if (invoiceData.dataFatura) {
                const invoiceDate = new Date(invoiceData.dataFatura);
                const dueDate = new Date(invoiceDate);
                dueDate.setDate(dueDate.getDate() + 30);
                document.getElementById('dataVencimento').value = dueDate.toISOString().split('T')[0];
            }
            
            // Pre-fill banking details if available in QR data
            this.preFillBankingDetails(invoiceData);
            
            // Auto-suggest accounting category based on NIF and amount
            this.suggestAccountingCategory(invoiceData);
            
            // Auto-enable relevant options based on invoice data
            this.autoEnableRelevantOptions(invoiceData);
            
            window.debug.success('🎉 Formulário preenchido automaticamente com dados do QR!');
            this.log('Formulário preenchido automaticamente com dados do QR', 'success');
        } catch (error) {
            window.debug.error(`❌ ERRO ao preencher formulário: ${error.message}`);
            window.debug.error(`Stack trace: ${error.stack}`);
            this.log(`Erro ao preencher formulário: ${error.message}`, 'error');
        }
    }

    parseATInvoiceData(qrContent) {
        const data = {};
        const lines = qrContent.split('*');
        
        // Store raw content for additional processing
        data.rawContent = qrContent;
        
        lines.forEach(line => {
            // Convert to uppercase for consistent processing
            const upperLine = line.toUpperCase();
            
            // A-E: Identification fields
            if (upperLine.includes('A:')) data.nifEmitente = upperLine.replace('A:', '').trim();
            if (upperLine.includes('B:')) data.nifAdquirente = upperLine.replace('B:', '').trim();
            if (upperLine.includes('C:')) data.paisEmitente = upperLine.replace('C:', '').trim();
            if (upperLine.includes('D:')) data.paisAdquirente = upperLine.replace('D:', '').trim();
            if (upperLine.includes('E:')) data.tipoAdquirente = upperLine.replace('E:', '').trim();
            
            // F-H: Document fields
            if (upperLine.includes('F:')) {
                const rawDate = upperLine.replace('F:', '').trim();
                // Format date from YYYYMMDD to YYYY-MM-DD
                if (/^\d{8}$/.test(rawDate)) {
                    const year = rawDate.substring(0, 4);
                    const month = rawDate.substring(4, 6);
                    const day = rawDate.substring(6, 8);
                    data.dataFatura = `${year}-${month}-${day}`;
                } else {
                    data.dataFatura = rawDate;
                }
            }
            if (upperLine.includes('G:')) data.numeroDocumento = upperLine.replace('G:', '').trim();
            if (upperLine.includes('H:')) data.codigoDocumento = upperLine.replace('H:', '').trim();
            
            // Document type mapping (from D field)
            if (upperLine.includes('D:')) {
                const docType = upperLine.replace('D:', '').trim();
                const documentTypes = {
                    'FR': 'Fatura-Recibo',
                    'FT': 'Fatura',
                    'NC': 'Nota de Crédito',
                    'ND': 'Nota de Débito',
                    'VD': 'Venda a Dinheiro',
                    'TV': 'Talão de Venda',
                    'TD': 'Talão de Devolução',
                    'AA': 'Alienação de Ativos',
                    'DA': 'Devolução de Ativos'
                };
                data.tipoDocumento = documentTypes[docType] || docType;
            }
            
            // I1-I8: Tax and value fields
            if (upperLine.includes('I1:')) data.moeda = upperLine.replace('I1:', '').trim();
            if (upperLine.includes('I2:')) data.valoresIVATaxas = upperLine.replace('I2:', '').trim();
            if (upperLine.includes('I3:')) data.ivaIsento = upperLine.replace('I3:', '').trim();
            if (upperLine.includes('I4:')) data.ivaRegimeEspecial = upperLine.replace('I4:', '').trim();
            if (upperLine.includes('I5:')) data.total = upperLine.replace('I5:', '').trim();
            if (upperLine.includes('I6:')) data.retencao = upperLine.replace('I6:', '').trim();
            if (upperLine.includes('I7:')) data.baseTributavel = upperLine.replace('I7:', '').trim();
            if (upperLine.includes('I8:')) data.iva = upperLine.replace('I8:', '').trim();
            
            // J1-J6: Additional IVA rates
            if (upperLine.includes('J1:')) data.baseIva6 = upperLine.replace('J1:', '').trim();
            if (upperLine.includes('J2:')) data.iva6 = upperLine.replace('J2:', '').trim();
            if (upperLine.includes('J3:')) data.baseIva13 = upperLine.replace('J3:', '').trim();
            if (upperLine.includes('J4:')) data.iva13 = upperLine.replace('J4:', '').trim();
            if (upperLine.includes('J5:')) data.baseIva23 = upperLine.replace('J5:', '').trim();
            if (upperLine.includes('J6:')) data.iva23 = upperLine.replace('J6:', '').trim();
            
            // N-O: Total fields
            if (upperLine.includes('N:')) data.totalIVA = upperLine.replace('N:', '').trim();
            if (upperLine.includes('O:')) data.total = upperLine.replace('O:', '').trim();
            
            // Q-R: Exemption codes
            if (upperLine.includes('Q:')) data.codigoIsencao = upperLine.replace('Q:', '').trim();
            if (upperLine.includes('R:')) data.motivoIsencao = upperLine.replace('R:', '').trim();
            
            // Additional fields that might be present
            if (line.includes('K:')) data.nomeEmitente = line.replace('K:', '').trim();
            if (line.includes('L:')) data.moradaEmitente = line.replace('L:', '').trim();
            if (line.includes('M:')) data.iban = line.replace('M:', '').trim();
            if (line.includes('N:')) data.descricao = line.replace('N:', '').trim();
        });
        
        // Try to extract company name from NIF if not directly available
        if (!data.nomeEmitente && data.nifEmitente) {
            data.nomeEmitente = this.lookupCompanyByNIF(data.nifEmitente);
        }
        
        return data;
    }

    // Lookup company name by NIF (simplified version)
    lookupCompanyByNIF(nif) {
        // Grupo AreLuna companies mapping
        const grupoAreLunaCompanies = {
            '516562240': 'Instituto AreLuna Medicina Dentária Avançada, Lda',
            '516313916': 'Sociedade de Gestão Vespasian Ventures, Lda',
            '516681826': 'ProStoral Laboratório de Dispositivos Médicos, Lda',
            '518899586': 'Pinklegion – Unipessoal Lda',
            '518822532': 'Papagaio Fotogénico – Unipessoal Lda',
            '518881555': 'Nuvens Autóctones – Unipessoal Lda'
        };
        
        // Common Portuguese companies (for reference)
        const commonCompanies = {
            '500000000': 'EDP - Energias de Portugal',
            '501442600': 'Vodafone Portugal',
            '502011475': 'NOS Comunicações',
            '503504564': 'MEO - Serviços de Comunicações',
            '500769405': 'Galp Energia'
        };
        
        // First check Grupo AreLuna companies, then common companies
        return grupoAreLunaCompanies[nif] || commonCompanies[nif] || null;
    }

    resetInvoiceForm() {
        // Reset all form fields
        const inputs = document.querySelectorAll('#invoiceProcessing input, #invoiceProcessing select, #invoiceProcessing textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // Hide all option sections
        document.getElementById('bankingOptions').style.display = 'none';
        document.getElementById('ivaOptions').style.display = 'none';
        document.getElementById('categoryOptions').style.display = 'none';
        document.getElementById('payableOptions').style.display = 'none';
        document.getElementById('alertOptions').style.display = 'none';
    }

    cancelInvoiceProcessing() {
        this.hideInvoiceProcessingInterface();
        this.log('Processamento de fatura cancelado', 'info');
    }

    saveInvoiceAsDraft() {
        const invoiceData = this.collectInvoiceData();
        
        // Save to localStorage as draft
        const drafts = JSON.parse(localStorage.getItem('invoiceDrafts') || '[]');
        drafts.push({
            ...invoiceData,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            status: 'draft'
        });
        localStorage.setItem('invoiceDrafts', JSON.stringify(drafts));
        
        this.log('Fatura salva como rascunho', 'success');
        this.hideInvoiceProcessingInterface();
    }

    async processInvoiceData() {
        try {
            const invoiceData = this.collectInvoiceData();
            const enabledIntegrations = this.getEnabledIntegrations();

            this.log('Iniciando processamento da fatura...', 'info');

            // Validate required fields
            if (!this.validateInvoiceData(invoiceData)) {
                this.log('Dados da fatura incompletos', 'error');
                return;
            }

            // Process each enabled integration
            const results = {
                invoice: invoiceData,
                integrations: {},
                timestamp: new Date().toISOString()
            };

            if (enabledIntegrations.banking) {
                results.integrations.banking = await this.processBankingIntegration(invoiceData);
            }

            if (enabledIntegrations.iva) {
                results.integrations.iva = this.processIVAControl(invoiceData);
            }

            if (enabledIntegrations.accounting) {
                results.integrations.accounting = this.processAccountingCategory(invoiceData);
            }

            if (enabledIntegrations.payable) {
                results.integrations.payable = this.processAccountsPayable(invoiceData);
            }

            if (enabledIntegrations.alerts) {
                results.integrations.alerts = this.processAlerts(invoiceData);
            }

            // Save processed invoice
            this.saveProcessedInvoice(results);

            // Show success message with integration results
            this.showProcessingResults(results);

            // Hide processing interface
            this.hideInvoiceProcessingInterface();

            this.log('Fatura processada com sucesso!', 'success');

        } catch (error) {
            this.log(`Erro no processamento: ${error.message}`, 'error');
        }
    }

    collectInvoiceData() {
        return {
            // Basic invoice data
            nifEmitente: document.getElementById('nifEmitente').value,
            nifAdquirente: document.getElementById('nifAdquirente').value,
            dataFatura: document.getElementById('dataFatura').value,
            tipoDocumento: document.getElementById('tipoDocumento').value,
            baseTributavel: document.getElementById('baseTributavel').value,
            iva: document.getElementById('iva').value,
            total: document.getElementById('total').value,
            
            // Additional fields
            descricao: document.getElementById('descricao').value,
            referenciaInterna: document.getElementById('referenciaInterna').value,
            centroCusto: document.getElementById('centroCusto').value,
            
            // Actions
            actions: {
                efetuarPagamento: document.getElementById('efetuarPagamento').checked,
                registrarIVA: document.getElementById('registrarIVA').checked,
                categorizarFatura: document.getElementById('categorizarFatura').checked,
                contasPagar: document.getElementById('contasPagar').checked,
                anexarComprovativo: document.getElementById('anexarComprovativo').checked,
                criarAlerta: document.getElementById('criarAlerta').checked
            },
            
            // Options data
            banking: {
                banco: document.getElementById('bancoSelect').value,
                conta: document.getElementById('contaBancaria').value
            },
            
            iva: {
                regime: document.getElementById('regimeIVA').value
            },
            
            category: {
                categoria: document.getElementById('categoriaContabil').value,
                tags: document.getElementById('tagsPersonalizadas').value
            },
            
            payable: {
                dataVencimento: document.getElementById('dataVencimento').value
            },
            
            alert: {
                tipo: document.getElementById('tipoAlerta').value,
                antecedencia: document.getElementById('antecedenciaAlerta').value
            }
        };
    }

    copyToClipboard() {
        const content = document.getElementById('qrContent').textContent;
        navigator.clipboard.writeText(content).then(() => {
            this.log('Conteúdo copiado para a área de transferência', 'success');
        });
    }

    downloadResult() {
        const content = document.getElementById('qrContent').textContent;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qr-code-content.txt';
        a.click();
        URL.revokeObjectURL(url);
        this.log('Resultado baixado como arquivo', 'success');
    }

    clearLog() {
        const debugLog = document.getElementById('debugLog');
        debugLog.innerHTML = '<div class="text-gray-600">[INFO] Log limpo</div>';
    }

    exportLog() {
        const debugLog = document.getElementById('debugLog');
        const content = debugLog.textContent;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'debug-log.txt';
        a.click();
        URL.revokeObjectURL(url);
        this.log('Log exportado como arquivo', 'success');
    }

    // Pre-fill banking details from QR data
    preFillBankingDetails(invoiceData) {
        try {
            // Validate input data
            if (!invoiceData || typeof invoiceData !== 'object') {
                this.log('Dados de fatura inválidos para pré-preenchimento bancário', 'warning');
                return;
            }

            // Extract banking information from QR data if available
            const beneficiario = this.extractBeneficiario(invoiceData);
            const iban = this.extractIBAN(invoiceData);
            const valor = invoiceData.total || '';
            const referencia = this.generatePaymentReference(invoiceData);

            // Update pre-filled banking details display with robust null checks
            const beneficiarioEl = document.getElementById('beneficiarioPreenchido');
            const ibanEl = document.getElementById('ibanPreenchido');
            const valorEl = document.getElementById('valorPreenchido');
            const referenciaEl = document.getElementById('referenciaPreenchida');

            // Only update elements that exist in the DOM
            if (beneficiarioEl && beneficiarioEl.textContent !== undefined) {
                beneficiarioEl.textContent = beneficiario || 'Não disponível';
            }
            if (ibanEl && ibanEl.textContent !== undefined) {
                ibanEl.textContent = iban || 'Não disponível';
            }
            if (valorEl && valorEl.textContent !== undefined) {
                valorEl.textContent = valor ? `€${valor}` : 'Não disponível';
            }
            if (referenciaEl && referenciaEl.textContent !== undefined) {
                referenciaEl.textContent = referencia || 'Será gerada automaticamente';
            }

            // Show/hide banking details section based on available data
            const bankingDetailsDiv = document.getElementById('bankingDetails');
            if (bankingDetailsDiv && bankingDetailsDiv.style !== undefined) {
                if (beneficiario || iban) {
                    bankingDetailsDiv.style.display = 'block';
                } else {
                    bankingDetailsDiv.style.display = 'none';
                }
            }

            this.log('Detalhes bancários pré-preenchidos com sucesso', 'info');
        } catch (error) {
            this.log(`Erro ao pré-preencher detalhes bancários: ${error.message}`, 'warning');
            console.error('Erro detalhado:', error);
        }
    }

    // Extract beneficiary name from invoice data
    extractBeneficiario(invoiceData) {
        // Try to extract company name from QR data or use NIF lookup
        if (invoiceData.nomeEmitente) {
            return invoiceData.nomeEmitente;
        }
        if (invoiceData.nifEmitente) {
            const companyName = this.lookupCompanyByNIF(invoiceData.nifEmitente);
            return companyName || `Empresa NIF: ${invoiceData.nifEmitente}`;
        }
        return null;
    }

    // Extract IBAN from QR data if available
    extractIBAN(invoiceData) {
        // Check if IBAN is directly available in parsed data
        if (invoiceData.iban) {
            return invoiceData.iban;
        }
        
        // Look for IBAN pattern in raw QR content (Portuguese format)
        if (invoiceData.rawContent) {
            const ibanPattern = /PT50\d{21}|PT\d{23}/g;
            const match = invoiceData.rawContent.match(ibanPattern);
            if (match) return match[0];
        }
        
        // Try to extract from other common patterns
        const commonIbanPatterns = [
            /IBAN[:\s]*([A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{1,16})/i,
            /PT[0-9]{21}/g
        ];
        
        for (const pattern of commonIbanPatterns) {
            const match = invoiceData.rawContent?.match(pattern);
            if (match) return match[1] || match[0];
        }
        
        return null;
    }

    // Generate payment reference based on invoice data
    generatePaymentReference(invoiceData) {
        const nif = invoiceData.nifEmitente?.slice(-4) || '0000';
        const docNumber = invoiceData.numeroDocumento?.slice(-3) || '000';
        const date = invoiceData.dataFatura?.replace(/-/g, '').slice(-6) || new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(-6);
        return `${nif}${docNumber}${date}`;
    }

    // Update alert preview based on current settings
    updateAlertPreview() {
        try {
            const tipoAlerta = document.getElementById('tipoAlerta')?.value || 'vencimento';
            const antecedencia = document.getElementById('antecedenciaAlerta')?.value || '3';
            const email = document.getElementById('alertEmail')?.checked;
            const sms = document.getElementById('alertSMS')?.checked;
            const push = document.getElementById('alertPush')?.checked;

            const methods = [];
            if (email) methods.push('Email');
            if (sms) methods.push('SMS');
            if (push) methods.push('Push');

            const methodsText = methods.length > 0 ? methods.join(', ') : 'Nenhum método selecionado';
            
            let previewText = '';
            switch (tipoAlerta) {
                case 'vencimento':
                    previewText = `Alerta de vencimento será enviado ${antecedencia} dias antes via ${methodsText}`;
                    break;
                case 'reconciliacao':
                    previewText = `Alerta de reconciliação será enviado ${antecedencia} dias antes via ${methodsText}`;
                    break;
                case 'pagamento':
                    previewText = `Alerta de pagamento será enviado ${antecedencia} dias antes via ${methodsText}`;
                    break;
                case 'ambos':
                    previewText = `Todos os alertas serão enviados ${antecedencia} dias antes via ${methodsText}`;
                    break;
            }

            const previewElement = document.getElementById('alertPreviewText');
            if (previewElement) {
                previewElement.textContent = previewText;
            }
        } catch (error) {
            this.log(`Erro ao atualizar preview do alerta: ${error.message}`, 'warning');
        }
    }

    // Enhanced logging with modern color-coded design
    log(message, type = 'info', context = {}) {
        const timestamp = new Date().toISOString();
        const timeString = new Date().toLocaleTimeString('pt-PT', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        
        const logContainer = document.getElementById('debugLog');
        const logEntry = document.createElement('div');
        logEntry.dataset.level = type;
        logEntry.dataset.timestamp = timestamp;
        
        let icon = '';
        let borderColor = '';
        let bgColor = '';
        let levelBadge = '';
        let contextInfo = '';
        
        // Format context information
        if (Object.keys(context).length > 0) {
            const contextKeys = Object.keys(context).slice(0, 3); // Show max 3 keys
            contextInfo = contextKeys.map(key => `${key}: ${context[key]}`).join(', ');
        }
        
        switch (type) {
            case 'success':
                icon = '✅';
                borderColor = 'border-green-400';
                bgColor = 'bg-green-50';
                levelBadge = 'bg-green-100 text-green-800';
                logEntry.className = `log-entry success-entry border-l-4 ${borderColor} ${bgColor} p-3 mb-2 rounded-r-lg`;
                break;
            case 'error':
                icon = '❌';
                borderColor = 'border-red-400';
                bgColor = 'bg-red-50';
                levelBadge = 'bg-red-100 text-red-800';
                logEntry.className = `log-entry error-entry border-l-4 ${borderColor} ${bgColor} p-3 mb-2 rounded-r-lg`;
                break;
            case 'warning':
                icon = '⚠️';
                borderColor = 'border-yellow-400';
                bgColor = 'bg-yellow-50';
                levelBadge = 'bg-yellow-100 text-yellow-800';
                logEntry.className = `log-entry warning-entry border-l-4 ${borderColor} ${bgColor} p-3 mb-2 rounded-r-lg`;
                break;
            case 'debug':
                icon = '🔧';
                borderColor = 'border-purple-400';
                bgColor = 'bg-purple-50';
                levelBadge = 'bg-purple-100 text-purple-800';
                logEntry.className = `log-entry debug-entry border-l-4 ${borderColor} ${bgColor} p-3 mb-2 rounded-r-lg`;
                break;
            default:
                icon = 'ℹ️';
                borderColor = 'border-blue-400';
                bgColor = 'bg-blue-50';
                levelBadge = 'bg-blue-100 text-blue-800';
                logEntry.className = `log-entry info-entry border-l-4 ${borderColor} ${bgColor} p-3 mb-2 rounded-r-lg`;
        }
        
        logEntry.innerHTML = `
            <div class="flex items-center gap-2 mb-1">
                <span class="timestamp text-gray-500 text-xs">[${timeString}]</span>
                <span class="level ${levelBadge} px-2 py-1 rounded text-xs font-semibold">${type.toUpperCase()}</span>
            </div>
            <div class="message text-gray-800">${icon} ${message}</div>
            ${contextInfo ? `<div class="context text-xs text-gray-600 mt-1">${contextInfo}</div>` : ''}
        `;
        
        // Add to log container
        logContainer.appendChild(logEntry);
        
        // Auto-scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Update statistics
        this.updateLogStatistics(type);
        
        // Store in log history
        this.logHistory.push({
            timestamp,
            type,
            message,
            context
        });
        
        // Keep only last 1000 entries
        if (this.logHistory.length > 1000) {
            this.logHistory = this.logHistory.slice(-1000);
        }
        
        // Console log for debugging
        console.log(`[${type.toUpperCase()}] ${message}`, context);
    }

    updateLogStatistics(type) {
        // Update statistics counters
        const stats = this.sessionStats || { info: 0, success: 0, warning: 0, error: 0, debug: 0 };
        if (stats[type] !== undefined) {
            stats[type]++;
        }
        this.sessionStats = stats;
        
        // Update UI counters if elements exist
        const successElement = document.getElementById('successCount');
        const errorElement = document.getElementById('errorCount');
        
        if (successElement) successElement.textContent = stats.success || 0;
        if (errorElement) errorElement.textContent = stats.error || 0;
    }

    // Enhanced debug functionality methods
    clearLog() {
        const debugLog = document.getElementById('debugLog');
        debugLog.innerHTML = `
            <div class="text-gray-600 log-entry" data-level="info" data-timestamp="${new Date().toISOString()}">
                <span class="timestamp">[${new Date().toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}]</span> 
                <span class="level">[INFO]</span> 
                <span class="message">Log limpo - Sistema reiniciado</span>
                <span class="context" data-context='{"action":"clear","user":"manual"}' style="display:none;"></span>
            </div>
        `;
        
        // Reset session stats
        if (window.debugSession) {
            window.debugSession.logs = [];
            window.debugSession.stats = { info: 0, success: 0, warning: 0, error: 0, debug: 0 };
        }
        
        this.updateSessionStats('info');
    }

    exportLog() {
        const debugLog = document.getElementById('debugLog');
        const logEntries = debugLog.querySelectorAll('.log-entry');
        
        let content = '=== QR CODE READER - DEBUG LOG EXPORT ===\n';
        content += `Export Date: ${new Date().toISOString()}\n`;
        content += `Session Duration: ${this.getSessionDuration()}\n`;
        content += `Total Entries: ${logEntries.length}\n\n`;
        
        // Add environment info
        content += '=== ENVIRONMENT INFO ===\n';
        content += `User Agent: ${navigator.userAgent}\n`;
        content += `Platform: ${navigator.platform}\n`;
        content += `Language: ${navigator.language}\n`;
        content += `Online: ${navigator.onLine}\n\n`;
        
        // Add log entries
        content += '=== LOG ENTRIES ===\n';
        logEntries.forEach(entry => {
            const timestamp = entry.dataset.timestamp;
            const level = entry.dataset.level;
            const message = entry.querySelector('.message').textContent;
            const contextEl = entry.querySelector('.context');
            const context = contextEl ? contextEl.dataset.context : '{}';
            
            content += `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
            if (context && context !== '{}') {
                content += `  Context: ${context}\n`;
            }
        });
        
        // Add session statistics
        if (window.debugSession) {
            content += '\n=== SESSION STATISTICS ===\n';
            content += JSON.stringify(window.debugSession.stats, null, 2);
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-debug-log-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.log('Log exportado com dados estruturados', 'success', { 
            entries: logEntries.length,
            format: 'structured'
        });
    }

    generateDebugReport() {
        const report = {
            timestamp: new Date().toISOString(),
            session: window.debugSession || {},
            environment: this.getEnvironmentInfo(),
            camera: this.getCameraInfo(),
            qrStats: this.getQRStats(),
            errorAnalysis: this.getErrorAnalysis(),
            performance: this.getPerformanceMetrics()
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-system-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.log('Relatório completo do sistema gerado', 'success', { 
            reportSize: JSON.stringify(report).length,
            sections: Object.keys(report).length
        });
    }

    filterLogs(level) {
        const logEntries = document.querySelectorAll('.log-entry');
        const filterButtons = document.querySelectorAll('.log-filter');
        
        // Update button states
        filterButtons.forEach(btn => {
            btn.classList.remove('active', 'bg-gray-800', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        
        const activeButton = document.querySelector(`[data-level="${level}"]`);
        if (activeButton) {
            activeButton.classList.remove('bg-gray-200', 'text-gray-700');
            activeButton.classList.add('active', 'bg-gray-800', 'text-white');
        }
        
        // Filter entries
        logEntries.forEach(entry => {
            if (level === 'all' || entry.dataset.level === level) {
                entry.style.display = 'block';
            } else {
                entry.style.display = 'none';
            }
        });
        
        this.log(`Filtro aplicado: ${level}`, 'debug', { filter: level });
    }

    updateSessionStats(level) {
        if (!window.debugSession) return;
        
        window.debugSession.stats[level] = (window.debugSession.stats[level] || 0) + 1;
        
        const total = Object.values(window.debugSession.stats).reduce((a, b) => a + b, 0);
        const errors = window.debugSession.stats.error || 0;
        const successRate = total > 0 ? Math.round(((total - errors) / total) * 100) : 100;
        
        document.getElementById('sessionStats').textContent = 
            `QRs: ${window.debugSession.stats.success || 0} | Erros: ${errors}`;
        document.getElementById('successRate').textContent = 
            `Taxa sucesso: ${successRate}%`;
        
        // Update uptime
        document.getElementById('uptime').textContent = 
            `Uptime: ${this.getSessionDuration()}`;
    }

    getSessionDuration() {
        if (!window.debugSession) return '00:00:00';
        
        const duration = Date.now() - window.debugSession.startTime;
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getEnvironmentInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            deviceMemory: navigator.deviceMemory || 0,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    getCameraInfo() {
        return {
            available: !!navigator.mediaDevices,
            permissions: 'unknown',
            constraints: this.currentConstraints || {},
            activeStream: !!this.stream,
            supportedFormats: ['video/mp4', 'image/jpeg', 'image/png']
        };
    }

    getQRStats() {
        const session = window.debugSession || {};
        const logs = session.logs || [];
        
        const qrLogs = logs.filter(log => 
            log.message.includes('QR') || 
            log.message.includes('processamento') ||
            log.message.includes('leitura')
        );
        
        return {
            totalScanned: qrLogs.filter(log => log.level === 'success').length,
            successfulReads: qrLogs.filter(log => log.message.includes('sucesso')).length,
            failedReads: qrLogs.filter(log => log.level === 'error').length,
            averageProcessingTime: 0,
            lastQRData: logs.find(log => log.context && log.context.qrData)?.context.qrData || null,
            errorPatterns: this.analyzeErrorPatterns(logs)
        };
    }

    analyzeErrorPatterns(logs) {
        const errors = logs.filter(log => log.level === 'error');
        const patterns = {};
        
        errors.forEach(error => {
            const key = error.message.split(':')[0];
            patterns[key] = (patterns[key] || 0) + 1;
        });
        
        return Object.entries(patterns)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }

    getErrorAnalysis() {
        const session = window.debugSession || {};
        const logs = session.logs || [];
        const errors = logs.filter(log => log.level === 'error');
        
        return {
            recentErrors: errors.slice(-10).map(e => ({
                timestamp: e.timestamp,
                message: e.message,
                context: e.context
            })),
            errorFrequency: this.analyzeErrorPatterns(logs).reduce((acc, [pattern, count]) => {
                acc[pattern] = count;
                return acc;
            }, {}),
            criticalIssues: errors.filter(e => 
                e.message.includes('crítico') || 
                e.message.includes('fatal') ||
                e.message.includes('crash')
            ),
            suggestedFixes: this.generateSuggestedFixes(errors)
        };
    }

    generateSuggestedFixes(errors) {
        const fixes = [];
        const errorMessages = errors.map(e => e.message.toLowerCase());
        
        if (errorMessages.some(msg => msg.includes('camera'))) {
            fixes.push('Verificar permissões da câmera no navegador');
        }
        
        if (errorMessages.some(msg => msg.includes('qr'))) {
            fixes.push('Melhorar qualidade da imagem ou iluminação');
        }
        
        if (errorMessages.some(msg => msg.includes('network') || msg.includes('fetch'))) {
            fixes.push('Verificar conexão de internet');
        }
        
        return fixes;
    }

    getPerformanceMetrics() {
        const memory = performance.memory || {};
        
        return {
            memory: {
                used: Math.round((memory.usedJSHeapSize || 0) / 1024 / 1024),
                total: Math.round((memory.totalJSHeapSize || 0) / 1024 / 1024),
                limit: Math.round((memory.jsHeapSizeLimit || 0) / 1024 / 1024)
            },
            timing: performance.timing ? {
                loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            } : null,
            navigation: performance.navigation ? {
                type: performance.navigation.type,
                redirectCount: performance.navigation.redirectCount
            } : null
        };
    }

    updateTechnicalDetails() {
        // Update environment info
        const envInfo = document.getElementById('envInfo');
        if (envInfo) {
            envInfo.textContent = JSON.stringify(this.getEnvironmentInfo(), null, 2);
        }
        
        // Update camera info
        const cameraInfo = document.getElementById('cameraInfo');
        if (cameraInfo) {
            cameraInfo.textContent = JSON.stringify(this.getCameraInfo(), null, 2);
        }
        
        // Update QR stats
        const qrStats = document.getElementById('qrStats');
        if (qrStats) {
            qrStats.textContent = JSON.stringify(this.getQRStats(), null, 2);
        }
        
        // Update error analysis
        const errorAnalysis = document.getElementById('errorAnalysis');
        if (errorAnalysis) {
            errorAnalysis.textContent = JSON.stringify(this.getErrorAnalysis(), null, 2);
        }
        
        // Update performance metrics
        const performanceEl = document.getElementById('performanceMetrics');
        if (performanceEl) {
            const metrics = this.getPerformanceMetrics();
            performanceEl.textContent = `CPU: N/A | RAM: ${metrics.memory.used}MB`;
        }
        
        const processingTimeEl = document.getElementById('processingTime');
        if (processingTimeEl) {
            const avgTime = window.debugSession?.averageProcessingTime || 0;
            processingTimeEl.textContent = `Tempo médio: ${avgTime}ms`;
        }
    }

    // Suggest accounting category based on invoice data
    suggestAccountingCategory(invoiceData) {
        const categorySelect = document.getElementById('categoriaContabil');
        const suggestionElement = document.getElementById('sugestaoCategoria');
        if (!categorySelect) return;

        const amount = parseFloat(invoiceData.total) || 0;
        const nifEmitente = invoiceData.nifEmitente || '';
        const description = invoiceData.descricao || '';

        // Enhanced category suggestions based on multiple factors
        let suggestedCategory = 'outros';
        let reasoning = '';

        // Amount-based suggestions
        if (amount > 10000) {
            suggestedCategory = 'equipamentos';
            reasoning = 'Valor elevado - possível aquisição de equipamento';
        } else if (amount > 5000) {
            suggestedCategory = 'fornecimentos-servicos-externos';
            reasoning = 'Valor médio-alto - serviços ou fornecimentos';
        } else if (amount > 1000) {
            suggestedCategory = 'servicos-profissionais';
            reasoning = 'Valor médio - serviços profissionais';
        } else if (amount < 100) {
            suggestedCategory = 'comunicacoes';
            reasoning = 'Valor baixo - comunicações ou despesas menores';
        }

        // NIF pattern analysis (Portuguese business patterns)
        if (nifEmitente.startsWith('5')) {
            suggestedCategory = 'servicos-profissionais';
            reasoning = 'NIF de pessoa coletiva - serviços profissionais';
        } else if (nifEmitente.startsWith('2')) {
            suggestedCategory = 'fornecimentos-servicos-externos';
            reasoning = 'NIF empresarial - fornecimentos e serviços';
        }

        // Description-based suggestions
        const descLower = description.toLowerCase();
        if (descLower.includes('combustivel') || descLower.includes('gasolina')) {
            suggestedCategory = 'viagens-deslocacoes';
            reasoning = 'Combustível identificado - viagens e deslocações';
        } else if (descLower.includes('telefone') || descLower.includes('internet')) {
            suggestedCategory = 'comunicacoes';
            reasoning = 'Comunicações identificadas';
        } else if (descLower.includes('seguro')) {
            suggestedCategory = 'seguros';
            reasoning = 'Seguro identificado';
        } else if (descLower.includes('marketing') || descLower.includes('publicidade')) {
            suggestedCategory = 'marketing-publicidade';
            reasoning = 'Marketing/Publicidade identificado';
        }

        // Set the suggested category
        categorySelect.value = suggestedCategory;
        
        // Update suggestion display
        if (suggestionElement) {
            suggestionElement.textContent = `${this.getCategoryDisplayName(suggestedCategory)} - ${reasoning}`;
        }

        this.log(`Categoria contábil sugerida: ${suggestedCategory} (${reasoning})`, 'info');
    }

    // Get display name for category
    getCategoryDisplayName(categoryValue) {
        const categoryNames = {
            'fornecimentos-servicos-externos': 'Fornecimentos e Serviços Externos',
            'mercadorias': 'Mercadorias',
            'materias-primas': 'Matérias-primas',
            'equipamentos': 'Equipamentos',
            'servicos-profissionais': 'Serviços Profissionais',
            'marketing-publicidade': 'Marketing e Publicidade',
            'viagens-deslocacoes': 'Viagens e Deslocações',
            'comunicacoes': 'Comunicações',
            'seguros': 'Seguros',
            'outros': 'Outros'
        };
        return categoryNames[categoryValue] || categoryValue;
    }

    // Auto-enable relevant options based on invoice data
    autoEnableRelevantOptions(invoiceData) {
        const amount = parseFloat(invoiceData.total) || 0;
        const hasIVA = parseFloat(invoiceData.iva) > 0;

        // Auto-enable IVA control if invoice has IVA
        if (hasIVA) {
            document.getElementById('controleIVA').checked = true;
            document.getElementById('ivaOptions').style.display = 'block';
            this.log('Controle de IVA ativado automaticamente', 'info');
        }

        // Auto-enable accounts payable for amounts > 500€
        if (amount > 500) {
            document.getElementById('contasPagar').checked = true;
            document.getElementById('payableOptions').style.display = 'block';
            this.log('Contas a pagar ativado automaticamente', 'info');
        }

        // Auto-enable banking integration for amounts > 100€
        if (amount > 100) {
            document.getElementById('integracaoBancaria').checked = true;
            document.getElementById('bankingOptions').style.display = 'block';
            this.log('Integração bancária ativada automaticamente', 'info');
        }

        // Auto-enable alerts for amounts > 1000€
        if (amount > 1000) {
            document.getElementById('criarAlerta').checked = true;
            document.getElementById('alertOptions').style.display = 'block';
            this.log('Alertas ativados automaticamente', 'info');
        }
    }

    // Enhanced invoice processing with integrations
    async processInvoiceData() {
        try {
            const invoiceData = this.collectInvoiceData();
            const enabledIntegrations = this.getEnabledIntegrations();

            this.log('Iniciando processamento da fatura...', 'info');

            // Validate required fields
            if (!this.validateInvoiceData(invoiceData)) {
                this.log('Dados da fatura incompletos', 'error');
                return;
            }

            // Process each enabled integration
            const results = {
                invoice: invoiceData,
                integrations: {},
                timestamp: new Date().toISOString()
            };

            if (enabledIntegrations.banking) {
                results.integrations.banking = await this.processBankingIntegration(invoiceData);
            }

            if (enabledIntegrations.iva) {
                results.integrations.iva = this.processIVAControl(invoiceData);
            }

            if (enabledIntegrations.accounting) {
                results.integrations.accounting = this.processAccountingCategory(invoiceData);
            }

            if (enabledIntegrations.payable) {
                results.integrations.payable = this.processAccountsPayable(invoiceData);
            }

            if (enabledIntegrations.alerts) {
                results.integrations.alerts = this.processAlerts(invoiceData);
            }

            // Save processed invoice
            await this.saveProcessedInvoice(results);

            // Show results
            this.showProcessingResults(results);

            this.log('Processamento da fatura concluído com sucesso', 'success');

        } catch (error) {
            this.log(`Erro no processamento: ${error.message}`, 'error');
            console.error('Invoice processing error:', error);
        }
    }

    // Enhanced accounting integration
    processAccountingIntegration(invoiceData) {
        const categoria = document.getElementById('categoriaContabil')?.value;
        const centroCusto = document.getElementById('centroCusto')?.value;
        const regimeIVA = document.getElementById('regimeIVA')?.value;

        const accountingData = {
            categoria: categoria,
            centroCusto: centroCusto,
            regimeIVA: regimeIVA,
            valorBase: parseFloat(invoiceData.subtotal) || 0,
            valorIVA: parseFloat(invoiceData.iva) || 0,
            valorTotal: parseFloat(invoiceData.total) || 0,
            dataProcessamento: new Date().toISOString(),
            status: 'processado'
        };

        // Calculate IVA deductibility based on regime
        switch (regimeIVA) {
            case 'normal':
                accountingData.ivaDeductible = accountingData.valorIVA;
                break;
            case 'pro-rata':
                accountingData.ivaDeductible = accountingData.valorIVA * 0.8;
                break;
            case 'isento':
            case 'nao-dedutivel':
                accountingData.ivaDeductible = 0;
                break;
            default:
                accountingData.ivaDeductible = accountingData.valorIVA;
        }

        this.log(`Integração contabilística processada: ${categoria}`, 'success');
        return accountingData;
    }

    // Enhanced banking integration
    processBankingIntegration(invoiceData) {
        const banco = document.getElementById('bancoSelecionado')?.value;
        const conta = document.getElementById('contaSelecionada')?.value;
        const dataVencimento = document.getElementById('dataVencimento')?.value;
        const pagamentoAutomatico = document.getElementById('integracaoBancaria')?.checked;

        const bankingData = {
            banco: banco,
            conta: conta,
            dataVencimento: dataVencimento,
            pagamentoAutomatico: pagamentoAutomatico,
            valor: parseFloat(invoiceData.total) || 0,
            referencia: this.generatePaymentReference(invoiceData),
            status: pagamentoAutomatico ? 'agendado' : 'pendente',
            dataProcessamento: new Date().toISOString()
        };

        if (pagamentoAutomatico && dataVencimento) {
            this.scheduleAutomaticPayment(bankingData);
        }

        this.log(`Integração bancária configurada: ${banco}`, 'success');
        return bankingData;
    }

    // Generate payment reference
    generatePaymentReference(invoiceData) {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `FAT${year}${month}${day}${random}`;
    }

    // Schedule automatic payment
    scheduleAutomaticPayment(bankingData) {
        // This would integrate with banking APIs in a real implementation
        this.log(`Pagamento automático agendado para ${bankingData.dataVencimento}`, 'info');
        
        // Store scheduled payment
        const scheduledPayments = JSON.parse(localStorage.getItem('scheduledPayments') || '[]');
        scheduledPayments.push(bankingData);
        localStorage.setItem('scheduledPayments', JSON.stringify(scheduledPayments));
    }

    // Export to SAF-T format (Portuguese tax format)
    exportToSAFT() {
        const invoices = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
        
        if (invoices.length === 0) {
            this.showNotification('Nenhuma fatura para exportar', 'warning');
            return;
        }

        const saftData = {
            Header: {
                AuditFileVersion: '1.04_01',
                CompanyID: 'ARELUNA',
                TaxRegistrationNumber: '999999999',
                TaxAccountingBasis: 'F',
                CompanyName: 'Grupo AreLuna',
                BusinessName: 'AreLuna',
                CompanyAddress: {
                    AddressDetail: 'Rua Principal, 123',
                    City: 'Lisboa',
                    PostalCode: '1000-000',
                    Country: 'PT'
                },
                FiscalYear: new Date().getFullYear(),
                StartDate: `${new Date().getFullYear()}-01-01`,
                EndDate: `${new Date().getFullYear()}-12-31`,
                CurrencyCode: 'EUR',
                DateCreated: new Date().toISOString().split('T')[0],
                TaxEntity: 'Global',
                ProductCompanyTaxID: '999999999',
                SoftwareCertificateNumber: '0',
                ProductID: 'AreLuna Invoice Reader',
                ProductVersion: '1.0'
            },
            SourceDocuments: {
                PurchaseInvoices: {
                    NumberOfEntries: invoices.length,
                    TotalDebit: invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0),
                    TotalCredit: 0,
                    Invoice: invoices.map((invoice, index) => ({
                        InvoiceNo: invoice.numero || `INV${index + 1}`,
                        InvoiceStatus: 'N',
                        Hash: this.generateSAFTHash(invoice),
                        InvoiceDate: invoice.data || new Date().toISOString().split('T')[0],
                        InvoiceType: 'FT',
                        SupplierID: invoice.nifEmitente || '999999999',
                        CustomerID: invoice.nifAdquirente || '999999999',
                        DocumentTotals: {
                            TaxPayable: parseFloat(invoice.iva) || 0,
                            NetTotal: parseFloat(invoice.subtotal) || 0,
                            GrossTotal: parseFloat(invoice.total) || 0
                        }
                    }))
                }
            }
        };

        // Create and download SAF-T file
        const saftXML = this.generateSAFTXML(saftData);
        this.downloadFile(saftXML, `SAF-T_${new Date().toISOString().split('T')[0]}.xml`, 'application/xml');
        
        this.log('Exportação SAF-T concluída', 'success');
    }

    // Generate SAF-T hash
    generateSAFTHash(invoice) {
        const hashString = `${invoice.numero}${invoice.data}${invoice.total}`;
        return btoa(hashString).substr(0, 172); // SAF-T hash limit
    }

    // Generate SAF-T XML
    generateSAFTXML(data) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
    <Header>
<AuditFileVersion>${data.Header.AuditFileVersion}</AuditFileVersion>
<CompanyID>${data.Header.CompanyID}</CompanyID>
<TaxRegistrationNumber>${data.Header.TaxRegistrationNumber}</TaxRegistrationNumber>
<TaxAccountingBasis>${data.Header.TaxAccountingBasis}</TaxAccountingBasis>
<CompanyName>${data.Header.CompanyName}</CompanyName>
<BusinessName>${data.Header.BusinessName}</BusinessName>
<FiscalYear>${data.Header.FiscalYear}</FiscalYear>
<StartDate>${data.Header.StartDate}</StartDate>
<EndDate>${data.Header.EndDate}</EndDate>
<CurrencyCode>${data.Header.CurrencyCode}</CurrencyCode>
<DateCreated>${data.Header.DateCreated}</DateCreated>
<TaxEntity>${data.Header.TaxEntity}</TaxEntity>
<ProductID>${data.Header.ProductID}</ProductID>
<ProductVersion>${data.Header.ProductVersion}</ProductVersion>
    </Header>
    <SourceDocuments>
<PurchaseInvoices>
    <NumberOfEntries>${data.SourceDocuments.PurchaseInvoices.NumberOfEntries}</NumberOfEntries>
    <TotalDebit>${data.SourceDocuments.PurchaseInvoices.TotalDebit.toFixed(2)}</TotalDebit>
    <TotalCredit>${data.SourceDocuments.PurchaseInvoices.TotalCredit.toFixed(2)}</TotalCredit>
    ${data.SourceDocuments.PurchaseInvoices.Invoice.map(inv => `
    <Invoice>
        <InvoiceNo>${inv.InvoiceNo}</InvoiceNo>
        <InvoiceStatus>${inv.InvoiceStatus}</InvoiceStatus>
        <Hash>${inv.Hash}</Hash>
        <InvoiceDate>${inv.InvoiceDate}</InvoiceDate>
        <InvoiceType>${inv.InvoiceType}</InvoiceType>
        <SupplierID>${inv.SupplierID}</SupplierID>
        <CustomerID>${inv.CustomerID}</CustomerID>
        <DocumentTotals>
            <TaxPayable>${inv.DocumentTotals.TaxPayable.toFixed(2)}</TaxPayable>
            <NetTotal>${inv.DocumentTotals.NetTotal.toFixed(2)}</NetTotal>
            <GrossTotal>${inv.DocumentTotals.GrossTotal.toFixed(2)}</GrossTotal>
        </DocumentTotals>
    </Invoice>`).join('')}
</PurchaseInvoices>
    </SourceDocuments>
</AuditFile>`;
    }

    // Validate with Portuguese Tax Authority (AT)
    async validateWithAT() {
        const invoices = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
        
        if (invoices.length === 0) {
            this.showNotification('Nenhuma fatura para validar', 'warning');
            return;
        }

        this.log('Iniciando validação com a AT...', 'info');

        // Simulate AT validation (in real implementation, this would call AT APIs)
        const validationResults = invoices.map(invoice => {
            const isValid = this.validateInvoiceWithAT(invoice);
            return {
                invoice: invoice.numero || 'N/A',
                valid: isValid,
                errors: isValid ? [] : ['NIF inválido', 'Valor de IVA incorreto']
            };
        });

        const validCount = validationResults.filter(r => r.valid).length;
        const invalidCount = validationResults.length - validCount;

        this.showNotification(
            `Validação AT concluída: ${validCount} válidas, ${invalidCount} inválidas`,
            invalidCount === 0 ? 'success' : 'warning'
        );

        this.log(`Validação AT: ${validCount}/${validationResults.length} faturas válidas`, 'info');
    }

    // Validate individual invoice with AT rules
    validateInvoiceWithAT(invoice) {
        // Basic AT validation rules
        const nifEmitente = invoice.nifEmitente;
        const nifAdquirente = invoice.nifAdquirente;
        const valorIVA = parseFloat(invoice.iva) || 0;
        const valorBase = parseFloat(invoice.subtotal) || 0;

        // Validate NIF format (9 digits)
        if (!nifEmitente || !/^\d{9}$/.test(nifEmitente)) return false;
        if (!nifAdquirente || !/^\d{9}$/.test(nifAdquirente)) return false;

        // Validate IVA calculation (23% standard rate)
        const expectedIVA = valorBase * 0.23;
        if (Math.abs(valorIVA - expectedIVA) > 0.01) return false;

        return true;
    }

    // Export to Excel backup
    exportToExcel() {
        const invoices = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
        
        if (invoices.length === 0) {
            this.showNotification('Nenhuma fatura para exportar', 'warning');
            return;
        }

        // Create CSV content
        const headers = ['Data', 'Número', 'Fornecedor', 'NIF Emitente', 'NIF Adquirente', 'Subtotal', 'IVA', 'Total', 'Status'];
        const csvContent = [
            headers.join(','),
            ...invoices.map(inv => [
                inv.data || '',
                inv.numero || '',
                inv.fornecedor || '',
                inv.nifEmitente || '',
                inv.nifAdquirente || '',
                inv.subtotal || '0',
                inv.iva || '0',
                inv.total || '0',
                inv.status || 'processado'
            ].join(','))
        ].join('\n');

        // Download CSV file
        this.downloadFile(csvContent, `faturas_backup_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        
        this.log('Backup Excel criado com sucesso', 'success');
    }

    // Download file helper
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Process accounts payable
    processAccountsPayable(invoiceData) {
        const payableData = {
            fornecedor: invoiceData.fornecedor || 'N/A',
            valor: parseFloat(invoiceData.total) || 0,
            dataVencimento: invoiceData.dataVencimento || new Date().toISOString().split('T')[0],
            status: 'pendente',
            categoria: 'fornecedores',
            dataProcessamento: new Date().toISOString()
        };

        // Store in accounts payable
        const accountsPayable = JSON.parse(localStorage.getItem('accountsPayable') || '[]');
        accountsPayable.push(payableData);
        localStorage.setItem('accountsPayable', JSON.stringify(accountsPayable));

        this.log(`Conta a pagar criada: ${payableData.fornecedor}`, 'success');
        return payableData;
    }

    // Process alerts
    processAlerts(invoiceData) {
        const alerts = [];
        const valor = parseFloat(invoiceData.total) || 0;

        // High value alert
        if (valor > 1000) {
            alerts.push({
                type: 'warning',
                message: `Fatura de alto valor: €${valor.toFixed(2)}`,
                timestamp: new Date().toISOString()
            });
        }

        // Duplicate check
        const existingInvoices = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
        const duplicate = existingInvoices.find(inv => 
            inv.numero === invoiceData.numero && inv.nifEmitente === invoiceData.nifEmitente
        );

        if (duplicate) {
            alerts.push({
                type: 'error',
                message: 'Possível fatura duplicada detectada',
                timestamp: new Date().toISOString()
            });
        }

        // Store alerts
        if (alerts.length > 0) {
            const allAlerts = JSON.parse(localStorage.getItem('invoiceAlerts') || '[]');
            allAlerts.push(...alerts);
            localStorage.setItem('invoiceAlerts', JSON.stringify(allAlerts));
        }

        return alerts;
    }

    // Save processed invoice
    async saveProcessedInvoice(results) {
        const processedInvoices = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
        processedInvoices.push({
            ...results.invoiceData,
            integrations: results.integrations,
            processedAt: new Date().toISOString(),
            id: Date.now().toString()
        });
        localStorage.setItem('processedInvoices', JSON.stringify(processedInvoices));
        
        // Update statistics
        this.updateInvoiceStatistics();
    }

    // Show processing results
    showProcessingResults(results) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-lg font-semibold mb-4">Processamento Concluído</h3>
                <div class="space-y-2">
                    <p><strong>Fatura:</strong> ${results.invoiceData.numero || 'N/A'}</p>
                    <p><strong>Fornecedor:</strong> ${results.invoiceData.fornecedor || 'N/A'}</p>
                    <p><strong>Valor:</strong> €${results.invoiceData.total || '0'}</p>
                    <p><strong>Integrações:</strong> ${Object.keys(results.integrations).length}</p>
                </div>
                <button onclick="this.closest('.fixed').remove()" 
                        class="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
                    Fechar
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update invoice statistics
    updateInvoiceStatistics() {
        const processedInvoices = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
        const alerts = JSON.parse(localStorage.getItem('invoiceAlerts') || '[]');
        
        document.getElementById('processedCount').textContent = processedInvoices.length;
        document.getElementById('pendingCount').textContent = '0'; // Placeholder
        document.getElementById('errorCount').textContent = alerts.filter(a => a.type === 'error').length;
    }

    // Get enabled integrations
    getEnabledIntegrations() {
        return {
            banking: document.getElementById('integracaoBancaria').checked,
            iva: document.getElementById('controleIVA').checked,
            accounting: document.getElementById('categorizacao').checked,
            payable: document.getElementById('contasPagar').checked,
            alerts: document.getElementById('criarAlerta').checked,
            attachment: document.getElementById('anexarComprovativo').checked
        };
    }

    // Process banking integration
    async processBankingIntegration(invoiceData) {
        const selectedBank = document.getElementById('bancoSelecionado').value;
        const selectedAccount = document.getElementById('contaSelecionada').value;

        // Simulate banking API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'pending',
                    bank: selectedBank,
                    account: selectedAccount,
                    amount: invoiceData.total,
                    reference: `PAY-${Date.now()}`,
                    message: 'Pagamento iniciado via API bancária'
                });
            }, 1000);
        });
    }

    // Process IVA control
    processIVAControl(invoiceData) {
        const ivaRegime = document.getElementById('regimeIVA').value;
        const ivaAmount = parseFloat(invoiceData.iva) || 0;

        return {
            regime: ivaRegime,
            amount: ivaAmount,
            deductible: ivaRegime === 'pro-rata' ? ivaAmount * 0.8 : ivaAmount,
            status: 'registered',
            message: `IVA registrado no regime ${ivaRegime}`
        };
    }

    // Process accounting category
    processAccountingCategory(invoiceData) {
        const category = document.getElementById('categoriaContabil').value;
        const costCenter = document.getElementById('centroCusto').value;

        return {
            category: category,
            costCenter: costCenter,
            amount: invoiceData.total,
            status: 'categorized',
            message: `Fatura categorizada como ${category}`
        };
    }

    // Process accounts payable
    processAccountsPayable(invoiceData) {
        const dueDate = document.getElementById('dataVencimento').value;

        return {
            dueDate: dueDate,
            amount: invoiceData.total,
            status: 'registered',
            payableId: `AP-${Date.now()}`,
            message: 'Documento lançado em contas a pagar'
        };
    }

    // Process alerts
    processAlerts(invoiceData) {
        const alertType = document.getElementById('tipoAlerta').value;
        const alertDays = document.getElementById('antecedenciaAlerta').value;

        return {
            type: alertType,
            daysAdvance: alertDays,
            status: 'scheduled',
            alertId: `ALERT-${Date.now()}`,
            message: `Alerta de ${alertType} agendado para ${alertDays} dias antes`
        };
    }

    // Save processed invoice to local storage AND API
    async saveProcessedInvoice(results) {
        // Save to localStorage as backup
        const processed = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
        processed.push(results);
        localStorage.setItem('processedInvoices', JSON.stringify(processed));
        
        // Save to API if available
        if (window.invoiceAPI) {
            try {
                const invoiceData = {
                    nomeCliente: results.invoice.nomeAdquirente || this.lookupCompanyByNIF(results.invoice.nifAdquirente),
                    numeroFatura: results.invoice.numeroDocumento || results.invoice.codigoDocumento,
                    dataVencimento: results.invoice.dataVencimento || this.calculateDueDate(results.invoice.dataFatura),
                    valor: parseFloat(results.invoice.total) || 0,
                    linhaDigitavel: '', // Não disponível em QR AT
                    nifEmitente: results.invoice.nifEmitente,
                    nifAdquirente: results.invoice.nifAdquirente,
                    paisEmitente: results.invoice.paisEmitente,
                    paisAdquirente: results.invoice.paisAdquirente,
                    dataFatura: results.invoice.dataFatura,
                    tipoDocumento: results.invoice.tipoDocumento,
                    codigoDocumento: results.invoice.codigoDocumento,
                    total: parseFloat(results.invoice.total) || 0,
                    totalIVA: parseFloat(results.invoice.totalIVA) || 0,
                    baseTributavel: parseFloat(results.invoice.baseTributavel) || 0,
                    moeda: results.invoice.moeda || 'EUR',
                    rawQRContent: results.invoice.rawQRContent || '',
                    status: 'processed'
                };
                
                const response = await window.invoiceAPI.create(invoiceData);
                this.log(`💾 Fatura salva na API: ${response.data.id}`, 'success');
                
                // Store API ID for future reference
                results.apiId = response.data.id;
                
            } catch (error) {
                this.log(`⚠️ Erro ao salvar na API: ${error.message}`, 'warning');
                // Continue mesmo se API falhar (dados já estão no localStorage)
            }
        }
    }
    
    // Helper: Calculate due date (30 days from invoice date)
    calculateDueDate(invoiceDate) {
        if (!invoiceDate) return '';
        const date = new Date(invoiceDate);
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }

    // Show processing results
    showProcessingResults(results) {
        let message = '✅ Fatura processada com sucesso!\n\n';
        
        Object.entries(results.integrations).forEach(([key, integration]) => {
            if (integration) {
                message += `${integration.message}\n`;
            }
        });

        alert(message);
    }

    // Progress bar functions
    showProgressBar() {
        const progressDiv = document.getElementById('processingProgress');
        progressDiv.style.display = 'block';
        
        // Reset progress
        this.updateProgressBar(0);
        this.resetProgressSteps();
    }

    hideProgressBar() {
        const progressDiv = document.getElementById('processingProgress');
        setTimeout(() => {
            progressDiv.style.display = 'none';
        }, 300);
    }

    updateProgressBar(percentage) {
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');
        
        progressBar.style.width = percentage + '%';
        progressPercentage.textContent = percentage + '%';
    }

    updateProgressStep(stepNumber, message, percentage) {
        const step = document.getElementById(`step${stepNumber}`);
        if (step) {
            const circle = step.querySelector('.w-4.h-4');
            const dot = circle ? circle.querySelector('.w-2.h-2') : null;
            const text = step.querySelector('span');
            
            // Update progress bar
            this.updateProgressBar(percentage);
            
            // Update step appearance
            if (circle) {
                circle.classList.remove('border-gray-300');
                circle.classList.add('border-blue-500');
            }
            if (dot) {
                dot.classList.remove('bg-gray-300');
                dot.classList.add('bg-blue-500');
            }
            step.classList.remove('text-gray-600');
            step.classList.add('text-blue-600');
            
            // Update text
            if (text) {
                text.textContent = message;
            }
            
            // Add checkmark when complete
            if (percentage === 100) {
                setTimeout(() => {
                if (dot) {
                    dot.classList.add('hidden');
                }
                if (circle) {
                    circle.innerHTML = '<svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
                    circle.classList.remove('border-blue-500');
                    circle.classList.add('border-green-500', 'bg-green-50');
                }
                step.classList.remove('text-blue-600');
                step.classList.add('text-green-600');
            }, 200);
        }
        }
    }

    resetProgressSteps() {
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                const circle = step.querySelector('.w-4.h-4');
                const dot = circle ? circle.querySelector('.w-2.h-2') : null;
                
                if (circle) {
                    circle.classList.remove('border-green-500', 'bg-green-500');
                    circle.classList.add('border-gray-300');
                }
                if (dot) {
                    dot.classList.remove('bg-white');
                    dot.classList.add('bg-gray-300');
                }
                step.classList.remove('text-green-600');
                step.classList.add('text-gray-600');
            }
        }
    }

    // Automation Controls
    initializeAutomationControls() {
        // Load saved settings
        const settings = this.loadAutomationSettings();
        
        // Initialize toggles
        this.initializeToggle('autoScanToggle', settings.autoScan, (enabled) => {
            this.saveAutomationSetting('autoScan', enabled);
            this.log(enabled ? 'Auto-scan ativado' : 'Auto-scan desativado', 'info');
        });
        
        this.initializeToggle('autoFillToggle', settings.autoFill, (enabled) => {
            this.saveAutomationSetting('autoFill', enabled);
            this.log(enabled ? 'Auto-preenchimento ativado' : 'Auto-preenchimento desativado', 'info');
        });
        
        this.initializeToggle('autoSaveToggle', settings.autoSave, (enabled) => {
            this.saveAutomationSetting('autoSave', enabled);
            this.log(enabled ? 'Auto-salvamento ativado' : 'Auto-salvamento desativado', 'info');
        });
        
        this.initializeToggle('notificationsToggle', settings.notifications, (enabled) => {
            this.saveAutomationSetting('notifications', enabled);
            this.log(enabled ? 'Notificações ativadas' : 'Notificações desativadas', 'info');
        });

        // Initialize stats
        this.updateQRStats();
        
        // Reset stats button
        document.getElementById('resetStats').addEventListener('click', () => {
            this.resetQRStats();
        });
    }

    initializeToggle(toggleId, initialState, callback) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            const checkbox = toggle.querySelector('input[type="checkbox"]');
            const slider = toggle.querySelector('.w-10.h-6');
            const knob = slider ? slider.querySelector('.w-4.h-4') : null;
            
            if (checkbox) {
                // Set initial state
                checkbox.checked = initialState;
                this.updateToggleVisual(slider, knob, initialState);
                
                // Add click handler
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    const newState = !checkbox.checked;
                    checkbox.checked = newState;
                    this.updateToggleVisual(slider, knob, newState);
                    callback(newState);
                });
            }
        }
    }

    updateToggleVisual(slider, knob, enabled) {
        if (slider && knob) {
            if (enabled) {
                knob.classList.remove('translate-x-0');
                knob.classList.add('translate-x-4');
                slider.classList.add('bg-opacity-100');
            } else {
                knob.classList.remove('translate-x-4');
                knob.classList.add('translate-x-0');
                slider.classList.remove('bg-opacity-100');
                slider.classList.add('bg-gray-300');
            }
        }
    }

    loadAutomationSettings() {
        const defaultSettings = {
            autoScan: true,
            autoFill: true,
            autoSave: true,
            notifications: true
        };
        
        try {
            const saved = localStorage.getItem('automationSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            this.log('Erro ao carregar configurações de automação', 'error');
            return defaultSettings;
        }
    }

    saveAutomationSetting(key, value) {
        try {
            const settings = this.loadAutomationSettings();
            settings[key] = value;
            localStorage.setItem('automationSettings', JSON.stringify(settings));
        } catch (error) {
            this.log('Erro ao salvar configuração de automação', 'error');
        }
    }

    updateQRStats() {
        const today = new Date().toDateString();
        const stats = JSON.parse(localStorage.getItem('qrStats') || '{}');
        const todayStats = stats[today] || { count: 0, lastTime: null };
        
        document.getElementById('qrProcessedCount').textContent = todayStats.count;
        document.getElementById('lastProcessedTime').textContent = 
            todayStats.lastTime ? new Date(todayStats.lastTime).toLocaleTimeString('pt-PT', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }) : '--:--';
    }

    incrementQRStats() {
        const today = new Date().toDateString();
        const now = new Date().toISOString();
        const stats = JSON.parse(localStorage.getItem('qrStats') || '{}');
        
        if (!stats[today]) {
            stats[today] = { count: 0, lastTime: null };
        }
        
        stats[today].count++;
        stats[today].lastTime = now;
        
        // Keep only last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        Object.keys(stats).forEach(date => {
            if (new Date(date) < sevenDaysAgo) {
                delete stats[date];
            }
        });
        
        localStorage.setItem('qrStats', JSON.stringify(stats));
        this.updateQRStats();
    }

    resetQRStats() {
        if (confirm('Tem certeza que deseja resetar as estatísticas?')) {
            localStorage.removeItem('qrStats');
            this.updateQRStats();
            this.log('Estatísticas resetadas', 'info');
        }
    }

    resetProgressSteps() {
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            const circle = step.querySelector('.w-4.h-4');
            const dot = circle.querySelector('.w-2.h-2');
            
            // Reset appearance
            circle.classList.remove('border-blue-500', 'border-green-500', 'bg-green-50');
            circle.classList.add('border-gray-300');
            circle.innerHTML = '<div class="w-2 h-2 rounded-full bg-gray-300"></div>';
            step.classList.remove('text-blue-600', 'text-green-600');
            step.classList.add('text-gray-600');
        }
    }

    // Parse QR data for invoice summary
    parseQRData(qrContent) {
        const data = {};
        
        // Split by * and parse each field
        const fields = qrContent.split('*');
        
        fields.forEach(field => {
            if (field.includes(':')) {
                const [key, value] = field.split(':', 2);
                switch(key) {
                    case 'A':
                        data.nifEmitente = value;
                        break;
                    case 'B':
                        data.nifAdquirente = value;
                        break;
                    case 'C':
                        data.pais = value;
                        break;
                    case 'D':
                        data.tipoDocumento = value;
                        break;
                    case 'F':
                        data.data = value;
                        break;
                    case 'I2':
                        data.valorTotal = value;
                        break;
                    case 'N':
                        data.valorIva = value;
                        break;
                    case 'O':
                        data.valorComIva = value;
                        break;
                }
            }
        });
        
        return data;
    }

    // Enhanced showInvoiceSummary with animations
    showInvoiceSummary(qrContent) {
        const summaryDiv = document.getElementById('invoiceSummary');
        
        // Parse QR data
        const parsedData = this.parseQRData(qrContent);
        
        // Populate summary fields
        document.getElementById('summaryNifEmitente').textContent = parsedData.nifEmitente || '-';
        document.getElementById('summaryDataFatura').textContent = parsedData.data || '-';
        document.getElementById('summaryTotal').textContent = parsedData.valorTotal || '-';
        document.getElementById('summaryTipoDocumento').textContent = parsedData.tipoDocumento || '-';
        document.getElementById('summaryNifAdquirente').textContent = parsedData.nifAdquirente || '-';
        
        // Show with animation
        summaryDiv.style.display = 'block';
        setTimeout(() => {
            summaryDiv.classList.remove('opacity-0', 'scale-95');
            summaryDiv.classList.add('opacity-100', 'scale-100');
        }, 50);
        
        // Setup event listeners
        document.getElementById('proceedToForm').onclick = () => {
            this.hideInvoiceSummary();
            this.showInvoiceProcessingInterface(qrContent);
        };
        
        document.getElementById('scanAnother').onclick = () => {
            this.resetInterface();
        };
    }

    hideInvoiceSummary() {
        const summaryDiv = document.getElementById('invoiceSummary');
        summaryDiv.classList.remove('opacity-100', 'scale-100');
        summaryDiv.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            summaryDiv.style.display = 'none';
        }, 300);
    }
}

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize debug session
    window.debugSession = {
        startTime: Date.now(),
        logs: [],
        stats: { info: 0, success: 0, warning: 0, error: 0, debug: 0 },
        averageProcessingTime: 0
    };
    
    // Initialize scanner
    const scanner = new JSQRScanner();
    
    // Initialize automation controls
    scanner.initializeAutomationControls();
    
    // Update technical details on load
    setTimeout(() => {
        scanner.updateTechnicalDetails();
        scanner.updateSessionStats('info');
    }, 1000);

    // Initialize Navigation Menu
    initializeNavigation();

    // Initialize Accordion Functionality
    initializeAccordions();

    // Initialize Dark Mode
    initializeDarkMode();

    // Initialize Enhanced Statistics Panel
    initializeStatisticsPanel();

    // Initialize Help Modal
    initializeHelpModal();

    // Initialize Settings
    initializeSettings();

    // Initialize Invoice Modal
     initializeInvoiceModal();
 });

 // Invoice Modal Functions
function initializeInvoiceModal() {
    const invoiceModal = document.getElementById('invoiceModal');
    const closeInvoiceModal = document.getElementById('closeInvoiceModal');
    const cancelProcessing = document.getElementById('cancelProcessing');
    const saveAsDraft = document.getElementById('saveAsDraft');
    const processInvoice = document.getElementById('processInvoice');
    
    // Find all elements with "Nova Fatura" text and add click handlers
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        if (element.textContent && element.textContent.trim() === 'Nova Fatura') {
            element.style.cursor = 'pointer';
            element.addEventListener('click', openInvoiceModal);
        }
    });
    
    // Also add handler to any element with text "Nova Fatura"
    document.addEventListener('click', function(e) {
        if (e.target.textContent && e.target.textContent.includes('Nova Fatura')) {
            openInvoiceModal();
        }
    });
    
    // Close modal handlers
    closeInvoiceModal.addEventListener('click', closeInvoiceModalHandler);
    cancelProcessing.addEventListener('click', closeInvoiceModalHandler);
    
    // Click outside to close
    invoiceModal.addEventListener('click', function(e) {
        if (e.target === invoiceModal) {
            closeInvoiceModalHandler();
        }
    });
    
    // Form handlers
    saveAsDraft.addEventListener('click', saveInvoiceAsDraft);
    processInvoice.addEventListener('click', processInvoiceData);
    
    // Auto-calculate total amount
    const netAmount = document.getElementById('netAmount');
    const vatAmount = document.getElementById('vatAmount');
    const totalAmount = document.getElementById('totalAmount');
    const vatRate = document.getElementById('vatRate');
    
    function calculateTotal() {
        const net = parseFloat(netAmount.value) || 0;
        const vat = parseFloat(vatAmount.value) || 0;
        totalAmount.value = (net + vat).toFixed(2);
    }
    
    function calculateVAT() {
        const net = parseFloat(netAmount.value) || 0;
        const rate = parseFloat(vatRate.value) || 0;
        const vat = (net * rate / 100);
        vatAmount.value = vat.toFixed(2);
        calculateTotal();
    }
    
    netAmount.addEventListener('input', calculateVAT);
    vatAmount.addEventListener('input', calculateTotal);
    vatRate.addEventListener('change', calculateVAT);
    
    // Export and compliance handlers
    document.getElementById('exportSAFT').addEventListener('click', exportSAFT);
    document.getElementById('validateAT').addEventListener('click', validateAT);
    document.getElementById('exportExcel').addEventListener('click', exportExcel);
    
    // Generate payment reference
    generatePaymentReference();
}

function openInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Set due date to 30 days from today
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
}

function closeInvoiceModalHandler() {
    const modal = document.getElementById('invoiceModal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Reset form
    resetInvoiceForm();
}

function resetInvoiceForm() {
    // Reset all form fields
    document.getElementById('supplierNIF').value = '';
    document.getElementById('supplierName').value = '';
    document.getElementById('invoiceNumber').value = '';
    document.getElementById('invoiceDate').value = '';
    document.getElementById('netAmount').value = '';
    document.getElementById('vatAmount').value = '';
    document.getElementById('totalAmount').value = '';
    document.getElementById('dueDate').value = '';
    document.getElementById('accountingCategory').value = '';
    document.getElementById('costCenter').value = '';
    document.getElementById('vatRegime').value = 'normal';
    document.getElementById('supplierAccount').value = '';
    document.getElementById('vatAccount').value = '';
    document.getElementById('ivaDeductible').checked = true;
    document.getElementById('bankName').value = '';
    document.getElementById('bankAccount').value = '';
    document.getElementById('paymentMethod').value = 'transferencia';
    document.getElementById('automaticPayment').checked = false;
    document.getElementById('paymentAlert').checked = true;
    
    // Hide progress section
    document.getElementById('processingProgress').style.display = 'none';
    
    // Generate new payment reference
    generatePaymentReference();
}

function saveInvoiceAsDraft() {
    const invoiceData = collectInvoiceData();
    
    // Save to localStorage as draft
    const drafts = JSON.parse(localStorage.getItem('invoiceDrafts') || '[]');
    invoiceData.id = Date.now();
    invoiceData.status = 'draft';
    invoiceData.createdAt = new Date().toISOString();
    
    drafts.push(invoiceData);
    localStorage.setItem('invoiceDrafts', JSON.stringify(drafts));
    
    showNotification('Fatura salva como rascunho', 'success');
    closeInvoiceModalHandler();
}

function processInvoiceData() {
    const invoiceData = collectInvoiceData();
    
    // Validate required fields
    if (!validateInvoiceData(invoiceData)) {
        return;
    }
    
    // Show progress section
    const progressSection = document.getElementById('processingProgress');
    progressSection.style.display = 'block';
    
    // Simulate processing steps
    simulateProcessing(invoiceData);
}

function collectInvoiceData() {
    return {
        supplierNIF: document.getElementById('supplierNIF').value,
        supplierName: document.getElementById('supplierName').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        netAmount: parseFloat(document.getElementById('netAmount').value) || 0,
        vatAmount: parseFloat(document.getElementById('vatAmount').value) || 0,
        totalAmount: parseFloat(document.getElementById('totalAmount').value) || 0,
        vatRate: document.getElementById('vatRate').value,
        dueDate: document.getElementById('dueDate').value,
        accountingCategory: document.getElementById('accountingCategory').value,
        costCenter: document.getElementById('costCenter').value,
        vatRegime: document.getElementById('vatRegime').value,
        supplierAccount: document.getElementById('supplierAccount').value,
        vatAccount: document.getElementById('vatAccount').value,
        ivaDeductible: document.getElementById('ivaDeductible').checked,
        bankName: document.getElementById('bankName').value,
        bankAccount: document.getElementById('bankAccount').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        paymentReference: document.getElementById('paymentReference').value,
        automaticPayment: document.getElementById('automaticPayment').checked,
        paymentAlert: document.getElementById('paymentAlert').checked
    };
}

function validateInvoiceData(data) {
    const requiredFields = [
        { field: 'supplierNIF', name: 'NIF do Fornecedor' },
        { field: 'supplierName', name: 'Nome do Fornecedor' },
        { field: 'invoiceNumber', name: 'Número da Fatura' },
        { field: 'invoiceDate', name: 'Data da Fatura' },
        { field: 'netAmount', name: 'Valor sem IVA' },
        { field: 'totalAmount', name: 'Valor Total' }
    ];
    
    for (const { field, name } of requiredFields) {
        if (!data[field] || data[field] === 0) {
            showNotification(`Campo obrigatório: ${name}`, 'error');
            return false;
        }
    }
    
    // Validate NIF (Portuguese tax number)
    if (data.supplierNIF && !validateNIF(data.supplierNIF)) {
        showNotification('NIF inválido', 'error');
        return false;
    }
    
    return true;
}

function validateNIF(nif) {
    // Basic NIF validation for Portugal
    if (!/^\d{9}$/.test(nif)) return false;
    
    const digits = nif.split('').map(Number);
    const checkDigit = digits[8];
    
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += digits[i] * (9 - i);
    }
    
    const remainder = sum % 11;
    const expectedCheckDigit = remainder < 2 ? 0 : 11 - remainder;
    
    return checkDigit === expectedCheckDigit;
}

function simulateProcessing(invoiceData) {
    const steps = [
        { id: 'step1', duration: 1000 },
        { id: 'step2', duration: 1500 },
        { id: 'step3', duration: 1200 },
        { id: 'step4', duration: 800 }
    ];
    
    let currentStep = 0;
    let progress = 0;
    
    function processStep() {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            const stepElement = document.getElementById(step.id);
            
            // Mark current step as active
            stepElement.classList.remove('text-gray-600', 'dark:text-gray-400');
            stepElement.classList.add('text-blue-600', 'dark:text-blue-400');
            
            // Update step indicator
            const indicator = stepElement.querySelector('.w-4.h-4');
            indicator.classList.remove('border-gray-300');
            indicator.classList.add('border-blue-600', 'bg-blue-600');
            
            const dot = indicator.querySelector('.w-2.h-2');
            dot.classList.remove('bg-gray-300');
            dot.classList.add('bg-white');
            
            setTimeout(() => {
                // Mark step as completed
                stepElement.classList.remove('text-blue-600', 'dark:text-blue-400');
                stepElement.classList.add('text-green-600', 'dark:text-green-400');
                
                // Update progress
                progress = ((currentStep + 1) / steps.length) * 100;
                document.getElementById('progressBar').style.width = `${progress}%`;
                document.getElementById('progressPercentage').textContent = `${Math.round(progress)}%`;
                
                currentStep++;
                processStep();
            }, step.duration);
        } else {
            // Processing complete
            completeProcessing(invoiceData);
        }
    }
    
    processStep();
}

function completeProcessing(invoiceData) {
    // Save processed invoice
    const processedInvoices = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
    invoiceData.id = Date.now();
    invoiceData.status = 'processed';
    invoiceData.processedAt = new Date().toISOString();
    
    processedInvoices.push(invoiceData);
    localStorage.setItem('processedInvoices', JSON.stringify(processedInvoices));
    
    // Show success message
    showNotification('Fatura processada com sucesso!', 'success');
    
    // Close modal after delay
    setTimeout(() => {
        closeInvoiceModalHandler();
    }, 2000);
}

function generatePaymentReference() {
    // Generate a simple payment reference
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const reference = `${timestamp}${random}`;
    
    document.getElementById('paymentReference').value = reference;
}

function exportSAFT() {
    showNotification('Exportação SAF-T iniciada...', 'info');
    // Simulate SAF-T export
    setTimeout(() => {
        showNotification('Arquivo SAF-T gerado com sucesso', 'success');
    }, 2000);
}

function validateAT() {
    showNotification('Validação AT iniciada...', 'info');
    // Simulate AT validation
    setTimeout(() => {
        showNotification('Validação AT concluída com sucesso', 'success');
    }, 3000);
}

function exportExcel() {
    const invoiceData = collectInvoiceData();
    
    // Create CSV content
    const csvContent = [
        ['Campo', 'Valor'],
        ['NIF do Fornecedor', invoiceData.supplierNIF],
        ['Nome do Fornecedor', invoiceData.supplierName],
        ['Número da Fatura', invoiceData.invoiceNumber],
        ['Data da Fatura', invoiceData.invoiceDate],
        ['Valor sem IVA', invoiceData.netAmount],
        ['Valor do IVA', invoiceData.vatAmount],
        ['Valor Total', invoiceData.totalAmount],
        ['Taxa de IVA', invoiceData.vatRate + '%'],
        ['Data de Vencimento', invoiceData.dueDate],
        ['Categoria Contabilística', invoiceData.accountingCategory],
        ['Centro de Custo', invoiceData.costCenter],
        ['Regime de IVA', invoiceData.vatRegime],
        ['Banco', invoiceData.bankName],
        ['Método de Pagamento', invoiceData.paymentMethod],
        ['Referência de Pagamento', invoiceData.paymentReference]
    ].map(row => row.join(',')).join('\n');
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fatura_${invoiceData.invoiceNumber || 'backup'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Backup Excel exportado com sucesso', 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
    
    // Set colors based on type
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Dark Mode Functions
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    
    // Check for saved dark mode preference or default to light mode
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Apply initial theme
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        updateDarkModeIcon(true);
    }
    
    // Toggle dark mode
    darkModeToggle.addEventListener('click', function() {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
            updateDarkModeIcon(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
            updateDarkModeIcon(true);
        }
    });
}

function updateDarkModeIcon(isDark) {
    const darkModeIcon = document.getElementById('darkModeIcon');
    
    if (isDark) {
        // Sun icon for light mode toggle
        darkModeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
        `;
    } else {
        // Moon icon for dark mode toggle
        darkModeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
        `;
    }
}

// Accordion Functions
function initializeAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const icon = this.querySelector('.accordion-icon');
            
            if (content.style.display === 'none' || content.style.display === '') {
                // Open accordion
                content.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
                this.classList.add('bg-gray-100');
            } else {
                // Close accordion
                content.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
                this.classList.remove('bg-gray-100');
            }
        });
    });
}

// Navigation Menu Functions
function initializeNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const navItems = document.querySelectorAll('.nav-item');

    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            toggleSidebar();
        });
    }

    // Overlay click to close
    if (overlay) {
        overlay.addEventListener('click', () => {
            closeSidebar();
        });
    }

    // Navigation item clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Handle navigation
            const navId = item.id;
            handleNavigation(navId);
            
            // Close mobile menu
            if (window.innerWidth < 1024) {
                closeSidebar();
            }
        });
    });

    // Update sidebar stats
    updateSidebarStats();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function handleNavigation(navId) {
    // Hide all sections first
    const sections = ['scanner-section', 'automation-section', 'invoices-section', 'stats-section', 'settings-section'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });

    // Show relevant section based on navigation
    switch(navId) {
        case 'nav-scanner':
            showSection('scanner-section');
            break;
        case 'nav-automation':
            showSection('automation-section');
            break;
        case 'nav-invoices':
            showSection('invoices-section');
            break;
        case 'nav-stats':
            showSection('stats-section');
            break;
        case 'nav-settings':
            showSection('settings-section');
            break;
        default:
            showSection('scanner-section');
    }
}

function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    } else {
        // If section doesn't exist, show all content (default view)
        const allSections = document.querySelectorAll('[id$="-section"]');
        allSections.forEach(s => s.style.display = 'block');
    }
}

// Toggle section content (for collapsible sections)
function toggleSection(contentId) {
    const content = document.getElementById(contentId);
    const button = document.querySelector(`[onclick="toggleSection('${contentId}')"]`);
    
    if (content && button) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        
        // Rotate the arrow icon
        const arrow = button.querySelector('svg');
        if (arrow) {
            arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            arrow.style.transition = 'transform 0.2s ease';
        }
    }
}

function updateSidebarStats() {
    // Update QR count
    const qrStats = JSON.parse(localStorage.getItem('qrStats') || '{}');
    const totalQRs = Object.values(qrStats).reduce((sum, dayStats) => sum + (dayStats.scanned || 0), 0);
    
    const qrCountElement = document.getElementById('sidebar-qr-count');
    if (qrCountElement) {
        qrCountElement.textContent = totalQRs;
    }

    // Update invoice count
    const processed = JSON.parse(localStorage.getItem('processedInvoices') || '[]');
    const invoiceCountElement = document.getElementById('sidebar-invoice-count');
    if (invoiceCountElement) {
        invoiceCountElement.textContent = processed.length;
    }
}

// Enhanced Statistics Panel Functions
function initializeStatisticsPanel() {
    const statsToggle = document.getElementById('statsToggle');
    const detailedStats = document.getElementById('detailedStats');
    const resetStatsBtn = document.getElementById('resetStats');
    const exportStatsBtn = document.getElementById('exportStats');
    const shareStatsBtn = document.getElementById('shareStats');
    
    // Initialize session start time
    const sessionStart = new Date();
    document.getElementById('sessionStart').textContent = sessionStart.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Toggle detailed stats visibility
    let isExpanded = localStorage.getItem('statsExpanded') === 'true';
    updateStatsVisibility(isExpanded);
    
    statsToggle.addEventListener('click', function() {
        isExpanded = !isExpanded;
        updateStatsVisibility(isExpanded);
        localStorage.setItem('statsExpanded', isExpanded.toString());
    });
    
    // Reset statistics
    resetStatsBtn.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja resetar todas as estatísticas?')) {
            resetAllStatistics();
            showNotification('Estatísticas resetadas com sucesso!', 'success');
        }
    });
    
    // Export statistics
    exportStatsBtn.addEventListener('click', function() {
        exportStatistics();
    });
    
    // Share statistics
    shareStatsBtn.addEventListener('click', function() {
        shareStatistics();
    });
    
    // Update statistics periodically
    setInterval(updateStatisticsDisplay, 1000);
}

function updateStatsVisibility(isExpanded) {
    const detailedStats = document.getElementById('detailedStats');
    const toggleIcon = document.querySelector('#statsToggle svg');
    
    if (isExpanded) {
        detailedStats.style.display = 'block';
        toggleIcon.style.transform = 'rotate(180deg)';
    } else {
        detailedStats.style.display = 'none';
        toggleIcon.style.transform = 'rotate(0deg)';
    }
}

function updateStatisticsDisplay() {
    const stats = getStatistics();
    
    // Update success rate
    const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100;
    document.getElementById('successRate').textContent = successRate + '%';
    
    // Update performance metrics
    if (stats.times.length > 0) {
        const minTime = Math.min(...stats.times);
        const maxTime = Math.max(...stats.times);
        document.getElementById('minTime').textContent = minTime + 'ms';
        document.getElementById('maxTime').textContent = maxTime + 'ms';
    }
    
    // Calculate QRs per minute
    const sessionDuration = (Date.now() - (stats.sessionStart || Date.now())) / 60000; // minutes
    const qrPerMinute = sessionDuration > 0 ? Math.round(stats.total / sessionDuration) : 0;
    document.getElementById('qrPerMinute').textContent = qrPerMinute.toString();
}

function getStatistics() {
    return {
        total: parseInt(document.getElementById('scanCount').textContent) || 0,
        success: parseInt(document.getElementById('successCount').textContent) || 0,
        errors: parseInt(document.getElementById('errorCount').textContent) || 0,
        avgTime: parseInt(document.getElementById('avgTime').textContent) || 0,
        times: JSON.parse(localStorage.getItem('processingTimes') || '[]'),
        sessionStart: parseInt(localStorage.getItem('sessionStart')) || Date.now()
    };
}

function resetAllStatistics() {
    document.getElementById('scanCount').textContent = '0';
    document.getElementById('successCount').textContent = '0';
    document.getElementById('errorCount').textContent = '0';
    document.getElementById('avgTime').textContent = '0ms';
    document.getElementById('successRate').textContent = '100%';
    document.getElementById('lastInvoiceTime').textContent = '--:--';
    document.getElementById('minTime').textContent = '--';
    document.getElementById('maxTime').textContent = '--';
    document.getElementById('qrPerMinute').textContent = '0';
    
    // Reset session start time
    const newSessionStart = Date.now();
    localStorage.setItem('sessionStart', newSessionStart.toString());
    document.getElementById('sessionStart').textContent = new Date(newSessionStart).toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Clear stored data
    localStorage.removeItem('processingTimes');
    localStorage.removeItem('processedInvoices');
}

function exportStatistics() {
    const stats = getStatistics();
    const exportData = {
        timestamp: new Date().toISOString(),
        session: {
            start: new Date(stats.sessionStart).toISOString(),
            duration: Math.round((Date.now() - stats.sessionStart) / 60000) + ' minutos'
        },
        totals: {
            qrCodes: stats.total,
            sucessos: stats.success,
            erros: stats.errors,
            taxaSucesso: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) + '%' : '100%'
        },
        performance: {
            tempoMedio: stats.avgTime + 'ms',
            tempoMinimo: stats.times.length > 0 ? Math.min(...stats.times) + 'ms' : '--',
            tempoMaximo: stats.times.length > 0 ? Math.max(...stats.times) + 'ms' : '--',
            qrsPorMinuto: document.getElementById('qrPerMinute').textContent
        }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estatisticas-scanner-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Estatísticas exportadas com sucesso!', 'success');
}

function shareStatistics() {
    const stats = getStatistics();
    const shareText = `📊 Estatísticas do Scanner QR - Grupo AreLuna
    
🔍 QR Codes Processados: ${stats.total}
✅ Sucessos: ${stats.success}
❌ Erros: ${stats.errors}
📈 Taxa de Sucesso: ${stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100}%
⚡ Tempo Médio: ${stats.avgTime}ms
📊 QRs/min: ${document.getElementById('qrPerMinute').textContent}

#GrupoAreLuna #Scanner #Produtividade`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Estatísticas do Scanner QR',
            text: shareText
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Estatísticas copiadas para a área de transferência!', 'success');
        }).catch(() => {
            showNotification('Erro ao copiar estatísticas', 'error');
        });
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    // Set notification style based on type
    switch(type) {
        case 'success':
            notification.className += ' bg-green-500 text-white';
            break;
        case 'error':
            notification.className += ' bg-red-500 text-white';
            break;
        default:
            notification.className += ' bg-blue-500 text-white';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize Help Modal functionality
function initializeHelpModal() {
    const helpButton = document.getElementById('helpButton');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    const tutorialTabs = document.querySelectorAll('.tutorial-tab');
    const tutorialContents = document.querySelectorAll('.tutorial-content');
    const startTutorialDemo = document.getElementById('startTutorialDemo');
    const exportHelpGuide = document.getElementById('exportHelpGuide');

    // Open modal
    helpButton?.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    function closeModal() {
        helpModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    closeHelpModal?.addEventListener('click', closeModal);

    // Close on backdrop click
    helpModal?.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !helpModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Tab switching functionality
    tutorialTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update tab styles
            tutorialTabs.forEach(t => {
                t.classList.remove('active', 'bg-white', 'dark:bg-gray-600', 'text-blue-600', 'dark:text-blue-400');
                t.classList.add('text-gray-600', 'dark:text-gray-400', 'hover:text-gray-800', 'dark:hover:text-gray-200');
            });
            
            tab.classList.add('active', 'bg-white', 'dark:bg-gray-600', 'text-blue-600', 'dark:text-blue-400');
            tab.classList.remove('text-gray-600', 'dark:text-gray-400', 'hover:text-gray-800', 'dark:hover:text-gray-200');
            
            // Show/hide content
            tutorialContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });

    // Demo functionality
    startTutorialDemo?.addEventListener('click', () => {
        closeModal();
        showNotification('🎯 Demo iniciada! Siga as instruções na tela.', 'success');
        
        // Simulate demo steps
        setTimeout(() => {
            const cameraButton = document.getElementById('startCamera');
            if (cameraButton) {
                cameraButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cameraButton.classList.add('animate-pulse');
                showNotification('👆 Clique em "Iniciar Câmera" para começar', 'info');
                
                setTimeout(() => {
                    cameraButton.classList.remove('animate-pulse');
                }, 3000);
            }
        }, 1000);
    });

    // Export guide functionality
    exportHelpGuide?.addEventListener('click', () => {
        const guideContent = `
# Guia do Leitor de Faturas - Grupo AreLuna

## 🚀 Primeiros Passos
Sistema inteligente para digitalização e processamento automático de faturas portuguesas através de QR codes.

### Preparação
- Tenha as faturas com QR code em mãos
- Certifique-se de ter boa iluminação
- Permita acesso à câmera quando solicitado

### Digitalização
- Clique em "Iniciar Câmera"
- Aponte para o QR code da fatura
- Aguarde o processamento automático

## 📱 Guia do Scanner

### Dicas para Melhor Digitalização
**Faça Assim:**
- Mantenha a fatura plana e bem iluminada
- Posicione o QR code no centro da tela
- Mantenha distância de 10-20cm
- Aguarde o foco automático

**Evite:**
- QR codes danificados ou sujos
- Reflexos de luz direta
- Movimentos bruscos da câmera
- Faturas dobradas ou amassadas

## ⚙️ Funcionalidades Avançadas
- Estatísticas em tempo real
- Modo escuro adaptável
- Integração bancária automática
- Controlo de IVA inteligente

## 🔧 Resolução de Problemas
- Verifique permissões da câmera
- Melhore a iluminação
- Use navegadores modernos
- Mantenha o sistema atualizado

---
Versão 2.1.0 • Grupo AreLuna
        `;

        const blob = new Blob([guideContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'guia-leitor-faturas.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('📄 Guia exportado com sucesso!', 'success');
    });
}

// Settings Functions
function initializeSettings() {
    // Load saved settings from localStorage
    loadSettings();

    // Settings event listeners
    const saveSettingsBtn = document.getElementById('saveSettings');
    const resetSettingsBtn = document.getElementById('resetSettings');

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }

    // Auto-save on checkbox change
    const checkboxes = document.querySelectorAll('#settings-section input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', autoSaveSettings);
    });
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('scannerSettings') || '{}');
    
    // Default settings
    const defaults = {
        autoScan: true,
        sound: true,
        vibration: false,
        autoProcess: true,
        strictValidation: false,
        autoBackup: true
    };

    // Merge with defaults
    const finalSettings = { ...defaults, ...settings };

    // Apply to UI
    document.getElementById('autoScanSetting').checked = finalSettings.autoScan;
    document.getElementById('soundSetting').checked = finalSettings.sound;
    document.getElementById('vibrationSetting').checked = finalSettings.vibration;
    document.getElementById('autoProcessSetting').checked = finalSettings.autoProcess;
    document.getElementById('strictValidationSetting').checked = finalSettings.strictValidation;
    document.getElementById('autoBackupSetting').checked = finalSettings.autoBackup;
}

function saveSettings() {
    const settings = {
        autoScan: document.getElementById('autoScanSetting').checked,
        sound: document.getElementById('soundSetting').checked,
        vibration: document.getElementById('vibrationSetting').checked,
        autoProcess: document.getElementById('autoProcessSetting').checked,
        strictValidation: document.getElementById('strictValidationSetting').checked,
        autoBackup: document.getElementById('autoBackupSetting').checked
    };

    localStorage.setItem('scannerSettings', JSON.stringify(settings));
    
    // Show success message
    showNotification('Configurações salvas com sucesso!', 'success');
}

function autoSaveSettings() {
    saveSettings();
}

function resetSettings() {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
        localStorage.removeItem('scannerSettings');
        loadSettings();
        showNotification('Configurações restauradas para os padrões!', 'info');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-x-full`;
    
    // Set color based on type
    switch(type) {
        case 'success':
            notification.classList.add('bg-green-500');
            break;
        case 'error':
            notification.classList.add('bg-red-500');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500');
            break;
        default:
            notification.classList.add('bg-blue-500');
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS for active navigation state and toggle checkboxes
const style = document.createElement('style');
style.textContent = `
    .nav-item.active {
        background-color: rgb(239 246 255);
        color: rgb(29 78 216);
        font-weight: 600;
    }
    .nav-item.active svg {
        color: rgb(29 78 216);
    }
    
    .toggle-checkbox {
        appearance: none;
        width: 44px;
        height: 24px;
        background-color: #e5e7eb;
        border-radius: 12px;
        position: relative;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .toggle-checkbox:checked {
        background-color: #3b82f6;
    }
    
    .toggle-checkbox::before {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: white;
        top: 2px;
        left: 2px;
        transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .toggle-checkbox:checked::before {
        transform: translateX(20px);
    }
    
    .dark .toggle-checkbox {
        background-color: #4b5563;
    }
    
    .dark .toggle-checkbox:checked {
        background-color: #3b82f6;
    }
`;
document.head.appendChild(style);
