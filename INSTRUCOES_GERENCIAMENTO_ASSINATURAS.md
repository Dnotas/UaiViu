# Instruções - Gerenciamento de Assinaturas e Pagamentos

## 📋 Visão Geral

O sistema UaiViu possui controle completo de assinaturas com bloqueio automático por vencimento e **liberação manual** para casos onde o cliente pagou mas o sistema ainda está bloqueando.

## 🔐 Acesso à Tela de Gerenciamento

**Requisito:** Você precisa ser um **Super Usuário** (usuário com flag `super = true` no banco de dados)

### Como acessar:
1. Faça login como super usuário
2. Acesse o menu lateral: **Configurações** (Settings)
3. Clique na aba: **Companies** (Empresas)

## 🎮 Como Funciona o Sistema de Bloqueio

### Campos de Controle:

1. **Status** (Ativo/Bloqueado)
   - ✅ **Sim (Liberado)**: Empresa ATIVA - ignora verificação de vencimento
   - 🚫 **Não (Bloqueado)**: Empresa BLOQUEADA - bloqueia login independente da data

2. **Data de Vencimento** (dueDate)
   - Data até quando a assinatura é válida
   - Se Status = Sim, esta data é IGNORADA (empresa continua ativa mesmo vencida)
   - Se Status = Não, empresa fica bloqueada

3. **Recorrência**
   - Define o tipo de cobrança: Mensal
   - Usado para incrementar automaticamente a data de vencimento

## 📝 Casos de Uso Comuns

### Caso 1: Cliente Pagou e Está Bloqueado ❌➡️✅

**Problema:** Cliente pagou em 29/11/2025 mas o sistema mostra "Sua assinatura venceu 29/11/2025"

**Solução:**
1. Acesse **Configurações → Companies**
2. Clique no ícone de editar (✏️) da empresa do cliente
3. Verifique se **Status = Sim (Liberado)**
   - Se estiver "Não", altere para "Sim"
4. **Opção A - Liberar sem alterar data:**
   - Apenas salve com Status = Sim
   - Empresa ficará ativa mesmo com data vencida

5. **Opção B - Atualizar vencimento:**
   - Altere a "Data de vencimento" para a nova data (ex: 29/12/2025)
   - OU clique no botão **"+ Vencimento"** para incrementar automaticamente pela recorrência
   - Salve

### Caso 2: Bloquear Cliente Manualmente 🚫

**Quando:** Cliente não pagou ou pediu cancelamento

**Solução:**
1. Acesse **Configurações → Companies**
2. Clique no ícone de editar (✏️) da empresa
3. Altere **Status** para **Não (Bloqueado)**
4. Salve

### Caso 3: Incrementar Vencimento Automaticamente 📅

**Quando:** Cliente pagou a mensalidade e você quer adicionar mais 1 mês

**Solução:**
1. Acesse **Configurações → Companies**
2. Clique no ícone de editar (✏️) da empresa
3. Clique no botão **"+ Vencimento"**
   - Isso adiciona 1 mês à data atual (se recorrência = Mensal)
4. Salve

## 🎨 Indicadores Visuais na Tabela

A tabela de empresas mostra cores diferentes baseado no vencimento:

- 🟡 **Amarelo claro**: Vence em 5 dias
- 🟠 **Laranja**: Entre -3 e +4 dias do vencimento
- 🔴 **Vermelho**: Vencido há 4 dias

**Coluna Status mostra:**
- "✅ Sim (Ativo)" - Empresa ativa dentro do prazo
- "✅ Sim (Liberado Manualmente - Vencido em XX/XX/XXXX)" - Empresa vencida mas liberada
- "🚫 Não (Bloqueado)" - Empresa bloqueada manualmente

## ⚙️ Regras do Sistema (Backend)

```typescript
// Verificação em: backend/src/middleware/checkCompanyStatus.ts

1. Se status = false ➡️ BLOQUEIA (ERR_COMPANY_SUSPENDED)
2. Se status = true:
   - Se dueDate venceu ➡️ BLOQUEIA (ERR_COMPANY_EXPIRED)
   - Se dueDate OK ou não definido ➡️ LIBERA
```

## 🆘 Resolução de Problemas

### Erro: "Sua assinatura venceu DD/MM/YYYY"

**Causa:** Data de vencimento passou E status está true

**Soluções:**
1. Alterar data de vencimento para o futuro
2. OU clicar em "+ Vencimento" para adicionar mais 1 mês
3. OU deixar Status = Sim (empresa continua ativa mesmo vencida)

### Erro: "Empresa suspensa"

**Causa:** Status = false (bloqueado manualmente)

**Solução:**
1. Alterar Status para "Sim (Liberado)"

### Cliente não consegue acessar mesmo com tudo OK

**Verificar:**
1. Status está "Sim"?
2. Data de vencimento está no futuro?
3. Usuário do cliente está ativo?
4. Cliente está tentando acessar com email/senha corretos?

## 🔧 Comandos Úteis (Banco de Dados)

### Ver empresas vencidas:
```sql
SELECT id, name, email, status, "dueDate"
FROM "Companies"
WHERE "dueDate" < CURRENT_DATE;
```

### Liberar empresa manualmente:
```sql
UPDATE "Companies"
SET status = true
WHERE id = [ID_DA_EMPRESA];
```

### Atualizar vencimento para +30 dias:
```sql
UPDATE "Companies"
SET "dueDate" = CURRENT_DATE + INTERVAL '30 days'
WHERE id = [ID_DA_EMPRESA];
```

## 📞 Contato e Suporte

Se precisar de mais ajuda, entre em contato com o time de desenvolvimento.

---

**Última atualização:** 30/11/2025
**Sistema:** UaiViu Multi-Tenant WhatsApp Platform
