/**
 * markdown-tree-parser
 *
 * A powerful JavaScript library for parsing and manipulating markdown files as tree structures.
 * Built on top of the remark/unified ecosystem.
 *
 * @author Kayvan Sylvan <kayvan@sylvan.com>
 * @version 1.0.0
 * @license MIT
 */

import { MarkdownTreeParser } from './lib/markdown-parser.js';

// Export the main class
export { MarkdownTreeParser };

// Default export for convenience
export default MarkdownTreeParser;

// Export additional utilities that might be useful
export { unified } from 'unified';
export { visit } from 'unist-util-visit';
export { selectAll, select } from 'unist-util-select';
export { find } from 'unist-util-find';

/**
 * Convenience function to create a new parser instance
 * @param {Object} options - Configuration options for the parser
 * @returns {MarkdownTreeParser} New parser instance
 */
export function createParser(options = {}) {
  return new MarkdownTreeParser(options);
}

/**
 * Quick utility to parse markdown and extract a section
 * @param {string} markdown - Markdown content
 * @param {string} sectionName - Section heading to extract
 * @param {Object} options - Parser options
 * @returns {Promise<string|null>} Extracted section as markdown or null
 */
export async function extractSection(markdown, sectionName, options = {}) {
  const parser = new MarkdownTreeParser(options);
  const tree = await parser.parse(markdown);
  const section = parser.extractSection(tree, sectionName);

  if (!section) {
    return null;
  }

  return await parser.stringify(section);
}

/**
 * Quick utility to get all headings from markdown
 * @param {string} markdown - Markdown content
 * @param {Object} options - Parser options
 * @returns {Promise<Array>} Array of heading objects
 */
export async function getHeadings(markdown, options = {}) {
  const parser = new MarkdownTreeParser(options);
  const tree = await parser.parse(markdown);
  return parser.getHeadingsList(tree);
}

/**
 * Quick utility to generate table of contents
 * @param {string} markdown - Markdown content
 * @param {number} maxLevel - Maximum heading level (default: 3)
 * @param {Object} options - Parser options
 * @returns {Promise<string>} Table of contents as markdown
 */
export async function generateTOC(markdown, maxLevel = 3, options = {}) {
  const parser = new MarkdownTreeParser(options);
  const tree = await parser.parse(markdown);
  return parser.generateTableOfContents(tree, maxLevel);
}