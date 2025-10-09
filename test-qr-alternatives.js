const fs = require('fs');
const path = require('path');

// Test different QR code libraries
async function testQRLibraries() {
    const imagePath = 'public/user-qr-real-decoded.png';
    
    console.log('Testing QR code libraries with user-provided image...');
    console.log(`Image path: ${imagePath}`);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
        console.error('Image file not found!');
        return;
    }
    
    const stats = fs.statSync(imagePath);
    console.log(`File size: ${stats.size} bytes`);
    
    // Test 1: qrcode-reader with sharp (alternative to Jimp)
    try {
        console.log('\n--- Testing with Sharp + qrcode-reader ---');
        const sharp = require('sharp');
        const QrCode = require('qrcode-reader');
        
        const buffer = await sharp(imagePath)
            .greyscale()
            .png()
            .toBuffer();
            
        const qr = new QrCode();
        
        const result = await new Promise((resolve, reject) => {
            qr.callback = (err, value) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(value);
                }
            };
            
            // Convert buffer to image data format
            sharp(buffer)
                .raw()
                .toBuffer({ resolveWithObject: true })
                .then(({ data, info }) => {
                    qr.decode({
                        data: data,
                        width: info.width,
                        height: info.height
                    });
                })
                .catch(reject);
        });
        
        console.log('Sharp + qrcode-reader SUCCESS:', result.result);
        return result.result;
        
    } catch (error) {
        console.log('Sharp + qrcode-reader FAILED:', error.message);
    }
    
    // Test 2: jsQR library
    try {
        console.log('\n--- Testing with jsQR ---');
        const jsQR = require('jsqr');
        const sharp = require('sharp');
        
        const { data, info } = await sharp(imagePath)
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });
            
        const code = jsQR(data, info.width, info.height);
        
        if (code) {
            console.log('jsQR SUCCESS:', code.data);
            return code.data;
        } else {
            console.log('jsQR: No QR code found');
        }
        
    } catch (error) {
        console.log('jsQR FAILED:', error.message);
    }
    
    // Test 3: qrcode-decoder
    try {
        console.log('\n--- Testing with qrcode-decoder ---');
        const QrCodeDecoder = require('qrcode-decoder');
        const qr = new QrCodeDecoder();
        
        const result = await qr.decodeFromPath(imagePath);
        console.log('qrcode-decoder SUCCESS:', result.data);
        return result.data;
        
    } catch (error) {
        console.log('qrcode-decoder FAILED:', error.message);
    }
    
    console.log('\nAll QR libraries failed to decode the image.');
    return null;
}

// Run the test
testQRLibraries()
    .then(result => {
        if (result) {
            console.log(`\n✅ Successfully decoded QR code: ${result}`);
        } else {
            console.log('\n❌ Failed to decode QR code with any library');
        }
    })
    .catch(error => {
        console.error('Test failed:', error);
    });