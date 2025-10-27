# Como Recuperar o Super Administrador

O Super Admin foi deletado? Sem problemas! Use um dos métodos abaixo para criar um novo.

---

## Método 1: Script Node.js (RECOMENDADO)

### Se estiver rodando SEM Docker:

1. **Entre na pasta backend:**
   ```bash
   cd backend
   ```

2. **Execute o script:**
   ```bash
   node create-super-admin.js
   ```

3. **Pronto!** O Super Admin será criado com:
   - **Email:** `superadmin@uaiviu.com`
   - **Senha:** `admin123`

---

### Se estiver rodando COM Docker:

1. **Primeiro, descubra o nome do container do backend:**
   ```bash
   docker ps
   ```
   Procure pelo container que tem "backend" no nome (ex: `uaiviu-backend-1`)

2. **Execute o script dentro do container:**
   ```bash
   docker exec -it uaiviu-backend-1 node create-super-admin.js
   ```
   (Substitua `uaiviu-backend-1` pelo nome real do seu container)

3. **Pronto!** O Super Admin será criado.

---

## Método 2: SQL Direto no Banco

### Se estiver rodando COM Docker:

1. **Conecte ao PostgreSQL:**
   ```bash
   docker exec -it uaiviu-postgres-1 psql -U postgres -d codatende
   ```
   (Substitua `uaiviu-postgres-1` pelo nome do container do PostgreSQL)

2. **Execute os comandos SQL:**
   ```sql
   -- Verificar se já existe super admin
   SELECT id, name, email, profile, super FROM "Users" WHERE super = true;

   -- Criar novo Super Admin
   INSERT INTO "Users" (
       name, email, profile, "passwordHash", "companyId",
       super, "tokenVersion", "createdAt", "updatedAt"
   )
   VALUES (
       'Super Admin',
       'superadmin@uaiviu.com',
       'admin',
       '$2a$08$YourBcryptHashHere',  -- Senha: admin123
       1,
       true,
       0,
       NOW(),
       NOW()
   );
   ```

3. **Saia do psql:**
   ```sql
   \q
   ```

---

### Se estiver rodando SEM Docker:

1. **Conecte ao PostgreSQL:**
   ```bash
   psql -U postgres -d codatende
   ```
   Senha: `postgres123`

2. **Execute o script SQL:**
   ```bash
   \i create-super-admin.sql
   ```

3. **Ou copie e cole os comandos SQL diretamente**

---

## Método 3: Transformar Usuário Existente em Super Admin

Se você já tem um usuário Admin e quer torná-lo Super Admin:

1. **Conecte ao banco de dados** (Docker ou local)

2. **Liste os usuários Admin:**
   ```sql
   SELECT id, name, email, profile, super FROM "Users" WHERE profile = 'admin';
   ```

3. **Escolha o ID do usuário** e execute:
   ```sql
   UPDATE "Users" SET super = true WHERE id = <ID_DO_USUARIO>;
   ```
   (Substitua `<ID_DO_USUARIO>` pelo ID real)

4. **Verifique:**
   ```sql
   SELECT id, name, email, profile, super FROM "Users" WHERE super = true;
   ```

---

## Credenciais Padrão do Super Admin Criado:

- **Email:** `superadmin@uaiviu.com`
- **Senha:** `admin123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

---

## Troubleshooting

### Erro: "duplicate key value violates unique constraint"
**Causa:** Já existe um usuário com esse email.

**Solução:** Use outro email ou delete o usuário existente:
```sql
DELETE FROM "Users" WHERE email = 'superadmin@uaiviu.com';
```

### Erro: "connection refused"
**Causa:** Não conseguiu conectar ao banco.

**Solução:**
- Se estiver com Docker: Certifique-se que os containers estão rodando (`docker ps`)
- Se estiver local: Verifique se o PostgreSQL está rodando
- Verifique as credenciais no script (host, porta, senha)

### Erro: "bcryptjs not found"
**Causa:** Dependências não instaladas.

**Solução:**
```bash
cd backend
npm install
```

---

## Diferenças entre Admin e Super Admin

| Recurso | Admin | Super Admin |
|---------|-------|-------------|
| Gerenciar usuários | ✅ | ✅ |
| Gerenciar filas | ✅ | ✅ |
| Gerenciar empresas | ❌ | ✅ |
| Visualizar todas as empresas | ❌ | ✅ |
| Trocar de empresa | ❌ | ✅ |

O campo `super` permite acesso multi-empresa e configurações avançadas do sistema.

---

## Precisa de Ajuda?

Se nenhum método funcionar, entre em contato com o suporte técnico.
