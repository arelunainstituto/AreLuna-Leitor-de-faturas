const express = require('express');
const multer = require('multer');
const QrCode = require('qrcode-reader');
const Jimp = require('jimp');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pino = require('pino');
const pinoHttp = require('pino-http');
const path = require('path');
const fs = require('fs-extra');
const jsQR = require('jsqr');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));
// Configure Helmet with a permissive CSP for local development to allow CDN scripts/styles
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // allow inline scripts used for Tailwind config and small helpers
        "https://cdn.tailwindcss.com",
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // allow inline styles injected by Tailwind CDN
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "data:"]
    }
  }
}));
app.use(cors());
app.use(compression());

// Middleware para forçar UTF-8 apenas em respostas JSON (rotas de API)
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));
app.use(express.static('public'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to try QR decoding with detailed error logging
function tryDecodeQR(image, strategyName) {
  return new Promise((resolve, reject) => {
    const qr = new QrCode();
    
    qr.callback = (err, value) => {
      if (err) {
        console.log(`[DEBUG] Strategy '${strategyName}' QR decode error: ${err.message}`);
        console.log(`[DEBUG] Error details:`, {
          name: err.name,
          message: err.message,
          stack: err.stack?.split('\n')[0] // First line of stack trace
        });
        reject(err);
      } else if (value && value.result) {
        console.log(`[DEBUG] Strategy '${strategyName}' decoded QR successfully`);
        resolve(value.result);
      } else {
        console.log(`[DEBUG] Strategy '${strategyName}' returned empty result`);
        reject(new Error('Empty QR result'));
      }
    };
    
    try {
      qr.decode(image.bitmap);
    } catch (decodeError) {
      console.log(`[DEBUG] Strategy '${strategyName}' decode exception: ${decodeError.message}`);
      reject(decodeError);
    }
  });
}

// Helper function to validate if the image is intact
async function validateImage(imagePath) {
  try {
    const stats = await fs.stat(imagePath);
    console.log(`[DEBUG] Validating image: ${imagePath} (${stats.size} bytes)`);
    
    // Check if file is not empty
    if (stats.size === 0) {
      throw new Error('Arquivo de imagem está vazio');
    }
    
    // Check if file is too small to be a valid image
    if (stats.size < 100) {
      throw new Error('Arquivo muito pequeno para ser uma imagem válida');
    }
    
    // Try to read first bytes to check PNG/JPEG signature
    const buffer = await fs.readFile(imagePath);
    const header = buffer.slice(0, 8);
    
    // Check PNG signature
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const isPNG = header.equals(pngSignature);
    
    // Check JPEG signature
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    
    if (!isPNG && !isJPEG) {
      throw new Error('Formato de arquivo não suportado. Use PNG ou JPEG.');
    }
    
    console.log(`[DEBUG] Valid image detected: ${isPNG ? 'PNG' : 'JPEG'}`);
    return { valid: true, format: isPNG ? 'PNG' : 'JPEG' };
    
  } catch (error) {
    console.log(`[ERROR] Image validation error: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

// Função para processar buffer de imagem (detecta e converte Base64)
function processImageBuffer(buffer) {
    try {
        // Verificar se o buffer existe e é válido
        if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new Error('Buffer inválido ou vazio');
        }
        
        // Verificar se é Base64
        const bufferStr = buffer.toString('utf8', 0, Math.min(100, buffer.length));
        if (bufferStr.includes('data:image')) {
            console.log('📝 Detectado formato Base64, convertendo...');
            const base64Data = buffer.toString('utf8').split(',')[1];
            if (!base64Data) {
                throw new Error('Dados Base64 inválidos');
            }
            return Buffer.from(base64Data, 'base64');
        }
        return buffer;
    } catch (error) {
        console.log('⚠️  Erro ao processar buffer:', error.message);
        throw error; // Re-throw the error instead of returning the potentially invalid buffer
    }
}

// Função para decodificar QR code usando jsQR com múltiplas estratégias
async function decodeQRCodeWithJsQR(buffer) {
    try {
        console.log('🔍 Tentando decodificação com jsQR...');
        
        const originalImage = await Jimp.read(buffer);
        console.log(`📐 Imagem original: ${originalImage.bitmap.width}x${originalImage.bitmap.height}`);
        
        // Estratégias de pré-processamento para jsQR
        const jsqrStrategies = [
            { 
                name: 'Original', 
                process: (img) => img.clone()
            },
            { 
                name: 'Grayscale + Contraste', 
                process: (img) => img.clone().greyscale().contrast(0.8)
            },
            { 
                name: 'Grayscale + Normalizado', 
                process: (img) => img.clone().greyscale().normalize()
            },
            { 
                name: 'Binarização Simples', 
                process: (img) => img.clone().greyscale().contrast(1.0).brightness(0.2)
            },
            { 
                name: 'Redimensionado 600px', 
                process: (img) => img.clone().resize(600, Jimp.AUTO).greyscale().contrast(0.5)
            },
            { 
                name: 'Redimensionado 400px + Contraste', 
                process: (img) => img.clone().resize(400, Jimp.AUTO).greyscale().contrast(0.8).normalize()
            },
            { 
                name: 'Ampliado 2x', 
                process: (img) => img.clone().scale(2).greyscale().contrast(0.6)
            }
        ];
        
        for (const strategy of jsqrStrategies) {
            try {
                console.log(`🔍 jsQR tentando estratégia: ${strategy.name}`);
                
                const processedImage = strategy.process(originalImage);
                const { width, height } = processedImage.bitmap;
                
                // Garantir que a imagem está em RGBA
                processedImage.rgba();
                
                // Criar Uint8ClampedArray para jsQR
                const imageData = new Uint8ClampedArray(processedImage.bitmap.data);
                
                // Tentar decodificar com jsQR
                const code = jsQR(imageData, width, height, {
                    inversionAttempts: "dontInvert", // Tentar sem inversão primeiro
                });
                
                if (code && code.data) {
                    console.log(`✅ jsQR decodificou com sucesso usando estratégia: ${strategy.name}`);
                    return code.data;
                }
                
                // Tentar também com inversão
                const codeInverted = jsQR(imageData, width, height, {
                    inversionAttempts: "onlyInvert", // Tentar apenas com inversão
                });
                
                if (codeInverted && codeInverted.data) {
                    console.log(`✅ jsQR decodificou com sucesso (invertido) usando estratégia: ${strategy.name}`);
                    return codeInverted.data;
                }
                
            } catch (strategyError) {
                console.log(`❌ Falha na estratégia jsQR ${strategy.name}: ${strategyError.message}`);
            }
        }
        
        throw new Error('Nenhuma estratégia jsQR foi bem-sucedida');
        
    } catch (error) {
        console.log('❌ Falha geral no jsQR:', error.message);
        throw error;
    }
}
// Função melhorada para decodificar QR code com sistema de fallback
async function decodeQRCodeRobust(buffer) {
    try {
        // Verificar se o buffer existe e é válido
        if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new Error('Buffer inválido ou vazio');
        }
        
        const processedBuffer = processImageBuffer(buffer);
        console.log(`📐 Buffer processado: ${processedBuffer.length} bytes`);
        
        // Primeira tentativa: jsQR (mais robusto)
        try {
            return await decodeQRCodeWithJsQR(processedBuffer);
        } catch (jsqrError) {
            console.log('⚠️  jsQR falhou, tentando método alternativo...');
        }
        
        // Segunda tentativa: Jimp + qrcode-reader com múltiplas estratégias
        const image = await Jimp.read(processedBuffer);
        console.log(`📐 Imagem carregada: ${image.bitmap.width}x${image.bitmap.height}`);
        
        // Diferentes estratégias de processamento
        const strategies = [
            { name: 'Original', process: (img) => img.greyscale() },
            { name: 'Contraste Alto', process: (img) => img.greyscale().contrast(0.8) },
            { name: 'Normalizado', process: (img) => img.greyscale().normalize() },
            { name: 'Brilho Ajustado', process: (img) => img.greyscale().brightness(0.3).contrast(0.5) },
            { name: 'Redimensionado 500px', process: (img) => img.greyscale().resize(500, Jimp.AUTO) },
            { name: 'Redimensionado 800px', process: (img) => img.greyscale().resize(800, Jimp.AUTO) }
        ];
        
        for (const strategy of strategies) {
            try {
                console.log(`🔍 Tentando estratégia: ${strategy.name}`);
                const processedImage = strategy.process(image.clone());
                
                const qr = new QrCode();
                const result = await new Promise((resolve, reject) => {
                    qr.callback = (err, value) => {
                        if (err) reject(err);
                        else resolve(value);
                    };
                    qr.decode(processedImage.bitmap);
                });
                
                console.log(`✅ Sucesso com estratégia: ${strategy.name}`);
                return result.result;
                
            } catch (strategyError) {
                console.log(`❌ Falha na estratégia ${strategy.name}: ${strategyError.message}`);
            }
        }
        
        throw new Error('Nenhuma estratégia de decodificação foi bem-sucedida');
        
    } catch (error) {
        console.error('❌ Erro no processamento da imagem:', error.message);
        throw error;
    }
}

// QR Code decoding function
async function decodeQRCode(imagePath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        return reject(new Error('File not found'));
      }

      console.log(`[DEBUG] Attempting to decode QR code from: ${imagePath}`);
      
      // First, validate the image
      const validation = await validateImage(imagePath);
      if (!validation.valid) {
        return reject(new Error(`Imagem inválida: ${validation.error}`));
      }
      
      // Read file buffer first to check if it's valid
      const buffer = await fs.readFile(imagePath);
      console.log(`[DEBUG] Buffer length: ${buffer.length}, first bytes: ${buffer.slice(0, 10).toString('hex')}`);
      
      // Process buffer to handle Base64 if needed
      const processedBuffer = processImageBuffer(buffer);
      console.log(`[DEBUG] Processed buffer length: ${processedBuffer.length}, first bytes: ${processedBuffer.slice(0, 10).toString('hex')}`);
      
      // Try to read with Jimp using the processed buffer
      Jimp.read(processedBuffer)
        .then(async image => {
          console.log(`[DEBUG] Image loaded successfully: ${image.bitmap.width}x${image.bitmap.height}`);
          
          // Save original image for debugging
          const debugPath = imagePath.replace(/\.[^/.]+$/, '_debug.png');
          await image.writeAsync(debugPath);
          console.log(`[DEBUG] Debug image saved to: ${debugPath}`);
          
          // Multiple processing strategies
          const strategies = [
            // Strategy 1: Original image with grayscale
            {
              name: 'grayscale',
              process: (img) => img.clone().greyscale()
            },
            // Strategy 2: High contrast + grayscale
            {
              name: 'high_contrast',
              process: (img) => img.clone().greyscale().contrast(0.8).brightness(0.2)
            },
            // Strategy 3: Normalized + threshold
            {
              name: 'normalized',
              process: (img) => img.clone().greyscale().normalize().contrast(1.0)
            },
            // Strategy 4: Inverted colors (for dark QR codes)
            {
              name: 'inverted',
              process: (img) => img.clone().greyscale().invert()
            },
            // Strategy 5: Blur reduction + sharpening
            {
              name: 'sharpened',
              process: (img) => img.clone().greyscale().convolute([
                [-1, -1, -1],
                [-1,  9, -1],
                [-1, -1, -1]
              ])
            },
            // Strategy 6: Resize for better detection (if too small)
            {
              name: 'resized',
              process: (img) => {
                const minSize = 300;
                if (img.bitmap.width < minSize || img.bitmap.height < minSize) {
                  const scale = minSize / Math.min(img.bitmap.width, img.bitmap.height);
                  return img.clone().scale(scale).greyscale();
                }
                return img.clone().greyscale();
              }
            }
          ];
          
          // Try each strategy
          for (let i = 0; i < strategies.length; i++) {
            const strategy = strategies[i];
            console.log(`[DEBUG] Trying strategy ${i + 1}/${strategies.length}: ${strategy.name}`);
            
            try {
              const processedImage = strategy.process(image);
              
              // Save processed image for debugging
              const strategyDebugPath = imagePath.replace(/\.[^/.]+$/, `_${strategy.name}.png`);
              await processedImage.writeAsync(strategyDebugPath);
              console.log(`[DEBUG] Strategy ${strategy.name} image saved to: ${strategyDebugPath}`);
              
              const result = await tryDecodeQR(processedImage, strategy.name);
              if (result) {
                console.log(`[SUCCESS] QR code decoded with strategy '${strategy.name}': ${result}`);
                
                // Clean up debug files on success
                try {
                  await fs.remove(debugPath);
                  await fs.remove(strategyDebugPath);
                } catch (cleanupError) {
                  console.log(`[DEBUG] Cleanup error: ${cleanupError.message}`);
                }
                
                return resolve(result);
              }
            } catch (strategyError) {
              console.log(`[DEBUG] Strategy '${strategy.name}' failed: ${strategyError.message}`);
            }
          }
          
          // If all strategies failed, try rotation
          console.log(`[DEBUG] All strategies failed, trying rotation...`);
          const rotations = [90, 180, 270];
          
          for (const angle of rotations) {
            console.log(`[DEBUG] Trying rotation: ${angle} degrees`);
            try {
              const rotatedImage = image.clone().greyscale().rotate(angle);
              const result = await tryDecodeQR(rotatedImage, `rotated_${angle}`);
              if (result) {
                console.log(`[SUCCESS] QR code decoded with rotation ${angle}°: ${result}`);
                return resolve(result);
              }
            } catch (rotationError) {
              console.log(`[DEBUG] Rotation ${angle}° failed: ${rotationError.message}`);
            }
          }
          
          // Final attempt with combined processing
          console.log(`[DEBUG] Final attempt with combined processing...`);
          try {
            const finalImage = image.clone()
              .greyscale()
              .normalize()
              .contrast(0.6)
              .brightness(0.1);
              
            const result = await tryDecodeQR(finalImage, 'final_combined');
            if (result) {
              console.log(`[SUCCESS] QR code decoded with final combined processing: ${result}`);
              return resolve(result);
            }
          } catch (finalError) {
            console.log(`[DEBUG] Final attempt failed: ${finalError.message}`);
          }
          
          reject(new Error('QR Code não encontrado após todas as tentativas de processamento'));
        })
        .catch(err => {
          console.log(`[ERROR] Jimp read error: ${err.message}`);
          console.log(`[ERROR] Error stack: ${err.stack}`);
          
          // Provide more specific error messages for common issues
          if (err.message.includes('end of stream') || 
              err.message.includes('Could not find MIME') ||
              err.message.includes('read requests waiting')) {
            reject(new Error('Imagem corrompida ou truncada. Tente fazer upload de uma nova imagem do QR code.'));
          } else {
            reject(new Error(`Erro ao processar imagem: ${err.message}`));
          }
        });
        
    } catch (error) {
      console.log(`[ERROR] General error: ${error.message}`);
      reject(error);
    }
  });
}

// Import routes
const invoiceRoutes = require('./routes/invoices');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'QR Code Reader Service',
    timestamp: new Date().toISOString(),
    endpoints: {
      qrDecode: '/decode',
      invoices: '/api/faturas',
      health: '/health',
      docs: '/api/docs'
    }
  });
});

app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'QR Code Reader Service',
    timestamp: new Date().toISOString()
  });
});

// API Routes
const fileRoutes = require('./routes/files');
app.use('/api/faturas', invoiceRoutes);
app.use('/api/files', fileRoutes);

// API Documentation
app.get('/api/docs', (req, res) => {
  const docsPath = path.join(__dirname, 'docs', 'API.md');
  if (fs.existsSync(docsPath)) {
    res.sendFile(docsPath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Documentação não encontrada'
    });
  }
});

// Endpoint para decodificar QR code
app.post('/decode', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('❌ Nenhum arquivo foi enviado na requisição');
            return res.status(400).json({ 
                success: false, 
                message: 'Nenhum arquivo foi enviado' 
            });
        }

        console.log(`📁 Processando arquivo: ${req.file.originalname}`);
        console.log(`📊 Tamanho: ${req.file.size} bytes`);
        console.log(`🎯 Tipo: ${req.file.mimetype}`);
        console.log(`📂 Caminho temporário: ${req.file.path}`);

        const startTime = Date.now();
        console.log('🚀 Iniciando processo de decodificação...');
        
        const result = await decodeQRCode(req.file.path);
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Decodificação bem-sucedida em ${processingTime}ms`);
        console.log(`📄 Dados decodificados (primeiros 100 chars): ${result.substring(0, 100)}...`);
        
        // Limpar arquivo temporário
        await fs.remove(req.file.path);
        console.log('🗑️  Arquivo temporário removido');
        
        res.json({
            success: true,
            data: result,
            processingTime: processingTime
        });

    } catch (error) {
        const processingTime = Date.now() - (req.startTime || Date.now());
        console.error('❌ Erro na decodificação:', error.message);
        console.error('🔍 Stack trace:', error.stack);
        console.error(`⏱️  Tempo até falha: ${processingTime}ms`);
        
        // Limpar arquivo temporário em caso de erro
        if (req.file && req.file.path) {
            try {
                await fs.remove(req.file.path);
                console.log('🗑️  Arquivo temporário removido após erro');
            } catch (cleanupError) {
                console.error('⚠️  Erro ao limpar arquivo temporário:', cleanupError.message);
            }
        }
        
        res.status(400).json({
            success: false,
            message: 'QR Code não encontrado ou não pôde ser decodificado',
            error: error.message,
            processingTime: processingTime
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 QR Code Reader Service running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation available at http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;