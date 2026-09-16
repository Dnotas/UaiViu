// Quando o UaiViu manda uma mensagem via W-API, o próprio W-API ecoa ela de volta
// no webhook como um evento fromMe:true (pra manter o histórico do WhatsApp
// consistente). Sem isso, esse eco duplicaria a mensagem que o UaiViu já
// registrou na hora do envio — mas também precisamos deixar passar mensagens
// fromMe que a pessoa mandou direto pelo celular (essas nunca passaram pelo
// UaiViu e têm que aparecer no chamado). Esse cache de curta duração marca
// "acabei de mandar pra esse número" pra distinguir um caso do outro.
const recentSends = new Map<string, number>();
const TTL_MS = 8000;

export const markWapiBridgeSent = (chatNumber: string): void => {
  recentSends.set(chatNumber, Date.now() + TTL_MS);
};

export const consumeWapiBridgeEcho = (chatNumber: string): boolean => {
  const expiresAt = recentSends.get(chatNumber);
  recentSends.delete(chatNumber);
  return !!expiresAt && expiresAt > Date.now();
};
