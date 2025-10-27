/**
 * Script para criar Super Administrador
 *
 * Como usar:
 * 1. Entre na pasta backend: cd backend
 * 2. Execute: node create-super-admin.js
 *
 * OU via Docker:
 * docker exec -it <container_backend> node create-super-admin.js
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Configuração do banco de dados (mesmas credenciais do docker-compose.yml)
const sequelize = new Sequelize('codatende', 'postgres', 'postgres123', {
  host: 'localhost',  // Se estiver rodando fora do Docker
  // host: 'postgres',  // Se estiver rodando dentro do Docker, descomente esta linha e comente a de cima
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function createSuperAdmin() {
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Dados do Super Admin
    const superAdminData = {
      name: 'Super Admin',
      email: 'superadmin@uaiviu.com',
      password: 'admin123',  // Senha padrão - ALTERE DEPOIS!
      profile: 'admin',
      companyId: 1,
      super: true,
      tokenVersion: 0
    };

    console.log('🔍 Verificando se já existe um super admin...');
    const [existingSuperAdmin] = await sequelize.query(
      'SELECT id, name, email, super FROM "Users" WHERE super = true LIMIT 1'
    );

    if (existingSuperAdmin.length > 0) {
      console.log('⚠️  Já existe um Super Admin:');
      console.log(`   ID: ${existingSuperAdmin[0].id}`);
      console.log(`   Nome: ${existingSuperAdmin[0].name}`);
      console.log(`   Email: ${existingSuperAdmin[0].email}\n`);

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('Deseja criar outro Super Admin mesmo assim? (s/n): ', async (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 's') {
          console.log('❌ Operação cancelada.');
          process.exit(0);
        }
        await insertSuperAdmin(superAdminData);
      });
    } else {
      await insertSuperAdmin(superAdminData);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

async function insertSuperAdmin(data) {
  try {
    console.log('🔐 Gerando hash da senha...');
    const passwordHash = await bcrypt.hash(data.password, 8);

    console.log('📝 Criando Super Admin...');
    const [result] = await sequelize.query(`
      INSERT INTO "Users" (
        name,
        email,
        profile,
        "passwordHash",
        "companyId",
        super,
        "tokenVersion",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        :name,
        :email,
        :profile,
        :passwordHash,
        :companyId,
        :super,
        :tokenVersion,
        NOW(),
        NOW()
      )
      RETURNING id, name, email, profile, super
    `, {
      replacements: {
        name: data.name,
        email: data.email,
        profile: data.profile,
        passwordHash: passwordHash,
        companyId: data.companyId,
        super: data.super,
        tokenVersion: data.tokenVersion
      }
    });

    console.log('\n✅ Super Admin criado com sucesso!\n');
    console.log('📋 Detalhes:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Nome: ${result[0].name}`);
    console.log(`   Email: ${result[0].email}`);
    console.log(`   Perfil: ${result[0].profile}`);
    console.log(`   Super: ${result[0].super}`);
    console.log(`   Senha: ${data.password}`);
    console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

    process.exit(0);
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      console.error('❌ Erro: Já existe um usuário com este email!');
      console.log('\n💡 Sugestão: Use outro email ou exclua o usuário existente.\n');
    } else {
      console.error('❌ Erro ao criar Super Admin:', error.message);
    }
    process.exit(1);
  }
}

// Executar
createSuperAdmin();
