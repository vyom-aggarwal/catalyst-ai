import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // The design system is the only source of colour and type. A raw hex or an
      // arbitrary size in JSX is a token that was never added to DESIGN.md.
      // `test/tokens.test.ts` enforces this on the whole tree; this rule catches
      // the most common shape of it in the editor.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            'Raw colour literal. Use a token from DESIGN.md (bg-surface, text-muted, ...).',
        },
      ],
    },
  },
]

export default config
