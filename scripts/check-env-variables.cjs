#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Environment Variables Checker and CI/CD Variables Creator
 * 
 * This script checks .env file variables against GitLab CI/CD variables and can
 * automatically create missing variables with default values.
 * 
 * AUTHENTICATION REQUIREMENTS:
 * - CI_JOB_TOKEN: ❌ Cannot manage CI/CD variables (limited permissions)
 * - Project Access Token: ✅ Required with 'api' scope
 * - Personal Access Token: ✅ Alternative with 'api' scope
 * 
 * SETUP:
 * 1. Create Project Access Token in GitLab project settings
 * 2. Grant 'Maintainer' or 'Owner' role
 * 3. Enable 'api' scope
 * 4. Add token as GITLAB_ACCESS_TOKEN in CI/CD variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');

// Path to the .env file
const envFilePath = path.resolve(__dirname, '../.env');

// GitLab API configuration
// NOTE: CI_JOB_TOKEN cannot manage CI/CD variables - need Project Access Token with 'api' scope
const GITLAB_TOKEN = process.env.GITLAB_ACCESS_TOKEN;
const GITLAB_PROJECT_ID = process.env.CI_PROJECT_ID;
// For self-hosted GitLab, CI_API_V4_URL should be automatically set by GitLab CI
const GITLAB_API_URL = process.env.CI_API_V4_URL || 'https://gitlab.com/api/v4';
const CURRENT_ENVIRONMENT = process.env.CI_ENVIRONMENT_NAME || '*';

/**
 * Extracts variable names and values from the .env file
 * @returns {Promise<Array<{name: string, value: string, comment: string}>>} Array of variable objects
 */
