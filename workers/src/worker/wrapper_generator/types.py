# workers/src/worker/wrapper_generator/types.py

_TYPE_ALIASES = {
    'Integer': 'Int',
    'Float': 'Float',
    'String': 'String',
    'Boolean': 'Boolean',
    'Character': 'Character',
    'Array<Integer>': 'Array<Int>',
    'Array<Float>': 'Array<Float>',
    'Array<String>': 'Array<String>',
    'Array<Boolean>': 'Array<Boolean>',
    'Matrix<Integer>': 'Matrix<Int>',
    'Matrix<Float>': 'Matrix<Float>',
    'Matrix<String>': 'Matrix<String>',
    'Matrix<Boolean>': 'Matrix<Boolean>',
    'LinkedList': 'LinkedList',
    'BinaryTree': 'BinaryTree',
    'Void': 'Void',
    'Int': 'Int',
    'Array<Int>': 'Array<Int>',
    'Matrix<Int>': 'Matrix<Int>',
}

def normalize_type(t: str) -> str:
    """Normalize a UI type name to the internal canonical name."""
    return _TYPE_ALIASES.get(t, t)

def normalize_signature(sig: dict) -> dict:
    """Return a copy of the signature with all types normalized."""
    return {
        'name': sig.get('name', 'solve'),
        'params': [
            {'name': p['name'], 'type': normalize_type(p['type'])}
            for p in sig.get('params', [])
        ],
        'returnType': normalize_type(sig.get('returnType', 'Void')),
    }

def c_type(sig_type: str) -> str:
    """Map signature type to C type string."""
    mapping = {
        'Int': 'int',
        'Float': 'double',
        'Boolean': 'int',
        'String': 'char*',
        'Character': 'char',
        'Array<Int>': 'int*',
        'Array<Float>': 'double*',
        'Array<String>': 'char**',
        'Array<Boolean>': 'int*',
        'Matrix<Int>': 'int**',
        'Matrix<Float>': 'double**',
        'Matrix<String>': 'char***',
        'Matrix<Boolean>': 'int**',
        'LinkedList': 'struct ListNode*',
        'BinaryTree': 'struct TreeNode*',
        'Void': 'void',
    }
    return mapping.get(sig_type, 'int')

def cpp_type(sig_type: str) -> str:
    """Map signature type to C++ type string."""
    mapping = {
        'Int': 'int',
        'Float': 'double',
        'Boolean': 'bool',
        'String': 'string',
        'Character': 'char',
        'Array<Int>': 'vector<int>',
        'Array<Float>': 'vector<double>',
        'Array<String>': 'vector<string>',
        'Array<Boolean>': 'vector<bool>',
        'Matrix<Int>': 'vector<vector<int>>',
        'Matrix<Float>': 'vector<vector<double>>',
        'Matrix<String>': 'vector<vector<string>>',
        'Matrix<Boolean>': 'vector<vector<bool>>',
        'LinkedList': 'ListNode*',
        'BinaryTree': 'TreeNode*',
        'Void': 'void',
    }
    return mapping.get(sig_type, 'int')

def java_type(sig_type: str) -> str:
    """Map signature type to Java type string."""
    mapping = {
        'Int': 'int',
        'Float': 'double',
        'Boolean': 'boolean',
        'String': 'String',
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
    }
    return mapping.get(sig_type, 'int')
