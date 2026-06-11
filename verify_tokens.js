#!/usr/bin/env node

/**
 * Verify that the new cool-neutral color tokens are properly applied
 * Run this after: npm run dev
 */

const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to the app
    console.log('Loading application...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 30000 });

    // Extract CSS variables from the root element
    const tokens = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);

      return {
        // Primary colors
        bg: style.getPropertyValue('--bg').trim(),
        surface: style.getPropertyValue('--surface').trim(),
        accent: style.getPropertyValue('--accent').trim(),

        // Text colors
        text_primary: style.getPropertyValue('--text-primary').trim(),
        text_secondary: style.getPropertyValue('--text-secondary').trim(),

        // Status colors
        success: style.getPropertyValue('--success').trim(),
        warning: style.getPropertyValue('--warning').trim(),

        // Borders
        border: style.getPropertyValue('--border').trim(),
      };
    });

    console.log('\n✓ Cool-neutral color tokens detected:');
    console.log('────────────────────────────────────');
    console.log('Background (--bg):', tokens.bg);
    console.log('Surface (--surface):', tokens.surface);
    console.log('Accent (--accent):', tokens.accent);
    console.log('Text Primary (--text-primary):', tokens.text_primary);
    console.log('Text Secondary (--text-secondary):', tokens.text_secondary);
    console.log('Success (--success):', tokens.success);
    console.log('Warning (--warning):', tokens.warning);
    console.log('Border (--border):', tokens.border);

    // Verify the colors are the new cool-neutral palette
    const expectedTokens = {
      bg: '#F6F7F9',
      surface: '#FFFFFF',
      accent: '#5B5BD6',
      text_primary: '#14171C',
      success: '#18794E',
      warning: '#AB6400',
      border: '#E3E6EB',
    };

    console.log('\n✓ Verification Results:');
    console.log('────────────────────────────────────');

    let allMatch = true;
    for (const [key, expected] of Object.entries(expectedTokens)) {
      const actual = tokens[key.toLowerCase().replace('_', '-')] || tokens[key];
      const match = actual.toUpperCase() === expected.toUpperCase();
      const status = match ? '✓' : '✗';
      console.log(`${status} ${key}: ${actual} (expected: ${expected})`);
      if (!match) allMatch = false;
    }

    console.log('────────────────────────────────────');
    if (allMatch) {
      console.log('✓ All tokens match! Cool-neutral palette is active.');
    } else {
      console.log('✗ Some tokens do not match. Check globals.css');
    }

    await browser.close();
    process.exit(allMatch ? 0 : 1);
  } catch (err) {
    console.error('✗ Error verifying tokens:', err.message);
    process.exit(1);
  }
})();
