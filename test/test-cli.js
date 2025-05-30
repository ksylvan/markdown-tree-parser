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

  // Test explode-doc command
  await test('CLI explode-doc command', async () => {
    const outputDir = path.join(testDir, 'exploded');
    const result = await runCLI(['explode-doc', testFile, outputDir]);

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

  await test('CLI explode-doc index.md content', async () => {
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

  await test('CLI explode-doc individual files', async () => {
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

  await test('CLI explode-doc error handling', async () => {
    // Test with non-existent file
    const result = await runCLI(['explode-doc', 'non-existent.md', testDir]);
    assert(result.code !== 0, 'Should fail with non-existent file');
    assert(
      result.stderr.includes('Error reading file'),
      'Should show error message'
    );
  });

  await test('CLI explode-doc usage help', async () => {
    // Test with missing arguments
    const result = await runCLI(['explode-doc']);
    assert(result.code !== 0, 'Should fail with missing arguments');
    assert(
      result.stderr.includes('Usage: md-tree explode-doc'),
      'Should show usage message'
    );
  });

  // Test that help includes explode-doc
  await test('CLI help includes explode-doc', async () => {
    const result = await runCLI(['help']);
    assert(result.code === 0, 'Help command should succeed');
    assert(
      result.stdout.includes('explode-doc'),
      'Help should mention explode-doc'
    );
    assert(
      result.stdout.includes('Extract all level 2 sections and create index'),
      'Should have description'
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