async function extractEnvVariables() {
  const variables = [];

  const fileStream = fs.createReadStream(envFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Extract variable name, value, and any inline comments
    const match = line.match(/^["']?([A-Za-z0-9_]+)["']?=(.*)$/);
    if (match && match[1]) {
      const name = match[1];
      const valueAndComment = match[2];
      
      // Split value from comment (if any)
      const commentMatch = valueAndComment.match(/^([^#]*)(#.*)?$/);
      const value = commentMatch ? commentMatch[1].trim() : valueAndComment.trim();
      const comment = commentMatch && commentMatch[2] ? commentMatch[2].trim() : '';
      
      variables.push({
        name,
        value: value.replace(/^["']|["']$/g, ''), // Remove quotes
        comment
      });
    }
  }

  return variables;
}

/**
 * Make HTTP request to GitLab API
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} Response data
 */
function makeGitLabRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    // Manually construct the full URL to avoid URL constructor issues
    const fullUrl = `${GITLAB_API_URL}${path}`;
    const url = new URL(fullUrl);
    
    const options = {
      method,
      headers: {
        'PRIVATE-TOKEN': GITLAB_TOKEN,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Enhanced error handling for HTML responses
        if (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
          reject(new Error(`GitLab API returned HTML instead of JSON. Status: ${res.statusCode}. This usually indicates:
1. Invalid API URL: ${url.toString()}
2. Authentication failure (check token validity)
3. Insufficient permissions (token needs 'api' scope)
4. Using wrong GitLab instance URL

Response preview: ${body.substring(0, 200)}...`));
          return;
        }

        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`GitLab API error: ${res.statusCode} - ${parsed.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}. Raw response: ${body.substring(0, 500)}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Get existing CI/CD variables from GitLab
 * @returns {Promise<Array>} Array of existing variables
 */
async function getExistingVariables() {
  try {
    return await makeGitLabRequest('GET', `/projects/${GITLAB_PROJECT_ID}/variables`);
  } catch (error) {
    if (error.message.includes('401')) {
      console.error('❌ Authentication failed: Invalid or insufficient token permissions');
      console.error('💡 Ensure GITLAB_ACCESS_TOKEN has "api" scope and "Maintainer" role');
    } else if (error.message.includes('403')) {
      console.error('❌ Access forbidden: Token lacks permission to access CI/CD variables');
      console.error('💡 Token needs "Maintainer" or "Owner" role in the project');
    } else {
      console.warn('⚠️  Could not fetch existing variables from GitLab:', error.message);
    }
    return [];
  }
}

/**
 * Create a CI/CD variable in GitLab
 * @param {string} key - Variable name
 * @param {string} value - Variable value
 * @param {boolean} masked - Whether to mask the variable
 * @param {boolean} protected - Whether to protect the variable
 * @param {string} environment - Environment scope (optional)
 * @returns {Promise<void>}
 */
async function createVariable(key, value, masked = false, protected = false, environment = '*') {
  const data = {
    key,
    value,
    masked,
    protected,
    environment_scope: environment
  };

  await makeGitLabRequest('POST', `/projects/${GITLAB_PROJECT_ID}/variables`, data);
}

/**
 * Main function to check environment variables
 */
async function checkEnvVariables() {
  try {
    // Check if .env file exists
    if (!fs.existsSync(envFilePath)) {
      console.error(`Error: .env file not found at ${envFilePath}`);
      console.log('Make sure you are running the script from the project root or the .env file exists.');
      process.exit(1);
    }

    const variables = await extractEnvVariables();

    if (variables.length === 0) {
      console.log('No variables found in .env file.');
      return;
    }

    // List of sensitive variables that should be masked
    const sensitiveVars = [
      'DATABASE_URL', 
      'JWT_SECRET', 
      'SMTP_PASSWORD',
      'SMTP_PASS',
      'PASSWORD',
      'SECRET',
      'KEY',
      'TOKEN'
    ];

    // Check if GitLab API is available
    const canUseGitLabAPI = GITLAB_PROJECT_ID;

    if (!canUseGitLabAPI) {
      console.log('⚠️  GitLab API not available - running in check-only mode');
      console.log('═══════════════════════════════════════════════════════');
      if (!GITLAB_PROJECT_ID) {
        console.log('❌ Missing GITLAB_ACCESS_TOKEN');
        console.log('\n📝 To enable automatic variable creation:');
        console.log('1. Go to your GitLab project → Settings → Access Tokens');
        console.log('2. Create a new Project Access Token with:');
        console.log('   - Name: "CI Variable Management"');
        console.log('   - Role: Maintainer or Owner');
        console.log('   - Scopes: ✅ api');
        console.log('3. Add the token as GITLAB_ACCESS_TOKEN in your CI/CD variables');
        console.log('4. Re-run this script');
      }

      console.log('');
    }

    // Get existing variables from GitLab if API is available
    let existingVariables = [];
    if (canUseGitLabAPI) {
      existingVariables = await getExistingVariables();
    }

    const existingVarNames = existingVariables.map(v => v.key);

    // Check which variables are missing from the environment and GitLab
    const missingFromEnv = [];
    const missingFromGitLab = [];
    const defaultVariables = [];

    variables.forEach(variable => {
      const isSensitive = sensitiveVars.some(sensVar => 
        variable.name === sensVar || variable.name.includes(sensVar)
      );

      const envValue = process.env[variable.name];

      // Check if missing from current environment
      if (!envValue) {
        missingFromEnv.push({ ...variable, sensitive: isSensitive });
      }
      // Check if variable exists but still has default value
      else if (envValue === 'default_variable') {
        defaultVariables.push({ ...variable, sensitive: isSensitive });
      }

      // Check if missing from GitLab CI/CD variables
      if (canUseGitLabAPI && !existingVarNames.includes(variable.name)) {
        missingFromGitLab.push({ ...variable, sensitive: isSensitive });
      }
    });

    // If we can use GitLab API, try to create missing variables
    if (canUseGitLabAPI && missingFromGitLab.length > 0) {
      console.log('Creating missing CI/CD variables in GitLab...');
      console.log('═══════════════════════════════════════════════');
      console.log(`Environment scope: ${CURRENT_ENVIRONMENT}`);
      console.log('');

      let createdCount = 0;
      let failedCount = 0;

      for (const variable of missingFromGitLab) {
        try {
          // Always use default placeholder value for security
          const defaultValue = 'default_variable';
          
          await createVariable(
            variable.name,
            defaultValue,
            variable.sensitive, // mask sensitive variables
            false, // don't protect by default
            CURRENT_ENVIRONMENT // use current environment scope
          );

          const status = variable.sensitive ? '🔒 MASKED' : '🔓 VISIBLE';
          const valueDisplay = variable.sensitive ? '[MASKED]' : `"${defaultValue}"`;
          const envScope = CURRENT_ENVIRONMENT === '*' ? 'ALL' : CURRENT_ENVIRONMENT;
          
          console.log(`✅ Created: ${variable.name} = ${valueDisplay} ${status} [${envScope}]`);
          if (variable.comment) {
            console.log(`   Comment: ${variable.comment}`);
          }
          createdCount++;
        } catch (error) {
          console.error(`❌ Failed to create ${variable.name}: ${error.message}`);
          failedCount++;
        }
      }

      console.log(`\n📊 Summary: ${createdCount} created, ${failedCount} failed`);
      
      if (createdCount > 0) {
        console.log('\n🔧 Next steps:');
        console.log('1. Go to your GitLab project → Settings → CI/CD → Variables');
        console.log('2. Update the default values to your actual configuration');
        if (CURRENT_ENVIRONMENT !== '*') {
          console.log(`3. Variables created for environment: ${CURRENT_ENVIRONMENT}`);
        }
        console.log('4. Re-run this script to verify all variables are set correctly');
      }
    }

    // Check if any variables are still missing from the environment
    if (missingFromEnv.length > 0) {
      console.log('\n❌ ERROR: The following variables are missing from the environment:');
      console.log('═══════════════════════════════════════════════════════════════');

      missingFromEnv.forEach(variable => {
        if (variable.sensitive) {
          console.log(`- ${variable.name} (SENSITIVE - should be masked)`);
        } else {
          console.log(`- ${variable.name}`);
        }
      });

      if (!canUseGitLabAPI) {
        console.log('\n📝 Manual Instructions:');
        console.log('1. Go to your GitLab project');
        console.log('2. Navigate to Settings > CI/CD');
        console.log('3. Expand the Variables section');
        console.log('4. Add each variable listed above');
        console.log('\nFor sensitive variables (marked above):');
        console.log('- Check the "Mask variable" option to hide the value in job logs');
        console.log('- Consider checking the "Protect variable" option for protected branches');
      }

      console.log('\n❌ Please ensure all variables are configured before continuing.');
      process.exit(1);
    }

    // Check if any variables still have default values
    if (defaultVariables.length > 0) {
      console.log('\n⚠️  WARNING: The following variables still have default values:');
      console.log('═══════════════════════════════════════════════════════════════');

      defaultVariables.forEach(variable => {
        if (variable.sensitive) {
          console.log(`- ${variable.name} = "default_variable" (SENSITIVE - should be masked)`);
        } else {
          console.log(`- ${variable.name} = "default_variable"`);
        }
      });

      console.log('\n📝 Action Required:');
      console.log('1. Go to your GitLab project → Settings → CI/CD → Variables');
      console.log('2. Update each variable listed above with the correct value');
      console.log('3. Re-run this script to verify all variables are configured');
      console.log('\nFor sensitive variables (marked above):');
      console.log('- Make sure the "Mask variable" option is enabled');
      console.log('- Consider enabling "Protect variable" for protected branches');

      console.log('\n❌ Please update all default values before continuing.');
      process.exit(1);
    }

    console.log('\n✅ All environment variables are properly configured!');
    
  } catch (error) {
    console.error('Error checking environment variables:', error.message);
    process.exit(1);
  }
}

// Run the script
checkEnvVariables();
