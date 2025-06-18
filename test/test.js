#!/usr/bin/env node

/**
 * Basic tests for markdown-tree-parser
 */

import { MarkdownTreeParser, createParser, extractSection } from '../index.js';
import { MarkdownCLI } from '../bin/md-tree.js'; // Added for checkLinks test
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    }
    passedTests++;
    console.log(`✅ ${name}`);
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

  // Test complex TOC generation for explode scenarios
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

  // Test explode and assemble document workflow
  await test('Explode and assemble document workflow', async () => {
    // Import CLI to test explode/assemble functionality
    const { MarkdownCLI } = await import('../bin/md-tree.js');
    const cli = new MarkdownCLI();

    // Create a test document
    const testDoc = `# Test Document

This is a test document for explode/assemble testing.

## First Section

Content for the first section.

### Subsection A

Some subsection content.

## Second Section

Content for the second section.

### Subsection B

More subsection content.

## Third Section

Final section content.
`;

    const testFile = path.join(__dirname, 'test-explode.md');
    const testDir = path.join(__dirname, 'test-explode-output');
    const reassembledFile = path.join(__dirname, 'test-reassembled.md');

    try {
      // Write test document
      await fs.writeFile(testFile, testDoc);

      // Test explode functionality
      await cli.explodeDocument(testFile, testDir);

      // Verify exploded files exist
      const indexPath = path.join(testDir, 'index.md');
      const indexExists = await fs
        .access(indexPath)
        .then(() => true)
        .catch(() => false);
      assert(indexExists, 'Index file should be created');

      // Test assemble functionality
      await cli.assembleDocument(testDir, reassembledFile);

      // Verify reassembled file exists
      const reassembledExists = await fs
        .access(reassembledFile)
        .then(() => true)
        .catch(() => false);
      assert(reassembledExists, 'Reassembled file should be created');

      // Read and verify the reassembled content
      const reassembledContent = await fs.readFile(reassembledFile, 'utf-8');
      assert(
        reassembledContent.includes('# Test Document'),
        'Should contain main title'
      );
      assert(
        reassembledContent.includes('## First Section'),
        'Should contain first section'
      );
      assert(
        reassembledContent.includes('## Second Section'),
        'Should contain second section'
      );
      assert(
        reassembledContent.includes('## Third Section'),
        'Should contain third section'
      );
    } finally {
      // Cleanup test files
      try {
        await fs.unlink(testFile);
        await fs.unlink(reassembledFile);
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  await test('Increment heading levels', async () => {
    const { MarkdownCLI } = await import('../bin/md-tree.js');
    const cli = new MarkdownCLI();

    const testContent = `# Level 1
## Level 2
### Level 3
`;

    const tree = await parser.parse(testContent);
    const adjustedTree = cli.incrementHeadingLevels(tree);
    const result = await parser.stringify(adjustedTree);

    assert(result.includes('## Level 1'), 'Level 1 should become Level 2');
    assert(result.includes('### Level 2'), 'Level 2 should become Level 3');
    assert(result.includes('#### Level 3'), 'Level 3 should become Level 4');
  });
  await test('Extract section files from TOC', async () => {
    const { MarkdownCLI } = await import('../bin/md-tree.js');
    const cli = new MarkdownCLI();

    // Use the actual format generated by the explode command
    const tocContent = `# Test Document

## Table of Contents

- [Test Document](#table-of-contents)
  - [First Section](./first-section.md)
  - [Second Section](./second-section.md)
    - [Subsection](./second-section.md#subsection)
  - [Third Section](./third-section.md)
`;

    const tree = await parser.parse(tocContent);
    const sectionFiles = await cli.extractSectionFilesFromTOC(tree);

    assert(
      sectionFiles.length === 3,
      `Should extract 3 section files, got ${sectionFiles.length}`
    );
    assert(
      sectionFiles[0].filename === 'first-section.md',
      'Should extract first section file'
    );
    assert(
      sectionFiles[1].filename === 'second-section.md',
      'Should extract second section file'
    );
    assert(
      sectionFiles[2].filename === 'third-section.md',
      'Should extract third section file'
    );
  });

  // Test email pattern matching (used by check-links)
  await test('Email pattern validation', async () => {
    // Test the email regex pattern directly (recreated from md-tree.js)
    const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Valid email patterns
    assert(EMAIL_PATTERN.test('user@example.com'), 'Should match simple email');
    assert(EMAIL_PATTERN.test('kayvan@sylvan.com'), 'Should match real email');
    assert(
      EMAIL_PATTERN.test('test.user+tag@domain.co.uk'),
      'Should match complex email'
    );
    assert(
      EMAIL_PATTERN.test('user123@test-domain.org'),
      'Should match email with numbers and hyphens'
    );

    // Invalid patterns that should NOT match
    assert(!EMAIL_PATTERN.test('not-an-email'), 'Should not match plain text');
    assert(
      !EMAIL_PATTERN.test('@domain.com'),
      'Should not match email without user'
    );
    assert(
      !EMAIL_PATTERN.test('user@'),
      'Should not match email without domain'
    );
    assert(
      !EMAIL_PATTERN.test('mailto:user@domain.com'),
      'Should not match mailto URLs (handled separately)'
    );
    assert(
      !EMAIL_PATTERN.test('https://example.com'),
      'Should not match HTTPS URLs'
    );
  });

  // Test link extraction and filtering
  await test('Link extraction for check-links functionality', async () => {
    const linkTestMarkdown = `# Links Test

Various link types:

- [Email link](user@example.com)
- [Mailto link](mailto:support@example.com)
- [HTTPS link](https://github.com)
- [HTTP link](http://example.com)
- [Local file](./docs/readme.md)
- [Hash link](#section)
- [Complex local](../parent/file.md#section)

Plain text with email@domain.com should not be a link.
`;

    const tree = await parser.parse(linkTestMarkdown);
    const links = parser.selectAll(tree, 'link');

    assert(
      links.length === 7,
      `Should find 7 link elements, found ${links.length}`
    );

    // Check specific link URLs
    const linkUrls = links.map((link) => link.url);
    assert(
      linkUrls.includes('user@example.com'),
      'Should find bare email link'
    );
    assert(
      linkUrls.includes('mailto:support@example.com'),
      'Should find mailto link'
    );
    assert(linkUrls.includes('https://github.com'), 'Should find HTTPS link');
    assert(linkUrls.includes('http://example.com'), 'Should find HTTP link');
    assert(
      linkUrls.includes('./docs/readme.md'),
      'Should find local file link'
    );
    assert(linkUrls.includes('#section'), 'Should find hash link');
    assert(
      linkUrls.includes('../parent/file.md#section'),
      'Should find complex local link'
    );
  });

  // Test suite for checkLinks
  await test('Check Links Functionality', async () => {
    const cli = new MarkdownCLI();
    const testReferenceLinksFile = path.join(
      __dirname,
      'test-reference-links.md'
    );
    const testDummySampleFilePath = path.join(
      __dirname,
      'test-dummy-sample.md'
    );

    // Create a unique dummy file for local link checking to pass
    await fs.writeFile(
      testDummySampleFilePath,
      '# Test Dummy Sample File\n\nThis is a test dummy file for testing links.'
    );

    await test('Check reference-style links', async () => {
      const markdownContent = await fs.readFile(
        testReferenceLinksFile,
        'utf-8'
      );
      const tree = await cli.parser.parse(markdownContent);
      const links = cli.parser.selectAll(tree, 'link');
      const definitions = cli.parser.selectAll(tree, 'definition');

      const collectedUrls = new Set();
      for (const link of links) {
        if (link.url) collectedUrls.add(link.url);
      }
      for (const def of definitions) {
        if (def.url) collectedUrls.add(def.url);
      }

      assert(
        collectedUrls.has('https://www.google.com'),
        'Should find Google link from definition'
      );
      assert(
        collectedUrls.has('./test-dummy-sample.md'),
        'Should find local-doc link from definition'
      );
      assert(
        !collectedUrls.has('[undefined]'),
        'Should not treat undefined reference as a URL'
      );
      // The following assertions were removed because selectAll(tree, 'link') for reference-style links
      // correctly returns linkReference nodes which do not have the 'url' property populated directly.
      // The url is resolved by checkLinks by looking at 'definition' nodes,
      // which is already tested by the collectedUrls assertions and the checkLinks output assertions.
      // assert(links.some(link => link.reference === 'google' && link.url === 'https://www.google.com'), 'Link object for google should have url');
      // assert(links.some(link => link.reference === 'local-doc' && link.url === './sample.md'), 'Link object for local-doc should have url');

      // Test the checkLinks output
      const originalConsoleLog = console.log;
      const logs = [];
      console.log = (...args) => {
        logs.push(args.join(' '));
      };

      try {
        await cli.checkLinks(testReferenceLinksFile);
      } finally {
        console.log = originalConsoleLog;
        // Clean up test dummy file
        try {
          await fs.unlink(testDummySampleFilePath);
        } catch (error) {
          // Ignore cleanup errors - file might not exist
          console.warn(
            `Warning: Could not clean up ${testDummySampleFilePath}:`,
            error.message
          );
        }
      }

      const output = logs.join('\n');
      assert(
        output.includes('🔗 Checking 2 unique URLs'),
        'Should check 2 unique URLs'
      );
      assert(
        output.includes('✅ https://www.google.com'),
        'Should successfully check Google link'
      );
      // Note: The actual local file path in output might be resolved.
      // We check for the original URL './test-dummy-sample.md' and the "✅" status.
      assert(
        output.includes('✅ ./test-dummy-sample.md'),
        'Should successfully check local test dummy sample file link'
      );
    });
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
