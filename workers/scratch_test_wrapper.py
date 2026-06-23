import json
from src.worker.wrapper_generator import WrapperGenerator

sig = {
    'name': 'mergeTwoLists',
    'params': [
        {'name': 'list1', 'type': 'LinkedList'},
        {'name': 'list2', 'type': 'LinkedList'}
    ],
    'returnType': 'LinkedList'
}

code = """
class Solution:
    def mergeTwoLists(self, list1, list2):
        return None
"""

wrapper = WrapperGenerator.generate_batch("python", sig, code)

with open("temp_wrapper.py", "w") as f:
    f.write(wrapper)

print("Generated temp_wrapper.py")
