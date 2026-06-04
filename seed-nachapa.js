#!/usr/bin/env node
/**
 * Script para importar o cardápio do Na Chapa Lanches & Açaí
 *
 * Uso:
 *   node seed-nachapa.js
 *
 * Edite as constantes de configuração abaixo antes de rodar.
 * O TOKEN pode ser obtido no localStorage do navegador (chave "food_token")
 * após logar no painel UaiViu Food.
 */

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
const FOOD_API = process.env.FOOD_URL || "http://localhost:3003";
const TOKEN    = process.env.TOKEN    || "COLE_SEU_TOKEN_AQUI";
// ──────────────────────────────────────────────────────────────────────────────

// ─── Complementos do Açaí (Monte seu Açaí 3 camadas) ─────────────────────────
const COMPLEMENTOS_ACAI_MONTE = [
  { name: "Granola",                  price: 0 },
  { name: "Paçoca",                   price: 0 },
  { name: "Banana",                   price: 0 },
  { name: "Manga",                    price: 0 },
  { name: "Morango",                  price: 0 },
  { name: "Kiwi",                     price: 0 },
  { name: "Leite em Pó",              price: 0 },
  { name: "Creme de Avelã",           price: 0 },
  { name: "Leite Condensado",         price: 0 },
  { name: "Calda de Morango",         price: 0 },
  { name: "Ovomaltine",               price: 0 },
  { name: "Creme Ninho",              price: 0 },
  { name: "Creme Oreo",               price: 0 },
  { name: "Creme de Paçoca",          price: 0 },
  { name: "Gotas de Chocolate",       price: 0 },
  { name: "Mousse de Morango",        price: 0 },
  { name: "Mousse de Maracujá",       price: 0 },
  { name: "Creme Kinder Bueno",       price: 0 },
  { name: "Creme Sonho de Valsa",     price: 0 },
  { name: "Chocolate Confete (m&m)",  price: 0 },
];

// ─── Complementos do Açaí Puro (cobrados individualmente) ────────────────────
const COMPLEMENTOS_ACAI_PURO = [
  { name: "Granola",                  price: 3.00 },
  { name: "Banana",                   price: 3.00 },
  { name: "Leite Condensado",         price: 3.00 },
  { name: "Kiwi",                     price: 3.00 },
  { name: "Manga",                    price: 3.00 },
  { name: "Morango",                  price: 3.00 },
  { name: "Paçoca",                   price: 3.00 },
  { name: "Ovomaltine",               price: 3.00 },
  { name: "Chocolate Confete (m&m)",  price: 3.00 },
  { name: "Leite em Pó",              price: 4.00 },
  { name: "Calda de Morango",         price: 4.00 },
  { name: "Mousse de Morango",        price: 4.00 },
  { name: "Mousse de Maracujá",       price: 4.00 },
  { name: "Gotas de Chocolate",       price: 4.00 },
  { name: "Creme Oreo",               price: 5.00 },
  { name: "Creme Ninho",              price: 5.00 },
  { name: "Creme de Avelã",           price: 5.00 },
  { name: "Creme Paçoca",             price: 5.00 },
  { name: "Creme Kinder Bueno",       price: 5.00 },
  { name: "Creme Sonho de Valsa",     price: 5.00 },
];

// ─── Acréscimos para Burgers e Hot Dogs ──────────────────────────────────────
const ACRESCIMOS_LANCHE = [
  { name: "Alface",                    price: 1.00 },
  { name: "Tomate",                    price: 1.00 },
  { name: "Ovo",                       price: 3.00 },
  { name: "Milho",                     price: 3.00 },
  { name: "Muçarela",                  price: 3.00 },
  { name: "Presunto",                  price: 3.00 },
  { name: "Calabresa",                 price: 3.00 },
  { name: "Salsicha",                  price: 3.00 },
  { name: "Uva Passas",                price: 3.00 },
  { name: "Batata Palha",              price: 3.00 },
  { name: "Barbecue",                  price: 3.00 },
  { name: "Molho Verde",               price: 3.00 },
  { name: "Mostarda",                  price: 3.00 },
  { name: "Cebola Caramelizada",       price: 3.00 },
  { name: "Catupiry",                  price: 4.00 },
  { name: "Cheddar",                   price: 4.00 },
  { name: "Bacon",                     price: 5.00 },
  { name: "Frango Desfiado",           price: 7.00 },
  { name: "Carne Hambúrguer 100g",     price: 7.00 },
  { name: "Carne Cozida",              price: 10.00 },
  { name: "Carne de Hambúrguer 150g",  price: 10.00 },
];

