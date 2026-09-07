// gateway/src/utils/templateGenerator.js
'use strict';

/**
 * Generate basic starter code templates for all supported languages.
 *
 * @param {string} judgeMode
 * @param {Object} signature
 * @returns {Object.<string, string>}
 */
function generateAllTemplates(judgeMode, signature) {
  if (judgeMode !== 'FUNCTION' || !signature || !signature.name) {
    return {
      python: '# Write your code here\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
      java: 'public class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
      javascript: '// Write your code here\n',
    };
  }

  const funcName = signature.name;
  const params = Array.isArray(signature.params) ? signature.params : [];
  const returnType = signature.returnType || 'Void';

  // Python
  const pyParams = params.map(p => p.name).join(', ');
  const pyCode = `class Solution:\n    def ${funcName}(self${pyParams ? ', ' + pyParams : ''}):\n        pass\n`;

  // JavaScript
  const jsParams = params.map(p => p.name).join(', ');
  const jsCode = `/**\n * @return {${returnType}}\n */\nfunction ${funcName}(${jsParams}) {\n    // Write your code here\n}\n`;

  // C++
  const mapCppType = (t) => {
    if (!t) return 'void';
    if (t === 'Integer' || t === 'Int') return 'int';
    if (t === 'Long' || t === 'Int64') return 'long long';
    if (t === 'Float' || t === 'Double') return 'double';
    if (t === 'Boolean') return 'bool';
    if (t === 'String') return 'string';
    if (t === 'Character' || t === 'Char') return 'char';
    if (t.startsWith('Array<')) {
      const inner = mapCppType(t.slice(6, -1));
      return `vector<${inner}>`;
    }
    if (t.startsWith('Matrix<')) {
      const inner = mapCppType(t.slice(7, -1));
      return `vector<vector<${inner}>>`;
    }
    return 'void';
  };
  const cppRet = mapCppType(returnType);
  const cppParams = params.map(p => `${mapCppType(p.type)} ${p.name}`).join(', ');
  const cppCode = `#include <vector>\n#include <string>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    ${cppRet} ${funcName}(${cppParams}) {\n        \n    }\n};\n`;

  // Java
  const mapJavaType = (t) => {
    if (!t) return 'void';
    if (t === 'Integer' || t === 'Int') return 'int';
    if (t === 'Long' || t === 'Int64') return 'long';
    if (t === 'Float' || t === 'Double') return 'double';
    if (t === 'Boolean') return 'boolean';
    if (t === 'String') return 'String';
    if (t === 'Character' || t === 'Char') return 'char';
    if (t.startsWith('Array<')) {
      const inner = mapJavaType(t.slice(6, -1));
      return `${inner}[]`;
    }
    if (t.startsWith('Matrix<')) {
      const inner = mapJavaType(t.slice(7, -1));
      return `${inner}[][]`;
    }
    return 'void';
  };
  const javaRet = mapJavaType(returnType);
  const javaParams = params.map(p => `${mapJavaType(p.type)} ${p.name}`).join(', ');
  const javaCode = `class Solution {\n    public ${javaRet} ${funcName}(${javaParams}) {\n        \n    }\n}\n`;

  return {
    python: pyCode,
    javascript: jsCode,
    cpp: cppCode,
    java: javaCode,
  };
}

module.exports = {
  generateAllTemplates,
};
