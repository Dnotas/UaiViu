#!/bin/bash
# Script para fazer deploy da correção de mensagens @lid

set -e

echo "🚀 Iniciando deploy da correção de mensagens @lid..."

cd /home/deploy/uaiviu

# Parar o backend
echo "⏸️  Parando backend..."
pm2 stop uaiviu-backend

# Fazer pull das alterações
echo "📥 Baixando alterações do git..."
git pull

# Instalar dependências
cd backend
echo "📦 Instalando dependências..."
npm install --force

# Limpar build anterior
echo "🧹 Limpando build anterior..."
rm -rf dist

# Compilar
echo "🔨 Compilando TypeScript..."
npm run build

# Iniciar backend
echo "▶️  Iniciando backend..."
pm2 start uaiviu-backend

# Salvar configuração PM2
pm2 save

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📊 Verificando logs..."
sleep 3
pm2 logs uaiviu-backend --lines 50
