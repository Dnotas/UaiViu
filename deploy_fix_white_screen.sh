#!/bin/bash

# Script para corrigir erro de tela branca no frontend
# Adiciona perfil supervisor e proteção robusta no componente Can

echo "=========================================="
echo "CORREÇÃO: Erro de tela branca (TypeError)"
echo "=========================================="
echo ""

# Ir para o diretório do projeto
cd /home/deploy/uaiviu

echo "1. Fazendo backup do frontend atual..."
if [ -d "frontend/build" ]; then
  cp -r frontend/build frontend/build.backup.$(date +%Y%m%d_%H%M%S)
fi

echo "2. Atualizando código do repositório..."
git pull

echo "3. Parando frontend..."
pm2 stop uaiviu-frontend

echo "4. Instalando dependências do frontend..."
cd frontend
npm install

echo "5. Fazendo build do frontend..."
rm -rf build
npm run build

echo "6. Iniciando frontend..."
pm2 start uaiviu-frontend
pm2 save

echo ""
echo "=========================================="
echo "Deploy concluído com sucesso!"
echo "=========================================="
echo ""
echo "Teste o acesso ao sistema agora."
echo "A tela branca deve estar corrigida."
echo ""
