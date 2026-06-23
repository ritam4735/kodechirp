import os
import sys

# We'll read the original wrapper_generator.py
with open("workers/src/worker/wrapper_generator.py", "r") as f:
    original_code = f.read()

# We will create the new directory structure
os.makedirs("workers/src/worker/wrapper_generator/languages", exist_ok=True)
os.makedirs("workers/src/worker/wrapper_generator/templates/python", exist_ok=True)
os.makedirs("workers/src/worker/wrapper_generator/templates/javascript", exist_ok=True)
os.makedirs("workers/src/worker/wrapper_generator/templates/c", exist_ok=True)
os.makedirs("workers/src/worker/wrapper_generator/templates/cpp", exist_ok=True)
os.makedirs("workers/src/worker/wrapper_generator/templates/java", exist_ok=True)
os.makedirs("workers/src/worker/wrapper_generator/helpers", exist_ok=True)

print("Directories created.")
