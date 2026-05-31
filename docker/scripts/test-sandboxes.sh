#!/bin/bash
set -e

echo "Testing all sandboxes..."

# Python test
echo "Running Python test..."
docker run --rm --network=none --memory=64m --cpus=0.5 --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges --read-only --user sandbox kodechirp-python-sandbox python -c "print('Python OK')"

# Node test
echo "Running Node test..."
docker run --rm --network=none --memory=64m --cpus=0.5 --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges --read-only --user sandbox kodechirp-node-sandbox node -e "console.log('Node OK')"

# For C/C++, we need a volume mount to compile, so we'll test it locally
TMP_DIR=$(mktemp -d /tmp/kc_run_test_XXXXXX)
chmod 777 "$TMP_DIR"

# C++ test
echo "Running C++ test..."
echo '#include <iostream>' > "$TMP_DIR/main.cpp"
echo 'int main() { std::cout << "C++ OK\\n"; return 0; }' >> "$TMP_DIR/main.cpp"
chmod 666 "$TMP_DIR/main.cpp"
docker run --rm --network=none --memory=256m --cpus=1 --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs /tmp:size=32m --user sandbox -v "$TMP_DIR:/app:Z" -w /app kodechirp-cpp-sandbox sh -c "g++ main.cpp -O2 -std=c++17 -o main && ./main"

# C test
echo "Running C test..."
echo '#include <stdio.h>' > "$TMP_DIR/main.c"
echo 'int main() { printf("C OK\\n"); return 0; }' >> "$TMP_DIR/main.c"
chmod 666 "$TMP_DIR/main.c"
docker run --rm --network=none --memory=256m --cpus=1 --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs /tmp:size=32m --user sandbox -v "$TMP_DIR:/app:Z" -w /app kodechirp-c-sandbox sh -c "gcc main.c -O2 -std=c11 -o main_c && ./main_c"

rm -rf "$TMP_DIR"

echo "All tests passed!"
