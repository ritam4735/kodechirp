# KodeChirp Sandbox Architecture

This directory contains the production-grade Docker sandbox infrastructure for KodeChirp.
These sandboxes are designed to securely execute untrusted user-submitted code in isolated environments.

## Architecture Overview

The system uses dedicated, minimal Docker containers tailored for each supported language. Each execution creates a randomized, isolated host directory, which is mounted into a hardened container that lives only for the duration of the code execution.

### Directory Structure

- `python-sandbox/`: Lightweight Alpine-based Python 3 environment.
- `node-sandbox/`: Minimal Alpine-based Node.js environment.
- `cpp-sandbox/`: Alpine-based environment with `g++` and minimal standard libraries.
- `c-sandbox/`: Alpine-based environment with `gcc`.
- `scripts/`: Automation scripts for building, rebuilding, testing, and cleaning up sandboxes.

## Security Model

The security model assumes **all incoming code is highly malicious**. We defend against container escapes, resource exhaustion, and privilege escalation through multiple layers of Docker isolation:

1. **Non-Root Execution**: Every container enforces execution as the unprivileged `sandbox` user.
2. **Network Isolation**: `--network=none` ensures zero inbound/outbound connectivity.
3. **Resource Limits**: Strict limits on CPU (`--cpus`), Memory (`--memory`), and process count (`--pids-limit=64`) prevent Denial of Service.
4. **Capability Dropping**: `--cap-drop=ALL` removes unnecessary root capabilities.
5. **No Privilege Escalation**: `--security-opt=no-new-privileges` strictly forbids `setuid`/`setgid` binaries from escalating privileges.
6. **Read-Only Filesystem**: `--read-only` prevents code from modifying the system root, while a small `--tmpfs /tmp` enables standard buffer behavior.
7. **Volume Isolation**: The executor provisions a random, temporary `kc_run_xxxx` directory per execution, mounted with restricted permissions. 

## Build Instructions

To build all sandboxes from scratch, run the provided build script:

```bash
./scripts/build-all.sh
```

To force a rebuild ignoring the Docker cache:

```bash
./scripts/rebuild-all.sh
```

## Runtime Flow

1. The KodeChirp backend receives a code submission via `/api/execute`.
2. `codeRunner.js` generates a unique UUID and creates an isolated `kc_run_{uuid}` directory in the host `/tmp` folder.
3. The source code is written to this directory (e.g. `main.cpp`).
4. A Docker subprocess is spawned using the respective `kodechirp-*-sandbox` image, mounting the directory.
5. The container compiles (if necessary) and runs the code. Outputs (stdout/stderr) are piped back to the Node process.
6. A hard wall-clock timeout enforces termination if the code infinite-loops.
7. `codeRunner.js` recursively deletes the host execution directory.

## Executor Integration

The KodeChirp backend (`services/codeRunner.js`) abstracts execution dynamically:

```javascript
const dockerArgs = [
  'run', '--rm',
  '--network=none',
  '--memory=64m', // Lang specific
  '--cpus=0.5',   // Lang specific
  '--pids-limit=64',
  '--cap-drop=ALL',
  '--security-opt=no-new-privileges',
  '--read-only',
  '--tmpfs', '/tmp:size=16m,exec',
  '--user', 'sandbox',
  '-v', `${runDir}:/app:Z`,
  '-w', '/app',
  imageName,
  ...commands
];
```

## Future Scalability Guidance

To add a new language (e.g., Rust or Go):
1. Create a `rust-sandbox/Dockerfile`.
2. Use an Alpine or scratch base. Install only the required compiler/runtime.
3. Add the `sandbox` user and set it as `USER sandbox`.
4. Update `build-all.sh` to build `kodechirp-rust-sandbox`.
5. Add configuration in `LANGUAGE_CONFIG` within `codeRunner.js`.

## Troubleshooting

- **Podman Compatibility**: Podman runs daemonless and often rootless. If you encounter permission errors on mounted volumes, ensure the `-v <dir>:/app:Z` flag is used (`:Z` relabels the SELinux context for the container). The executor handles this natively.
- **Docker Compatibility**: If using standard Docker, the `sandbox` user (UID usually 100 on Alpine) must have write access to the volume mounted. The executor runs `chmod 777` on the temporary host directory to ensure smooth handoffs.
- **Hanging Containers**: If a container hangs past the backend timeout, the `codeRunner.js` will send a `SIGKILL` to the `spawn` process, which typically kills the Docker CLI. Ensure `scripts/cleanup.sh` is periodically run on the host to purge any detached containers.
