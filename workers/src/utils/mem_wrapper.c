#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/resource.h>

int main(int argc, char *argv[]) {
    if (argc < 2) return 1;

    pid_t pid = fork();
    if (pid == -1) {
        perror("fork");
        return 1;
    } else if (pid == 0) {
        execvp(argv[1], &argv[1]);
        perror("execvp");
        exit(1);
    } else {
        int status;
        struct rusage usage;
        if (wait4(pid, &status, 0, &usage) == -1) {
            perror("wait4");
            return 1;
        }
        fprintf(stderr, "\nMEMORY_KB: %ld\n", usage.ru_maxrss);
        if (WIFEXITED(status)) {
            return WEXITSTATUS(status);
        } else if (WIFSIGNALED(status)) {
            return 128 + WTERMSIG(status);
        }
    }
    return 1;
}
