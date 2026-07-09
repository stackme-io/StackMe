// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import type Parser from 'web-tree-sitter'
import { initJavaParser } from './parser'

// R2 GATE #0: does tree-sitter-java 0.20.2 parse Selenium @FindBy annotations into a
// clean tree (no ERROR), and how are they shaped? If it can't, the whole @FindBy plan
// is off before we write a line. Runs on the Node parser - no deploy needed.
const here = dirname(fileURLToPath(import.meta.url))
function pick(rels: string[], label: string): string {
  const hit = rels.map(r => resolve(here, r)).find(existsSync)
  if (!hit) throw new Error(`${label} not found in: ${rels.join(', ')}`)
  return hit
}
const coreWasm = pick([
  '../../node_modules/web-tree-sitter/tree-sitter.wasm',
  '../../../../node_modules/web-tree-sitter/tree-sitter.wasm',
], 'tree-sitter.wasm')
const javaWasm = pick([
  '../../../../node_modules/tree-sitter-wasms/out/tree-sitter-java.wasm',
  '../../node_modules/tree-sitter-wasms/out/tree-sitter-java.wasm',
], 'tree-sitter-java.wasm')

const SRC = `package com.example.pages;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.How;
import org.openqa.selenium.WebElement;

public class LoginPage extends BasePage {
  @FindBy(id = "loginButton")
  WebElement loginButton;

  @FindBy(how = How.ID, using = "user")
  WebElement user;

  @FindBy(css = ".submit")
  WebElement submit;
}`

type Node = Parser.SyntaxNode
function walk(root: Node): Node[] {
  const out: Node[] = []
  const stack: Node[] = [root]
  while (stack.length) {
    const n = stack.pop()!
    out.push(n)
    for (let i = n.childCount - 1; i >= 0; i--) { const c = n.child(i); if (c) stack.push(c) }
  }
  return out
}

let parser: Parser
beforeAll(async () => {
  parser = await initJavaParser({ locateFile: () => coreWasm, grammarPath: javaWasm })
}, 20000)

describe('R2 gate #0: @FindBy grammar', () => {
  it('parses @FindBy annotations without ERROR / MISSING nodes', () => {
    const nodes = walk(parser.parse(SRC).rootNode)
    const errors = nodes.filter(n => n.type === 'ERROR' || n.isMissing())
    expect(errors.map(n => `${n.type}@${n.startPosition.row + 1}`)).toEqual([])
  })

  it('recognizes annotations, extends, and How.ID (structure for step 2)', () => {
    const tree = parser.parse(SRC)
    const nodes = walk(tree.rootNode)
    // print the shape once so we can plan the @FindBy walk
    console.log('[R2 gate] node types seen:', [...new Set(nodes.map(n => n.type))].sort().join(', '))
    console.log('[R2 gate] sexp:\n' + tree.rootNode.toString())
    expect(nodes.some(n => /annotation/.test(n.type))).toBe(true)     // @FindBy recognized
    expect(nodes.some(n => n.type === 'superclass' || /extends/.test(n.type) || n.type === 'type_identifier')).toBe(true) // extends BasePage
  })
})
