// JavaTreeSitterExtractor - the Selenium/Java front-end. Walks the tree-sitter CST
// and emits RawLocator for every `By.<strategy>(...)` call (whether standalone,
// inside driver.findElement(...), or a @FindBy field value - we only look at the By
// call itself). Direct string literal -> decoded selector; anything else (variable,
// concatenation, method call) -> null == dynamic. ERROR / MISSING nodes are collected
// per the step-7 contract (surfaced, not silently dropped). No classification here.

import type Parser from 'web-tree-sitter'
import type { LocatorExtractor, ExtractResult, RawLocator, ParseError, ClassInfo, SourceFileInput } from '@locateme/core/types'
import { decodeJavaString, decodeJavaTextBlock } from '@locateme/core/javaString'

type Node = Parser.SyntaxNode

// The literal value of a By.* argument, or null when it isn't a plain string literal
// (identifier / concatenation / method call -> built elsewhere -> dynamic).
function literalValue(arg: Node): string | null {
  if (arg.type !== 'string_literal') return null
  const t = arg.text
  if (t.startsWith('"""')) return decodeJavaTextBlock(t)   // text block
  return decodeJavaString(t.slice(1, -1))                  // strip the surrounding quotes, then decode
}

// @FindBy shorthand keys and the How.* enum both map to our internal strategy names
// (the same ones classifySelenium understands). @FindBy(css=...) -> cssSelector, etc.
const FINDBY_KEY_TO_STRATEGY: Record<string, string> = {
  id: 'id', name: 'name', className: 'className', css: 'cssSelector',
  tagName: 'tagName', linkText: 'linkText', partialLinkText: 'partialLinkText', xpath: 'xpath',
}
const HOW_TO_STRATEGY: Record<string, string> = {
  ID: 'id', NAME: 'name', CLASS_NAME: 'className', CSS: 'cssSelector',
  TAG_NAME: 'tagName', LINK_TEXT: 'linkText', PARTIAL_LINK_TEXT: 'partialLinkText',
  XPATH: 'xpath', ID_OR_NAME: 'id', // ID_OR_NAME best-effort
}

// A `@FindBy(...)` annotation on a field -> one locator, audited at its declaration
// site (no inheritance merge - fragility is a function of the string, declared once).
// Two forms: shorthand `@FindBy(id="x")` and `@FindBy(how=How.ID, using="x")`.
function findByLocator(node: Node): RawLocator | null {
  if (node.childForFieldName('name')?.text !== 'FindBy') return null
  const args = node.childForFieldName('arguments')
  if (!args) return null

  let strategy: string | null = null
  let usingValue: Node | null = null
  let shorthandValue: Node | null = null
  for (let i = 0; i < args.namedChildCount; i++) {
    const pair = args.namedChild(i)
    if (!pair || pair.type !== 'element_value_pair') continue
    const key = pair.childForFieldName('key')?.text
    const value = pair.childForFieldName('value')
    if (!key || !value) continue
    if (key === 'how') {
      const field = value.type === 'field_access' ? value.childForFieldName('field')?.text : undefined
      if (field && HOW_TO_STRATEGY[field]) strategy = HOW_TO_STRATEGY[field]
    } else if (key === 'using') {
      usingValue = value
    } else if (FINDBY_KEY_TO_STRATEGY[key]) {
      strategy = FINDBY_KEY_TO_STRATEGY[key]
      shorthandValue = value
    }
  }
  if (!strategy) return null

  const litNode = usingValue ?? shorthandValue
  return {
    method: 'By.' + strategy,
    selector: litNode ? literalValue(litNode) : null,
    line: node.startPosition.row + 1,
  }
}

export class JavaTreeSitterExtractor implements LocatorExtractor {
  private parser: Parser
  constructor(parser: Parser) { this.parser = parser }

  extract(file: SourceFileInput): ExtractResult {
    const tree = this.parser.parse(file.text)
    const locators: RawLocator[] = []
    const errors: ParseError[] = []
    const classes: ClassInfo[] = []

    const stack: Node[] = [tree.rootNode]
    while (stack.length) {
      const node = stack.pop()!

      if (node.type === 'ERROR' || node.isMissing()) {
        errors.push({ line: node.startPosition.row + 1 })
      }

      if (node.type === 'method_invocation') {
        const obj = node.childForFieldName('object')
        const name = node.childForFieldName('name')
        if (obj && obj.type === 'identifier' && obj.text === 'By' && name) {
          const args = node.childForFieldName('arguments')
          const firstArg = args ? args.namedChild(0) : null
          locators.push({
            method: 'By.' + name.text,
            selector: firstArg ? literalValue(firstArg) : null,
            line: node.startPosition.row + 1,
          })
        }
      }

      if (node.type === 'annotation') {
        const loc = findByLocator(node)
        if (loc) locators.push(loc)
      }

      if (node.type === 'class_declaration') {
        const name = node.childForFieldName('name')?.text
        if (name) {
          const sc = node.childForFieldName('superclass')
          // `superclass` node text is "extends Base" (may carry generics) - strip both.
          const superclass = sc ? (sc.text.replace(/^\s*extends\s+/, '').replace(/<[\s\S]*$/, '').trim() || null) : null
          classes.push({ name, superclass, file: file.path, line: node.startPosition.row + 1 })
        }
      }

      // Full DFS (all children, not just named) so ERROR nodes are caught too.
      for (let i = node.childCount - 1; i >= 0; i--) {
        const c = node.child(i)
        if (c) stack.push(c)
      }
    }

    return { locators, errors, classes }
  }
}
