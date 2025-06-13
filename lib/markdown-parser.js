import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { selectAll, select } from 'unist-util-select';
import { find } from 'unist-util-find';

/**
 * A powerful markdown parser that treats markdown as a manipulable tree structure
 * Built on top of the remark/unified ecosystem
 */
export class MarkdownTreeParser {
  constructor(options = {}) {
    this.options = {
      // Default remark-stringify options
      bullet: '*',
      emphasis: '*',
      strong: '*',
      ...options,
    };

    this.processor = unified()
      .use(remarkParse)
      .use(remarkStringify, this.options);
  }

  /**
   * Parse markdown text into an Abstract Syntax Tree (AST)
   * @param {string} markdownText - The markdown content to parse
   * @returns {Promise<Object>} The parsed AST tree
   */
  async parse(markdownText) {
    const file = await this.processor.process(markdownText);
    return file.data.tree || this.processor.parse(markdownText);
  }

  /**
   * Convert AST back to markdown text
   * @param {Object} tree - The AST tree to stringify
   * @returns {Promise<string>} The markdown string
   */
  async stringify(tree) {
    // Create a deep copy of the tree to avoid mutation issues
    const treeCopy = JSON.parse(JSON.stringify(tree));
    const result = await unified()
      .use(remarkStringify, this.options)
      .stringify(treeCopy);
    return result;
  }