// ─── Dados completos do cardápio ──────────────────────────────────────────────
const MENU = [
  {
    name: "Açaí - Monte seu Açaí 3 Camadas",
    sortOrder: 1,
    items: [
      { name: "Monte seu Açaí 350ml",  description: "Açaí premium montado em 3 camadas. Escolha 3 complementos.", price: 19.00, complements: COMPLEMENTOS_ACAI_MONTE },
      { name: "Monte seu Açaí 500ml",  description: "Açaí premium montado em 3 camadas. Escolha 3 complementos.", price: 24.00, complements: COMPLEMENTOS_ACAI_MONTE },
      { name: "Monte seu Açaí 750ml",  description: "Açaí premium montado em 3 camadas. Escolha 3 complementos.", price: 30.00, complements: COMPLEMENTOS_ACAI_MONTE },
      { name: "Monte seu Açaí 1 Litro", description: "Açaí premium montado em 3 camadas. Escolha 3 complementos.", price: 40.00, complements: COMPLEMENTOS_ACAI_MONTE },
    ],
  },
  {
    name: "Açaí Puro",
    sortOrder: 2,
    items: [
      { name: "Açaí Puro 350ml",   description: "Açaí puro premium. Complementos cobrados individualmente.", price: 16.00, complements: COMPLEMENTOS_ACAI_PURO },
      { name: "Açaí Puro 500ml",   description: "Açaí puro premium. Complementos cobrados individualmente.", price: 20.00, complements: COMPLEMENTOS_ACAI_PURO },
      { name: "Açaí Puro 750ml",   description: "Açaí puro premium. Complementos cobrados individualmente.", price: 27.00, complements: COMPLEMENTOS_ACAI_PURO },
      { name: "Açaí Puro 1 Litro", description: "Açaí puro premium. Complementos cobrados individualmente.", price: 30.00, complements: COMPLEMENTOS_ACAI_PURO },
      { name: "Açaí Puro 2 Litros", description: "Açaí puro premium. Complementos cobrados individualmente.", price: 49.90, complements: COMPLEMENTOS_ACAI_PURO },
    ],
  },
  {
    name: "Vitamina de Açaí",
    sortOrder: 3,
    items: [
      { name: "Vitamina Tradicional 300ml",      description: "Açaí batido com leite.",                                                               price: 13.00 },
      { name: "Vitamina Tradicional 500ml",      description: "Açaí batido com leite.",                                                               price: 15.00 },
      { name: "Vitamina Tradicional 700ml",      description: "Açaí batido com leite.",                                                               price: 18.00 },
      { name: "Vitamina Laranja 300ml",          description: "Açaí batido com laranja.",                                                             price: 13.00 },
      { name: "Vitamina Laranja 500ml",          description: "Açaí batido com laranja.",                                                             price: 15.00 },
      { name: "Vitamina Laranja 700ml",          description: "Açaí batido com laranja.",                                                             price: 18.00 },
      { name: "Vitamina Turbinada 300ml",        description: "Açaí batido com leite e paçoca.",                                                      price: 14.00 },
      { name: "Vitamina Turbinada 500ml",        description: "Açaí batido com leite e paçoca.",                                                      price: 16.00 },
      { name: "Vitamina Turbinada 700ml",        description: "Açaí batido com leite e paçoca.",                                                      price: 19.00 },
      { name: "Vitamina Morango 300ml",          description: "Açaí batido com leite e morangos.",                                                    price: 15.00 },
      { name: "Vitamina Morango 500ml",          description: "Açaí batido com leite e morangos.",                                                    price: 17.00 },
      { name: "Vitamina Morango 700ml",          description: "Açaí batido com leite e morangos.",                                                    price: 20.00 },
      { name: "Vitamina Leite em Pó 300ml",      description: "Açaí batido com leite e três camadas de leite em pó.",                                price: 15.00 },
      { name: "Vitamina Leite em Pó 500ml",      description: "Açaí batido com leite e três camadas de leite em pó.",                                price: 17.00 },
      { name: "Vitamina Leite em Pó 700ml",      description: "Açaí batido com leite e três camadas de leite em pó.",                                price: 20.00 },
      { name: "Vitamina Leite Condensado 300ml", description: "Açaí batido com leite, duas camadas de leite em pó e duas de leite condensado.",       price: 16.00 },
      { name: "Vitamina Leite Condensado 500ml", description: "Açaí batido com leite, duas camadas de leite em pó e duas de leite condensado.",       price: 18.00 },
      { name: "Vitamina Leite Condensado 700ml", description: "Açaí batido com leite, duas camadas de leite em pó e duas de leite condensado.",       price: 22.00 },
    ],
  },
  {
    name: "Bebidas",
    sortOrder: 4,
    items: [
      { name: "Água sem Gás 500ml",         price: 4.00  },
      { name: "Água com Gás 500ml",         price: 5.00  },
      { name: "Isotônico",                  price: 7.00  },
      { name: "Suco Lata 290ml",            price: 7.00  },
      { name: "Refrigerante Lata 350ml",    price: 7.00  },
      { name: "Refrigerante Lata Zero 350ml", price: 7.00 },
      { name: "Cerveja Lata 473ml",         price: 10.00 },
      { name: "Energético Lata",            price: 12.00 },
      { name: "Refrigerante 600ml",         price: 12.00 },
      { name: "Refrigerante 1 Litro",       price: 15.00 },
      { name: "Refrigerante 1,5 Litro",     price: 18.00 },
    ],
  },
  {
    name: "Burguer Artesanal",
    sortOrder: 5,
    items: [
      {
        name: "X-Burguer",
        description: "Pão de brioche, carne caseira 100g, muçarela e batata palha.",
        price: 19.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Smash Burguer",
        description: "Pão de brioche, carne caseira 100g, muçarela, requeijão, alface, tomate. Molho verde, catchup e barbecue.",
        price: 27.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Smash Egg",
        description: "Pão de brioche, carne caseira 100g, muçarela, cheddar, ovo, tomate, alface, cebola caramelizada. Molho verde, catchup e barbecue.",
        price: 28.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Smash Bacon",
        description: "Pão de brioche, carne caseira 100g, muçarela, cheddar, bacon, cebola caramelizada, tomate, alface. Molho verde, catchup e barbecue.",
        price: 30.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Smash Na Chapa",
        description: "Pão de brioche, carne caseira 100g, muçarela, presunto, requeijão, bacon, ovo, tomate, alface e batata palha. Molho verde, catchup e barbecue.",
        price: 31.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Raiz",
        description: "Pão de brioche, carne caseira 100g, muçarela, ovo, milho, alface, tomate, batata palha. Molho verde, catchup e barbecue.",
        price: 31.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Pizza",
        description: "Pão de brioche, duas carnes caseiras 100g, molho de tomate caseiro, muçarela, dupla calabresa, muçarela e requeijão. Molho verde, catchup e barbecue.",
        price: 34.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Burguer Especial",
        description: "Pão de brioche, duas carnes caseiras 100g, cebola caramelizada, muçarela e cheddar. Molho verde, catchup e barbecue.",
        price: 34.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Querido",
        description: "Pão de brioche, carne caseira 150g, muçarela, cheddar, bacon, cebola caramelizada, tomate, alface. Molho verde, catchup e barbecue.",
        price: 34.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Bacon Especial",
        description: "Pão de brioche, duas carnes caseiras 100g, duplo bacon, cheddar e requeijão. Molho verde, catchup e barbecue.",
        price: 35.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Calma Calabreso",
        description: "Pão de brioche, carne caseira 150g, muçarela, cheddar, bacon, calabresa, tomate, alface. Molho verde, catchup e barbecue.",
        price: 35.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Na Chapa Burguer",
        description: "Pão de brioche, carne caseira 150g, muçarela, presunto, requeijão, bacon, ovo, tomate, alface e batata palha. Molho verde, catchup e barbecue.",
        price: 36.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Burgão na Marmita",
        description: "Pão de brioche, duas carnes caseiras 100g, dois ovos, requeijão, muçarela, presunto, cheddar, bacon, calabresa, cebola caramelizada, tomate, alface e batata palha. Molho verde, catchup e barbecue.",
        price: 46.90, complements: ACRESCIMOS_LANCHE,
      },
    ],
  },
  {
    name: "Burguer com Frango",
    sortOrder: 6,
    items: [
      {
        name: "X-Frango Fit",
        description: "Pão de brioche, filé de frango desfiado, muçarela, milho, alface, tomate, batata palha. Molho verde, catchup e barbecue.",
        price: 30.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Galinha",
        description: "Pão de brioche, filé de frango desfiado, bacon, muçarela, milho, alface, tomate, batata palha. Molho verde, catchup e barbecue.",
        price: 32.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Tropical",
        description: "Pão de brioche, filé de frango desfiado, requeijão, banana, milho, alface, tomate, batata palha. Molho verde, catchup e barbecue.",
        price: 32.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Maromba",
        description: "Pão de brioche, filé de frango desfiado, dois ovos, requeijão, milho, alface, tomate, batata palha. Molho verde, catchup e barbecue.",
        price: 35.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "X-Galinha Especial",
        description: "Pão de brioche, filé de frango desfiado, bacon, requeijão, ovo, tomate, presunto, milho, alface, muçarela, batata palha. Molho verde, catchup e barbecue.",
        price: 36.90, complements: ACRESCIMOS_LANCHE,
      },
    ],
  },
  {
    name: "Hot Dog Cultural",
    sortOrder: 7,
    items: [
      {
        name: "Hot Dog",
        description: "Pão macio, molho de tomate caseiro, salsicha de qualidade, requeijão, tomate fresco picado, milho e batata palha.",
        price: 18.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Paulista",
        description: "Pão macio, molho de tomate caseiro, salsicha, requeijão, purê de batata, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 20.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Americano",
        description: "Pão macio, molho de tomate caseiro, salsicha, cheddar, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 20.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Hot Guloso",
        description: "Pão macio, molho de tomate caseiro, duas salsichas, duplo requeijão, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 21.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Carioca",
        description: "Pão macio, molho de tomate caseiro, salsicha, requeijão, ovo, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 21.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Gaúcho",
        description: "Pão macio, molho de tomate caseiro, salsicha, calabresa, requeijão, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 21.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Na Chapa Dog",
        description: "Pão macio, molho de tomate caseiro, salsicha, requeijão, muçarela, presunto, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 22.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Hot Frango",
        description: "Pão macio, molho de tomate caseiro, salsicha, requeijão, filé de frango desfiado, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 22.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Mineiro",
        description: "Pão macio, molho de tomate caseiro, salsicha, requeijão, bacon, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 22.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Nordestino",
        description: "Pão macio, molho de tomate caseiro, salsicha, requeijão, carne seca desfiada, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 24.00, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Hot X-Tudo",
        description: "Pão macio, molho de tomate caseiro, duas salsichas, requeijão, bacon, ovo, muçarela, presunto, tomate fresco picado, milho e batata palha. Molho verde, catchup e mostarda.",
        price: 25.90, complements: ACRESCIMOS_LANCHE,
      },
      {
        name: "Dogão na Marmita",
        description: "Pão macio, molho de tomate caseiro, três salsichas, requeijão, cheddar, carne seca desfiada, calabresa, bacon, dois ovos, muçarela, presunto, tomate fresco picado, milho, purê de batata e batata palha. Molho verde, catchup e mostarda.",
        price: 36.00, complements: ACRESCIMOS_LANCHE,
      },
    ],
  },
  {
    name: "Sanduíches Simples",
    sortOrder: 8,
    items: [
      {
        name: "Misto Duplo",
        description: "Pão de brioche prensado, duas fatias de muçarela, duas fatias de presunto.",
        price: 14.00,
      },
      {
        name: "Misto com Ovo",
        description: "Pão de brioche prensado, duas fatias de muçarela, duas fatias de presunto e ovo.",
        price: 16.00,
      },
    ],
  },
  {
    name: "Refeição - Espaguete",
    sortOrder: 9,
    items: [
      {
        name: "Chinezinho",
        description: "Espaguete, molho shoyo, bacon, ovo, calabresa, muçarela, milho e tomate picado.",
        price: 30.90,
      },
      {
        name: "Caipira",
        description: "Espaguete, molho de tomate artesanal, frango desfiado, bacon, milho, muçarela, tomate picado e uva passas.",
        price: 32.90,
      },
      {
        name: "Mineirinho",
        description: "Espaguete, carne cozida desfiada, bacon, muçarela, tomate picado e molho branco.",
        price: 35.90,
      },
      {
        name: "Domingão",
        description: "Espaguete, molho de tomate caseiro, carne cozida desfiada, bacon, muçarela, tomate picado, milho e uva passas.",
        price: 34.90,
      },
      {
        name: "Chinezão",
        description: "Espaguete, molho de shoyo, carne cozida desfiada, bacon, ovos, milho, tomate picado e muçarela.",
        price: 34.90,
      },
      {
        name: "Carreteiro",
        description: "Arroz, carne cozida desfiada, ovos, bacon, milho e batata palha.",
        price: 36.90,
      },
    ],
  },
  {
    name: "Porções",
    sortOrder: 10,
    items: [
      {
        name: "Fritas",
        description: "Batata frita 400g.",
        price: 25.00,
      },
      {
        name: "Fritas Cheddar",
        description: "Batata frita 400g, bacon e cheddar.",
        price: 36.90,
      },
      {
        name: "Fritas Muçarela",
        description: "Batata frita 400g, bacon e muçarela.",
        price: 36.90,
      },
      {
        name: "Fritas Carne Seca",
        description: "Batata frita 400g, carne seca e catupiry.",
        price: 36.90,
      },
    ],
  },
];

