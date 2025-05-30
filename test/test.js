#!/usr/bin/env node

/**
 * Basic tests for markdown-tree-parser
 */

import { MarkdownTreeParser, createParser, extractSection } from '../index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test data
const testMarkdown = `
# Main Title

This is the introduction.

## Installation

To install this package:

\`\`\`bash
npm install markdown-tree-parser
\`\`\`

### Prerequisites

You need Node.js installed.

### Quick Start

Run the following commands.

## Usage

Here's how to use it:

### Basic Usage

Simple examples here.

### Advanced Usage

Complex examples here.

## Contributing

Guidelines for contributors.
`;

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

// Run tests
async function runTests() {
  console.log('🧪 Running markdown-tree-parser tests...\n');

  const parser = new MarkdownTreeParser();

  // Test basic parsing
  await test('Parse markdown to AST', async () => {
    const tree = await parser.parse(testMarkdown);
    assert(tree.type === 'root', 'Tree should have root type');
    assert(tree.children.length > 0, 'Tree should have children');
  });

  // Test stringify
  await test('Stringify AST to markdown', async () => {
    const tree = await parser.parse('# Hello\n\nWorld');
    const result = await parser.stringify(tree);
    assert(typeof result === 'string', 'Result should be string');
    assert(result.includes('Hello'), 'Result should contain original content');
  });

  // Test section extraction
  await test('Extract specific section', async () => {
    const tree = await parser.parse(testMarkdown);
    const section = parser.extractSection(tree, 'Installation');
    assert(section !== null, 'Should find Installation section');
    assert(section.type === 'root', 'Section should be root type');

    const markdown = await parser.stringify(section);
    assert(markdown.includes('## Installation'), 'Should contain heading');
    assert(markdown.includes('npm install'), 'Should contain content');
  });

  // Test extract all sections
  await test('Extract all sections at level 2', async () => {
    const tree = await parser.parse(testMarkdown);
    const sections = parser.extractAllSections(tree, 2);
    assert(
      sections.length === 3,
      `Should find 3 sections, found ${sections.length}`
    );
    assert(
      sections[0].headingText === 'Installation',
      'First section should be Installation'
    );
    assert(
      sections[1].headingText === 'Usage',
      'Second section should be Usage'
    );
    assert(
      sections[2].headingText === 'Contributing',
      'Third section should be Contributing'
    );
  });

  // Test headings list
  await test('Get headings list', async () => {
    const tree = await parser.parse(testMarkdown);
    const headings = parser.getHeadingsList(tree);
    assert(
      headings.length === 8,
      `Should find 8 headings, found ${headings.length}`
    );
    assert(headings[0].level === 1, 'First heading should be level 1');
    assert(
      headings[0].text === 'Main Title',
      'First heading should be Main Title'
    );
  });

  // Test CSS selectors
  await test('CSS selector search', async () => {
    const tree = await parser.parse(testMarkdown);
    const level2Headings = parser.selectAll(tree, 'heading[depth="2"]');
    assert(
      level2Headings.length === 3,
      `Should find 3 level-2 headings, found ${level2Headings.length}`
    );

    const allHeadings = parser.selectAll(tree, 'heading');
    assert(
      allHeadings.length === 8,
      `Should find 8 total headings, found ${allHeadings.length}`
    );
  });

  // Test document stats
  await test('Document statistics', async () => {
    const tree = await parser.parse(testMarkdown);
    const stats = parser.getStats(tree);
    assert(
      stats.headings.total === 8,
      `Should count 8 headings, found ${stats.headings.total}`
    );
    assert(stats.wordCount > 0, 'Should count words');
    assert(stats.paragraphs > 0, 'Should count paragraphs');
  });

  // Test table of contents
  await test('Generate table of contents', async () => {
    const tree = await parser.parse(testMarkdown);
    const toc = parser.generateTableOfContents(tree, 3);
    assert(typeof toc === 'string', 'TOC should be string');
    assert(toc.includes('## Table of Contents'), 'Should include TOC header');
    assert(toc.includes('Installation'), 'Should include section names');
  });

  // Test convenience functions
  await test('Convenience function extractSection', async () => {
    const result = await extractSection(testMarkdown, 'Usage');
    assert(result !== null, 'Should extract section');
    assert(result.includes('## Usage'), 'Should contain usage heading');
  });

  // Test createParser with options
  await test('Create parser with options', async () => {
    const customParser = createParser({ bullet: '-' });
    const tree = await customParser.parse('- Item 1\n- Item 2');
    const result = await customParser.stringify(tree);
    assert(result.includes('-'), 'Should use custom bullet');
  });

  // Test with sample file if it exists
  const samplePath = path.join(__dirname, 'sample.md');
  try {
    await fs.access(samplePath);
    await test('Parse sample file', async () => {
      const content = await fs.readFile(samplePath, 'utf-8');
      const tree = await parser.parse(content);
      assert(tree.type === 'root', 'Should parse sample file');

      const headings = parser.getHeadingsList(tree);
      assert(headings.length > 0, 'Sample should have headings');
    });
  } catch {
    console.log('ℹ️  Sample file not found, skipping file test');
  }

  // Test error handling
  await test('Handle non-existent section', async () => {
    const tree = await parser.parse(testMarkdown);
    const section = parser.extractSection(tree, 'NonExistentSection');
    assert(section === null, 'Should return null for non-existent section');
  });

  // Test complex TOC generation for explode-doc scenarios
  await test('Generate TOC with nested headings', async () => {
    const complexMarkdown = `
# Main Document

## Section 1

Content 1

### Subsection 1.1

Sub content

#### Sub-subsection 1.1.1

Deep content

### Subsection 1.2

More content

## Section 2

Content 2

### Subsection 2.1

Sub content 2
`;
    const tree = await parser.parse(complexMarkdown);
    const headings = parser.getHeadingsList(tree);

    // Check that we get the right structure
    assert(headings.length === 7, 'Should find all 7 headings');
    assert(
      headings[0].level === 1 && headings[0].text === 'Main Document',
      'First heading should be level 1 main title'
    );
    assert(
      headings[1].level === 2 && headings[1].text === 'Section 1',
      'Second heading should be level 2'
    );
    assert(
      headings[2].level === 3 && headings[2].text === 'Subsection 1.1',
      'Should have level 3 subsection'
    );
  });

  // Test section extraction with complex content
  await test('Extract sections with subsections', async () => {
    const complexMarkdown = `
# Main Document

## Installation

Main installation content.

### Prerequisites

You need these things.

### Quick Install

Run these commands.

## Usage

Usage content here.

### Basic Usage

Simple examples.
`;
    const tree = await parser.parse(complexMarkdown);
    const sections = parser.extractAllSections(tree, 2);

    assert(sections.length === 2, 'Should extract 2 level-2 sections');
    assert(
      sections[0].headingText === 'Installation',
      'First section should be Installation'
    );
    assert(
      sections[1].headingText === 'Usage',
      'Second section should be Usage'
    );

    // Check that subsections are included
    const installationMarkdown = await parser.stringify(sections[0].tree);
    assert(
      installationMarkdown.includes('### Prerequisites'),
      'Installation section should include Prerequisites subsection'
    );
    assert(
      installationMarkdown.includes('### Quick Install'),
      'Installation section should include Quick Install subsection'
    );
  });

  // Test filename sanitization pattern (simulating CLI behavior)
  await test('Filename sanitization pattern', () => {
    function sanitizeFilename(text) {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    assert(
      sanitizeFilename('Installation Guide') === 'installation-guide',
      'Should handle spaces'
    );
    assert(
      sanitizeFilename('API Reference / Overview') === 'api-reference-overview',
      'Should handle special chars'
    );
    assert(
      sanitizeFilename('Core Workflow & Patterns') === 'core-workflow-patterns',
      'Should handle ampersands'
    );
    assert(
      sanitizeFilename('---Test---') === 'test',
      'Should clean up multiple dashes'
    );
  });

  // Summary
  console.log(`\n📊 Test Results: ${passedTests}/${testCount} passed`);

  if (passedTests === testCount) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.error(`❌ ${testCount - passedTests} tests failed`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
