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
    const { nome, email, telefone, plano } = await req.json()

    if (!nome || !email || !telefone || !plano) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: nome, email, telefone, plano' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca token do Asaas no banco
    const { data: tokenRow, error: tokenError } = await supabase
      .from('token')
      .select('UAIVIU_TOKEN')
      .single()

    if (tokenError || !tokenRow?.UAIVIU_TOKEN) {
      throw new Error('Token Asaas não encontrado no banco')
    }
    const asaasToken = tokenRow.UAIVIU_TOKEN

    const planoInfo = PLANOS[plano] ?? PLANOS.basico
    const telefoneLimpo = telefone.replace(/\D/g, '')

    // Cria cliente no Asaas
    const custRes = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, email, mobilePhone: telefoneLimpo }),
    })
    const customer = await custRes.json()

    if (!customer.id) {
      const msg = customer.errors?.[0]?.description ?? JSON.stringify(customer)
      throw new Error(`Erro ao criar cliente no Asaas: ${msg}`)
    }

    // Data de vencimento: amanhã
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // Cria cobrança PIX
    const payRes = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'PIX',
        value: planoInfo.valor,
        dueDate: dueDateStr,
        description: `Assinatura UaiViu - ${planoInfo.nome}`,
        externalReference: `uaiviu_${Date.now()}`,
      }),
    })
    const payment = await payRes.json()

    if (!payment.id) {
      const msg = payment.errors?.[0]?.description ?? JSON.stringify(payment)
      throw new Error(`Erro ao criar cobrança no Asaas: ${msg}`)
    }

    // Busca QR Code PIX
    const pixRes = await fetch(`https://api.asaas.com/v3/payments/${payment.id}/pixQrCode`, {
      headers: { 'access_token': asaasToken },
    })
    const pixData = await pixRes.json()

    // Salva assinante pendente no Supabase
    await supabase.from('assinaturas').insert({
      nome,
      email,
      telefone,
      plano,
      valor: planoInfo.valor,
      asaas_customer_id: customer.id,
      asaas_payment_id: payment.id,
      status: 'pendente',
    })

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        pixQrCode: pixData.encodedImage,   // base64 da imagem
        pixCopyPaste: pixData.payload,      // chave copia-e-cola
        valor: planoInfo.valor,
        plano: planoInfo.nome,
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
