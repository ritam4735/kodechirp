import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from worker.wrapper_generator import WrapperGenerator

TYPES = [
    'Integer', 'Float', 'String', 'Boolean', 'Character',
    'Array<Integer>', 'Array<Float>', 'Array<String>', 'Array<Boolean>',
    'Matrix<Integer>', 'Matrix<Float>', 'Matrix<String>', 'Matrix<Boolean>',
    'LinkedList', 'BinaryTree'
]

LANGS = ['python', 'javascript', 'c', 'cpp', 'java']

def test_type(ptype, ret_type, lang):
    signature = {
        'name': 'testFunc',
        'params': [{'name': 'param1', 'type': ptype}],
        'returnType': ret_type
    }
    try:
        if lang == 'python':
            code = "class Solution:\n    def testFunc(self, param1): pass\n"
        elif lang == 'javascript':
            code = "function testFunc(param1) {}\n"
        elif lang == 'c':
            code = "int testFunc(int param1) { return 0; }\n"
        elif lang == 'cpp':
            code = "class Solution {\npublic:\n    int testFunc(int param1) { return 0; }\n};\n"
        elif lang == 'java':
            code = "class Solution {\n    public int testFunc(int param1) { return 0; }\n}\n"
        WrapperGenerator.generate_batch(lang, signature, code)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"FAILED {lang} | Param: {ptype} | Return: {ret_type} -> {e}")
        return False
    return True

all_passed = True
for lang in LANGS:
    for t in TYPES:
        if not test_type(t, 'Void', lang): all_passed = False
        if not test_type('Integer', t, lang): all_passed = False

if all_passed:
    print("ALL TYPE COMBINATIONS PASSED FOR ALL LANGUAGES!")
