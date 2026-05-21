const META_API_URL = "https://graph.facebook.com/v18.0";

export function getMetaToken(): string {
  return process.env.META_WHATSAPP_TOKEN ?? "";
}

export function getMetaPhoneId(): string {
  return process.env.META_PHONE_NUMBER_ID ?? "";
}

export async function sendMetaMessage(phoneNumberId: string, to: string, body: string): Promise<void> {
  const token = getMetaToken();
  if (!token || !phoneNumberId) {
    console.warn("[WhatsApp] META_WHATSAPP_TOKEN ou phone_number_id não configurado — mensagem não enviada.");
    return;
  }
  console.log("[WhatsApp] Enviando mensagem:", { phoneNumberId, to, bodyPreview: body.slice(0, 80) });
  const resp = await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error("[WhatsApp] Erro ao enviar:", { phoneNumberId, to, status: resp.status, err });
  } else {
    let wamid = "(sem wamid)";
    try {
      const result = await resp.json() as { messages?: { id: string }[] };
      wamid = result?.messages?.[0]?.id ?? "(sem wamid)";
    } catch { }
    console.log("[WhatsApp] Mensagem enviada:", { phoneNumberId, to, wamid });
  }
}

/**
 * Envia mensagem usando template aprovado da Meta.
 * Usado quando fora da janela de 24h (sem sessão ativa).
 * O template deve estar aprovado no WhatsApp Business Account.
 */
export async function sendMetaTemplateMessage(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string = "pt_BR",
  bodyParameters?: { type: string; parameter_name?: string; text: string }[]
): Promise<void> {
  const token = getMetaToken();
  if (!token || !phoneNumberId) {
    console.warn("[WhatsApp] Token ou phone_number_id não configurado — template não enviado.");
    return;
  }
  const components = bodyParameters && bodyParameters.length > 0
    ? [{ type: "body", parameters: bodyParameters }]
    : undefined;

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  };

  console.log("[WhatsApp] Enviando template:", { phoneNumberId, to, templateName, languageCode });
  const resp = await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error("[WhatsApp] Erro ao enviar template:", { phoneNumberId, to, templateName, status: resp.status, err });
  } else {
    let wamid = "(sem wamid)";
    try {
      const result = await resp.json() as { messages?: { id: string }[] };
      wamid = result?.messages?.[0]?.id ?? "(sem wamid)";
    } catch { }
    console.log("[WhatsApp] Template enviado:", { phoneNumberId, to, wamid });
  }
}

export async function sendMetaDocument(phoneNumberId: string, to: string, documentUrl: string, filename: string, caption?: string): Promise<void> {
  const token = getMetaToken();
  if (!token || !phoneNumberId) return;
  const resp = await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: { link: documentUrl, filename, ...(caption ? { caption } : {}) },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error("[WhatsApp] Erro ao enviar documento:", err);
  }
}
