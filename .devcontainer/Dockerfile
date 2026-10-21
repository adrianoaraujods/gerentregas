FROM mcr.microsoft.com/devcontainers/typescript-node:24

# Postgres e locale entram na imagem: o postCreateCommand roda como `node`,
# que nesta imagem não tem sudo sem senha.
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql locales \
 && sed -i 's/^# *pt_BR.UTF-8/pt_BR.UTF-8/' /etc/locale.gen \
 && locale-gen \
 && rm -rf /var/lib/apt/lists/*
