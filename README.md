# markdown-tree-parser

[![npm version](https://img.shields.io/npm/v/@kayvan/markdown-tree-parser)](https://www.npmjs.com/package/@kayvan/markdown-tree-parser)
[![Node.js CI](https://github.com/ksylvan/markdown-tree-parser/workflows/Node.js%20CI/badge.svg)](https://github.com/ksylvan/markdown-tree-parser/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful JavaScript library and CLI tool for parsing and manipulating markdown files as tree structures. Built on top of the battle-tested [remark/unified](https://github.com/remarkjs/remark) ecosystem.

<div align="center">
<!-- <img src="https://github.com/ksylvan/markdown-tree-parser/blob/main/logo.png?raw=true" alt="md-tree logo" width="200" height="200"> -->
<img src="./logo.png" alt="md-tree logo" width="200" height="200">
</div>

## 🚀 Features

- **🌳 Tree-based parsing** - Treats markdown as manipulable Abstract Syntax Trees (AST)
- **✂️ Section extraction** - Extract specific sections with automatic boundary detection
- **🔍 Powerful search** - CSS-like selectors and custom search functions
- **📚 Batch processing** - Process multiple sections at once
- **🛠️ CLI & Library** - Use as a command-line tool or JavaScript library
- **📊 Document analysis** - Get statistics and generate table of contents
- **🎯 TypeScript ready** - Full type definitions included

## 📦 Installation

### Global Installation (for CLI usage)

```bash
# Using npm
npm install -g @kayvan/markdown-tree-parser

# Using pnpm (may require approval for build scripts)
pnpm install -g @kayvan/markdown-tree-parser
pnpm approve-builds -g  # If prompted

# Using yarn
yarn global add @kayvan/markdown-tree-parser
```

### Local Installation (for library usage)

```bash
npm install @kayvan/markdown-tree-parser
```

## 🔧 CLI Usage

After global installation, use the `md-tree` command:

### List all headings

```bash
md-tree list README.md
md-tree list README.md --format json
```

### Extract specific sections

```bash
# Extract one section
md-tree extract README.md "Installation"

# Extract to a file
md-tree extract README.md "Installation" --output ./sections
```

### Extract all sections at a level

```bash
# Extract all level-2 sections
md-tree extract-all README.md 2

# Extract to separate files
md-tree extract-all README.md 2 --output ./sections
```

### Show document structure

```bash
md-tree tree README.md
```

### Search with CSS-like selectors

```bash
# Find all level-2 headings
md-tree search README.md "heading[depth=2]"

# Find all links
md-tree search README.md "link"
```

### Document statistics

```bash
md-tree stats README.md
```

### Check links

```bash
md-tree check-links README.md
md-tree check-links README.md --recursive
```

### Generate table of contents

```bash
md-tree toc README.md --max-level 3
```

### Complete CLI options

```bash
md-tree help
```

## 📚 Library Usage

### Basic Usage

```javascript
import { MarkdownTreeParser } from 'markdown-tree-parser';

const parser = new MarkdownTreeParser();

// Parse markdown into AST
const markdown = `
# My Document
Some content here.

## Section 1
Content for section 1.

## Section 2
Content for section 2.
`;

const tree = await parser.parse(markdown);

// Extract a specific section
const section = parser.extractSection(tree, 'Section 1');
const sectionMarkdown = await parser.stringify(section);

console.log(sectionMarkdown);
// Output:
// ## Section 1
// Content for section 1.
```

### Advanced Usage

```javascript
import { MarkdownTreeParser, createParser, extractSection } from 'markdown-tree-parser';

// Create parser with custom options
const parser = createParser({
  bullet: '-',      // Use '-' for lists
  emphasis: '_',    // Use '_' for emphasis
  strong: '__'      // Use '__' for strong
});

// Extract all sections at level 2
const tree = await parser.parse(markdown);
const sections = parser.extractAllSections(tree, 2);

sections.forEach(async (section, index) => {
  const heading = parser.getHeadingText(section.heading);
  const content = await parser.stringify(section.tree);
  console.log(`Section ${index + 1}: ${heading}`);
  console.log(content);
});

// Use convenience functions
const sectionMarkdown = await extractSection(markdown, 'Installation');
```

### Search and Manipulation

```javascript
// CSS-like selectors
const headings = parser.selectAll(tree, 'heading[depth=2]');
const links = parser.selectAll(tree, 'link');
const codeBlocks = parser.selectAll(tree, 'code');

// Custom search
const customNode = parser.findNode(tree, (node) => {
  return node.type === 'heading' &&
         parser.getHeadingText(node).includes('API');
});

// Transform content
parser.transform(tree, (node) => {
  if (node.type === 'heading' && node.depth === 1) {
    node.depth = 2; // Convert h1 to h2
  }
});

// Get document statistics
const stats = parser.getStats(tree);
console.log(`Document has ${stats.wordCount} words and ${stats.headings.total} headings`);

// Generate table of contents
const toc = parser.generateTableOfContents(tree, 3);
console.log(toc);
```

### Working with Files

```javascript
import fs from 'fs/promises';

// Read and process a file
const content = await fs.readFile('README.md', 'utf-8');
const tree = await parser.parse(content);

// Extract all sections and save to files
const sections = parser.extractAllSections(tree, 2);

for (let i = 0; i < sections.length; i++) {
  const section = sections[i];
  const filename = `section-${i + 1}.md`;
  const markdown = await parser.stringify(section.tree);
  await fs.writeFile(filename, markdown);
}
```

## 🎯 Use Cases

- **📖 Documentation Management** - Split large docs into manageable sections
- **🌐 Static Site Generation** - Process markdown for blogs and websites
- **📝 Content Organization** - Restructure and reorganize markdown content
- **🔍 Content Analysis** - Analyze document structure and extract insights
- **📋 Documentation Tools** - Build custom documentation processing tools
- **🚀 Content Migration** - Extract and transform content between formats

## 🏗️ API Reference

### MarkdownTreeParser

#### Constructor

```javascript
new MarkdownTreeParser(options = {})
```

#### Methods

- `parse(markdown)` - Parse markdown into AST
- `stringify(tree)` - Convert AST back to markdown
- `extractSection(tree, headingText, level?)` - Extract specific section
- `extractAllSections(tree, level)` - Extract all sections at level
- `select(tree, selector)` - Find first node matching CSS selector
- `selectAll(tree, selector)` - Find all nodes matching CSS selector
- `findNode(tree, condition)` - Find node with custom condition
- `getHeadingText(headingNode)` - Get text content of heading
- `getHeadingsList(tree)` - Get all headings with metadata
- `getStats(tree)` - Get document statistics
- `generateTableOfContents(tree, maxLevel)` - Generate TOC
- `transform(tree, visitor)` - Transform tree with visitor function

### Convenience Functions

- `createParser(options)` - Create new parser instance
- `extractSection(markdown, sectionName, options)` - Quick section extraction
- `getHeadings(markdown, options)` - Quick heading extraction
- `generateTOC(markdown, maxLevel, options)` - Quick TOC generation

## 🔗 CSS-Like Selectors

The library supports powerful CSS-like selectors for searching:

```javascript
// Element selectors
parser.selectAll(tree, 'heading')     // All headings
parser.selectAll(tree, 'paragraph')  // All paragraphs
parser.selectAll(tree, 'link')       // All links

// Attribute selectors
parser.selectAll(tree, 'heading[depth=1]')    // H1 headings
parser.selectAll(tree, 'heading[depth=2]')    // H2 headings
parser.selectAll(tree, 'link[url*="github"]') // Links containing "github"

// Pseudo selectors
parser.selectAll(tree, ':first-child')  // First child elements
parser.selectAll(tree, ':last-child')   // Last child elements
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test CLI
npm run test:cli

# Run examples
npm run example
```

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/ksylvan/markdown-tree-parser.git
cd markdown-tree-parser

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format

# Test CLI functionality
npm run test:cli
```

### CI/CD

This project uses GitHub Actions for continuous integration. The workflow automatically:

- Tests against Node.js versions 18.x, 20.x, and 22.x
- Runs linting with ESLint
- Executes the full test suite
- Tests CLI functionality
- Verifies the package can be published

The CI badge in the README shows the current build status and links to the [Actions page](https://github.com/ksylvan/markdown-tree-parser/actions).

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built on top of the excellent [unified](https://unifiedjs.com/) ecosystem:

- [remark](https://github.com/remarkjs/remark) - Markdown processing
- [mdast](https://github.com/syntax-tree/mdast) - Markdown AST specification
- [unist](https://github.com/syntax-tree/unist) - Universal syntax tree utilities

## 📞 Support

- 📖 [Documentation](https://github.com/ksylvan/markdown-tree-parser#readme)
- 🐛 [Issue Tracker](https://github.com/ksylvan/markdown-tree-parser/issues)
- 💬 [Discussions](https://github.com/ksylvan/markdown-tree-parser/discussions)

---

Made with ❤️ by [Kayvan Sylvan](https://github.com/ksylvan)
