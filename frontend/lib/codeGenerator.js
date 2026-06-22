// frontend/lib/codeGenerator.js

import { JUDGE_MODES } from './typeSystem';

export function generateStarterCode(judgeMode, signature, language) {
  if (judgeMode !== JUDGE_MODES.FUNCTION && judgeMode !== JUDGE_MODES.CLASS) {
    return null;
  }
  if (!signature) {
    return null;
  }

  const { name, params, returnType } = signature;

  if (language === 'javascript') {
    const args = params.map(p => p.name).join(', ');
    const jsDocParams = params.map(p => ` * @param {${p.type}} ${p.name}`).join('\n');
    return `/**\n${jsDocParams}\n * @return {${returnType}}\n */\nvar ${name} = function(${args}) {\n    \n};\n`;
  }

  if (language === 'python') {
    const typeMap = {
      'Integer': 'int',
      'Float': 'float',
      'String': 'str',
      'Boolean': 'bool',
      'Character': 'str',
      'Array<Integer>': 'List[int]',
      'Array<Float>': 'List[float]',
      'Array<String>': 'List[str]',
      'Array<Boolean>': 'List[bool]',
      'Matrix<Integer>': 'List[List[int]]',
      'Matrix<Float>': 'List[List[float]]',
      'Matrix<String>': 'List[List[str]]',
      'Matrix<Boolean>': 'List[List[bool]]',
      'LinkedList': 'Optional[ListNode]',
      'BinaryTree': 'Optional[TreeNode]',
      'Graph': 'Node',
    };
    const args = params.map(p => `${p.name}: ${typeMap[p.type] || 'Any'}`).join(', ');
    const ret = typeMap[returnType] || 'Any';
    
    let imports = '';
    const allTypes = [...params.map(p => p.type), returnType];
    if (allTypes.some(t => t && (t.startsWith('Array') || t.startsWith('Matrix')))) {
      imports += `from typing import List\n`;
    }
    if (allTypes.some(t => t === 'LinkedList' || t === 'BinaryTree')) {
      imports += `from typing import Optional\n`;
    }
    
    return `${imports}${imports ? '\n' : ''}class Solution:\n    def ${name}(self, ${args}) -> ${ret}:\n        pass\n`;
  }

  if (language === 'c' || language === 'cpp') {
    const cTypeMap = {
      'Integer': 'int',
      'Float': 'double',
      'String': language === 'cpp' ? 'string' : 'char*',
      'Boolean': 'bool',
      'Character': 'char',
      'Array<Integer>': language === 'cpp' ? 'vector<int>' : 'int*',
      'Array<Float>': language === 'cpp' ? 'vector<double>' : 'double*',
      'Array<String>': language === 'cpp' ? 'vector<string>' : 'char**',
      'Array<Boolean>': language === 'cpp' ? 'vector<bool>' : 'bool*',
      'Matrix<Integer>': language === 'cpp' ? 'vector<vector<int>>' : 'int**',
      'LinkedList': 'ListNode*',
      'BinaryTree': 'TreeNode*',
      'Graph': 'Node*',
      'Void': 'void'
    };
    const argsArray = params.map(p => `${cTypeMap[p.type] || 'void*'} ${p.name}`);
    if (language === 'c' && returnType.startsWith('Array')) {
        argsArray.push('int* returnSize');
    }
    const args = argsArray.join(', ');
    const ret = cTypeMap[returnType] || 'void*';
    
    if (language === 'cpp') {
      let imports = '';
      const allTypes = [...params.map(p => p.type), returnType];
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
      if (returnType.startsWith('Array')) {
          doc = `/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\n`;
      }
      return `${doc}${ret} ${name}(${args}) {\n    \n}\n`;
    }
  }

  return null;
}
