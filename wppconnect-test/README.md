# WPPConnect - prova de conceito (alternativa ao Baileys)

## Motivo

O pareamento novo do Baileys (biblioteca usada hoje pelo UaiViu pra falar
com o WhatsApp) está quebrado por um bug de protocolo do lado do WhatsApp/
Baileys (set/2026) — nenhuma conexão nova consegue parear via QR ou código
de número. Enquanto isso, produção roda via pontes externas (W-API,
InovaChat) que controlam o WhatsApp em outra infraestrutura.

Esse diretório é um sandbox **isolado**, fora do `backend/`, pra testar se
o [WPPConnect](https://github.com/wppconnect-team/wppconnect) — que
controla o WhatsApp Web de verdade via Chromium/Puppeteer, em vez de
reimplementar o protocolo como o Baileys faz — consegue parear onde o
Baileys falha.

**Não mexe em nada do UaiViu em produção.** Só sobe pra virar a conexão de
verdade se o teste provar que funciona de ponta a ponta (parear, manter
sessão, enviar mensagem).

## Status

- Servidor Express rodando em `/home/deploy/wppconnect-test` (porta 4002),
  exposto via nginx em `https://teste.uaiviu.com.br/wpp-teste/`.
- QR code gerado e exibido com sucesso numa página que atualiza sozinha
  (`/connections/:token/page`).
- Pareamento (scan do QR) ainda não confirmado de ponta a ponta.

## Arquivos

- `server.js` — servidor de teste: cria sessão WPPConnect, expõe QR/status/
  envio de texto.
- `uaiviu-teste.nginx` — bloco de nginx que expõe o sandbox no domínio de
  teste existente (`teste.uaiviu.com.br`), sem abrir porta nova.
- `package.json` — dependências (`@wppconnect-team/wppconnect`, `express`).

## Próximos passos

1. Confirmar pareamento real (scan do QR até `status: connected`).
2. Testar envio/recebimento de mensagem de teste.
3. Só então planejar com calma a migração de alguma conexão real — sem
   nunca tirar do ar o que já funciona (wapi_bridge / inovachat_bridge).
