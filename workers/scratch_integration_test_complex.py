import sys
import os
import asyncio
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from worker.wrapper_generator import WrapperGenerator
from services.docker_service import DockerService

LANGS = ['c', 'cpp', 'java']

COMPLEX_TYPES = ['Matrix<Integer>', 'Matrix<Float>', 'BinaryTree']

async def test_complex():
    service = DockerService()
    all_passed = True
    
    for lang in LANGS:
        for ptype in COMPLEX_TYPES:
            signature = {
                'name': 'testFunc',
                'params': [{'name': 'param1', 'type': ptype}],
                'returnType': ptype
            }
            if lang == 'c':
                if ptype == 'BinaryTree':
                    code = "struct TreeNode* testFunc(struct TreeNode* param1) { return param1; }\n"
                elif ptype.startswith('Matrix'):
                    if 'Float' in ptype:
                        code = "double** testFunc(double** param1, int param1_rows, int* param1_cols, int* ret_size, int** ret_col_sizes) { *ret_size=0; return param1; }\n"
                    else:
                        code = "int** testFunc(int** param1, int param1_rows, int* param1_cols, int* ret_size, int** ret_col_sizes) { *ret_size=0; return param1; }\n"
            elif lang == 'cpp':
                if ptype == 'BinaryTree':
                    code = "class Solution {\npublic:\n    TreeNode* testFunc(TreeNode* param1) { return param1; }\n};\n"
                elif ptype.startswith('Matrix'):
                    if 'Float' in ptype:
                        code = "class Solution {\npublic:\n    vector<vector<double>> testFunc(vector<vector<double>> param1) { return param1; }\n};\n"
                    else:
                        code = "class Solution {\npublic:\n    vector<vector<int>> testFunc(vector<vector<int>> param1) { return param1; }\n};\n"
            elif lang == 'java':
                if ptype == 'BinaryTree':
                    code = "class Solution {\n    public TreeNode testFunc(TreeNode param1) { return param1; }\n}\n"
                elif ptype.startswith('Matrix'):
                    if 'Float' in ptype:
                        code = "class Solution {\n    public double[][] testFunc(double[][] param1) { return param1; }\n}\n"
                    else:
                        code = "class Solution {\n    public int[][] testFunc(int[][] param1) { return param1; }\n}\n"
                
            wrapper = WrapperGenerator.generate_batch(lang, signature, code)
            sub_id = uuid.uuid4().hex[:8]
            run_dir, compile_res = await service.prepare_and_compile(sub_id, wrapper, lang)
            if compile_res and compile_res.exitCode != 0:
                print(f"COMPILE FAILED {lang} | Type: {ptype} | Err: {compile_res.stderr}")
                all_passed = False
            else:
                print(f"COMPILE PASSED {lang} | Type: {ptype}")
            await service.cleanup_submission(run_dir)

    if all_passed:
        print("COMPLEX TYPE TESTS PASSED")

if __name__ == '__main__':
    asyncio.run(test_complex())