  /**
   * Find a specific heading and return it with all its content until the next same-level heading
   * @param {Object} tree - The AST tree to search
   * @param {string} headingText - Text to search for in headings
   * @param {number|null} level - Optional specific heading level to match
   * @returns {Object|null} New tree containing the section, or null if not found
   */
  extractSection(tree, headingText, level = null) {
    let foundHeading = null;
    let startIndex = -1;
    let endIndex = -1;
    let exactMatch = null;
    let exactMatchIndex = -1;

    // Find the target heading - prefer exact matches over partial matches
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'heading') {
        const nodeText = this.getHeadingText(node);
        const lowerNodeText = nodeText.toLowerCase();
        const lowerSearchText = headingText.toLowerCase();

        if (level === null || node.depth === level) {
          // Check for exact match first
          if (lowerNodeText === lowerSearchText) {
            exactMatch = node;
            exactMatchIndex = i;
          } else if (lowerNodeText.includes(lowerSearchText) && !foundHeading) {
            // Only use partial match if no exact match found yet and no other partial match
            foundHeading = node;
            startIndex = i;
          }
        }
      }
    }

    // Prefer exact match over partial match
    if (exactMatch) {
      foundHeading = exactMatch;
      startIndex = exactMatchIndex;
    }

    if (!foundHeading || startIndex === -1) {
      return null;
    }

    // Find where this section ends (next heading of same or higher level)
    const targetDepth = foundHeading.depth;
    for (let i = startIndex + 1; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'heading' && node.depth <= targetDepth) {
        endIndex = i;
        break;
      }
    }

    // Create a new tree with just this section
    const sectionNodes = tree.children.slice(
      startIndex,
      endIndex === -1 ? undefined : endIndex
    );

    // Create deep copies to avoid node reference issues
    const copiedNodes = JSON.parse(JSON.stringify(sectionNodes));

    return {
      type: 'root',
      children: copiedNodes,
    };
  }

  /**
   * Extract all sections at a specific heading level
   * @param {Object} tree - The AST tree to process
   * @param {number} level - Heading level to extract (default: 2)
   * @returns {Array} Array of section objects with heading and tree properties
   */
  extractAllSections(tree, level = 2) {
    const sections = [];
    let startIndex = -1;

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];

      if (node.type === 'heading' && node.depth === level) {
        // If we have a previous section, save it
        if (startIndex !== -1) {
          const sectionNodes = tree.children.slice(startIndex, i);
          // Create deep copies to avoid node reference issues
          const copiedNodes = JSON.parse(JSON.stringify(sectionNodes));
          sections.push({
            heading: JSON.parse(JSON.stringify(tree.children[startIndex])),
            tree: {
              type: 'root',
              children: copiedNodes,
            },
            headingText: this.getHeadingText(tree.children[startIndex]),
          });
        }

        // Start new section
        startIndex = i;
      } else if (
        node.type === 'heading' &&
        node.depth <= level &&
        startIndex !== -1
      ) {
        // End current section if we hit a higher-level heading
        const sectionNodes = tree.children.slice(startIndex, i);
        // Create deep copies to avoid node reference issues
        const copiedNodes = JSON.parse(JSON.stringify(sectionNodes));
        sections.push({
          heading: JSON.parse(JSON.stringify(tree.children[startIndex])),
          tree: {
            type: 'root',
            children: copiedNodes,
          },
          headingText: this.getHeadingText(tree.children[startIndex]),
        });
        startIndex = -1;
      }
    }

    // Don't forget the last section
    if (startIndex !== -1) {
      const sectionNodes = tree.children.slice(startIndex);
      // Create deep copies to avoid node reference issues
      const copiedNodes = JSON.parse(JSON.stringify(sectionNodes));
      sections.push({
        heading: JSON.parse(JSON.stringify(tree.children[startIndex])),
        tree: {
          type: 'root',
          children: copiedNodes,
        },
        headingText: this.getHeadingText(tree.children[startIndex]),
      });
    }

    return sections;
  }

  /**
   * Search for a single node using CSS-like selectors
   * @param {Object} tree - The AST tree to search
   * @param {string} selector - CSS-like selector string
   * @returns {Object|null} First matching node or null
   */
  select(tree, selector) {
    return select(selector, tree);
  }

  /**
   * Search for all nodes using CSS-like selectors
   * @param {Object} tree - The AST tree to search
   * @param {string} selector - CSS-like selector string
   * @returns {Array} Array of matching nodes
   */
  selectAll(tree, selector) {
    return selectAll(selector, tree);
  }

  /**
   * Find nodes by custom condition
   * @param {Object} tree - The AST tree to search
   * @param {string|function|Object} condition - Search condition
   * @returns {Object|null} First matching node or null
   */
  findNode(tree, condition) {
    if (typeof condition === 'string') {
      return find(tree, condition);
    }
    if (typeof condition === 'function') {
      return find(tree, condition);
    }
    if (typeof condition === 'object') {
      return find(tree, condition);
    }
    return null;
  }

  /**
   * Get plain text content from a heading node
   * @param {Object} headingNode - The heading AST node
   * @returns {string} Plain text content of the heading
   */
  getHeadingText(headingNode) {
    let text = '';
    visit(headingNode, 'text', (node) => {
      text += node.value;
    });
    return text;
  }

  /**
   * Transform tree by visiting nodes with a custom function
   * @param {Object} tree - The AST tree to transform
   * @param {function} visitor - Visitor function to apply to nodes
   * @returns {Object} The transformed tree
   */
  transform(tree, visitor) {
    visit(tree, visitor);
    return tree;
  }

  /**
   * Get a flat list of all headings with their levels and text
   * @param {Object} tree - The AST tree to analyze
   * @returns {Array} Array of heading objects with level, text, and node properties
   */
  getHeadingsList(tree) {
    const headings = [];
    visit(tree, 'heading', (node) => {
      headings.push({
        level: node.depth,
        text: this.getHeadingText(node),
        node: node,
      });
    });
    return headings;
  }

  /**
   * Extract everything under a specific heading level down to a certain depth
   * @param {Object} tree - The AST tree to search
   * @param {string} headingText - Heading text to search for
   * @param {number|null} maxDepth - Maximum depth to include (relative to found heading)
   * @returns {Object|null} New tree with nested section or null if not found
   */
  extractNestedSection(tree, headingText, maxDepth = null) {
    let foundHeading = null;
    let collecting = false;
    const sectionNodes = [];

    visit(tree, (node, _index) => {
      if (node.type === 'heading') {
        if (
          !collecting &&
          this.getHeadingText(node)
            .toLowerCase()
            .includes(headingText.toLowerCase())
        ) {
          foundHeading = node;
          collecting = true;
          sectionNodes.push(node);
        } else if (collecting) {
          // Stop collecting if we hit a heading of same or higher level
          if (node.depth <= foundHeading.depth) {
            return 'skip';
          }
          // Stop if we've exceeded max depth
          if (maxDepth && node.depth > foundHeading.depth + maxDepth) {
            return;
          }
          sectionNodes.push(node);
        }
      } else if (collecting) {
        sectionNodes.push(node);
      }
    });

    if (sectionNodes.length === 0) {
      return null;
    }

    // Create deep copies to avoid node reference issues
    const copiedNodes = JSON.parse(JSON.stringify(sectionNodes));

    return {
      type: 'root',
      children: copiedNodes,
    };
  }

  /**
   * Get document statistics
   * @param {Object} tree - The AST tree to analyze
   * @returns {Object} Statistics about the document
   */
  getStats(tree) {
    const stats = {
      headings: { total: 0, byLevel: {} },
      paragraphs: 0,
      codeBlocks: 0,
      lists: 0,
      links: 0,
      images: 0,
      wordCount: 0,
    };

    visit(tree, (node) => {
      switch (node.type) {
        case 'heading':
          stats.headings.total++;
          stats.headings.byLevel[node.depth] =
            (stats.headings.byLevel[node.depth] || 0) + 1;
          break;
        case 'paragraph':
          stats.paragraphs++;
          break;
        case 'code':
          stats.codeBlocks++;
          break;
        case 'list':
          stats.lists++;
          break;
        case 'link':
          stats.links++;
          break;
        case 'image':
          stats.images++;
          break;
        case 'text':
          stats.wordCount += node.value
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
          break;
      }
    });

    return stats;
  }

  /**
   * Create a table of contents from the document
   * @param {Object} tree - The AST tree to process
   * @param {number} maxLevel - Maximum heading level to include (default: 3)
   * @returns {string} Markdown table of contents
   */
  generateTableOfContents(tree, maxLevel = 3) {
    const headings = this.getHeadingsList(tree);
    const filteredHeadings = headings.filter((h) => h.level <= maxLevel);

    if (filteredHeadings.length === 0) {
      return '';
    }

    let toc = '## Table of Contents\n\n';

    for (const heading of filteredHeadings) {
      const indent = '  '.repeat(heading.level - 1);
      const link = heading.text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      toc += `${indent}- [${heading.text}](#${link})\n`;
    }

    return toc;
  }
}
