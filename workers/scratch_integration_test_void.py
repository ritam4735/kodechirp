import sys
import os
import asyncio
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from worker.wrapper_generator import WrapperGenerator
from services.docker_service import DockerService

LANGS = ['c', 'cpp', 'java']

async def test_void():
    service = DockerService()
    all_passed = True
    
    for lang in LANGS:
        signature = {
            'name': 'testFunc',
            'params': [{'name': 'param1', 'type': 'Integer'}],
            'returnType': 'Void'
        }
        if lang == 'c':
            code = "void testFunc(int param1) { }\n"
        elif lang == 'cpp':
            code = "class Solution {\npublic:\n    void testFunc(int param1) { }\n};\n"
        elif lang == 'java':
            code = "class Solution {\n    public void testFunc(int param1) { }\n}\n"
            
        wrapper = WrapperGenerator.generate_batch(lang, signature, code)
        sub_id = uuid.uuid4().hex[:8]
        run_dir, compile_res = await service.prepare_and_compile(sub_id, wrapper, lang)
        if compile_res and compile_res.exitCode != 0:
            print(f"COMPILE FAILED {lang} | Void Return | Err: {compile_res.stderr}")
            all_passed = False
        else:
            print(f"COMPILE PASSED {lang} | Void Return")
        await service.cleanup_submission(run_dir)

    if all_passed:
        print("VOID RETURN TESTS PASSED")

if __name__ == '__main__':
    asyncio.run(test_void())
