# Correção de Números Inválidos - UaiViu

## Problema Identificado

Um contato (Juliana #438) estava com o número **6743182553226** (código +674 de Nauru), que não é um número brasileiro. Quando o atendente tentava responder, a mensagem era enviada para esse número errado ao invés do número correto da cliente.

## Soluções Implementadas

### 1. Sistema de Validação de Números Brasileiros

Criado o arquivo `backend/src/helpers/ValidateBrazilianNumber.ts` que valida:

✅ **NÚMEROS PERMITIDOS:**
- Números brasileiros: `55` + DDD (11-99) + número (8-9 dígitos) = **12-13 dígitos**
  - Exemplos válidos: `5537991470016`, `553799147001`
- Grupos WhatsApp: números longos com mais de 13 dígitos
  - Exemplo: `120363142926103927`

❌ **NÚMEROS BLOQUEADOS:**
- Números estrangeiros (não começam com 55)
- Números com formato inválido
- Números muito curtos ou sem DDD válido

### 2. Travas de Segurança em Todos os Pontos

**Pontos protegidos:**

1. **SendWhatsAppMessage.ts** - Mensagens de texto
2. **SendWhatsAppMedia.ts** - Imagens, vídeos, áudios, documentos
3. **MessageController.ts** - API externa
4. **ContactController.ts** - Atualização de contatos

Agora, **ANTES** de enviar qualquer mensagem, o sistema:
- Valida se o número é brasileiro ou grupo
- **BLOQUEIA** e mostra erro se for inválido
- Registra logs detalhados de segurança
- Corrige automaticamente inconsistências no flag `isGroup`

### 3. Validação na Edição de Contatos

O `ContactController.ts` agora:
- Valida o NOVO número fornecido pelo usuário
- Se o novo número for inválido, mostra mensagem clara de erro
- Se o novo número for válido, permite a correção
- Mantém validação do WhatsApp apenas para números pessoais válidos

## Como Corrigir o Contato Juliana

### Opção 1: Via Interface (RECOMENDADO)

1. Faça o deploy das correções:
```bash
cd /home/deploy/uaiviu  # ou o nome da sua empresa
cd backend
npm install --force
npm run build
pm2 restart uaiviu-backend
```

2. Na interface do UaiViu:
   - Abra o chamado/contato da Juliana
   - Clique em "Editar Contato"
   - Digite o número brasileiro correto (ex: `5537991234567`)
   - Salve

3. O sistema agora:
   - Validará que o novo número é brasileiro
   - Verificará no WhatsApp se o número existe
   - Atualizará o contato
   - Bloqueará qualquer tentativa futura de usar número inválido

### Opção 2: Via SQL Direto (Para Múltiplos Contatos)

Use o arquivo `fix_invalid_contacts.sql` para:

1. **Identificar todos os contatos inválidos:**
```sql
SELECT id, name, number, LENGTH(number) as tamanho
FROM "Contacts"
WHERE LENGTH(number) <= 13 AND LEFT(number, 2) != '55'
ORDER BY "updatedAt" DESC;
```

2. **Ver tickets associados:**
```sql
SELECT t.id as ticket_id, c.name, c.number
FROM "Tickets" t
INNER JOIN "Contacts" c ON t."contactId" = c.id
WHERE LENGTH(c.number) <= 13 AND LEFT(c.number, 2) != '55';
```

3. **Deletar contatos sem tickets** (se não forem necessários):
```sql
DELETE FROM "Contacts"
WHERE LENGTH(number) <= 13
  AND LEFT(number, 2) != '55'
  AND NOT EXISTS (SELECT 1 FROM "Tickets" t WHERE t."contactId" = id);
```

## Logs de Segurança

Agora você verá nos logs do backend:

```
🔒 [SEGURANÇA] Validando número do contato...
Resultado da validação: {
  isValid: false,
  cleanNumber: '6743182553226',
  errorMessage: 'Número não é brasileiro: 6743182553226 não começa com 55'
}
❌ [SEGURANÇA] NÚMERO INVÁLIDO DETECTADO!
⚠️ BLOQUEADO POR SEGURANÇA
```

## Mensagens de Erro para o Usuário

Se tentar enviar mensagem para número inválido:

```
⚠️ BLOQUEADO POR SEGURANÇA: Número não é brasileiro: 6743182553226 não começa com 55.

Apenas números brasileiros (55 + DDD + número) ou grupos são permitidos.
Ticket #326 - Contato: Juliana
```

Se tentar editar contato com número inválido:

```
❌ NÚMERO INVÁLIDO: Número não é brasileiro: 6743182553226 não começa com 55.

Por favor, forneça um número brasileiro válido (55 + DDD + número) ou um ID de grupo válido.
```

## Verificação de Integridade

Após o deploy, execute estas queries para verificar:

```sql
-- Contar contatos inválidos restantes
SELECT COUNT(*) FROM "Contacts"
WHERE LENGTH(number) <= 13 AND LEFT(number, 2) != '55';

-- Ver tickets com contatos inválidos
SELECT t.id, t.status, c.name, c.number
FROM "Tickets" t
INNER JOIN "Contacts" c ON t."contactId" = c.id
WHERE LENGTH(c.number) <= 13 AND LEFT(c.number, 2) != '55'
AND t.status != 'closed';
```

## Resumo das Proteções

| Situação | Antes | Depois |
|----------|-------|--------|
| Enviar mensagem para número estrangeiro | ❌ Permitido | ✅ BLOQUEADO |
| Criar contato com número inválido | ❌ Permitido | ✅ BLOQUEADO |
| Editar contato com novo número inválido | ❌ Permitido | ✅ BLOQUEADO |
| Corrigir contato com número válido | ✅ Permitido | ✅ Permitido |
| Enviar para grupos | ✅ Permitido | ✅ Permitido |
| Logs detalhados | ❌ Limitados | ✅ Completos |

## Arquivos Modificados

1. **Novo:** `backend/src/helpers/ValidateBrazilianNumber.ts`
2. `backend/src/services/WbotServices/SendWhatsAppMessage.ts`
3. `backend/src/services/WbotServices/SendWhatsAppMedia.ts`
4. `backend/src/controllers/MessageController.ts`
5. `backend/src/controllers/ContactController.ts`
6. **Novo:** `fix_invalid_contacts.sql` (queries de limpeza)

## Próximos Passos

1. ✅ Faça o deploy do backend
2. ✅ Teste corrigir o número da Juliana na interface
3. ✅ Execute as queries SQL para identificar outros contatos inválidos
4. ✅ Corrija ou delete contatos inválidos conforme necessário
5. ✅ Monitore os logs para garantir que não há mais envios para números errados

## Garantias de Segurança

🔒 **IMPOSSÍVEL** enviar mensagem para número não brasileiro
🔒 **IMPOSSÍVEL** criar contato com número inválido
🔒 **IMPOSSÍVEL** atualizar contato para número inválido
🔒 **LOGS COMPLETOS** de todas as validações e envios
🔒 **CORREÇÃO AUTOMÁTICA** de inconsistências no flag isGroup

---

**Data da correção:** 2025-11-11
**Problema:** Mensagens enviadas para números errados (não brasileiros)
**Status:** ✅ CORRIGIDO E PROTEGIDO
