// frontend/lib/typeSystem.js

export const DATA_TYPES = {
  // Primitives
  INTEGER: 'Integer',
  FLOAT: 'Float',
  STRING: 'String',
  BOOLEAN: 'Boolean',
  CHARACTER: 'Character',

  // Collections
  ARRAY_INTEGER: 'Array<Integer>',
  ARRAY_FLOAT: 'Array<Float>',
  ARRAY_STRING: 'Array<String>',
  ARRAY_BOOLEAN: 'Array<Boolean>',
  
  MATRIX_INTEGER: 'Matrix<Integer>', // 2D Arrays
  MATRIX_FLOAT: 'Matrix<Float>',
  MATRIX_STRING: 'Matrix<String>',
  MATRIX_BOOLEAN: 'Matrix<Boolean>',

  // Complex Structures
  LINKED_LIST: 'LinkedList',
  BINARY_TREE: 'BinaryTree',
  GRAPH: 'Graph',
};

export const JUDGE_MODES = {
  STDIN_STDOUT: 'STDIN_STDOUT',
  FUNCTION: 'FUNCTION',
  CLASS: 'CLASS',
  CUSTOM: 'CUSTOM',
};
