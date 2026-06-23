// gateway/src/utils/typeSystem.js

const DATA_TYPES = {
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
  // NOTE: Graph was removed — too many valid representations for automated judging.
};

const JUDGE_MODES = {
  STDIN_STDOUT: 'STDIN_STDOUT',
  FUNCTION: 'FUNCTION',
  CLASS: 'CLASS',
  CUSTOM: 'CUSTOM',
};

function validateSignature(metadata) {
  if (!metadata || typeof metadata !== 'object') return false;
  if (!metadata.name || typeof metadata.name !== 'string') return false;
  
  if (!Array.isArray(metadata.params)) return false;
  const validTypes = Object.values(DATA_TYPES);

  for (const param of metadata.params) {
    if (!param.name || typeof param.name !== 'string') return false;
    if (!validTypes.includes(param.type)) return false;
  }

  if (!validTypes.includes(metadata.returnType) && metadata.returnType !== 'Void') {
    return false;
  }

  return true;
}

module.exports = {
  DATA_TYPES,
  JUDGE_MODES,
  validateSignature,
};
