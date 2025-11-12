/**
 * Script para corrigir tickets duplicados causados por dispositivos vinculados (@lid)
 *
 * Problema: Quando usuários usam WhatsApp Web/Desktop, o sistema criava:
 * - 1 contato com número real (ex: 553791260083)
 * - 1 contato com ID do dispositivo (ex: 148137817669860) marcado como número normal
 *
 * Isso causava 2 tickets para a mesma pessoa.
 *
 * Este script:
 * 1. Identifica contatos duplicados (@lid)
 * 2. Transfere todas as mensagens para o ticket correto
 * 3. Fecha os tickets duplicados
 * 4. Deleta os contatos @lid falsos
 */

const { Sequelize, Op } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function fixDuplicateTickets() {
  console.log('🔍 Iniciando correção de tickets duplicados...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados\n');

    // 1. Identificar contatos com números suspeitos (muito longos = @lid)
    const [lidContacts] = await sequelize.query(`
      SELECT
        c.id as lid_contact_id,
        c.name,
        c.number as lid_number,
        c."companyId",
        c."isGroup",
        COUNT(t.id) as ticket_count
      FROM "Contacts" c
      LEFT JOIN "Tickets" t ON t."contactId" = c.id
      WHERE
        LENGTH(c.number) > 13
        AND c."isGroup" = false
        AND c.number NOT LIKE '%@%'
      GROUP BY c.id, c.name, c.number, c."companyId", c."isGroup"
      ORDER BY c."companyId", c.name;
    `);

    console.log(`📋 Encontrados ${lidContacts.length} contatos suspeitos (@lid)\n`);

    if (lidContacts.length === 0) {
      console.log('✅ Nenhum contato duplicado encontrado!');
      process.exit(0);
    }

    let totalFixed = 0;
    let totalMessagesMoved = 0;

    // 2. Para cada contato @lid, procurar o contato real correspondente
    for (const lidContact of lidContacts) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔍 Processando: ${lidContact.name} (ID: ${lidContact.lid_contact_id})`);
      console.log(`   Número suspeito: ${lidContact.lid_number}`);
      console.log(`   Tickets associados: ${lidContact.ticket_count}`);

      // Buscar contato real com o mesmo nome e company
      const [realContacts] = await sequelize.query(`
        SELECT
          c.id as real_contact_id,
          c.name,
          c.number as real_number,
          COUNT(t.id) as ticket_count
        FROM "Contacts" c
        LEFT JOIN "Tickets" t ON t."contactId" = c.id
        WHERE
          c.name = :name
          AND c."companyId" = :companyId
          AND c.id != :lidContactId
          AND LENGTH(c.number) <= 13
          AND c."isGroup" = false
        GROUP BY c.id, c.name, c.number
        ORDER BY c."createdAt" ASC
        LIMIT 1;
      `, {
        replacements: {
          name: lidContact.name,
          companyId: lidContact.companyId,
          lidContactId: lidContact.lid_contact_id
        }
      });

      if (realContacts.length === 0) {
        console.log(`   ⚠️  Nenhum contato real encontrado com o mesmo nome. Pulando...`);
        continue;
      }

      const realContact = realContacts[0];
      console.log(`   ✅ Contato real encontrado: ${realContact.real_number} (ID: ${realContact.real_contact_id})`);

      // 3. Buscar tickets do contato @lid
      const [lidTickets] = await sequelize.query(`
        SELECT id, status, "whatsappId", "createdAt"
        FROM "Tickets"
        WHERE "contactId" = :lidContactId
        ORDER BY "createdAt" ASC;
      `, {
        replacements: { lidContactId: lidContact.lid_contact_id }
      });

      if (lidTickets.length === 0) {
        console.log(`   ℹ️  Nenhum ticket encontrado. Deletando contato...`);
        await sequelize.query(`DELETE FROM "Contacts" WHERE id = :id`, {
          replacements: { id: lidContact.lid_contact_id }
        });
        continue;
      }

      // 4. Para cada ticket @lid, buscar ticket correspondente do contato real
      for (const lidTicket of lidTickets) {
        console.log(`\n   📝 Ticket @lid #${lidTicket.id} (Status: ${lidTicket.status})`);

        // Buscar ticket do contato real na mesma época
        const [realTickets] = await sequelize.query(`
          SELECT id, status, "createdAt"
          FROM "Tickets"
          WHERE
            "contactId" = :realContactId
            AND "whatsappId" = :whatsappId
            AND "companyId" = :companyId
            AND ABS(EXTRACT(EPOCH FROM ("createdAt" - :lidCreatedAt))) < 3600
          ORDER BY "createdAt" ASC
          LIMIT 1;
        `, {
          replacements: {
            realContactId: realContact.real_contact_id,
            whatsappId: lidTicket.whatsappId,
            companyId: lidContact.companyId,
            lidCreatedAt: lidTicket.createdAt
          }
        });

        let targetTicketId;

        if (realTickets.length > 0) {
          targetTicketId = realTickets[0].id;
          console.log(`   ➡️  Ticket real correspondente: #${targetTicketId}`);
        } else {
          // Se não encontrou ticket correspondente, usa o ticket real mais recente ou cria um novo
          const [latestRealTickets] = await sequelize.query(`
            SELECT id
            FROM "Tickets"
            WHERE "contactId" = :realContactId
            ORDER BY "createdAt" DESC
            LIMIT 1;
          `, {
            replacements: { realContactId: realContact.real_contact_id }
          });

          if (latestRealTickets.length > 0) {
            targetTicketId = latestRealTickets[0].id;
            console.log(`   ➡️  Usando último ticket real: #${targetTicketId}`);
          } else {
            console.log(`   ⚠️  Nenhum ticket real encontrado. Movendo contato do ticket...`);
            // Move o ticket para o contato real
            await sequelize.query(`
              UPDATE "Tickets"
              SET "contactId" = :realContactId
              WHERE id = :ticketId;
            `, {
              replacements: {
                realContactId: realContact.real_contact_id,
                ticketId: lidTicket.id
              }
            });
            console.log(`   ✅ Ticket #${lidTicket.id} movido para contato real`);
            continue;
          }
        }

        // 5. Transferir mensagens do ticket @lid para o ticket real
        const [messages] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM "Messages"
          WHERE "ticketId" = :lidTicketId;
        `, {
          replacements: { lidTicketId: lidTicket.id }
        });

        const messageCount = parseInt(messages[0].count);

        if (messageCount > 0) {
          console.log(`   📨 Transferindo ${messageCount} mensagens...`);

          await sequelize.query(`
            UPDATE "Messages"
            SET
              "ticketId" = :targetTicketId,
              "contactId" = :realContactId
            WHERE "ticketId" = :lidTicketId;
          `, {
            replacements: {
              targetTicketId: targetTicketId,
              realContactId: realContact.real_contact_id,
              lidTicketId: lidTicket.id
            }
          });

          totalMessagesMoved += messageCount;
          console.log(`   ✅ Mensagens transferidas`);
        }

        // 6. Fechar/deletar ticket @lid
        console.log(`   🗑️  Deletando ticket @lid #${lidTicket.id}...`);

        // Deletar TicketTraking associados
        await sequelize.query(`
          DELETE FROM "TicketTraking" WHERE "ticketId" = :ticketId;
        `, {
          replacements: { ticketId: lidTicket.id }
        });

        // Deletar TicketTags associados
        await sequelize.query(`
          DELETE FROM "TicketTags" WHERE "ticketId" = :ticketId;
        `, {
          replacements: { ticketId: lidTicket.id }
        });

        // Deletar ticket
        await sequelize.query(`
          DELETE FROM "Tickets" WHERE id = :ticketId;
        `, {
          replacements: { ticketId: lidTicket.id }
        });

        console.log(`   ✅ Ticket deletado`);
        totalFixed++;
      }

      // 7. Deletar contato @lid
      console.log(`\n   🗑️  Deletando contato @lid (ID: ${lidContact.lid_contact_id})...`);
      await sequelize.query(`
        DELETE FROM "Contacts" WHERE id = :id;
      `, {
        replacements: { id: lidContact.lid_contact_id }
      });
      console.log(`   ✅ Contato deletado`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`\n✅ CORREÇÃO CONCLUÍDA!`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Tickets corrigidos: ${totalFixed}`);
    console.log(`   - Mensagens movidas: ${totalMessagesMoved}`);
    console.log(`   - Contatos @lid deletados: ${lidContacts.length}\n`);

  } catch (error) {
    console.error('❌ Erro ao executar correção:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Executar
fixDuplicateTickets();
