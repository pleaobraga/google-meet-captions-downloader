import path from 'node:path'
import { defineConfig } from 'vite'

const dirname = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(dirname, './src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(dirname, 'src/entries/content-script.ts'),
      formats: ['iife'],
      name: 'MeetCaptionsContent',
      fileName: () => 'content-script.js',
    },
  },
})
