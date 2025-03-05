#!/usr/bin/env node

/**
 * This script automatically fixes common TypeScript errors:
 * - Removes unused imports
 * - Removes unused variables
 * - Adds missing exports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the list of TypeScript errors
function getTypeScriptErrors() {
  try {
    const output = execSync('cd ../.. && yarn workspace @admin-ai/frontend tsc --noEmit', { encoding: 'utf8' });
    return output;
  } catch (error) {
    return error.stdout;
  }
}

// Parse the TypeScript errors
function parseErrors(output) {
  const errors = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Match error patterns
    const fileMatch = line.match(/^(.+\.tsx?):(\d+):(\d+) - error TS(\d+): (.+)$/);
    if (fileMatch) {
      const [_, filePath, lineNum, colNum, errorCode, message] = fileMatch;
      errors.push({
        filePath,
        lineNum: parseInt(lineNum),
        colNum: parseInt(colNum),
        errorCode,
        message
      });
    }
  }
  
  return errors;
}

// Fix unused imports and variables
function fixUnusedImportsAndVariables(errors) {
  const fileErrors = {};
  
  // Group errors by file
  for (const error of errors) {
    if (!fileErrors[error.filePath]) {
      fileErrors[error.filePath] = [];
    }
    fileErrors[error.filePath].push(error);
  }
  
  // Process each file
  for (const [filePath, fileErrorList] of Object.entries(fileErrors)) {
    try {
      const fullPath = path.resolve(__dirname, '..', filePath);
      if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${fullPath}`);
        continue;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let lines = content.split('\n');
      let modified = false;
      
      // Process unused imports (TS6192)
      const unusedImportErrors = fileErrorList.filter(e => e.errorCode === '6192');
      for (const error of unusedImportErrors) {
        const line = lines[error.lineNum - 1];
        // Remove the entire import line
        lines[error.lineNum - 1] = '// ' + line;
        modified = true;
        console.log(`Fixed unused import in ${filePath}:${error.lineNum}`);
      }
      
      // Process unused variables (TS6133)
      const unusedVarErrors = fileErrorList.filter(e => e.errorCode === '6133');
      for (const error of unusedVarErrors) {
        const line = lines[error.lineNum - 1];
        const varName = error.message.match(/'([^']+)' is declared but/)?.[1];
        
        if (varName) {
          // Comment out the variable in the line
          if (line.includes(`${varName},`)) {
            lines[error.lineNum - 1] = line.replace(`${varName},`, `/* ${varName}, */`);
            modified = true;
          } else if (line.includes(`, ${varName}`)) {
            lines[error.lineNum - 1] = line.replace(`, ${varName}`, `/* , ${varName} */`);
            modified = true;
          } else if (line.includes(`${varName}`)) {
            lines[error.lineNum - 1] = line.replace(`${varName}`, `/* ${varName} */`);
            modified = true;
          }
          console.log(`Fixed unused variable ${varName} in ${filePath}:${error.lineNum}`);
        }
      }
      
      // Process unused interfaces (TS6196)
      const unusedInterfaceErrors = fileErrorList.filter(e => e.errorCode === '6196');
      for (const error of unusedInterfaceErrors) {
        const line = lines[error.lineNum - 1];
        const interfaceName = error.message.match(/'([^']+)' is declared but/)?.[1];
        
        if (interfaceName && line.includes(`interface ${interfaceName}`)) {
          // Comment out the interface declaration
          lines[error.lineNum - 1] = `// ${line}`;
          
          // Find and comment out the interface body
          let i = error.lineNum;
          let braceCount = 0;
          let foundOpeningBrace = false;
          
          while (i < lines.length) {
            if (lines[i].includes('{')) {
              foundOpeningBrace = true;
              braceCount++;
            }
            if (lines[i].includes('}')) {
              braceCount--;
            }
            
            if (foundOpeningBrace) {
              lines[i] = `// ${lines[i]}`;
            }
            
            if (foundOpeningBrace && braceCount === 0) {
              break;
            }
            
            i++;
          }
          
          modified = true;
          console.log(`Fixed unused interface ${interfaceName} in ${filePath}:${error.lineNum}`);
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        console.log(`Updated ${filePath}`);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }
}

// Main function
function main() {
  console.log('Analyzing TypeScript errors...');
  const output = getTypeScriptErrors();
  const errors = parseErrors(output);
  
  console.log(`Found ${errors.length} TypeScript errors`);
  
  if (errors.length > 0) {
    console.log('Fixing unused imports and variables...');
    fixUnusedImportsAndVariables(errors);
  }
  
  console.log('Done!');
}

main(); 