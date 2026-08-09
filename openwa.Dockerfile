# Patched OpenWA image: base open-wa/wa-automate plus procps (the base image
# lacks `ps`, which the OpenWA server spawns for process-cleanup and crashes
# with `Error: spawn ps ENOENT`, killing the whole container).
FROM openwa/wa-automate:latest

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends procps curl \
  && rm -rf /var/lib/apt/lists/*

# The base image sets USER owauser; procps binaries remain world-executable.
USER owauser

# Keep the base image's entrypoint intact.
ENTRYPOINT ["/usr/bin/dumb-init", "--", "./start.sh"]