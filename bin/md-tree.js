#!/usr/bin/env node

/**
 * md-tree CLI - Command line interface for markdown-tree-parser
 *
 * A powerful CLI tool for parsing and manipulating markdown files as tree structures.
 */

import { MarkdownTreeParser } from '../lib/markdown-parser.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, '..', 'package.json');

// Constants
const PATTERNS = {
  HEADING: /^(#{1,6})(\s+.*)$/,
  HEADING_LEVEL_1_5: /^(#{1,5})(\s+.*)$/,
  LEVEL_1_HEADING: /^# /,
  LEVEL_2_HEADING: /^## /,
  TOC_LINK: /\[([^\]]+)\]\(\.\/([^#)]+)(?:#[^)]*)?\)/,
  LEVEL_2_TOC_ITEM: /^ {2}[-*] \[/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

const LIMITS = {
  MAX_HEADING_LEVEL: 6,
  MIN_HEADING_LEVEL: 1,
  MAX_HEADING_LEVEL_FOR_ADJUSTMENT: 5,
};

const MESSAGES = {
  FILE_NOT_FOUND: '❌ File not found',
  WRITE_SUCCESS: '✅ Written to',
  PROCESSING: '✅ Processing',
  NO_SECTIONS_FOUND: '⚠️  No sections found',
  WARNING: '⚠️  Warning',
  ERROR: '❌ Error',
  USAGE_LIST: '❌ Usage: md-tree list <file>',
  USAGE_EXTRACT: '❌ Usage: md-tree extract <file> <heading>',
  USAGE_EXTRACT_ALL: '❌ Usage: md-tree extract-all <file> [level]',
  USAGE_EXPLODE: '❌ Usage: md-tree explode <file> <output-directory>',
  USAGE_ASSEMBLE: '❌ Usage: md-tree assemble <directory> <output-file>',
  USAGE_TREE: '❌ Usage: md-tree tree <file>',
  USAGE_SEARCH: '❌ Usage: md-tree search <file> <selector>',
  USAGE_STATS: '❌ Usage: md-tree stats <file>',
  USAGE_TOC: '❌ Usage: md-tree toc <file>',
  USAGE_CHECK_LINKS: '❌ Usage: md-tree check-links <file>',
  INDEX_NOT_FOUND: 'index.md not found in',
  NO_MAIN_TITLE: 'No main title found in index.md',
  NO_SECTION_FILES: 'No section files found in TOC',
  SECTION_ARROW: '→',
  TOC_CREATED: 'Table of Contents → index.md',
};

class MarkdownCLI {
  constructor() {
    this.parser = new MarkdownTreeParser();
  }

  async getVersion() {
    try {
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      return packageJson.version;
    } catch {
      return 'unknown';
    }
  }

  async readFile(filePath) {
    try {
      // Resolve relative paths
      const resolvedPath = path.resolve(filePath);
      return await fs.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      console.error(
        `${MESSAGES.ERROR} reading file ${filePath}:`,
        error.message
      );
      process.exit(1);
    }
  }

  async writeFile(filePath, content) {
    try {
      const resolvedPath = path.resolve(filePath);
      await fs.writeFile(resolvedPath, content, 'utf-8');
      console.log(
        `${MESSAGES.WRITE_SUCCESS} ${path.relative(process.cwd(), resolvedPath)}`
      );
    } catch (error) {
      console.error(
        `${MESSAGES.ERROR} writing file ${filePath}:`,
        error.message
      );
      process.exit(1);
    }
  }

  /**
   * Sanitize text for use in filenames or URL anchors
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizeText(text) {
    return text
      .toLowerCase()
      .replace(
        /[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\s-]/g,
        ''
      )
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Alias for backward compatibility and semantic clarity
  sanitizeFilename(text) {
    return this.sanitizeText(text);
  }

  // Alias for backward compatibility and semantic clarity
  createAnchor(text) {
    return this.sanitizeText(text);
  }

  async showUsage() {
    const version = await this.getVersion();
    console.log(`
📚 md-tree v${version} - Markdown Tree Parser CLI

Usage: md-tree <command> <file> [options]

Commands:
  list <file>                   List all headings in the file
  extract <file> <heading>      Extract a specific section by heading text
  extract-all <file> [level]    Extract all sections at level (default: 2)
  explode <file> <output-dir>   Extract all level 2 sections and create index
  assemble <dir> <output-file>  Reassemble exploded document from directory
  tree <file>                   Show the document structure as a tree
  search <file> <selector>      Search using CSS-like selectors
  stats <file>                  Show document statistics
  toc <file>                    Generate table of contents
  check-links <file>            Verify that links are reachable
  version                       Show version information
  help                          Show this help message

Options:
  --output, -o <dir>            Output directory for extracted files
  --level, -l <number>          Heading level to work with
  --format, -f <json|text>      Output format (default: text)
  --max-level <number>          Maximum heading level for TOC (default: 3)
  --recursive, -r               Recursively check linked markdown files

Examples:
  md-tree list README.md
  md-tree extract README.md "Installation"
  md-tree extract-all README.md 2 --output ./sections
  md-tree explode README.md ./exploded
  md-tree assemble ./exploded reassembled.md
  md-tree tree README.md
  md-tree search README.md "heading[depth=2]"
  md-tree stats README.md
  md-tree toc README.md --max-level 2

For more information, visit: https://github.com/ksylvan/markdown-tree-parser
`);
  }

  async listHeadings(filePath, format = 'text') {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const headings = this.parser.getHeadingsList(tree);

    if (format === 'json') {
      console.log(
        JSON.stringify(
          headings.map((h) => ({
            level: h.level,
            text: h.text,
          })),
          null,
          2
        )
      );
    } else {
      console.log(
        `\n📋 Headings in ${path.basename(filePath)} (${headings.length} total):\n`
      );
      headings.forEach((h, _index) => {
        const indent = '  '.repeat(h.level - 1);
        const icon = h.level === 1 ? '📁' : h.level === 2 ? '📄' : '📃';
        console.log(`${indent}${icon} ${h.text}`);
      });
    }
  }

  async extractSection(filePath, headingText, outputDir = null) {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const section = this.parser.extractSection(tree, headingText);

    if (!section) {
      console.error(
        `${MESSAGES.ERROR} Section "${headingText}" not found in ${path.basename(filePath)}`
      );

      // Suggest similar headings
      const headings = this.parser.getHeadingsList(tree);
      const suggestions = headings
        .filter((h) =>
          h.text
            .toLowerCase()
            .includes(headingText.toLowerCase().substring(0, 3))
        )
        .slice(0, 3);

      if (suggestions.length > 0) {
        console.log('\n💡 Did you mean one of these?');
        for (const h of suggestions) {
          console.log(`   - "${h.text}"`);
        }
      }

      process.exit(1);
    }

    const markdown = await this.parser.stringify(section);

    if (outputDir) {
      const filename = `${this.sanitizeFilename(headingText)}.md`;
      const outputPath = path.join(outputDir, filename);
      await fs.mkdir(outputDir, { recursive: true });
      await this.writeFile(outputPath, markdown);
    } else {
      console.log(`\n📄 Section "${headingText}":\n`);
      console.log(markdown);
    }
  }

  async extractAllSections(filePath, level = 2, outputDir = null) {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const sections = this.parser.extractAllSections(tree, level);

    if (sections.length === 0) {
      console.log(
        `${MESSAGES.NO_SECTIONS_FOUND} at level ${level} in ${path.basename(filePath)}`
      );
      return;
    }

    console.log(
      `\n📚 Found ${sections.length} sections at level ${level} in ${path.basename(filePath)}:\n`
    );

    if (outputDir) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const headingText = section.headingText;
      const markdown = await this.parser.stringify(section.tree);

      console.log(`${i + 1}. ${headingText}`);

      if (outputDir) {
        const filename = `${String(i + 1).padStart(2, '0')}-${this.sanitizeFilename(headingText)}.md`;
        const outputPath = path.join(outputDir, filename);
        await this.writeFile(outputPath, markdown);
      } else {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(markdown);
        console.log(`${'─'.repeat(50)}\n`);
      }
    }

    if (outputDir) {
      console.log(`\n✨ All sections extracted to ${outputDir}`);
    }
  }

  async showTree(filePath) {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const headings = this.parser.getHeadingsList(tree);

    if (headings.length === 0) {
      console.log(`📄 ${path.basename(filePath)} has no headings`);
      return;
    }

    console.log(`\n🌳 Document structure for ${path.basename(filePath)}:\n`);

    for (const heading of headings) {
      const indent = '  '.repeat(heading.level - 1);
      const icon =
        heading.level === 1 ? '📁' : heading.level === 2 ? '📄' : '📃';
      console.log(`${indent}${icon} ${heading.text}`);
    }
  }

  async searchNodes(filePath, selector, format = 'text') {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const nodes = this.parser.selectAll(tree, selector);

    if (format === 'json') {
      console.log(JSON.stringify(nodes, null, 2));
    } else {
      console.log(
        `\n🔍 Found ${nodes.length} nodes matching "${selector}" in ${path.basename(filePath)}:\n`
      );

      if (nodes.length === 0) {
        console.log('No matches found.');
        return;
      }

      nodes.forEach((node, index) => {
        console.log(`${index + 1}. Type: ${node.type}`);
        if (node.type === 'heading') {
          console.log(`   Text: "${this.parser.getHeadingText(node)}"`);
          console.log(`   Level: ${node.depth}`);
        } else if (node.type === 'text') {
          const preview = node.value.slice(0, 100);
          console.log(
            `   Value: "${preview}${node.value.length > 100 ? '...' : ''}"`
          );
        } else if (node.type === 'link') {
          console.log(`   URL: ${node.url}`);
          if (node.title) console.log(`   Title: ${node.title}`);
        }
        console.log();
      });
    }
  }

  async showStats(filePath) {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const stats = this.parser.getStats(tree);

    console.log(`\n📊 Statistics for ${path.basename(filePath)}:\n`);
    console.log(`📝 Word count: ${stats.wordCount.toLocaleString()}`);
    console.log(`📋 Paragraphs: ${stats.paragraphs}`);
    console.log(`📁 Headings: ${stats.headings.total}`);

    if (Object.keys(stats.headings.byLevel).length > 0) {
      console.log('   By level:');
      for (const [level, count] of Object.entries(stats.headings.byLevel).sort(
        ([a], [b]) => Number.parseInt(a) - Number.parseInt(b)
      )) {
        console.log(`     Level ${level}: ${count}`);
      }
    }

    console.log(`💻 Code blocks: ${stats.codeBlocks}`);
    console.log(`📌 Lists: ${stats.lists}`);
    console.log(`🔗 Links: ${stats.links}`);
    console.log(`🖼️  Images: ${stats.images}`);
  }

  async generateTOC(filePath, maxLevel = 3) {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const toc = this.parser.generateTableOfContents(tree, maxLevel);

    if (!toc) {
      console.log(
        `${MESSAGES.WARNING} No headings found in ${path.basename(filePath)} to generate TOC`
      );
      return;
    }

    console.log(`\n📚 Table of Contents for ${path.basename(filePath)}:\n`);
    console.log(toc);
  }

  async checkLinks(filePath, recursive = false, visited = new Set()) {
    const resolvedPath = path.resolve(filePath);
    if (visited.has(resolvedPath)) return;
    visited.add(resolvedPath);

    const content = await this.readFile(resolvedPath);
    const tree = await this.parser.parse(content);
    const links = this.parser.selectAll(tree, 'link');
    const definitions = this.parser.selectAll(tree, 'definition');

    const allUrls = [];
    for (const link of links) {
      allUrls.push(link.url);
    }
    for (const definition of definitions) {
      allUrls.push(definition.url);
    }

    const uniqueUrls = new Set(allUrls);

    console.log(
      `\n🔗 Checking ${uniqueUrls.size} unique URLs in ${path.basename(resolvedPath)}:`
    );

    for (const url of uniqueUrls) {
      if (!url || url.startsWith('#')) {
        continue;
      }

      // Show email links but mark as skipped
      if (url.startsWith('mailto:') || PATTERNS.EMAIL.test(url)) {
        console.log(`⏭️  ${url} (email - skipped)`);
        continue;
      }

      if (/^https?:\/\//i.test(url)) {
        try {
          const res = await globalThis.fetch(url, { method: 'HEAD' });
          if (res.ok) {
            console.log(`✅ ${url}`);
          } else {
            console.log(`❌ ${url} (${res.status})`);
          }
        } catch (err) {
          console.log(`❌ ${url} (${err.message})`);
        }
      } else {
        const target = path.resolve(
          path.dirname(resolvedPath),
          url.split('#')[0]
        );
        try {
          await fs.access(target);
          console.log(`✅ ${url}`);
          if (recursive && /\.md$/i.test(target)) {
            await this.checkLinks(target, true, visited);
          }
        } catch {
          console.log(`❌ ${url} (file not found)`);
        }
      }
    }
  }

  parseArgs() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      return { command: 'help', args: [], options: {} };
    }

    const command = args[0];
    const options = {
      output: null,
      level: 2,
      format: 'text',
      maxLevel: 3,
      recursive: false,
    };

    // Parse flags
    const filteredArgs = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--output' || arg === '-o') {
        options.output = args[i + 1];
        i++; // skip next arg
      } else if (arg === '--level' || arg === '-l') {
        options.level = Number.parseInt(args[i + 1]) || 2;
        i++; // skip next arg
      } else if (arg === '--format' || arg === '-f') {
        options.format = args[i + 1] || 'text';
        i++; // skip next arg
      } else if (arg === '--max-level') {
        options.maxLevel = Number.parseInt(args[i + 1]) || 3;
        i++; // skip next arg
      } else if (arg === '--recursive' || arg === '-r') {
        options.recursive = true;
      } else if (!arg.startsWith('-')) {
        filteredArgs.push(arg);
      }
    }

    return { command, args: filteredArgs, options };
  }

  // Command handlers
  async handleVersionCommand() {
    const version = await this.getVersion();
    console.log(`md-tree v${version}`);
  }

  async handleHelpCommand() {
    await this.showUsage();
  }

  async handleListCommand(args, options) {
    if (args.length < 2) {
      console.error(MESSAGES.USAGE_LIST);
      process.exit(1);
    }
    await this.listHeadings(args[1], options.format);
  }

  async handleExtractCommand(args, options) {
    if (args.length < 3) {
      console.error(MESSAGES.USAGE_EXTRACT);
      process.exit(1);
    }
    await this.extractSection(args[1], args[2], options.output);
  }

  async handleExtractAllCommand(args, options) {
    if (args.length < 2) {
      console.error(MESSAGES.USAGE_EXTRACT_ALL);
      process.exit(1);
    }
    const level = args[2] ? Number.parseInt(args[2]) : options.level;
    await this.extractAllSections(args[1], level, options.output);
  }

  async handleExplodeCommand(args) {
    if (args.length < 3) {
      console.error(MESSAGES.USAGE_EXPLODE);
      process.exit(1);
    }
    await this.explodeDocument(args[1], args[2]);
  }

  async handleAssembleCommand(args) {
    if (args.length < 3) {
      console.error(MESSAGES.USAGE_ASSEMBLE);
      process.exit(1);
    }
    await this.assembleDocument(args[1], args[2]);
  }

  async handleTreeCommand(args) {
    if (args.length < 2) {
      console.error(MESSAGES.USAGE_TREE);
      process.exit(1);
    }
    await this.showTree(args[1]);
  }

  async handleSearchCommand(args, options) {
    if (args.length < 3) {
      console.error(MESSAGES.USAGE_SEARCH);
      process.exit(1);
    }
    await this.searchNodes(args[1], args[2], options.format);
  }

  async handleStatsCommand(args) {
    if (args.length < 2) {
      console.error(MESSAGES.USAGE_STATS);
      process.exit(1);
    }
    await this.showStats(args[1]);
  }

  async handleTocCommand(args, options) {
    if (args.length < 2) {
      console.error(MESSAGES.USAGE_TOC);
      process.exit(1);
    }
    await this.generateTOC(args[1], options.maxLevel);
  }

  async handleCheckLinksCommand(args, options) {
    if (args.length < 2) {
      console.error(MESSAGES.USAGE_CHECK_LINKS);
      process.exit(1);
    }
    await this.checkLinks(args[1], options.recursive);
  }

  async run() {
    const { command, args, options } = this.parseArgs();

    try {
      switch (command) {
        case 'version':
          await this.handleVersionCommand();
          break;
        case 'help':
          await this.handleHelpCommand();
          break;
        case 'list':
          await this.handleListCommand(args, options);
          break;
        case 'extract':
          await this.handleExtractCommand(args, options);
          break;
        case 'extract-all':
          await this.handleExtractAllCommand(args, options);
          break;
        case 'explode':
          await this.handleExplodeCommand(args);
          break;
        case 'assemble':
          await this.handleAssembleCommand(args);
          break;
        case 'tree':
          await this.handleTreeCommand(args);
          break;
        case 'search':
          await this.handleSearchCommand(args, options);
          break;
        case 'stats':
          await this.handleStatsCommand(args);
          break;
        case 'toc':
          await this.handleTocCommand(args, options);
          break;
        case 'check-links':
          await this.handleCheckLinksCommand(args, options);
          break;
        default:
          console.error(`${MESSAGES.ERROR} Unknown command: ${command}`);
          console.log('Run "md-tree help" for usage information.');
          process.exit(1);
      }
    } catch (error) {
      console.error(`${MESSAGES.ERROR}:`, error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  async explodeDocument(filePath, outputDir) {
    // Use the text-based approach for perfect round-trip compatibility
    return await this.explodeDocumentTextBased(filePath, outputDir);
  }

  // Text-based explode that preserves original formatting exactly
  async explodeDocumentTextBased(filePath, outputDir) {
    const content = await this.readFile(filePath);
    const lines = content.split('\n');

    // Find all level 2 headings and their positions
    const sections = [];
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for main title (level 1)
      if (line.match(/^# /)) {
        if (currentSection) {
          currentSection.endLine = i - 1;
          sections.push(currentSection);
        }
        currentSection = null;
        continue;
      }

      // Check for level 2 heading (section start)
      if (line.match(/^## /)) {
        if (currentSection) {
          currentSection.endLine = i - 1;
          sections.push(currentSection);
        }

        currentSection = {
          headingText: line.replace(/^## /, ''),
          startLine: i,
          endLine: null,
          lines: [],
        };
        continue;
      }

      // Add line to current section if we're in one
      if (currentSection) {
        currentSection.lines.push(line);
      }
    }

    // Don't forget the last section
    if (currentSection) {
      currentSection.endLine = lines.length - 1;
      sections.push(currentSection);
    }

    if (sections.length === 0) {
      console.log(
        `${MESSAGES.NO_SECTIONS_FOUND} at level 2 in ${path.basename(filePath)}`
      );
      return;
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    console.log(
      `\n📚 Exploding ${sections.length} sections from ${path.basename(filePath)} to ${outputDir}:\n`
    );

    // Keep track of section filenames for index generation
    const sectionFiles = [];

    // Extract each section to its own file
    for (const section of sections) {
      const headingText = section.headingText;

      // Make main section heading Level 1, and decrement all subsection headings by one level
      const decrementedLines = section.lines.map((line) => {
        // Check if line is a heading (starts with #)
        const headingMatch = line.match(/^(#{2,6})(\s+.*)$/);
        if (headingMatch) {
          const [, hashes, rest] = headingMatch;
          // Remove one # to decrease the level (level 3 becomes level 2, etc.)
          return hashes.slice(1) + rest;
        }
        return line;
      });

      const sectionLines = [`# ${headingText}`, ...decrementedLines];
      const adjustedContent = sectionLines.join('\n');

      // Generate filename without numbered prefix
      const filename = `${this.sanitizeFilename(headingText)}.md`;
      const outputPath = path.join(outputDir, filename);

      sectionFiles.push({
        filename,
        headingText,
      });

      await this.writeFile(outputPath, adjustedContent);
      console.log(
        `${MESSAGES.PROCESSING} ${headingText} ${MESSAGES.SECTION_ARROW} ${filename}`
      );
    }

    // Parse content with AST to generate rich TOC with all subsections
    const tree = await this.parser.parse(content);
    const indexContent = await this.generateIndexContentWithSubsections(
      tree,
      sectionFiles
    );
    const indexPath = path.join(outputDir, 'index.md');
    await this.writeFile(indexPath, indexContent);
    console.log(`${MESSAGES.PROCESSING} ${MESSAGES.TOC_CREATED}`);

    console.log(
      `\n✨ Document exploded to ${outputDir} (${sectionFiles.length + 1} files)`
    );
  }

  async generateIndexContent(tree, sectionFiles) {
    // Use the enhanced AST-based approach to include all subsections
    return await this.generateIndexContentWithSubsections(tree, sectionFiles);
  }

  // Enhanced index generation with all subsections using AST
  async generateIndexContentWithSubsections(tree, sectionFiles) {
    const headings = this.parser.getHeadingsList(tree);
    const mainTitle = headings.find((h) => h.level === 1);

    if (!mainTitle) {
      return await this.generateIndexContentTextBased(
        await this.parser.stringify(tree),
        sectionFiles
      );
    }

    // Create a map of section names to filenames for quick lookup
    const sectionMap = new Map();
    for (const file of sectionFiles) {
      sectionMap.set(file.headingText.toLowerCase(), file.filename);
    }

    // Start with title and TOC heading
    let toc = `# ${mainTitle.text}\n\n## Table of Contents\n\n`;

    // Add the main title link
    toc += `- [${mainTitle.text}](#table-of-contents)\n`;

    // Process all headings to create nested TOC
    let currentLevel2Filename = null;

    for (const heading of headings) {
      // Skip the main title (level 1)
      if (heading.level === 1) {
        continue;
      }

      if (heading.level === 2) {
        // This is a main section
        currentLevel2Filename = sectionMap.get(heading.text.toLowerCase());

        if (currentLevel2Filename) {
          toc += `  - [${heading.text}](./${currentLevel2Filename})\n`;
        } else {
          toc += `  - [${heading.text}](#${this.createAnchor(heading.text)})\n`;
        }
      } else if (heading.level > 2 && currentLevel2Filename) {
        // This is a subsection within a level 2 section
        const indent = '  '.repeat(heading.level - 1);
        const anchor = this.createAnchor(heading.text);
        toc += `${indent}- [${heading.text}](./${currentLevel2Filename}#${anchor})\n`;
      }
    }

    return toc;
  }

  /**
   * Adjust heading levels in markdown content
   * @param {string} content - Markdown content
   * @param {number} adjustment - Number of levels to adjust (+1 to increase level, -1 to decrease level)
   * @returns {string} Content with adjusted heading levels
   */
  adjustHeadingLevels(content, adjustment) {
    const lines = content.split('\n');

    const adjustedLines = lines.map((line) => {
      const headingMatch = line.match(PATTERNS.HEADING_LEVEL_1_5);
      if (headingMatch) {
        const [, hashes, rest] = headingMatch;
        const currentLevel = hashes.length;
        const newLevel = currentLevel + adjustment;

        // Ensure we stay within valid heading level bounds (1-6)
        if (
          newLevel >= LIMITS.MIN_HEADING_LEVEL &&
          newLevel <= LIMITS.MAX_HEADING_LEVEL
        ) {
          return '#'.repeat(newLevel) + rest;
        }
      }
      return line;
    });

    return adjustedLines.join('\n');
  }

  // Convenience methods for backward compatibility
  decrementAllHeadingLevelsInText(content) {
    return this.adjustHeadingLevels(content, 1); // Add # (decrease logical level)
  }

  incrementHeadingLevelsInText(content) {
    return this.adjustHeadingLevels(content, 1); // Add # (increase logical level)
  }

  // Generate index content preserving original spacing
  async generateIndexContentTextBased(originalContent, sectionFiles) {
    const lines = originalContent.split('\n');

    // Find the main title
    let mainTitle = 'Table of Contents';
    for (const line of lines) {
      if (line.match(/^# /)) {
        mainTitle = line.replace(/^# /, '');
        break;
      }
    }

    // Create a map of section names to filenames for quick lookup
    const sectionMap = new Map();
    for (const file of sectionFiles) {
      sectionMap.set(file.headingText.toLowerCase(), file.filename);
    }

    // Start with title and TOC heading, preserving original spacing
    let toc = `# ${mainTitle}\n\n## Table of Contents\n\n`;

    // Add the main title link
    toc += `- [${mainTitle}](#table-of-contents)\n`;

    // Add links for each section
    for (const file of sectionFiles) {
      toc += `  - [${file.headingText}](./${file.filename})\n`;
    }

    return toc;
  }

  findParentLevel2Heading(headings, targetHeading) {
    const targetIndex = headings.indexOf(targetHeading);

    // Look backwards for the most recent level 2 heading
    for (let i = targetIndex - 1; i >= 0; i--) {
      if (headings[i].level === 2) {
        return headings[i];
      }
      // If we hit a level 1 heading, stop looking
      if (headings[i].level === 1) {
        break;
      }
    }

    return null;
  }

  // Helper method to decrement all heading levels in a tree by 1
  decrementHeadingLevels(tree) {
    if (!tree || !tree.children) return tree;

    // Create a deep copy to avoid modifying the original tree
    const clonedTree = JSON.parse(JSON.stringify(tree));

    const decrementNode = (node) => {
      if (node.type === 'heading' && node.depth > 1) {
        node.depth = node.depth - 1;
      }

      if (node.children) {
        node.children.forEach(decrementNode);
      }
    };

    if (clonedTree.children) {
      clonedTree.children.forEach(decrementNode);
    }

    return clonedTree;
  }

  // Helper method to increment all heading levels in a tree by 1
  incrementHeadingLevels(tree) {
    if (!tree || !tree.children) return tree;

    // Create a deep copy to avoid modifying the original tree
    const clonedTree = JSON.parse(JSON.stringify(tree));

    const incrementNode = (node) => {
      if (node.type === 'heading' && node.depth < 6) {
        node.depth = node.depth + 1;
      }

      if (node.children) {
        node.children.forEach(incrementNode);
      }
    };

    if (clonedTree.children) {
      clonedTree.children.forEach(incrementNode);
    }

    return clonedTree;
  }

  async assembleDocument(inputDir, outputFile) {
    const indexPath = path.join(inputDir, 'index.md');

    // Check if index.md exists
    try {
      await fs.access(indexPath);
    } catch {
      console.error(
        `${MESSAGES.ERROR} ${MESSAGES.INDEX_NOT_FOUND} ${inputDir}`
      );
      process.exit(1);
    }

    const indexContent = await this.readFile(indexPath);
    const indexTree = await this.parser.parse(indexContent);

    // Extract the main title and get the list of section files from TOC
    const headings = this.parser.getHeadingsList(indexTree);
    const mainTitle = headings.find((h) => h.level === 1);

    if (!mainTitle) {
      console.error(`${MESSAGES.ERROR} ${MESSAGES.NO_MAIN_TITLE}`);
      process.exit(1);
    }

    console.log(`\n📚 Assembling document: ${mainTitle.text}`);

    // Parse the TOC to extract section file references
    const sectionFiles = await this.extractSectionFilesFromTOC(indexTree);

    if (sectionFiles.length === 0) {
      console.error(`${MESSAGES.ERROR} ${MESSAGES.NO_SECTION_FILES}`);
      process.exit(1);
    }

    console.log(`📖 Found ${sectionFiles.length} sections to assemble`);

    // Start building the reassembled document
    let assembledContent = `# ${mainTitle.text}\n`;

    // Process each section file
    for (const sectionFile of sectionFiles) {
      console.log(`${MESSAGES.PROCESSING} ${sectionFile.filename}...`);

      const filePath = path.join(inputDir, sectionFile.filename);
      try {
        const sectionContent = await this.readFile(filePath);

        // Increment all heading levels back up to match original document structure
        const adjustedContent =
          this.incrementHeadingLevelsInText(sectionContent);

        // Add the section content:
        // - After main title: blank line then content (original has blank line after title)
        // - Between sections: direct concatenation (original has no spacing between sections)
        assembledContent += `\n${adjustedContent}`;
      } catch {
        console.error(
          `${MESSAGES.WARNING}: Could not read ${sectionFile.filename}, skipping...`
        );
      }
    }

    // Write the assembled document
    await this.writeFile(outputFile, assembledContent);
    console.log(`\n✨ Document assembled to ${outputFile}`);
  } // Method to increment ALL heading levels directly in text (shift all headings up one level)

  async extractSectionFilesFromTOC(indexTree) {
    // Convert the tree back to markdown to parse the TOC links
    const indexMarkdown = await this.parser.stringify(indexTree);
    const lines = indexMarkdown.split('\n');

    const sectionFiles = [];
    const processedFiles = new Set();

    for (const line of lines) {
      // Look for TOC lines that reference files (not just anchors)
      const match = line.match(/\[([^\]]+)\]\(\.\/([^#)]+)(?:#[^)]*)?\)/);
      if (match) {
        const [, linkText, filename] = match;

        // Only include level 2 sections (main sections, not sub-sections)
        // Level 2 items have exactly 2 spaces before the dash (are children of main heading)
        // Level 3+ items have 4+ spaces (are nested deeper)
        if (line.match(/^ {2}[-*] \[/) && !processedFiles.has(filename)) {
          sectionFiles.push({
            filename,
            title: linkText,
          });
          processedFiles.add(filename);
        }
      }
    }

    return sectionFiles;
  }
}

// Export the class for testing
export { MarkdownCLI };

const cli = new MarkdownCLI();
cli.run();
