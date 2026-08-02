// frontend/lib/codeGenerator.js

import { JUDGE_MODES } from './typeSystem';

function normalizeType(t) {
  if (!t) return 'Int';
  if (t === 'Integer') return 'Int';
  if (t.startsWith('Array<Integer>')) return t.replace('Integer', 'Int');
  if (t.startsWith('Matrix<Integer>')) return t.replace('Integer', 'Int');
  return t;
}

export function generateStarterCode(judgeMode, signature, language) {
  if (judgeMode !== JUDGE_MODES.FUNCTION) {
    return null;
  }
  if (!signature) {
    return null;
  }

  const { name, params, returnType } = signature;
  const normalizedParams = (params || []).map(p => ({ ...p, type: normalizeType(p.type) }));
  const normalizedReturnType = normalizeType(returnType || 'Void');

  if (language === 'javascript') {
    const args = normalizedParams.map(p => p.name).join(', ');
    const jsDocParams = normalizedParams.map(p => ` * @param {${p.type}} ${p.name}`).join('\n');
    return `/**\n${jsDocParams}\n * @return {${normalizedReturnType}}\n */\nvar ${name} = function(${args}) {\n    \n};\n`;
  }

  if (language === 'python') {
    const typeMap = {
      'Int': 'int',
      'Float': 'float',
      'String': 'str',
      'Boolean': 'bool',
      'Character': 'str',
      'Array<Int>': 'List[int]',
      'Array<Float>': 'List[float]',
      'Array<String>': 'List[str]',
      'Array<Boolean>': 'List[bool]',
      'Matrix<Int>': 'List[List[int]]',
      'Matrix<Float>': 'List[List[float]]',
      'Matrix<String>': 'List[List[str]]',
      'Matrix<Boolean>': 'List[List[bool]]',
      'LinkedList': 'Optional[ListNode]',
      'BinaryTree': 'Optional[TreeNode]',
      'Void': 'None',
    };

    const mapPyType = (t) => {
      if (typeMap[t]) return typeMap[t];
      if (t.startsWith('Array<')) return `List[${mapPyType(t.slice(6, -1))}]`;
      if (t.startsWith('Matrix<')) return `List[List[${mapPyType(t.slice(7, -1))}]]`;
      return t;
    };

    const args = normalizedParams.map(p => `${p.name}: ${mapPyType(p.type)}`).join(', ');
    const ret = mapPyType(normalizedReturnType);
    
    const allTypes = [...normalizedParams.map(p => p.type), normalizedReturnType];
    const needsList = allTypes.some(t => t && (t.startsWith('Array') || t.startsWith('Matrix')));
    const needsOptional = allTypes.some(t => t === 'LinkedList' || t === 'BinaryTree');

    let typingImports = [];
    if (needsList) typingImports.push('List');
    if (needsOptional) typingImports.push('Optional');
    
    let imports = '';
    if (typingImports.length > 0) {
      imports = `from typing import ${typingImports.join(', ')}\n`;
    }
    
    return `${imports}${imports ? '\n' : ''}class Solution:\n    def ${name}(self, ${args}) -> ${ret}:\n        pass\n`;
  }

  if (language === 'c' || language === 'cpp') {
    const cTypeMap = {
      'Int': 'int',
      'Float': 'double',
      'String': language === 'cpp' ? 'string' : 'char*',
      'Boolean': language === 'cpp' ? 'bool' : 'int',
      'Character': 'char',
      'Array<Int>': language === 'cpp' ? 'vector<int>' : 'int*',
      'Array<Float>': language === 'cpp' ? 'vector<double>' : 'double*',
      'Array<String>': language === 'cpp' ? 'vector<string>' : 'char**',
      'Array<Boolean>': language === 'cpp' ? 'vector<bool>' : 'int*',
      'Matrix<Int>': language === 'cpp' ? 'vector<vector<int>>' : 'int**',
      'Matrix<Float>': language === 'cpp' ? 'vector<vector<double>>' : 'double**',
      'Matrix<String>': language === 'cpp' ? 'vector<vector<string>>' : 'char***',
      'Matrix<Boolean>': language === 'cpp' ? 'vector<vector<bool>>' : 'int**',
      'LinkedList': language === 'cpp' ? 'ListNode*' : 'struct ListNode*',
      'BinaryTree': language === 'cpp' ? 'TreeNode*' : 'struct TreeNode*',
      'Void': 'void'
    };
    const argsArray = normalizedParams.map(p => `${cTypeMap[p.type] || 'void*'} ${p.name}`);
    if (language === 'c' && normalizedReturnType.startsWith('Array')) {
        argsArray.push('int* returnSize');
    }
    const args = argsArray.join(', ');
    const ret = cTypeMap[normalizedReturnType] || 'void*';
    
    if (language === 'cpp') {
      let imports = '';
      const allTypes = [...normalizedParams.map(p => p.type), normalizedReturnType];
      if (allTypes.some(t => t && (t.startsWith('Array') || t.startsWith('Matrix')))) {
        imports += `#include <vector>\n`;
      }
      if (allTypes.some(t => t === 'String' || t === 'Array<String>')) {
        imports += `#include <string>\n`;
      }
      if (imports) imports += `\nusing namespace std;\n\n`;
      return `${imports}class Solution {\npublic:\n    ${ret} ${name}(${args}) {\n        \n    }\n};\n`;
    } else {
      let doc = '';
      if (normalizedReturnType.startsWith('Array')) {
          doc = `/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\n`;
      }
      return `${doc}${ret} ${name}(${args}) {\n    \n}\n`;
    }
  }

  if (language === 'java') {
    const javaTypeMap = {
      'Int': 'int',
      'Float': 'double',
      'String': 'String',
      'Boolean': 'boolean',
      'Character': 'char',
      'Array<Int>': 'int[]',
      'Array<Float>': 'double[]',
      'Array<String>': 'String[]',
      'Array<Boolean>': 'boolean[]',
      'Matrix<Int>': 'int[][]',
      'Matrix<Float>': 'double[][]',
      'Matrix<String>': 'String[][]',
      'Matrix<Boolean>': 'boolean[][]',
      'LinkedList': 'ListNode',
      'BinaryTree': 'TreeNode',
      'Void': 'void',
    };
    const args = normalizedParams.map(p => `${javaTypeMap[p.type] || 'Object'} ${p.name}`).join(', ');
    const ret = javaTypeMap[normalizedReturnType] || 'Object';
    return `class Solution {\n    public ${ret} ${name}(${args}) {\n        \n    }\n}\n`;
  }

  return null;
}

