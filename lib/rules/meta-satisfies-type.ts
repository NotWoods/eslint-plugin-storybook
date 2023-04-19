/**
 * @fileoverview Meta should be followed by `satisfies Meta`
 * @author Tiger Oakes
 */

import { AST_NODE_TYPES, ASTUtils, TSESTree, TSESLint } from '@typescript-eslint/utils'
import { getMetaObjectExpression } from '../utils'
import { createStorybookRule } from '../utils/create-storybook-rule'
import { isTSSatisfiesExpression } from '../utils/ast'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

export = createStorybookRule({
  name: 'meta-satisfies-type',
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Meta should use `satisfies Meta`',
      categories: [],
      recommended: 'error',
    },
    messages: {
      metaShouldSatisfyType: 'Meta should be followed by `satisfies Meta`',
    },
    fixable: 'code',
    schema: [],
  },

  create(context) {
    // variables should be defined here
    const sourceCode = context.getSourceCode()

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------
    const getTextWithParentheses = (node: TSESTree.Node): string => {
      // Capture parentheses before and after the node
      let beforeCount = 0
      let afterCount = 0

      if (ASTUtils.isParenthesized(node, sourceCode)) {
        const bodyOpeningParen = sourceCode.getTokenBefore(node, ASTUtils.isOpeningParenToken)
        const bodyClosingParen = sourceCode.getTokenAfter(node, ASTUtils.isClosingParenToken)

        if (bodyOpeningParen && bodyClosingParen) {
          beforeCount = node.range[0] - bodyOpeningParen.range[0]
          afterCount = bodyClosingParen.range[1] - node.range[1]
        }
      }

      return sourceCode.getText(node, beforeCount, afterCount)
    }

    const getFixer = (meta: TSESTree.ObjectExpression): TSESLint.ReportFixFunction | undefined => {
      const { parent } = meta
      if (!parent) {
        return undefined
      }

      switch (parent.type) {
        // {} as Meta
        case AST_NODE_TYPES.TSAsExpression:
          return (fixer) => [
            fixer.replaceText(parent, getTextWithParentheses(meta)),
            fixer.insertTextAfter(
              parent,
              ` satisfies ${getTextWithParentheses(parent.typeAnnotation)}`
            ),
          ]
        // const meta: Meta = {}
        case AST_NODE_TYPES.VariableDeclarator: {
          const { typeAnnotation } = parent.id
          if (typeAnnotation) {
            return (fixer) => [
              fixer.remove(typeAnnotation),
              fixer.insertTextAfter(
                meta,
                ` satisfies ${getTextWithParentheses(typeAnnotation.typeAnnotation)}`
              ),
            ]
          }
          return undefined
        }
        default:
          return undefined
      }
    }
    // any helper functions should go here or else delete this section

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      ExportDefaultDeclaration(node) {
        const meta = getMetaObjectExpression(node, context)
        if (!meta) {
          return null
        }

        if (!meta.parent || !isTSSatisfiesExpression(meta.parent)) {
          context.report({
            node: meta,
            messageId: 'metaShouldSatisfyType',
            fix: getFixer(meta),
          })
        }
      },
    }
  },
})
