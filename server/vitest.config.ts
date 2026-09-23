import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Os testes compartilham o mesmo banco; rodar em série evita interferência.
    fileParallelism: false,
  },
})
