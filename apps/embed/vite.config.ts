import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'FlowFormEmbed',
      fileName: 'flowform-embed',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
