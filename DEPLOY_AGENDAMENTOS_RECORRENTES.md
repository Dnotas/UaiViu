# Deploy - Sistema de Agendamentos Recorrentes

## Descrição da Funcionalidade

Sistema que permite criar mensagens programadas que se repetem automaticamente todo dia (ou em outras frequências), abrindo tickets automaticamente ao enviar.

## Arquivos Modificados/Criados

### Backend
- ✅ `backend/src/database/migrations/20250311000001-add-recurring-fields-to-schedules.ts` - **NOVO**
- ✅ `backend/src/models/Schedule.ts` - Adicionados campos de recorrência
- ✅ `backend/src/queues.ts` - Lógica de processamento de recorrências
- ✅ `backend/src/services/ScheduleServices/CreateService.ts` - Suporte a recorrência
- ✅ `backend/src/services/ScheduleServices/UpdateService.ts` - Suporte a recorrência
- ✅ `backend/src/controllers/ScheduleController.ts` - Novos parâmetros

## Comandos para Deploy

### 1. Executar no Servidor (Backend)

```bash
cd /home/deploy/uaiviu  # ou o caminho correto da sua instalação

# Parar o backend
pm2 stop uaiviu-backend

# Atualizar código
git pull

# Entrar no backend
cd backend

# Instalar dependências (se houver novas)
npm install --force

# Executar migrations (SEMPRE 2 VEZES conforme padrão do projeto)
npx sequelize db:migrate
npx sequelize db:migrate

# Rebuild
rm -rf dist
npm run build

# Iniciar backend
pm2 start uaiviu-backend
pm2 save

# Verificar logs
pm2 logs uaiviu-backend --lines 100
```

### 2. Verificar se está funcionando

```bash
# Verificar se a migration rodou
pm2 logs uaiviu-backend | grep "recurring"

# Verificar processamento de filas
pm2 logs uaiviu-backend | grep "🔄"
```

## Novos Campos na Tabela Schedules

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `isRecurring` | BOOLEAN | Se é recorrente (padrão: false) |
| `recurringType` | STRING | Tipo: 'daily', 'weekly', 'monthly' |
| `recurringTime` | STRING | Hora do envio (formato HH:mm) |
| `lastRunAt` | DATE | Última execução |
| `isActive` | BOOLEAN | Se está ativo (padrão: true) |

## Como Usar a API

### Criar Agendamento Recorrente (TODO DIA)

**Endpoint:** `POST /schedules`

```json
{
  "contactId": 123,
  "userId": 1,
  "body": "Bom dia! Lembrete diário do seu atendimento.",
  "isRecurring": true,
  "recurringType": "daily",
  "recurringTime": "09:00",
  "isActive": true
}
```

### Criar Agendamento Único (Mantém compatibilidade)

**Endpoint:** `POST /schedules`

```json
{
  "contactId": 123,
  "userId": 1,
  "body": "Mensagem única para data específica",
  "sendAt": "2025-03-12 14:30:00",
  "isRecurring": false
}
```

### Editar Agendamento Recorrente

**Endpoint:** `PUT /schedules/:id`

```json
{
  "body": "Nova mensagem",
  "recurringTime": "10:00",
  "isActive": true
}
```

### Desativar Agendamento Recorrente

**Endpoint:** `PUT /schedules/:id`

```json
{
  "isActive": false
}
```

## Funcionamento

1. **CronJob** roda **a cada 1 minuto**
2. Verifica agendamentos com `isRecurring = true` e `isActive = true`
3. Se a hora atual está dentro de 5 minutos da `recurringTime` configurada
4. Verifica se já não rodou hoje (campo `lastRunAt`)
5. **Envia a mensagem** e **cria/abre um ticket automaticamente**
6. Atualiza `lastRunAt` com data/hora atual
7. No dia seguinte, repete o processo

## Logs para Monitorar

```bash
# Ver agendamentos recorrentes sendo processados
pm2 logs uaiviu-backend | grep "🔄"

# Ver quando mensagens recorrentes são enviadas
pm2 logs uaiviu-backend | grep "Mensagem recorrente enviada"

# Ver erros
pm2 logs uaiviu-backend --err
```

## Checklist de Deploy

- [ ] Commit feito no git
- [ ] Pull no servidor executado
- [ ] Backend parado com `pm2 stop`
- [ ] Migrations executadas 2x
- [ ] Build realizado com sucesso
- [ ] Backend iniciado com `pm2 start`
- [ ] Logs verificados sem erros
- [ ] Teste de criação de agendamento recorrente
- [ ] Verificar se CronJob está rodando (ver logs a cada minuto)

## Rollback (Se necessário)

```bash
cd /home/deploy/uaiviu/backend

# Reverter migration
npx sequelize db:migrate:undo

# Voltar para commit anterior
git checkout HEAD~1

# Rebuild e restart
npm run build
pm2 restart uaiviu-backend
```

## Suporte

Em caso de dúvidas ou erros, verificar:
1. Logs do PM2: `pm2 logs uaiviu-backend`
2. Tabela Schedules no banco: `SELECT * FROM "Schedules" WHERE "isRecurring" = true;`
3. Fila Redis: Verificar se `scheduleMonitor` está ativa

---

**Data da Implementação:** 03/11/2025
**Responsável:** Claude Code
**Status:** ✅ Pronto para Deploy
