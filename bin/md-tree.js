#!/usr/bin/env node

/**
 * md-tree CLI - Command line interface for markdown-tree-parser
 *
 * A powerful CLI tool for parsing and manipulating markdown files as tree structures.
 */

import { MarkdownTreeParser } from "../lib/markdown-parser.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, "..", "package.json");

class MarkdownCLI {
  constructor() {
    this.parser = new MarkdownTreeParser();
  }

  async getVersion() {
    try {
      const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"));
      return packageJson.version;
    } catch {
      return "unknown";
    }
  }

  async readFile(filePath) {
    try {
      // Resolve relative paths
      const resolvedPath = path.resolve(filePath);
      return await fs.readFile(resolvedPath, "utf-8");
    } catch (error) {
      console.error(`❌ Error reading file ${filePath}:`, error.message);
      process.exit(1);
    }
  }

  async writeFile(filePath, content) {
    try {
      const resolvedPath = path.resolve(filePath);
      await fs.writeFile(resolvedPath, content, "utf-8");
      console.log(
        `✅ Written to ${path.relative(process.cwd(), resolvedPath)}`
      );
    } catch (error) {
      console.error(`❌ Error writing file ${filePath}:`, error.message);
      process.exit(1);
    }
  }

  sanitizeFilename(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async showUsage() {
    const version = await this.getVersion();
    console.log(`
📚 md-tree v${version} - Markdown Tree Parser CLI

Usage: md-tree <command> <file> [options]

Commands:
  list <file>                     List all headings in the file
  extract <file> <heading>        Extract a specific section by heading text
  extract-all <file> [level]      Extract all sections at level (default: 2)
  tree <file>                     Show the document structure as a tree
  search <file> <selector>        Search using CSS-like selectors
  stats <file>                    Show document statistics
  toc <file>                      Generate table of contents
  version                         Show version information
  help                            Show this help message

Options:
  --output, -o <dir>              Output directory for extracted files
  --level, -l <number>            Heading level to work with
  --format, -f <json|text>        Output format (default: text)
  --max-level <number>            Maximum heading level for TOC (default: 3)

Examples:
  md-tree list README.md
  md-tree extract README.md "Installation"
  md-tree extract-all README.md 2 --output ./sections
  md-tree tree README.md
  md-tree search README.md "heading[depth=2]"
  md-tree stats README.md
  md-tree toc README.md --max-level 2

For more information, visit: https://github.com/ksylvan/markdown-tree-parser
`);
  }

  async listHeadings(filePath, format = "text") {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const headings = this.parser.getHeadingsList(tree);

    if (format === "json") {
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
        const indent = "  ".repeat(h.level - 1);
        const icon = h.level === 1 ? "📁" : h.level === 2 ? "📄" : "📃";
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
        `❌ Section "${headingText}" not found in ${path.basename(filePath)}`
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
        console.log("\n💡 Did you mean one of these?");
        suggestions.forEach((h) => console.log(`   - "${h.text}"`));
      }

      process.exit(1);
    }

    const markdown = await this.parser.stringify(section);

    if (outputDir) {
      const filename = this.sanitizeFilename(headingText) + ".md";
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
        `⚠️  No sections found at level ${level} in ${path.basename(filePath)}`
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
        const filename = `${String(i + 1).padStart(2, "0")}-${this.sanitizeFilename(headingText)}.md`;
        const outputPath = path.join(outputDir, filename);
        await this.writeFile(outputPath, markdown);
      } else {
        console.log(`\n${"─".repeat(50)}`);
        console.log(markdown);
        console.log(`${"─".repeat(50)}\n`);
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

    headings.forEach((heading) => {
      const indent = "  ".repeat(heading.level - 1);
      const icon =
        heading.level === 1 ? "📁" : heading.level === 2 ? "📄" : "📃";
      console.log(`${indent}${icon} ${heading.text}`);
    });
  }

  async searchNodes(filePath, selector, format = "text") {
    const content = await this.readFile(filePath);
    const tree = await this.parser.parse(content);
    const nodes = this.parser.selectAll(tree, selector);

    if (format === "json") {
      console.log(JSON.stringify(nodes, null, 2));
    } else {
      console.log(
        `\n🔍 Found ${nodes.length} nodes matching "${selector}" in ${path.basename(filePath)}:\n`
      );

      if (nodes.length === 0) {
        console.log("No matches found.");
        return;
      }

      nodes.forEach((node, index) => {
        console.log(`${index + 1}. Type: ${node.type}`);
        if (node.type === "heading") {
          console.log(`   Text: "${this.parser.getHeadingText(node)}"`);
          console.log(`   Level: ${node.depth}`);
        } else if (node.type === "text") {
          const preview = node.value.slice(0, 100);
          console.log(
            `   Value: "${preview}${node.value.length > 100 ? "..." : ""}"`
          );
        } else if (node.type === "link") {
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
      console.log("   By level:");
      Object.entries(stats.headings.byLevel)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([level, count]) => {
          console.log(`     Level ${level}: ${count}`);
        });
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
        `⚠️  No headings found in ${path.basename(filePath)} to generate TOC`
      );
      return;
    }

    console.log(`\n📚 Table of Contents for ${path.basename(filePath)}:\n`);
    console.log(toc);
  }

  parseArgs() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      return { command: "help", args: [], options: {} };
    }

    const command = args[0];
    const options = {
      output: null,
      level: 2,
      format: "text",
      maxLevel: 3,
    };

    // Parse flags
    const filteredArgs = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--output" || arg === "-o") {
        options.output = args[i + 1];
        i++; // skip next arg
      } else if (arg === "--level" || arg === "-l") {
        options.level = parseInt(args[i + 1]) || 2;
        i++; // skip next arg
      } else if (arg === "--format" || arg === "-f") {
        options.format = args[i + 1] || "text";
        i++; // skip next arg
      } else if (arg === "--max-level") {
        options.maxLevel = parseInt(args[i + 1]) || 3;
        i++; // skip next arg
      } else if (!arg.startsWith("-")) {
        filteredArgs.push(arg);
      }
    }

    return { command, args: filteredArgs, options };
  }

  async run() {
    const { command, args, options } = this.parseArgs();

    try {
      switch (command) {
        case "version":
          const version = await this.getVersion();
          console.log(`md-tree v${version}`);
          break;

        case "help":
          await this.showUsage();
          break;

        case "list":
          if (args.length < 2) {
            console.error("❌ Usage: md-tree list <file>");
            process.exit(1);
          }
          await this.listHeadings(args[1], options.format);
          break;

        case "extract":
          if (args.length < 3) {
            console.error("❌ Usage: md-tree extract <file> <heading>");
            process.exit(1);
          }
          await this.extractSection(args[1], args[2], options.output);
          break;

        case "extract-all":
          if (args.length < 2) {
            console.error("❌ Usage: md-tree extract-all <file> [level]");
            process.exit(1);
          }
          const level = args[2] ? parseInt(args[2]) : options.level;
          await this.extractAllSections(args[1], level, options.output);
          break;

        case "tree":
          if (args.length < 2) {
            console.error("❌ Usage: md-tree tree <file>");
            process.exit(1);
          }
          await this.showTree(args[1]);
          break;

        case "search":
          if (args.length < 3) {
            console.error("❌ Usage: md-tree search <file> <selector>");
            process.exit(1);
          }
          await this.searchNodes(args[1], args[2], options.format);
          break;

        case "stats":
          if (args.length < 2) {
            console.error("❌ Usage: md-tree stats <file>");
            process.exit(1);
          }
          await this.showStats(args[1]);
          break;

        case "toc":
          if (args.length < 2) {
            console.error("❌ Usage: md-tree toc <file>");
            process.exit(1);
          }
          await this.generateTOC(args[1], options.maxLevel);
          break;

        default:
          console.error(`❌ Unknown command: ${command}`);
          console.log('Run "md-tree help" for usage information.');
          process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Run CLI
const cli = new MarkdownCLI();
cli.run();
