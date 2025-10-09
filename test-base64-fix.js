const fs = require('fs-extra');

// Função para detectar e converter Base64 para buffer
function processImageBuffer(buffer) {
  try {
    // Verificar se é Base64 (texto que começa com data: ou apenas Base64)
    const bufferStr = buffer.toString('utf8');
    
    // Detectar se é uma string Base64
    if (bufferStr.startsWith('data:image/')) {
      // Data URL format: data:image/png;base64,iVBORw0KGgo...
      const base64Data = bufferStr.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } else if (bufferStr.match(/^[A-Za-z0-9+/]+=*$/)) {
      // Pure Base64 string
      return Buffer.from(bufferStr, 'base64');
    } else if (bufferStr.startsWith('iVBORw0KGgo') || bufferStr.startsWith('/9j/') || bufferStr.startsWith('R0lGOD')) {
      // Common image Base64 prefixes
      return Buffer.from(bufferStr, 'base64');
    }
    
    // Se não é Base64, retorna o buffer original
    return buffer;
  } catch (error) {
    // Se falhar, retorna o buffer original
    return buffer;
  }
}

async function testFix() {
  const buffer = await fs.readFile('./public/user-qr-real.png');
  console.log('Original buffer length:', buffer.length);
  console.log('First 20 chars as string:', buffer.toString('utf8').substring(0, 20));
  
  const processed = processImageBuffer(buffer);
  console.log('Processed buffer length:', processed.length);
  console.log('First 10 bytes as hex:', processed.slice(0, 10).toString('hex'));
  
  // Check if it's now a valid PNG
  const isPNG = processed.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
  console.log('Is valid PNG after processing:', isPNG);
}

testFix().catch(console.error);
