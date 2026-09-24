.PHONY: setup install dev db-up db-down db-push db-seed run clean

# Configuração inicial do projeto
setup: install db-up db-push db-seed

# Instalação das dependências
install:
	pnpm install

# Rodar o projeto (atalho)
run: dev

# Rodar o projeto em modo de desenvolvimento
dev:
	pnpm dev

# Subir o banco de dados via Docker
db-up:
	docker compose up -d
	@echo "Aguardando o banco de dados iniciar..."
	sleep 5

# Parar o banco de dados
db-down:
	docker compose down

# Aplicar o schema no banco de dados
db-push:
	pnpm db:push

# Rodar os seeds para popular o banco de dados com usuário admin
db-seed:
	pnpm db:seed

# Parar o banco e remover volumes (limpeza total)
clean:
	docker compose down -v
