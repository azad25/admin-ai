#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all files that import from auth.context.tsx
const findCommand = "grep -l \"from '../contexts/auth.context'\" --include='*.tsx' --include='*.ts' -r ./src";

try {
  // Execute the find command
  const output = execSync(findCommand, { cwd: path.resolve(__dirname, '..') }).toString();
  const files = output.split('\n').filter(Boolean);

  console.log(`Found ${files.length} files with imports from auth.context.tsx`);

  // Process each file
  files.forEach(filePath => {
    const fullPath = path.resolve(__dirname, '..', filePath);
    console.log(`Processing ${filePath}...`);

    // Read the file content
    let content = fs.readFileSync(fullPath, 'utf8');

    // Replace the import statements
    content = content.replace(
      /from ['"]\.\.\/contexts\/auth\.context['"]/g, 
      "from '../contexts/AuthContext'"
    );

    // Write the updated content back to the file
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  });

  console.log('All imports have been updated successfully!');
} catch (error) {
  console.error('Error updating imports:', error.message);
  process.exit(1);
} 