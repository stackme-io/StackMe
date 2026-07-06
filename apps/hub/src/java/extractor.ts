// JavaTreeSitterExtractor - the Selenium/Java front-end. Walks the tree-sitter CST
// and emits RawLocator for every `By.<strategy>(...)` call (whether standalone,
// inside driver.findElement(...), or a @FindBy field value - we only look at the By
// call itself). Direct string literal -> decoded selector; anything else (variable,
// concatenation, method call) -> null == dynamic. ERROR / MISSING nodes are collected
// per the step-7 contract (surfaced, not silently dropped). No classification here.

import type Parser from 'web-tree-sitter'
import type { LocatorExtractor, ExtractResult, RawLocator, ParseError, SourceFileInput } from '@locateme/core/types'
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

export class JavaTreeSitterExtractor implements LocatorExtractor {
  private parser: Parser
  constructor(parser: Parser) { this.parser = parser }

  extract(file: SourceFileInput): ExtractResult {
    const tree = this.parser.parse(file.text)
    const locators: RawLocator[] = []
    const errors: ParseError[] = []

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

      // Full DFS (all children, not just named) so ERROR nodes are caught too.
      for (let i = node.childCount - 1; i >= 0; i--) {
        const c = node.child(i)
        if (c) stack.push(c)
      }
    }

    return { locators, errors }
  }
}
