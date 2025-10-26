/**
 * Script de Teste - Envio de Mensagem para GRUPO
 *
 * Este script testa o envio de mensagens de texto para GRUPOS WhatsApp
 * usando a API do Atendechat/UaiViu.
 *
 * IMPORTANTE:
 * 1. Configure o TOKEN do Bearer abaixo
 * 2. Configure o ID do GRUPO (sem @g.us)
 * 3. Configure o whatsappId da conexão
 */

const https = require('https');

// ============================================================
// CONFIGURAÇÕES - PREENCHA ANTES DE EXECUTAR
// ============================================================

const CONFIG = {
  // Token Bearer da conexão (obtido em Connections > Editar Conexão)
  token: 'dnotas2023',

  // ID do grupo (números apenas, SEM @g.us)
  // Exemplo: 120363123456789123
  groupId: '120363142926103927',

  // ID da conexão WhatsApp (número da conexão cadastrada)
  whatsappId: 1,

  // Mensagem a ser enviada
  message: 'Olá grupo! Esta é uma mensagem de teste enviada via API. 🚀',

  // URL da API
  apiUrl: 'backend.uaiviu.com.br',
  apiPath: '/api/messages/send'
};

// ============================================================
// VALIDAÇÕES
// ============================================================

function validarConfiguracoes() {
  const erros = [];

  if (CONFIG.token === 'SEU_TOKEN_AQUI') {
    erros.push('❌ Configure o TOKEN no script!');
  }

  if (CONFIG.groupId === 'ID_DO_GRUPO_AQUI') {
    erros.push('❌ Configure o ID do GRUPO no script!');
  }

  if (CONFIG.groupId.includes('@g.us')) {
    erros.push('❌ O ID do grupo NÃO deve incluir @g.us, apenas os números!');
  }

  if (erros.length > 0) {
    console.log('\n🚨 ERROS DE CONFIGURAÇÃO:\n');
    erros.forEach(erro => console.log(erro));
    console.log('\n📝 Abra o arquivo e configure as variáveis em CONFIG.\n');
    return false;
  }

  return true;
}

// ============================================================
// FUNÇÃO DE ENVIO
// ============================================================

function enviarMensagemGrupo() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      number: CONFIG.groupId,        // ID do grupo (sem @g.us)
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

    console.log('\n📡 Enviando mensagem para grupo...\n');
    console.log('🔹 Endpoint:', `https://${CONFIG.apiUrl}${CONFIG.apiPath}`);
    console.log('🔹 Grupo ID:', CONFIG.groupId);
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
        console.log('🔹 Headers:', JSON.stringify(res.headers, null, 2));
        console.log('🔹 Body:', data);
        console.log('\n');

        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ SUCESSO! Mensagem enviada para o grupo!\n');
          resolve({ statusCode: res.statusCode, body: data });
        } else {
          console.log('⚠️ ATENÇÃO! Status code diferente de 200/201.\n');
          console.log('📋 Verifique se:');
          console.log('   - O token está correto e ativo');
          console.log('   - O ID do grupo está correto (12 dígitos aprox.)');
          console.log('   - A conexão WhatsApp está ativa (whatsappId)');
          console.log('   - O bot está presente no grupo\n');
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
// INFORMAÇÕES SOBRE GRUPOS
// ============================================================

function exibirInformacoes() {
  console.log('\n' + '='.repeat(70));
  console.log('📚 INFORMAÇÕES SOBRE ENVIO DE MENSAGENS PARA GRUPOS');
  console.log('='.repeat(70) + '\n');

  console.log('🔍 Como obter o ID do Grupo:');
  console.log('   1. Envie uma mensagem no grupo pelo WhatsApp Web');
  console.log('   2. No backend, consulte o banco de dados:');
  console.log('      SELECT id, name, number, isGroup FROM Contacts WHERE isGroup = 1;');
  console.log('   3. O campo "number" contém o ID do grupo (ex: 120363123456789123)');
  console.log('   4. Copie esse número e cole na configuração deste script\n');

  console.log('📋 Formato dos IDs:');
  console.log('   - Contato Pessoal: 5599999999999 (DDI + DDD + Número)');
  console.log('   - Grupo: 120363123456789123 (ID do grupo com ~12-18 dígitos)\n');

  console.log('🔐 Token:');
  console.log('   - Obter em: Connections > Editar Conexão > Campo Token');
  console.log('   - Formato: Bearer token (o script já adiciona "Bearer ")\n');

  console.log('⚙️ WhatsApp ID:');
  console.log('   - ID numérico da conexão cadastrada');
  console.log('   - Normalmente 1, 2, 3... (verificar no banco ou interface)\n');

  console.log('✅ O endpoint é o MESMO para pessoal e grupo!');
  console.log('   - Endpoint: POST /api/messages/send');
  console.log('   - A diferença está no formato do número\n');

  console.log('='.repeat(70) + '\n');
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================

async function main() {
  console.clear();

  console.log('\n' + '='.repeat(70));
  console.log('🚀 TESTE DE ENVIO DE MENSAGEM PARA GRUPO - UaiViu/Atendechat');
  console.log('='.repeat(70) + '\n');

  // Validar configurações
  if (!validarConfiguracoes()) {
    exibirInformacoes();
    process.exit(1);
  }

  console.log('✅ Configurações validadas!\n');

  // Tentar enviar
  try {
    await enviarMensagemGrupo();
    console.log('🎉 Teste concluído com sucesso!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message, '\n');
    exibirInformacoes();
    process.exit(1);
  }
}

// Executar
main();
