#!/bin/bash

# Script de deploy - Correção transcrição de áudio
# Atualiza modelo Gemini para gemini-2.5-flash-lite

echo "🚀 Iniciando deploy da correção de transcrição de áudio..."

# Nome da empresa (ajuste conforme necessário)
empresa_atualizar="uaiviu"

cd /home/deploy/${empresa_atualizar}

echo "📦 Parando backend..."
pm2 stop ${empresa_atualizar}-backend

echo "⬇️  Baixando atualizações..."
git pull

cd backend

echo "📚 Instalando dependências..."
npm install

echo "🔨 Compilando código TypeScript..."
rm -rf dist
npm run build

echo "✅ Reiniciando backend..."
pm2 start ${empresa_atualizar}-backend
pm2 save

echo "📊 Status do PM2:"
pm2 list

echo ""
echo "✅ Deploy concluído!"
echo "🎤 Transcrição de áudio agora usa modelo gemini-2.5-flash-lite"
echo ""
echo "Para verificar os logs:"
echo "  pm2 logs ${empresa_atualizar}-backend --lines 50"
