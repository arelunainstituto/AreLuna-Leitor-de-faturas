/**
 * Configuração do Jest para testes automatizados
 */
module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Padrão de arquivos de teste
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Cobertura de código
  collectCoverageFrom: [
    'server.js',
    'public/js/**/*.js',
    '!public/js/qr-scanner.js', // Excluir arquivo muito grande por enquanto
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Diretório de cobertura
  coverageDirectory: 'coverage',
  
  // Relatórios de cobertura
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Timeout padrão (em ms)
  testTimeout: 10000,
  
  // Mostrar mensagens detalhadas
  verbose: true,
  
  // Limpar mocks automaticamente
  clearMocks: true,
  
  // Resetar mocks automaticamente
  resetMocks: true,
  
  // Restaurar mocks automaticamente
  restoreMocks: true
};


