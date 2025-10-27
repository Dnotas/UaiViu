-- Script para criar/restaurar Super Administrador
-- Banco de dados: codatende
-- Credenciais no docker-compose.yml

-- 1. Verificar se já existe algum super admin
SELECT id, name, email, profile, super FROM "Users" WHERE super = true;

-- 2. Se não existir, inserir novo Super Admin
-- Senha padrão: admin123 (hash bcrypt)
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
    'Super Admin',
    'superadmin@uaiviu.com',
    'admin',
    '$2a$08$K.O0jF5YqF8F5YqF5YqF5.YqF5YqF5YqF5YqF5YqF5YqF5YqF5Yq',  -- Senha: admin123
    1,
    true,
    0,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 3. OU atualizar um admin existente para ser super admin
-- Substitua o ID pelo ID do usuário que você quer tornar super admin
-- UPDATE "Users" SET super = true WHERE id = 1;

-- 4. Verificar se foi criado/atualizado
SELECT id, name, email, profile, super FROM "Users" WHERE super = true;
