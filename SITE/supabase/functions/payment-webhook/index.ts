import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Asaas envia webhook aqui após pagamento confirmado.
// Configure no painel Asaas: Configurações > Notificações > Webhook
// URL: https://reubrhhceuxwbtaqxcnq.supabase.co/functions/v1/payment-webhook

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
          status: 'confirmado',
          confirmed_at: new Date().toISOString(),
        })
        .eq('asaas_payment_id', payload.payment.id)
        .select()
        .single()

      if (assinatura) {
        console.log(`✅ Assinatura confirmada: ${assinatura.nome} | ${assinatura.email} | ${assinatura.telefone} | ${assinatura.plano}`)
        // Aqui você pode adicionar envio de e-mail, notificação etc.
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('error', { status: 500 })
  }
})
