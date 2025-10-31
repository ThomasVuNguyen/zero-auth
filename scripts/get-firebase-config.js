#!/usr/bin/env node

/**
 * Helper script to fetch Firebase web app configuration
 * 
 * This script attempts to create a Firebase web app and get its config.
 * If that fails, it provides instructions for manual setup.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'starmind-72daa';
const CONFIG_FILE = path.join(__dirname, '../public/firebase-config.js');

console.log('🔍 Attempting to get Firebase web app configuration...\n');

try {
  // Try to get existing apps first
  console.log('Checking for existing web apps...');
  const appsOutput = execSync(`firebase apps:list --project=${PROJECT_ID} --json`, { encoding: 'utf-8' });
  const apps = JSON.parse(appsOutput);
  
  if (apps && apps.length > 0) {
    const webApp = apps.find(app => app.platform === 'WEB');
    if (webApp) {
      console.log(`✅ Found existing web app: ${webApp.appId}`);
      console.log('Fetching SDK config...\n');
      
      try {
        const configOutput = execSync(`firebase apps:sdkconfig ${webApp.appId} --project=${PROJECT_ID}`, { encoding: 'utf-8' });
        console.log('📋 SDK Config:');
        console.log(configOutput);
        console.log('\n💡 Copy the config values above and update public/firebase-config.js');
        return;
      } catch (e) {
        console.log('⚠️  Could not fetch config via CLI');
      }
    }
  }
  
  console.log('No existing web app found.');
  console.log('\n📝 To create a web app:');
  console.log('   1. Go to: https://console.firebase.google.com/project/starmind-72daa/settings/general');
  console.log('   2. Scroll to "Your apps" section');
  console.log('   3. Click the web icon (</>) or "Add app" → Web');
  console.log('   4. Register the app (nickname optional)');
  console.log('   5. Copy the config values and update public/firebase-config.js\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n📝 Manual setup instructions:');
  console.log('   1. Go to: https://console.firebase.google.com/project/starmind-72daa/settings/general');
  console.log('   2. Scroll to "Your apps" section');
  console.log('   3. Click the web icon (</>) or "Add app" → Web');
  console.log('   4. Register the app');
  console.log('   5. Copy the config values and update public/firebase-config.js');
}