// ─── Helpers de API ───────────────────────────────────────────────────────────

async function createGroup(name, sortOrder) {
  const form = new FormData();
  form.append("name", name);
  form.append("sortOrder", String(sortOrder));

  const res = await fetch(`${FOOD_API}/menu/groups`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Criar grupo "${name}" falhou [${res.status}]: ${text}`);
  }
  return res.json();
}

async function createItem(groupId, item, sortOrder) {
  const form = new FormData();
  form.append("name", item.name);
  if (item.description) form.append("description", item.description);
  form.append("price", String(item.price));
  form.append("sortOrder", String(sortOrder));

  const res = await fetch(`${FOOD_API}/menu/groups/${groupId}/items`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Criar item "${item.name}" falhou [${res.status}]: ${text}`);
  }
  return res.json();
}

async function saveComplements(itemId, complements) {
  const res = await fetch(`${FOOD_API}/menu/items/${itemId}/complements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      hasComplements: true,
      complements: complements.map((c, i) => ({ name: c.name, price: c.price, sortOrder: i })),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salvar complementos para item ${itemId} falhou [${res.status}]: ${text}`);
  }
  return res.json();
}

// ─── Execução principal ───────────────────────────────────────────────────────

async function main() {
  if (TOKEN === "COLE_SEU_TOKEN_AQUI") {
    console.error("\nERRO: Configure o TOKEN no topo do script ou passe via variavel de ambiente:");
    console.error("  TOKEN=xxx node seed-nachapa.js\n");
    console.error("O token pode ser obtido no localStorage do navegador (chave 'food_token')");
    console.error("apos logar no painel UaiViu Food.\n");
    process.exit(1);
  }

  console.log(`\nConectando em: ${FOOD_API}`);
  console.log(`Iniciando importacao de ${MENU.length} grupos...\n`);

  let totalGrupos = 0;
  let totalItens = 0;
  let totalComplementos = 0;

  for (const grupo of MENU) {
    process.stdout.write(`Criando grupo: "${grupo.name}"... `);
    const grupoSalvo = await createGroup(grupo.name, grupo.sortOrder);
    console.log(`OK (id=${grupoSalvo.id})`);
    totalGrupos++;

    for (let i = 0; i < grupo.items.length; i++) {
      const item = grupo.items[i];
      process.stdout.write(`  -> "${item.name}" R$${item.price.toFixed(2)}... `);
      const itemSalvo = await createItem(grupoSalvo.id, item, i);
      totalItens++;

      if (item.complements && item.complements.length > 0) {
        await saveComplements(itemSalvo.id, item.complements);
        totalComplementos += item.complements.length;
        console.log(`OK (id=${itemSalvo.id}, ${item.complements.length} complementos)`);
      } else {
        console.log(`OK (id=${itemSalvo.id})`);
      }
    }

    console.log("");
  }

  console.log("=".repeat(55));
  console.log(`Importacao concluida com sucesso!`);
  console.log(`  Grupos criados:       ${totalGrupos}`);
  console.log(`  Itens criados:        ${totalItens}`);
  console.log(`  Complementos criados: ${totalComplementos}`);
  console.log("=".repeat(55));
}

main().catch((err) => {
  console.error("\nErro fatal:", err.message);
  process.exit(1);
});
