#!/usr/bin/env node

/**
 * Usage examples for markdown-tree-parser
 * Demonstrates various features of the library
 */

import {
  MarkdownTreeParser,
  createParser,
  extractSection,
  getHeadings,
  generateTOC,
} from '../index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sample markdown content
const sampleMarkdown = `
# My Awesome Project

Welcome to my project! This is a powerful tool for working with markdown.

## Features

This project has many great features:

### Performance
- Fast parsing with remark
- Efficient tree manipulation
- Memory-optimized operations

### Usability
- Simple API design
- Comprehensive documentation
- Great error messages

## Installation

Getting started is easy:

### Prerequisites
- Node.js 18+
- npm or yarn

### Quick Install
\`\`\`bash
npm install my-awesome-project
\`\`\`

## Usage

Here's how to use the project:

### Basic Example
\`\`\`javascript
import { MyProject } from 'my-awesome-project';
const project = new MyProject();
\`\`\`

### Advanced Configuration
For power users, you can configure everything:

\`\`\`javascript
const project = new MyProject({
  performance: 'high',
  debugging: true
});
\`\`\`

## Contributing

We love contributions! Here's how to help:

1. Fork the repo
2. Make your changes
3. Submit a PR

### Code Style
Please follow our style guide and run the linter.

## License

MIT License - feel free to use this project!
`;

async function runExamples() {
  console.log('🎯 markdown-tree-parser Usage Examples\n');
  console.log('='.repeat(50));

  // Example 1: Basic parsing and section extraction
  console.log('\n📖 Example 1: Basic Section Extraction');
  console.log('-'.repeat(40));

  const parser = new MarkdownTreeParser();
  const tree = await parser.parse(sampleMarkdown);

  // Extract the Features section
  const featuresSection = parser.extractSection(tree, 'Features');
  if (featuresSection) {
    const featuresMarkdown = await parser.stringify(featuresSection);
    console.log('Extracted "Features" section:');
    console.log(featuresMarkdown);
  }

  // Example 2: Extract all level-2 sections
  console.log('\n📚 Example 2: Extract All Sections');
  console.log('-'.repeat(40));

  const sections = parser.extractAllSections(tree, 2);
  console.log(`Found ${sections.length} level-2 sections:`);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    console.log(`${i + 1}. ${section.headingText}`);
  }

  // Example 3: Document analysis
  console.log('\n📊 Example 3: Document Analysis');
  console.log('-'.repeat(40));

  const headings = parser.getHeadingsList(tree);
  console.log('Document structure:');
  headings.forEach((h) => {
    const indent = '  '.repeat(h.level - 1);
    console.log(`${indent}${h.level}. ${h.text}`);
  });

  const stats = parser.getStats(tree);
  console.log(`\nStatistics:`);
  console.log(`- ${stats.wordCount} words`);
  console.log(`- ${stats.headings.total} headings`);
  console.log(`- ${stats.paragraphs} paragraphs`);
  console.log(`- ${stats.codeBlocks} code blocks`);

  // Example 4: CSS-like selectors
  console.log('\n🔍 Example 4: Advanced Search');
  console.log('-'.repeat(40));

  // Find all level-2 headings
  const level2Headings = parser.selectAll(tree, 'heading[depth="2"]');
  console.log('Level-2 headings:');
  level2Headings.forEach((heading) => {
    console.log(`- ${parser.getHeadingText(heading)}`);
  });

  // Find all code blocks
  const codeBlocks = parser.selectAll(tree, 'code');
  console.log(`\nFound ${codeBlocks.length} code blocks`);

  // Find links
  const links = parser.selectAll(tree, 'link');
  console.log(`Found ${links.length} links`);

  // Example 5: Content transformation
  console.log('\n🔄 Example 5: Content Transformation');
  console.log('-'.repeat(40));

  // Create a copy of the tree for transformation
  const transformedTree = JSON.parse(JSON.stringify(tree));

  // Transform all h1 headings to h2
  parser.transform(transformedTree, (node) => {
    if (node.type === 'heading' && node.depth === 1) {
      node.depth = 2;
      console.log(
        `Transformed: "${parser.getHeadingText(node)}" from h1 to h2`
      );
    }
  });

  // Example 6: Table of Contents generation
  console.log('\n📋 Example 6: Table of Contents');
  console.log('-'.repeat(40));

  const toc = parser.generateTableOfContents(tree, 3);
  console.log('Generated TOC:');
  console.log(toc);

  // Example 7: Convenience functions
  console.log('\n⚡ Example 7: Convenience Functions');
  console.log('-'.repeat(40));

  // Quick section extraction
  const quickSection = await extractSection(sampleMarkdown, 'Installation');
  if (quickSection) {
    console.log('Quick extraction of Installation section:');
    console.log(quickSection.substring(0, 100) + '...');
  }

  // Quick headings list
  const quickHeadings = await getHeadings(sampleMarkdown);
  console.log(`\nQuick headings count: ${quickHeadings.length}`);

  // Quick TOC
  const quickTOC = await generateTOC(sampleMarkdown, 2);
  console.log('\nQuick TOC (max level 2):');
  console.log(quickTOC);

  // Example 8: Custom parser configuration
  console.log('\n⚙️  Example 8: Custom Configuration');
  console.log('-'.repeat(40));

  const customParser = createParser({
    bullet: '-', // Use dashes for lists
    emphasis: '_', // Use underscores for emphasis
    strong: '__', // Use double underscores for strong
  });

  const listMarkdown = `
# Lists
- Item 1
- Item 2
  - Sub item

*Emphasis* and **strong** text.
`;

  const customTree = await customParser.parse(listMarkdown);
  const customResult = await customParser.stringify(customTree);
  console.log('Custom formatting:');
  console.log(customResult);

  // Example 9: Working with files (if sample exists)
  console.log('\n📁 Example 9: File Processing');
  console.log('-'.repeat(40));

  try {
    const samplePath = path.join(__dirname, '..', 'test', 'sample.md');
    const fileContent = await fs.readFile(samplePath, 'utf-8');

    console.log(`Reading file: ${path.basename(samplePath)}`);

    const fileTree = await parser.parse(fileContent);
    const fileStats = parser.getStats(fileTree);

    console.log(`File contains:`);
    console.log(`- ${fileStats.wordCount} words`);
    console.log(`- ${fileStats.headings.total} headings`);
    console.log(`- ${fileStats.paragraphs} paragraphs`);

    // Extract sections and show what we'd save
    const fileSections = parser.extractAllSections(fileTree, 2);
    console.log(
      `\nWould extract ${fileSections.length} sections to separate files`
    );
  } catch (error) {
    console.log('Sample file not available for file processing example');
    console.log(`Error: ${error.message}`);
  }

  // Example 10: Nested section extraction
  console.log('\n🌳 Example 10: Nested Section Extraction');
  console.log('-'.repeat(40));

  // Extract Features section with limited depth
  const nestedSection = parser.extractNestedSection(tree, 'Features', 1);
  if (nestedSection) {
    const nestedMarkdown = await parser.stringify(nestedSection);
    console.log('Features section with max depth 1:');
    console.log(nestedMarkdown);
  }

  console.log('\n🎉 Examples completed!');
  console.log('\nTry these CLI commands:');
  console.log('  md-tree help');
  console.log('  md-tree list test/sample.md');
  console.log('  md-tree tree test/sample.md');
  console.log('  md-tree extract test/sample.md "Installation"');
}

// Run examples
runExamples().catch((error) => {
  console.error('💥 Example error:', error);
  process.exit(1);
});
