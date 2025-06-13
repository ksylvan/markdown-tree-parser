#!/usr/bin/env node

/**
 * CLI tests for markdown-tree-parser
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(__dirname, '..', 'bin', 'md-tree.js');
const testDir = path.join(__dirname, 'temp-cli-test');

// Test utilities
let testCount = 0;
let passedTests = 0;

function test(name, fn) {
  testCount++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          passedTests++;
          console.log(`✅ ${name}`);
        })
        .catch((error) => {
          console.error(`❌ ${name}: ${error.message}`);
        });
    } else {
      passedTests++;
      console.log(`✅ ${name}`);
    }
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Helper to run CLI command
function runCLI(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [binPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', reject);
  });
}

// Create test markdown file
const testMarkdown = `# Test Document

This is a test document for CLI testing.

## Introduction

This is the introduction section with some content.

### Background

Some background information here.

## Installation

Instructions for installation.

### Prerequisites

List of prerequisites:

1. Node.js 18+
2. npm

### Quick Install

\`\`\`bash
npm install test-package
\`\`\`

## Usage

How to use the package.

### Basic Usage

Simple examples.

### Advanced Usage

Complex examples with more details.

## Contributing

Guidelines for contributors.

### Development Setup

How to set up development environment.

### Submitting Changes

Process for submitting changes.

## License

MIT License information.
`;

async function setupTests() {
  // Create test directory
  await fs.mkdir(testDir, { recursive: true });

  // Create test markdown file
  const testFile = path.join(testDir, 'test.md');
  await fs.writeFile(testFile, testMarkdown, 'utf-8');

  return testFile;
}

async function cleanupTests() {
  // Clean up test directory
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Warning: Could not clean up test directory:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Running CLI tests...\n');

  const testFile = await setupTests();

  // Test explode command
  await test('CLI explode command', async () => {
    const outputDir = path.join(testDir, 'exploded');
    const result = await runCLI(['explode', testFile, outputDir]);

    assert(
      result.code === 0,
      `Command should succeed, got exit code ${result.code}\nstderr: ${result.stderr}`
    );
    assert(
      result.stdout.includes('Exploding'),
      'Should show exploding message'
    );
    assert(
      result.stdout.includes('Document exploded'),
      'Should show completion message'
    );

    // Check if files were created
    const files = await fs.readdir(outputDir);
    assert(files.includes('index.md'), 'Should create index.md');
    assert(files.includes('introduction.md'), 'Should create introduction.md');
    assert(files.includes('installation.md'), 'Should create installation.md');
    assert(files.includes('usage.md'), 'Should create usage.md');
    assert(files.includes('contributing.md'), 'Should create contributing.md');
    assert(files.includes('license.md'), 'Should create license.md');

    // Check file count (5 sections + 1 index = 6 files)
    assert(
      files.length === 6,
      `Expected 6 files, got ${files.length}: ${files.join(', ')}`
    );
  });

  await test('CLI explode index.md content', async () => {
    const outputDir = path.join(testDir, 'exploded');
    const indexPath = path.join(outputDir, 'index.md');
    const indexContent = await fs.readFile(indexPath, 'utf-8');

    // Check main title links to table of contents
    assert(indexContent.includes('# Test Document'), 'Should have main title');
    assert(
      indexContent.includes('## Table of Contents'),
      'Should have TOC heading'
    );
    assert(
      indexContent.includes('[Test Document](#table-of-contents)'),
      'Main title should link to TOC'
    );

    // Check level 2 headings link to files
    assert(
      indexContent.includes('[Introduction](./introduction.md)'),
      'Should link to introduction file'
    );
    assert(
      indexContent.includes('[Installation](./installation.md)'),
      'Should link to installation file'
    );
    assert(
      indexContent.includes('[Usage](./usage.md)'),
      'Should link to usage file'
    );

    // Check sub-headings link to sections within files
    assert(
      indexContent.includes('[Prerequisites](./installation.md#prerequisites)'),
      'Should link to section in file'
    );
    assert(
      indexContent.includes('[Basic Usage](./usage.md#basic-usage)'),
      'Should link to section in file'
    );
    assert(
      indexContent.includes(
        '[Development Setup](./contributing.md#development-setup)'
      ),
      'Should link to section in file'
    );
  });

  await test('CLI explode individual files', async () => {
    const outputDir = path.join(testDir, 'exploded');

    // Check introduction.md
    const introPath = path.join(outputDir, 'introduction.md');
    const introContent = await fs.readFile(introPath, 'utf-8');
    assert(
      introContent.includes('# Introduction'),
      'Introduction file should have section heading'
    );
    assert(
      introContent.includes('This is the introduction section'),
      'Should have section content'
    );
    assert(
      introContent.includes('## Background'),
      'Should include subsections'
    );

    // Check installation.md
    const installPath = path.join(outputDir, 'installation.md');
    const installContent = await fs.readFile(installPath, 'utf-8');
    assert(
      installContent.includes('# Installation'),
      'Installation file should have section heading'
    );
    assert(
      installContent.includes('Instructions for installation'),
      'Should have section content'
    );
    assert(
      installContent.includes('## Prerequisites'),
      'Should include subsections'
    );
    assert(
      installContent.includes('npm install'),
      'Should include code blocks'
    );
  });

  await test('CLI explode error handling', async () => {
    // Test with non-existent file
    const result = await runCLI(['explode', 'non-existent.md', testDir]);
    assert(result.code !== 0, 'Should fail with non-existent file');
    assert(
      result.stderr.includes('Error reading file'),
      'Should show error message'
    );
  });

  await test('CLI explode usage help', async () => {
    // Test with missing arguments
    const result = await runCLI(['explode']);
    assert(result.code !== 0, 'Should fail with missing arguments');
    assert(
      result.stderr.includes('Usage: md-tree explode'),
      'Should show usage message'
    );
  });

  // Test that help includes explode
  await test('CLI help includes explode', async () => {
    const result = await runCLI(['help']);
    assert(result.code === 0, 'Help command should succeed');
    assert(result.stdout.includes('explode'), 'Help should mention explode');
    assert(
      result.stdout.includes('Extract all level 2 sections and create index'),
      'Should have description'
    );
  });

  // Test check-links command
  await test('CLI check-links command with mixed link types', async () => {
    // Create a test file with various link types
    const testLinksFile = path.join(testDir, 'test-links.md');
    const testLinksContent = `# Test Links Document

## Contact Information

- Email: [kayvan@sylvan.com](kayvan@sylvan.com)
- Support: [mailto:support@example.com](mailto:support@example.com)
- Website: [https://github.com](https://github.com)
- Local doc: [./sample.md](./sample.md)
- Hash link: [Table of Contents](#table-of-contents)
- Broken link: [broken.md](./broken.md)

## Table of Contents

Content here.
`;

    await fs.writeFile(testLinksFile, testLinksContent, 'utf-8');

    // Also create the referenced sample.md file so it passes
    const sampleFile = path.join(testDir, 'sample.md');
    await fs.writeFile(sampleFile, '# Sample\n\nContent', 'utf-8');

    const result = await runCLI(['check-links', testLinksFile]);

    assert(result.code === 0, 'Check-links command should succeed');

    // Should show checking message
    assert(
      result.stdout.includes('🔗 Checking'),
      'Should show checking message'
    );

    // Should check HTTPS link
    assert(
      result.stdout.includes('✅ https://github.com') ||
        result.stdout.includes('❌ https://github.com'),
      'Should attempt to check HTTPS link'
    );

    // Should check local file and find it
    assert(
      result.stdout.includes('✅ ./sample.md'),
      'Should find existing local file'
    );

    // Should find broken local file
    assert(
      result.stdout.includes('❌ ./broken.md (file not found)'),
      'Should report broken local file'
    );

    // Should show email links as skipped
    assert(
      result.stdout.includes('⏭️  kayvan@sylvan.com (email - skipped)'),
      'Should show bare email links as skipped'
    );
    assert(
      result.stdout.includes(
        '⏭️  mailto:support@example.com (email - skipped)'
      ),
      'Should show mailto links as skipped'
    );

    // Should NOT show hash links (they should be ignored)
    assert(
      !result.stdout.includes('#table-of-contents'),
      'Should ignore hash links'
    );
  });

  await test('CLI check-links with missing file', async () => {
    const result = await runCLI(['check-links', 'non-existent.md']);
    assert(result.code !== 0, 'Should fail with non-existent file');
    assert(
      result.stderr.includes('Error reading file') ||
        result.stderr.includes('ENOENT') ||
        result.stderr.includes('File not found'),
      'Should show file not found error'
    );
  });

  await test('CLI check-links usage help', async () => {
    const result = await runCLI(['check-links']);
    assert(result.code !== 0, 'Should fail with missing arguments');
    assert(
      result.stderr.includes('Usage: md-tree check-links'),
      'Should show usage message'
    );
  });

  await test('CLI check-links recursive option', async () => {
    // Create main file with link to another markdown file
    const mainFile = path.join(testDir, 'main.md');
    const linkedFile = path.join(testDir, 'linked.md');

    const mainContent = `# Main Document

See also: [Linked Document](./linked.md)
`;

    const linkedContent = `# Linked Document

This document has links too:
- [External](https://example.com)
- [Back to main](./main.md)
`;

    await fs.writeFile(mainFile, mainContent, 'utf-8');
    await fs.writeFile(linkedFile, linkedContent, 'utf-8');

    const result = await runCLI(['check-links', mainFile, '--recursive']);

    assert(result.code === 0, 'Recursive check-links should succeed');
    assert(
      result.stdout.includes('✅ ./linked.md'),
      'Should check link to other markdown file'
    );
    // Should also check links in the linked file due to recursive flag
    assert(
      result.stdout.includes('linked.md') &&
        (result.stdout.includes('example.com') ||
          result.stdout.includes('https://example.com')),
      'Should recursively check links in linked markdown files'
    );
  });

  await test('CLI help includes check-links', async () => {
    const result = await runCLI(['help']);
    assert(result.code === 0, 'Help command should succeed');
    assert(
      result.stdout.includes('check-links'),
      'Help should mention check-links'
    );
  });

  await cleanupTests();

  // Summary
  console.log(`\n📊 CLI Test Results: ${passedTests}/${testCount} passed`);

  if (passedTests === testCount) {
    console.log('🎉 All CLI tests passed!');
    process.exit(0);
  } else {
    console.error(`❌ ${testCount - passedTests} CLI tests failed`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('💥 CLI test runner error:', error);
  process.exit(1);
});
