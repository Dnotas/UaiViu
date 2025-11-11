# Fusão Automática de Contatos Duplicados - UaiViu

## O Que Foi Implementado

Sistema de **fusão automática** de contatos duplicados que é ativado quando você tenta atualizar o número de um contato para um número que já existe no banco.

## Como Funciona

### Cenário:
- **Contato A (Juliana #438)**: número errado `6743182553226`, mas tem o histórico correto
- **Contato B**: número correto `553791993979`, mas sem histórico

### Quando você clicar em SALVAR para mudar o número da Juliana:

```
1. Sistema detecta que já existe outro contato com o número 553791993979
2. Inicia fusão automática:
   ✅ Transfere TODOS os tickets do Contato B para Juliana (A)
   ✅ Deleta o Contato B (duplicado)
   ✅ Atualiza o número da Juliana para 553791993979
3. Resultado: Juliana fica com número correto E histórico completo
```

## Logs Detalhados

Quando a fusão acontecer, você verá nos logs:

```
========================================
🔍 [MERGE CONTACTS] Verificando duplicatas...
Contato atual ID: 438
Número atual: 6743182553226
Novo número: 553791993979

⚠️  [MERGE CONTACTS] DUPLICATA DETECTADA!
Contato duplicado ID: 999
Nome duplicado: Outro Nome
========================================
🔄 [MERGE CONTACTS] Iniciando fusão automática...

📊 Contato atual (Juliana) tem 15 tickets
📊 Contato duplicado (Outro Nome) tem 3 tickets

🔀 Transferindo 3 tickets do contato duplicado...
✅ Tickets transferidos com sucesso

🗑️  Deletando contato duplicado (ID: 999)...
✅ Contato duplicado deletado

========================================
✅ [MERGE CONTACTS] Fusão concluída com sucesso!
Total de tickets após fusão: 18
========================================
```

## Vantagens

✅ **Zero comandos SQL**: Tudo automático pela interface
✅ **Preserva histórico**: Nenhum ticket ou mensagem é perdida
✅ **Sem duplicatas**: Sistema limpa automaticamente
✅ **Logs completos**: Rastreamento total da operação
✅ **Seguro**: Só mescla contatos da mesma empresa

## Quando Acontece

A fusão só é ativada quando:
1. Você está **editando** um contato existente
2. Você está **mudando o número** do contato
3. O novo número **já existe** em outro contato da mesma empresa

## O Que É Transferido

- ✅ Todos os tickets (abertos, pendentes, fechados)
- ✅ Todo o histórico de mensagens
- ✅ Tags dos tickets
- ✅ Atribuições de usuários
- ✅ Filas associadas

## O Que É Deletado

- ❌ Apenas o contato duplicado (registro na tabela Contacts)
- ⚠️  Os tickets NÃO são deletados, são transferidos

## Casos de Uso

### Caso 1: Número errado corrigido (seu caso)
- Contato com número errado mas histórico correto
- Existe contato duplicado com número certo
- **Solução**: Edite o número no contato original → fusão automática

### Caso 2: Cliente cadastrado duas vezes
- Cliente foi cadastrado 2x com números diferentes
- Ambos têm histórico de atendimento
- **Solução**: Edite um deles para o número correto → fusão automática

### Caso 3: Migração de número
- Cliente mudou de número
- Quer manter histórico antigo + novo número
- **Solução**: Já funciona naturalmente, sem fusão

## Segurança

🔒 Só funciona para contatos da **mesma empresa**
🔒 Contato original é **sempre preservado**
🔒 Contato duplicado é **deletado após transferir tudo**
🔒 Operação é **atômica** (tudo ou nada)

## Arquivo Modificado

- `backend/src/services/ContactServices/UpdateContactService.ts`

## Para Aplicar

```bash
cd /home/deploy/uaiviu/backend
npm install --force
rm -rf dist
npm run build
pm2 restart uaiviu-backend
```

## Como Usar

1. Faça o deploy
2. Abra o contato da Juliana (ou qualquer outro com número errado)
3. Clique em "Editar Contato"
4. Digite o número correto (ex: `553791993979`)
5. Clique em "SALVAR"
6. **Pronto!** Sistema faz a fusão automaticamente
7. Verifique os logs para confirmar

## Resultado Esperado

Depois da fusão:
- ✅ Juliana terá o número correto (553791993979)
- ✅ Juliana terá TODO o histórico (dela + do duplicado)
- ✅ Contato duplicado será removido automaticamente
- ✅ Nenhum ticket ou mensagem será perdida
- ✅ Você poderá enviar e receber mensagens normalmente

## Monitoramento

Para confirmar que funcionou:

```sql
-- Ver se ainda existe duplicata
SELECT id, name, number FROM "Contacts"
WHERE number = '553791993979' AND "companyId" = 1;

-- Deve retornar apenas 1 contato (Juliana)

-- Ver total de tickets da Juliana
SELECT COUNT(*) FROM "Tickets" WHERE "contactId" = 438;

-- Deve mostrar o total combinado dos dois contatos
```

---

**Data da implementação:** 2025-11-11
**Problema resolvido:** Impossibilidade de corrigir números duplicados via interface
**Status:** ✅ IMPLEMENTADO - Aguardando deploy e testes
