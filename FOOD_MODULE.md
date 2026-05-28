# UaiViu Food — Módulo de Restaurante

Módulo separado que roda no mesmo servidor mas em processos e portas diferentes do UaiViu principal.

## Portas
| Serviço | Porta |
|---|---|
| UaiViu Backend (principal) | 3001 (padrão) |
| UaiViu Frontend (principal) | 3000 (padrão) |
| **Food Backend** | **3003** |
| **Food Frontend** | **3002** |

## Estrutura
```
/backend-food     ← API do módulo food
/frontend-food    ← Painel do restaurante + cardápio público
```

## Banco de dados
Usa o **mesmo PostgreSQL** do UaiViu principal. Tabelas food são prefixadas com `food_`:
- `food_restaurant_configs`
- `food_whatsapps`
- `food_menu_groups`
- `food_menu_items`
- `food_orders`
- `food_order_items`
- `food_payment_configs`

Além disso, a tabela `Companies` do UaiViu principal recebe a coluna `isRestaurant` (boolean).

---

## Deploy completo

### 1. Migration no banco principal (tabela Companies)
```bash
cd backend
npx sequelize db:migrate
npx sequelize db:migrate
```

### 2. Backend Food
```bash
cd backend-food
cp .env.example .env
# Edite o .env com as credenciais do banco e JWT (mesmos do backend principal)
npm install --force
npm run build
npx sequelize db:migrate  # cria as tabelas food_*
pm2 start ecosystem.food.config.js --only uaiviu-food-backend
pm2 save
```

### 3. Frontend Food
```bash
cd frontend-food
cp .env.example .env
# Edite REACT_APP_BACKEND_FOOD_URL e REACT_APP_PUBLIC_MENU_URL
npm install --force
npm run build
# serve é instalado como devDependency e usado pelo PM2
pm2 start ecosystem.food.config.js --only uaiviu-food-frontend
pm2 save
```

### 4. Frontend principal (atualizar)
```bash
cd frontend
# Adicione ao .env:
# REACT_APP_FOOD_URL=https://seudominio.com.br:3002
npm run build
pm2 restart <nome-frontend-principal>
```

---

## Nginx — mesma URL, rotas separadas

Adicione ao seu `nginx.conf`:

```nginx
# Food Frontend (painel + cardápio público)
location /cardapio/ {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
}

# Food Backend API
location /api/food/ {
    proxy_pass http://localhost:3003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_read_timeout 120s;
}

# Food entrega (link motoboy)
location /entrega/ {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

---

## Fluxo completo

```
1. Restaurante cadastra → marca "Minha empresa é um restaurante"
2. Login → UaiViu principal detecta isRestaurant=true → redireciona para food frontend
3. Restaurante conecta WhatsApp no painel food
4. Restaurante configura cardápio (grupos + itens + fotos)
5. Restaurante configura pagamentos (PIX, cartão, pagar na entrega)
6. Restaurante configura mensagens automáticas

--- FLUXO DO CLIENTE FINAL ---
7. Cliente manda mensagem no WhatsApp do restaurante
8. Bot food responde: boas-vindas + link do cardápio
9. Cliente abre link, monta carrinho, informa dados e confirma
10. Cliente recebe: "✅ Pedido recebido!" via WhatsApp
11. Restaurante vê pedido no kanban → clica "Iniciar Preparo"
12. Cliente recebe: "👨‍🍳 Sendo preparado!" via WhatsApp
13. Restaurante clica "Saiu para Entrega" → gera link do motoboy
14. Cliente recebe: "🛵 Saiu para entrega!" via WhatsApp
15. Motoboy acessa link único → clica "Confirmar Entrega"
16. Cliente recebe: "🎉 Pedido entregue!" via WhatsApp
```

---

## Variáveis de ambiente (.env)

### backend-food/.env
```
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_USER=<igual ao UaiViu principal>
DB_PASS=<igual ao UaiViu principal>
DB_NAME=<igual ao UaiViu principal>
JWT_SECRET=<igual ao UaiViu principal>
JWT_REFRESH_SECRET=<igual ao UaiViu principal>
REDIS_URI=<igual ao UaiViu principal>
PUBLIC_MENU_BASE_URL=https://seudominio.com.br/cardapio
UPLOADS_DIR=./uploads
```

### frontend-food/.env
```
PORT=3002
REACT_APP_BACKEND_FOOD_URL=https://seudominio.com.br
REACT_APP_PUBLIC_MENU_URL=https://seudominio.com.br/cardapio
REACT_APP_MAIN_URL=https://seudominio.com.br
```

### frontend (principal)/.env — adicionar
```
REACT_APP_FOOD_URL=https://seudominio.com.br
```
