#!/bin/bash
# Script para deploy das correções de tickets
# Execute como usuário deploy no servidor

echo "========================================="
echo "DEPLOY - Correções de Tickets"
echo "========================================="
echo ""
echo "Correções incluídas:"
echo "1. Tickets duplicados @lid - ELIMINADO"
echo "2. Validação inteligente de números"
echo ""

cd /home/deploy/uaiviu

echo "1. Parando o backend..."
pm2 stop uaiviu-backend

echo ""
echo "2. Fazendo git pull..."
git pull

echo ""
echo "3. Instalando dependências..."
cd backend
npm install

echo ""
echo "4. Removendo build anterior..."
rm -rf dist

echo ""
echo "5. Compilando novo build..."
npm run build

echo ""
echo "6. Iniciando backend..."
pm2 start uaiviu-backend

echo ""
echo "7. Salvando configuração PM2..."
pm2 save

echo ""
echo "========================================="
echo "DEPLOY CONCLUÍDO!"
echo "========================================="
echo ""
echo "Agora execute: pm2 logs uaiviu-backend --lines 100"
echo "Para verificar se está tudo funcionando corretamente."
echo ""
echo "LOGS ESPERADOS:"
echo ""
echo "✅ Tickets duplicados @lid:"
echo '   "🔧 [handleMessage] Mensagem @lid SEM participant descartada"'
echo ""
echo "✅ Validação de números:"
echo '   "✅ [getValidWhatsAppNumber] Número válido: 5537991470016"'
echo '   "🔧 [getValidWhatsAppNumber] CORREÇÃO: Usando participant"'
echo ""
echo "❌ NÃO deve mais aparecer:"
echo '   "⚠️  Mensagem @lid SEM duplicata encontrada (processando mesmo assim)"'
echo ""
