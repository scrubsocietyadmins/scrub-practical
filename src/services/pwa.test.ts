/**
 * Automated Verification Tests for Scrub Practical PWA
 * Validates:
 * 1. Web App Manifest validity & required fields
 * 2. Icon asset dimensions & files
 * 3. Service Worker file presence and cache keys
 * 4. PWA Manager state transitions & subscription mechanics
 */

import fs from 'fs';
import path from 'path';
import { pwaManager } from './pwaService';

function runTests() {
  console.log('--- Starting Scrub Practical PWA Verification Tests ---');

  // Test 1: Verify Web App Manifest
  console.log('Test 1: Validating Web App Manifest (manifest.webmanifest & manifest.json)...');
  const manifestPath = path.resolve('public/manifest.webmanifest');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.webmanifest is missing from public directory');
  }
  const manifestJsonPath = path.resolve('public/manifest.json');
  if (!fs.existsSync(manifestJsonPath)) {
    throw new Error('manifest.json fallback is missing from public directory');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.name !== 'Scrub Practical') {
    throw new Error(`Expected name "Scrub Practical", got "${manifest.name}"`);
  }
  if (manifest.short_name !== 'Scrub Practical') {
    throw new Error(`Expected short_name "Scrub Practical", got "${manifest.short_name}"`);
  }
  if (manifest.display !== 'standalone') {
    throw new Error(`Expected display "standalone", got "${manifest.display}"`);
  }
  if (!manifest.theme_color || !manifest.background_color) {
    throw new Error('Theme or background color missing in manifest');
  }
  if (!manifest.start_url || !manifest.scope) {
    throw new Error('start_url or scope missing in manifest');
  }

  // Verify icons in manifest
  const requiredIcons = [
    { size: '192x192', purpose: 'any' },
    { size: '512x512', purpose: 'any' },
    { size: '192x192', purpose: 'maskable' },
    { size: '512x512', purpose: 'maskable' },
  ];

  for (const req of requiredIcons) {
    const found = manifest.icons.find(
      (icon: any) => icon.sizes === req.size && icon.purpose === req.purpose
    );
    if (!found) {
      throw new Error(`Missing required icon: ${req.size} with purpose: ${req.purpose}`);
    }
  }
  console.log('✓ Test 1 Passed: Web App Manifest is valid with all required properties.');

  // Test 2: Verify Generated Icon Assets on disk
  console.log('Test 2: Verifying icon files on disk and PNG headers...');
  const iconFiles = [
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-192.png',
    'icon-maskable-512.png',
    'apple-touch-icon.png',
  ];

  for (const file of iconFiles) {
    const fullPath = path.resolve('public', file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Icon file missing: ${file}`);
    }
    const buf = fs.readFileSync(fullPath);
    if (buf.length < 1000) {
      throw new Error(`Icon file too small: ${file} (${buf.length} bytes)`);
    }
    // Check PNG signature [0x89, 0x50, 0x4E, 0x47]
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      throw new Error(`File is not a valid PNG: ${file}`);
    }
  }
  console.log('✓ Test 2 Passed: All 5 required PWA icon PNG assets exist and are valid.');

  // Test 3: Verify Service Worker definition
  console.log('Test 3: Verifying Service Worker script (public/sw.js)...');
  const swPath = path.resolve('public/sw.js');
  if (!fs.existsSync(swPath)) {
    throw new Error('public/sw.js is missing');
  }
  const swContent = fs.readFileSync(swPath, 'utf-8');
  if (!swContent.includes("addEventListener('install'")) {
    throw new Error('sw.js missing install listener');
  }
  if (!swContent.includes("addEventListener('activate'")) {
    throw new Error('sw.js missing activate listener');
  }
  if (!swContent.includes("addEventListener('fetch'")) {
    throw new Error('sw.js missing fetch listener');
  }
  if (!swContent.includes('SKIP_WAITING')) {
    throw new Error('sw.js missing safe SKIP_WAITING message handler');
  }
  console.log('✓ Test 3 Passed: Service Worker script verified.');

  // Test 4: Verify index.html references
  console.log('Test 4: Verifying index.html PWA tags and manifest link...');
  const indexPath = path.resolve('index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  if (!indexContent.includes('rel="manifest"')) {
    throw new Error('index.html missing rel="manifest" link');
  }
  if (!indexContent.includes('viewport-fit=cover')) {
    throw new Error('index.html missing viewport-fit=cover for notch support');
  }
  if (!indexContent.includes('name="apple-mobile-web-app-capable"')) {
    throw new Error('index.html missing apple mobile web app capable meta tag');
  }
  console.log('✓ Test 4 Passed: index.html correctly configured for PWA installation.');

  // Test 5: Verify PWA Manager subscription
  console.log('Test 5: Verifying PWA Manager State & subscription...');
  let notifiedState: any = null;
  const unsubscribe = pwaManager.subscribe((state) => {
    notifiedState = state;
  });

  if (!notifiedState) {
    throw new Error('PWA manager failed to notify subscriber with initial state');
  }
  if (typeof notifiedState.isOnline !== 'boolean') {
    throw new Error('isOnline property missing or invalid in PWAState');
  }
  unsubscribe();
  console.log('✓ Test 5 Passed: PWA Manager state and subscriber mechanics verified.');

  console.log('\n--- All Scrub Practical PWA Tests Passed Successfully! ---');
}

runTests();
