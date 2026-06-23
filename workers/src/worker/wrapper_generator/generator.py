# workers/src/worker/wrapper_generator/generator.py
from .types import normalize_signature
from .languages.python import PythonGenerator
from .languages.javascript import JavascriptGenerator
from .languages.c import CGenerator
from .languages.cpp import CppGenerator
from .languages.java import JavaGenerator

class WrapperGenerator:
    """
    Generates execution wrappers for FUNCTION and CLASS judge modes.
    Takes the user's implementation and wraps it with JSON serialization/deserialization logic.
    """

    @staticmethod
    def generate(language: str, signature: dict, user_code: str) -> str:
        """
        Main entry point for generating the wrapper.
        """
        signature = normalize_signature(signature)
        if language == "python":
            return PythonGenerator.generate(signature, user_code, batch=False)
        elif language == "javascript":
            return JavascriptGenerator.generate(signature, user_code, batch=False)
        elif language == "c":
            return CGenerator.generate(signature, user_code, batch=False)
        elif language == "cpp":
            return CppGenerator.generate(signature, user_code, batch=False)
        elif language == "java":
            return JavaGenerator.generate(signature, user_code, batch=False)
        else:
            raise NotImplementedError(f"Wrapper generation not supported for language: {language}")

    @staticmethod
    def generate_batch(language: str, signature: dict, user_code: str) -> str:
        """
        Generate a batch wrapper that runs ALL test cases in a single process.
        """
        signature = normalize_signature(signature)
        if language == "python":
            return PythonGenerator.generate(signature, user_code, batch=True)
        elif language == "javascript":
            return JavascriptGenerator.generate(signature, user_code, batch=True)
        elif language == "c":
            return CGenerator.generate(signature, user_code, batch=True)
        elif language == "cpp":
            return CppGenerator.generate(signature, user_code, batch=True)
        elif language == "java":
            return JavaGenerator.generate(signature, user_code, batch=True)
        else:
            raise NotImplementedError(f"Batch wrapper not supported for language: {language}")
