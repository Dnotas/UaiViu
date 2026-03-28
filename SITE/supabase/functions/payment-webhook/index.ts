import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Asaas envia webhook aqui após pagamento confirmado.
// Configure no painel Asaas: Configurações > Notificações > Webhook
// URL: https://reubrhhceuxwbtaqxcnq.supabase.co/functions/v1/payment-webhook

const UAIVIU_BACKEND   = 'https://backend.uaiviu.com.br'
const WHATSAPP_TOKEN   = 'dnotas2023'
const NUMERO_SUPORTE   = '5531972500555'

async function notificarWhatsApp(assinatura: {
  nome: string; email: string; telefone: string; plano: string; valor: number
}) {
  const msg =
    `✅ *Novo assinante confirmado!*\n\n` +
    `👤 *Nome:* ${assinatura.nome}\n` +
    `📧 *E-mail:* ${assinatura.email}\n` +
    `📱 *WhatsApp:* ${assinatura.telefone}\n` +
    `📦 *Plano:* ${assinatura.plano}\n` +
    `💰 *Valor:* R$ ${Number(assinatura.valor).toFixed(2).replace('.', ',')}/mês\n\n` +
    `Entre em contato para liberar o acesso! 🚀`

  await fetch(`${UAIVIU_BACKEND}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      number: NUMERO_SUPORTE,
      body:   msg,
    }),
  })
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook Asaas recebido:', payload.event, payload.payment?.id)

    const eventosConfirmados = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']

    if (eventosConfirmados.includes(payload.event) && payload.payment?.id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { data: assinatura } = await supabase
        .from('assinaturas')
        .update({
          status:       'confirmado',
          confirmed_at: new Date().toISOString(),
        })
        .eq('asaas_payment_id', payload.payment.id)
        .select()
        .single()

      if (assinatura) {
        console.log(`✅ Confirmado: ${assinatura.nome} | ${assinatura.email} | ${assinatura.plano}`)
        await notificarWhatsApp(assinatura)
        console.log(`📲 Notificação enviada para ${NUMERO_SUPORTE}`)
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('error', { status: 500 })
  }
})
