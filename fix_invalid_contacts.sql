-- Script para identificar e corrigir contatos com números inválidos
-- Execute este script no PostgreSQL para limpar o banco de dados

-- ===========================================================================
-- PASSO 1: IDENTIFICAR CONTATOS COM NÚMEROS INVÁLIDOS
-- ===========================================================================

-- Listar todos os contatos com números não brasileiros (não começam com 55)
-- EXCETO grupos (que têm mais de 13 dígitos)
SELECT
    id,
    name,
    number,
    LENGTH(number) as tamanho,
    "companyId",
    "isGroup",
    "createdAt",
    "updatedAt"
FROM "Contacts"
WHERE
    -- Não é grupo
    LENGTH(number) <= 13
    -- E não começa com 55
    AND LEFT(number, 2) != '55'
ORDER BY "updatedAt" DESC;

-- ===========================================================================
-- PASSO 2: CONTAGEM DE CONTATOS INVÁLIDOS POR EMPRESA
-- ===========================================================================

SELECT
    "companyId",
    COUNT(*) as total_invalidos
FROM "Contacts"
WHERE
    LENGTH(number) <= 13
    AND LEFT(number, 2) != '55'
GROUP BY "companyId";

-- ===========================================================================
-- PASSO 3: VERIFICAR TICKETS ASSOCIADOS A CONTATOS INVÁLIDOS
-- ===========================================================================

SELECT
    t.id as ticket_id,
    t.status as ticket_status,
    c.id as contact_id,
    c.name as contact_name,
    c.number as contact_number,
    t."companyId",
    t."updatedAt"
FROM "Tickets" t
INNER JOIN "Contacts" c ON t."contactId" = c.id
WHERE
    LENGTH(c.number) <= 13
    AND LEFT(c.number, 2) != '55'
ORDER BY t."updatedAt" DESC;

-- ===========================================================================
-- PASSO 4: OPÇÃO 1 - DELETAR CONTATOS INVÁLIDOS SEM TICKETS
-- ===========================================================================
-- ⚠️ CUIDADO: Esta query deleta contatos permanentemente!
-- ⚠️ Execute apenas se tiver certeza!

-- Primeiro, veja quantos serão deletados:
SELECT COUNT(*) as total_a_deletar
FROM "Contacts" c
WHERE
    LENGTH(c.number) <= 13
    AND LEFT(c.number, 2) != '55'
    AND NOT EXISTS (
        SELECT 1 FROM "Tickets" t WHERE t."contactId" = c.id
    );

-- Para executar a deleção, descomente a query abaixo:
/*
DELETE FROM "Contacts"
WHERE
    LENGTH(number) <= 13
    AND LEFT(number, 2) != '55'
    AND NOT EXISTS (
        SELECT 1 FROM "Tickets" t WHERE t."contactId" = id
    );
*/

-- ===========================================================================
-- PASSO 5: OPÇÃO 2 - MARCAR CONTATOS INVÁLIDOS PARA REVISÃO MANUAL
-- ===========================================================================
-- Esta query adiciona um prefixo "INVÁLIDO-" ao nome dos contatos problemáticos
-- para facilitar identificação na interface

-- Primeiro, veja quais serão marcados:
SELECT
    id,
    name,
    CONCAT('INVÁLIDO-', name) as novo_nome,
    number
FROM "Contacts"
WHERE
    LENGTH(number) <= 13
    AND LEFT(number, 2) != '55'
    AND name NOT LIKE 'INVÁLIDO-%';

-- Para executar a marcação, descomente a query abaixo:
/*
UPDATE "Contacts"
SET name = CONCAT('INVÁLIDO-', name)
WHERE
    LENGTH(number) <= 13
    AND LEFT(number, 2) != '55'
    AND name NOT LIKE 'INVÁLIDO-%';
*/

-- ===========================================================================
-- PASSO 6: ENCONTRAR DUPLICATAS DE CONTATOS
-- ===========================================================================
-- Às vezes o mesmo número foi cadastrado múltiplas vezes

SELECT
    number,
    COUNT(*) as total_duplicatas,
    STRING_AGG(name, ', ') as nomes,
    STRING_AGG(id::text, ', ') as ids
FROM "Contacts"
WHERE LENGTH(number) >= 12
GROUP BY number, "companyId"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ===========================================================================
-- CASO ESPECÍFICO: JULIANA COM NÚMERO INVÁLIDO
-- ===========================================================================

-- Encontrar o contato específico mencionado pelo usuário
SELECT
    c.id as contact_id,
    c.name,
    c.number,
    c."isGroup",
    c."companyId",
    COUNT(t.id) as total_tickets
FROM "Contacts" c
LEFT JOIN "Tickets" t ON t."contactId" = c.id
WHERE c.number = '6743182553226'
GROUP BY c.id, c.name, c.number, c."isGroup", c."companyId";

-- Ver todos os tickets desse contato
SELECT
    t.id,
    t.status,
    t."lastMessage",
    t."updatedAt",
    u.name as assigned_user
FROM "Tickets" t
LEFT JOIN "Users" u ON t."userId" = u.id
WHERE t."contactId" = 438  -- ID do contato Juliana
ORDER BY t."updatedAt" DESC;

-- ===========================================================================
-- RECOMENDAÇÕES:
-- ===========================================================================
-- 1. Execute primeiro as queries de SELECT para entender o problema
-- 2. Faça backup do banco antes de executar DELETE ou UPDATE
-- 3. Use a interface do UaiViu para corrigir manualmente contatos com tickets ativos
-- 4. Delete apenas contatos sem tickets associados
-- 5. Para o caso da Juliana (ID 438):
--    - Corrija o número manualmente na interface
--    - Use um número brasileiro válido (ex: 5537991234567)
--    - O sistema agora bloqueará números inválidos
