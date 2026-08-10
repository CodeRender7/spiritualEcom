# Patched OpenWA image: base open-wa/wa-automate plus procps (the base image
# lacks `ps`, which the OpenWA server spawns for process-cleanup and crashes
# with `Error: spawn ps ENOENT`, killing the whole container).
FROM openwa/wa-automate:latest

USER root

# The base image ships a google-chrome apt repo whose key has expired
# (NO_PUBKEY FD533C07C264648F), which makes `apt-get update` fail and kill the
# whole build. Chrome itself is already installed at /opt/google/chrome, so drop
# the repo (and clean stray lists) before updating.
RUN rm -f /etc/apt/sources.list.d/google-chrome*.list /etc/apt/trusted.gpg.d/google-chrome*.gpg \
  && rm -f /etc/apt/sources.list.d/*.save /etc/apt/sources.list.d/*.distUpgrade \
  && apt-get update \
  && apt-get install -y --no-install-recommends procps curl \
  && rm -rf /var/lib/apt/lists/*

# The base image sets USER owauser; procps binaries remain world-executable.
USER owauser

# Multi-session entrypoint (replaces the stock single-session EasyAPI CLI).
# Runs one client per WA_SESSIONS id and routes /<sessionId>/<method> paths.
# .cjs required: the base image package.json has "type": "module".
COPY openwa-multisession.cjs /usr/src/app/openwa-multisession.cjs

# Keep the base image's entrypoint intact.
ENTRYPOINT ["/usr/bin/dumb-init", "--", "./start.sh"]