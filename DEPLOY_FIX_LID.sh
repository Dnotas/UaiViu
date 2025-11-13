#!/bin/bash
# Script para deploy da correção de tickets duplicados @lid
# Execute como usuário deploy no servidor

echo "========================================="
echo "DEPLOY - Correção tickets duplicados @lid"
echo "========================================="
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
echo "Agora execute: pm2 logs uaiviu-backend --lines 50"
echo "Para verificar se está tudo funcionando corretamente."
echo ""
echo "Você deve ver logs como:"
echo '  "🔧 [handleMessage] Mensagem @lid SEM participant descartada"'
echo ""
