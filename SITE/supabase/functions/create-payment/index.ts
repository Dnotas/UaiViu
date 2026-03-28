import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLANOS: Record<string, { valor: number; nome: string }> = {
  basico:       { valor: 49.90,  nome: 'Plano Básico' },
  professional: { valor: 397.00, nome: 'Plano Professional' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { nome, email, telefone, cpfCnpj, plano } = await req.json()

    if (!nome || !email || !telefone || !cpfCnpj || !plano) {
      return new Response(
        JSON.stringify({ error: 'Preencha todos os campos: nome, email, telefone, CPF/CNPJ e plano.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Busca token do Asaas na tabela token do Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tokenRow } = await supabase.from('token').select('UAIVIU_TOKEN').single()
    const asaasToken = tokenRow?.UAIVIU_TOKEN
    if (!asaasToken) throw new Error('Token Asaas não configurado no banco.')

    const planoInfo = PLANOS[plano] ?? PLANOS.basico
    const telefoneLimpo = telefone.replace(/\D/g, '')
    const cpfCnpjLimpo  = cpfCnpj.replace(/\D/g, '')

    // 1. Cria ou busca cliente no Asaas
    const custRes = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        nome,
        email:       email,
        mobilePhone: telefoneLimpo,
        cpfCnpj:     cpfCnpjLimpo,
      }),
    })
    const customer = await custRes.json()

    let customerId = customer.id
    // Se CPF/CNPJ já existe, Asaas retorna erro — busca o cliente existente
    if (!customerId && customer.errors) {
      const searchRes = await fetch(
        `https://api.asaas.com/v3/customers?cpfCnpj=${cpfCnpjLimpo}`,
        { headers: { 'access_token': asaasToken } }
      )
      const searchData = await searchRes.json()
      customerId = searchData.data?.[0]?.id
    }
    if (!customerId) throw new Error('Erro ao criar cliente no Asaas: ' + JSON.stringify(customer.errors))

    // 2. Cria assinatura recorrente mensal (cliente escolhe PIX, Boleto ou Cartão na página do Asaas)
    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    const subRes = await fetch('https://api.asaas.com/v3/subscriptions', {
      method: 'POST',
      headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer:    customerId,
        billingType: 'UNDEFINED',  // cliente escolhe: PIX, Boleto ou Cartão
        value:       planoInfo.valor,
        nextDueDate: dueDateStr,
        cycle:       'MONTHLY',
        description: `Assinatura UaiViu - ${planoInfo.nome}`,
      }),
    })
    const subscription = await subRes.json()
    if (!subscription.id) throw new Error('Erro ao criar assinatura: ' + JSON.stringify(subscription.errors))

    // 3. Busca a primeira cobrança gerada pela assinatura
    await new Promise(r => setTimeout(r, 1500)) // Asaas demora ~1s para gerar o primeiro pagamento
    const paymentsRes = await fetch(
      `https://api.asaas.com/v3/payments?subscription=${subscription.id}&limit=1`,
      { headers: { 'access_token': asaasToken } }
    )
    const paymentsData = await paymentsRes.json()
    const firstPayment = paymentsData.data?.[0]

    const invoiceUrl = firstPayment?.invoiceUrl ?? `https://www.asaas.com/i/${subscription.id}`

    // 4. Salva no Supabase como pendente
    await supabase.from('assinaturas').insert({
      nome,
      email,
      telefone,
      cpf_cnpj:              cpfCnpjLimpo,
      plano,
      valor:                 planoInfo.valor,
      asaas_customer_id:     customerId,
      asaas_subscription_id: subscription.id,
      asaas_payment_id:      firstPayment?.id ?? null,
      status:                'pendente',
    })

    return new Response(
      JSON.stringify({
        success:    true,
        invoiceUrl, // página Asaas onde cliente escolhe PIX / Boleto / Cartão
        valor:      planoInfo.valor,
        plano:      planoInfo.nome,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('create-payment error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
