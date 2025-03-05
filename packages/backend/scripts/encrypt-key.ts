import { encrypt } from '../src/utils/encryption';

const key = process.argv[2];
if (!key) {
  console.error('Please provide an API key to encrypt');
  process.exit(1);
}

const encrypted = encrypt(key);
console.log('Encrypted key:', encrypted); 