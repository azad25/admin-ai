const crypto = require('crypto');
const { Client } = require('pg');

const ENCRYPTION_KEY = '8b50afb9f4dc3f4c3ee6b5084ace1d7b0bcb455c68eb95d8eaa2dbd68d70ac9f';
const API_KEY = 'AIzaSyBnVkT9wiLnMv_RQmVIEkb-meUgPL2qXKs';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function updateDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'admin_ai',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const encryptedKey = encrypt(API_KEY);
    const providerConfig = {
      apiKey: encryptedKey,
      isActive: true,
      provider: 'gemini',
      isVerified: true,
      lastVerified: new Date().toISOString(),
      selectedModel: 'gemini-2.0-flash',
      availableModels: ['gemini-2.0-flash', 'gemini-pro', 'gemini-pro-vision']
    };

    const query = `
      UPDATE ai_settings 
      SET providers = $1::jsonb 
      WHERE "userId" IN ('00000000-0000-0000-0000-000000000001', '139656b7-8cdc-4f0d-9c0d-aacfb28b217a')
    `;

    await client.query(query, [[providerConfig]]);
    console.log('Successfully updated database with re-encrypted API key');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await client.end();
  }
}

updateDatabase().catch(console.error); 