const crypto = require('crypto');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY not found in environment');
  process.exit(1);
}

console.log('Using encryption key:', {
  keyLength: ENCRYPTION_KEY.length,
  isHex: /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY),
  firstEightChars: ENCRYPTION_KEY.substring(0, 8)
});

// Create a 32-byte buffer from the hex key
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');

console.log('Key buffer length:', KEY_BUFFER.length, 'bytes');

function encrypt(text) {
  // Clean and validate the text first
  const cleanedText = text.trim().replace(/[\r\n\t]/g, '');
  
  console.log('Encrypting text:', {
    originalLength: text.length,
    cleanedLength: cleanedText.length,
    startsWithAI: cleanedText.startsWith('AI')
  });
  
  // For Gemini keys, validate format
  if (cleanedText.startsWith('AI')) {
    console.log('Validating Gemini API key format...');
    if (cleanedText.length < 20) {
      throw new Error('Invalid Gemini API key format - must be at least 20 characters');
    }
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let encrypted = cipher.update(cleanedText);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const result = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  
  console.log('Encryption result:', {
    ivLength: iv.length,
    encryptedLength: encrypted.length,
    resultLength: result.length,
    ivFirstFourBytes: iv.slice(0, 4).toString('hex')
  });
  
  // Test decryption immediately
  const decrypted = decrypt(result);
  console.log('Immediate decryption test:', {
    decryptedLength: decrypted.length,
    matches: decrypted === cleanedText,
    startsWithAI: decrypted.startsWith('AI'),
    firstEightChars: decrypted.substring(0, 8)
  });
  
  if (decrypted !== cleanedText) {
    throw new Error('Encryption verification failed');
  }
  
  return result;
}

function decrypt(text) {
  console.log('Decrypting text:', {
    textLength: text.length,
    containsSeparator: text.includes(':'),
    firstEightChars: text.substring(0, 8)
  });
  
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  
  console.log('Decryption components:', {
    ivLength: iv.length,
    encryptedLength: encryptedText.length,
    ivFirstFourBytes: iv.slice(0, 4).toString('hex')
  });
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  const result = decrypted.toString().trim();
  
  console.log('Decryption result:', {
    resultLength: result.length,
    startsWithAI: result.startsWith('AI'),
    firstEightChars: result.substring(0, 8)
  });
  
  return result;
}

async function cleanProviderSettings() {
  const pool = new Pool({
    user: 'postgres',
    database: 'admin_ai',
    port: 5432
  });

  try {
    console.log('Removing all provider settings...');
    
    // First, remove all provider settings
    await pool.query(`
      UPDATE ai_settings 
      SET providers = '[]'::jsonb
      WHERE "userId" = '139656b7-8cdc-4f0d-9c0d-aacfb28b217a'
    `);
    
    console.log('Successfully removed all provider settings');
    
    // Now add a fresh provider with proper encryption
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error('GEMINI_API_KEY not found in environment');
      return;
    }
    
    console.log('Adding new provider settings...');
    console.log('Original Gemini key details:', {
      length: geminiKey.length,
      startsWithAI: geminiKey.startsWith('AI'),
      firstEightChars: geminiKey.substring(0, 8)
    });
    
    // Clean and validate the key
    let cleanedKey = geminiKey.trim().replace(/[\r\n\t]/g, '');
    
    // Fix the key format if it starts with AIAI
    if (cleanedKey.startsWith('AIAI')) {
      cleanedKey = 'AI' + cleanedKey.substring(4);
      console.log('Fixed key format:', {
        length: cleanedKey.length,
        startsWithAI: cleanedKey.startsWith('AI'),
        firstEightChars: cleanedKey.substring(0, 8)
      });
    }
    
    if (!cleanedKey.startsWith('AI') || cleanedKey.length < 20) {
      console.error('Invalid Gemini API key format:', {
        length: cleanedKey.length,
        startsWithAI: cleanedKey.startsWith('AI')
      });
      return;
    }
    
    // Encrypt the key
    const encryptedKey = encrypt(cleanedKey);
    
    // Test decryption
    const testDecrypt = decrypt(encryptedKey);
    console.log('Final encryption test:', {
      original: cleanedKey,
      decrypted: testDecrypt,
      matches: testDecrypt === cleanedKey,
      originalLength: cleanedKey.length,
      decryptedLength: testDecrypt.length,
      firstEightChars: testDecrypt.substring(0, 8)
    });
    
    // Add new provider settings with proper verification
    const newProvider = {
      provider: 'gemini',
      apiKey: encryptedKey,
      selectedModel: 'gemini-2.0-flash',
      availableModels: ['gemini-2.0-flash', 'gemini-pro', 'gemini-pro-vision'],
      isActive: true,
      isVerified: true,
      lastVerified: new Date().toISOString(),
      settings: {
        temperature: 0.7,
        maxTokens: 2048
      }
    };
    
    await pool.query(`
      UPDATE ai_settings 
      SET providers = $1::jsonb
      WHERE "userId" = $2
    `, [JSON.stringify([newProvider]), '139656b7-8cdc-4f0d-9c0d-aacfb28b217a']);
    
    console.log('Successfully added new provider settings');
    
    // Verify the settings were saved correctly
    const result = await pool.query(`
      SELECT providers 
      FROM ai_settings 
      WHERE "userId" = '139656b7-8cdc-4f0d-9c0d-aacfb28b217a'
    `);
    
    if (result.rows.length > 0) {
      const savedProvider = result.rows[0].providers[0];
      console.log('Saved provider verification:', {
        provider: savedProvider.provider,
        keyLength: savedProvider.apiKey.length,
        isEncrypted: savedProvider.apiKey.includes(':'),
        model: savedProvider.selectedModel,
        isVerified: savedProvider.isVerified,
        availableModels: savedProvider.availableModels,
        firstEightChars: savedProvider.apiKey.substring(0, 8)
      });
      
      // Test decryption of saved key
      const savedDecrypted = decrypt(savedProvider.apiKey);
      console.log('Saved key decryption test:', {
        decryptedLength: savedDecrypted.length,
        startsWithAI: savedDecrypted.startsWith('AI'),
        matches: savedDecrypted === cleanedKey,
        firstEightChars: savedDecrypted.substring(0, 8)
      });
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanProviderSettings().catch(console.error); 