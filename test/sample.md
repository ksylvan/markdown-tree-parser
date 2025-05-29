# Sample Document

This is a sample markdown document for testing the markdown-tree-parser package.

## Overview

This document demonstrates various markdown features and structures that can be parsed and manipulated.

### Key Features

- **Bold text** and *italic text*
- `Inline code` and code blocks
- [Links](https://example.com) and ![images](image.png)
- Lists and tables

### Architecture

The document follows a hierarchical structure with multiple heading levels.

## Installation

Follow these steps to get started:

### Prerequisites

Make sure you have the following installed:

1. Node.js (version 18 or higher)
2. npm package manager
3. A text editor

### Quick Install

```bash
npm install markdown-tree-parser
```

### Configuration

You can configure the parser with various options:

```javascript
const parser = new MarkdownTreeParser({
  bullet: '-',
  emphasis: '_'
});
```

## Usage Examples

Here are some common usage patterns.

### Basic Usage

```javascript
import { MarkdownTreeParser } from 'markdown-tree-parser';

const parser = new MarkdownTreeParser();
const tree = await parser.parse(markdown);
```

### Advanced Features

For more complex scenarios:

- Extract specific sections
- Search with CSS selectors
- Transform document structure
- Generate statistics

### CLI Usage

The package includes a powerful CLI:

```bash
md-tree list document.md
md-tree extract document.md "Installation"
```

## API Reference

### Core Methods

The main parser class provides these methods:

- `parse(markdown)` - Parse markdown to AST
- `stringify(tree)` - Convert AST to markdown
- `extractSection(tree, heading)` - Extract sections
- `selectAll(tree, selector)` - CSS-like search

### Utility Functions

Additional helper functions:

- `getHeadingsList(tree)` - List all headings
- `getStats(tree)` - Document statistics
- `generateTableOfContents(tree)` - Create TOC

## Testing

The package includes comprehensive tests:

```bash
npm test
npm run test:cli
```

### Test Coverage

- Unit tests for all core functions
- Integration tests for CLI commands
- End-to-end examples

## Contributing

We welcome contributions from the community!

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the tests
5. Submit a pull request

### Code Standards

Please follow these guidelines:

- Use ESLint for code quality
- Write meaningful commit messages
- Include tests for new features
- Update documentation as needed

## Support

Need help? Here are your options:

### Documentation

- Check the README for basic usage
- Browse the examples directory
- Read the API documentation

### Community

- Open an issue on GitHub
- Join our discussions
- Check Stack Overflow

## License

This project is licensed under the MIT License.
