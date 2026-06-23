import sys
import os
import asyncio
import uuid
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from worker.wrapper_generator import WrapperGenerator
from services.docker_service import DockerService
from models.submission import ExecutionResult

TYPES = [
    'Integer', 'Float', 'String', 'Boolean', 'Character',
    'Array<Integer>', 'Array<Float>', 'Array<String>', 'Array<Boolean>',
    'Matrix<Integer>', 'Matrix<Float>', 'Matrix<String>', 'Matrix<Boolean>',
    'LinkedList', 'BinaryTree'
]

LANGS = ['python', 'javascript', 'c', 'cpp', 'java']

async def test_all():
    service = DockerService()
    all_passed = True
    
    for lang in LANGS:
        for ptype in TYPES:
            ret_type = 'Void'
            signature = {
                'name': 'testFunc',
                'params': [{'name': 'param1', 'type': ptype}],
                'returnType': ret_type
            }
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
                
            wrapper = WrapperGenerator.generate_batch(lang, signature, code)
            
            sub_id = uuid.uuid4().hex[:8]
            
            # For C, CPP, Java we can check compile errors
            if lang in ['c', 'cpp', 'java']:
                run_dir, compile_res = await service.prepare_and_compile(sub_id, wrapper, lang)
                if compile_res and compile_res.exitCode != 0:
                    print(f"COMPILE FAILED {lang} | Param: {ptype} | Err: {compile_res.stderr}")
                    all_passed = False
                await service.cleanup_submission(run_dir)
            else:
                # For interpreted languages, just run it with empty JSON to check for syntax errors
                res = await service.execute_code(wrapper, lang, stdin="\n", timeout_ms=2000)
                if res.exitCode != 0 and "___KC_BATCH_SEP___" not in res.stdout:
                    print(f"RUN FAILED {lang} | Param: {ptype} | Err: {res.stderr} | Out: {res.stdout}")
                    all_passed = False

    if all_passed:
        print("ALL INTEGRATION TESTS PASSED")

if __name__ == '__main__':
    asyncio.run(test_all())
