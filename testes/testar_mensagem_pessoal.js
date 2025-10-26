/**
 * Script de Teste - Envio de Mensagem PESSOAL
 *
 * Este script testa o envio de mensagens de texto para contatos PESSOAIS
 * usando a API do Atendechat/UaiViu.
 */

const https = require('https');

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const CONFIG = {
  // Token Bearer da conexão
  token: 'dnotas2023',

  // Número pessoal (com DDI + DDD + Número, sem máscaras)
  // Exemplo: 5537991470016
  number: '5537991470016',

  // ID da conexão WhatsApp
  whatsappId: 1,

  // Mensagem a ser enviada
  message: 'Olá! Esta é uma mensagem de teste PESSOAL enviada via API. ✅',

  // URL da API
  apiUrl: 'backend.uaiviu.com.br',
  apiPath: '/api/messages/send'
};

// ============================================================
// FUNÇÃO DE ENVIO
// ============================================================

function enviarMensagemPessoal() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      number: CONFIG.number,
      body: CONFIG.message,
      whatsappId: CONFIG.whatsappId
    });

    const options = {
      hostname: CONFIG.apiUrl,
      path: CONFIG.apiPath,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log('\n📡 Enviando mensagem PESSOAL...\n');
    console.log('🔹 Endpoint:', `https://${CONFIG.apiUrl}${CONFIG.apiPath}`);
    console.log('🔹 Número:', CONFIG.number);
    console.log('🔹 WhatsApp ID:', CONFIG.whatsappId);
    console.log('🔹 Mensagem:', CONFIG.message);
    console.log('\n⏳ Aguarde...\n');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📥 Resposta recebida!\n');
        console.log('🔹 Status Code:', res.statusCode);
        console.log('🔹 Body:', data);
        console.log('\n');

        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ SUCESSO! Mensagem enviada para o contato pessoal!\n');
          resolve({ statusCode: res.statusCode, body: data });
        } else {
          console.log('⚠️ ATENÇÃO! Status code diferente de 200/201.\n');
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ ERRO na requisição:', error.message, '\n');
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================

async function main() {
  console.clear();

  console.log('\n' + '='.repeat(70));
  console.log('🚀 TESTE DE ENVIO DE MENSAGEM PESSOAL - UaiViu/Atendechat');
  console.log('='.repeat(70) + '\n');

  try {
    await enviarMensagemPessoal();
    console.log('🎉 Teste concluído com sucesso!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message, '\n');
    process.exit(1);
  }
}

// Executar
main();
