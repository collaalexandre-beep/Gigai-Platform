import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Quote, QuoteItem, Client, Contact, Seller, PaymentTerm, PaymentMethod } from "@shared/schema";

type QuotePrintData = Quote & {
  client?: Client;
  contact?: Contact;
  seller?: Seller;
  paymentTerm?: PaymentTerm;
  paymentMethod?: PaymentMethod;
  items: QuoteItem[];
};

export default function QuotePrintPage() {
  const { id } = useParams<{ id: string }>();

  const { data: quote, isLoading } = useQuery<QuotePrintData>({
    queryKey: ["/api/quotes", id, "print"],
    queryFn: async () => {
      const q = await fetch(`/api/quotes/${id}`).then((r) => r.json());
      const items = await fetch(`/api/quotes/${id}/items`).then((r) => r.json());
      let client, contact, seller, paymentTerm, paymentMethod;
      if (q.clientId) client = await fetch(`/api/clients/${q.clientId}`).then((r) => r.json());
      if (q.contactId) contact = await fetch(`/api/contacts/${q.contactId}`).then((r) => r.json());
      if (q.sellerId) seller = await fetch(`/api/sellers/${q.sellerId}`).then((r) => r.json());
      if (q.prazosPagamentoId) {
        const pts: PaymentTerm[] = await fetch(`/api/payment-terms`).then((r) => r.json());
        paymentTerm = pts.find((pt) => pt.id === q.prazosPagamentoId);
      }
      if (q.formaPagamento) {
        const methods: PaymentMethod[] = await fetch(`/api/payment-methods`).then((r) => r.json());
        paymentMethod = methods.find((m) => m.nome === q.formaPagamento) || { nome: q.formaPagamento } as PaymentMethod;
      }
      return { ...q, items, client, contact, seller, paymentTerm, paymentMethod };
    },
  });

  useEffect(() => {
    if (quote && !isLoading) {
      document.title = `Orçamento ${quote.numero}`;
    }
  }, [quote, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando orçamento...</p>
      </div>
    );
  }
  if (!quote) return <div className="p-8">Orçamento não encontrado.</div>;

  const fmt = (val: string | number | null | undefined) => {
    if (val == null || val === "") return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
  };
  const fmtDate = (d: string | null | undefined) =>
    d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

  const subtotal = quote.items.reduce((s, i) => s + Number(i.precoTotal || 0), 0);
  const descontoVal = subtotal * (Number(quote.desconto || 0) / 100);
  const impostosVal = subtotal * (Number(quote.impostos || 0) / 100);
  const total = subtotal - descontoVal + impostosVal;

  const vencimentos = paymentTermDias(quote.paymentTerm, total);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .print-page {
          background: white;
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          padding: 15mm 15mm 20mm;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          font-size: 8.5pt;
          color: #000;
          line-height: 1.3;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 3px 5px; }
        .divider { border: none; border-top: 1.5px solid #000; margin: 6px 0; }
        .divider-light { border: none; border-top: 0.5px solid #ccc; margin: 3px 0; }
        .items-table th { background: #e8e8e8; font-size: 7.5pt; font-weight: 700; border-top: 1px solid #888; border-bottom: 1px solid #888; }
        .items-table td { border-bottom: 0.5px solid #ddd; font-size: 8pt; }
        .totals-table td { padding: 2px 5px; font-size: 8.5pt; }
        .legal-text { font-size: 6.5pt; color: #444; margin-top: 8px; line-height: 1.4; }
        .sig-line { border-top: 1px solid #000; width: 45%; display: inline-block; margin-top: 30px; }
      `}</style>

      <div className="no-print" style={{ background: '#f5f5f5', padding: '20px', display: 'flex', justifyContent: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <button
          onClick={() => window.print()}
          style={{ background: '#1e40af', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
        >
          🖨 Imprimir
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Voltar
        </button>
      </div>

      <div className="print-page">
        {/* Header */}
        <table style={{ width: '100%', marginBottom: '6px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '18pt', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.5px' }}>Gráfica+</div>
                <div style={{ fontSize: '7pt', color: '#666', marginTop: '2px', letterSpacing: '0.5px' }}>SISTEMA GRÁFICO INDUSTRIAL</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{ fontSize: '9pt' }}>Data: <strong>{fmtDate(quote.data)}</strong></div>
                <div style={{ fontSize: '9pt', marginTop: '3px' }}>Orçamento Nr.: <strong>{quote.numero}</strong></div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="divider" />

        {/* Client Info */}
        <table style={{ width: '100%', marginBottom: '4px', fontSize: '8pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '40%' }}>
                <span style={{ color: '#555', fontWeight: 600 }}>Cliente:</span>{' '}
                {quote.client?.razaoSocial || '—'}
              </td>
              <td style={{ width: '30%' }}>
                <span style={{ color: '#555', fontWeight: 600 }}>Fantasia:</span>{' '}
                {quote.client?.nomeFantasia || quote.client?.razaoSocial || '—'}
              </td>
              <td>
                <span style={{ color: '#555', fontWeight: 600 }}>Contato:</span>{' '}
                {quote.contact?.nomeCompleto || '—'}
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ color: '#555', fontWeight: 600 }}>Fone:</span>{' '}
                {quote.client?.telefone || '—'}
              </td>
              <td>
                <span style={{ color: '#555', fontWeight: 600 }}>Email:</span>{' '}
                {quote.client?.email || '—'}
              </td>
              <td>
                <span style={{ color: '#555', fontWeight: 600 }}>CNPJ/CPF:</span>{' '}
                {quote.client?.cnpj || quote.client?.cpf || '—'}
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="divider" />

        {/* Items Table */}
        <table className="items-table" style={{ marginBottom: '8px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: '22px' }}>-</th>
              <th style={{ textAlign: 'center', width: '35px' }}>Qtde.</th>
              <th style={{ textAlign: 'left' }}>Produto / Serviço</th>
              <th style={{ textAlign: 'center', width: '35px' }}>U.M.</th>
              <th style={{ textAlign: 'center', width: '40px' }}>Lar.</th>
              <th style={{ textAlign: 'center', width: '40px' }}>Alt.</th>
              <th style={{ textAlign: 'right', width: '70px' }}>Unitário</th>
              <th style={{ textAlign: 'right', width: '75px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fafafa' : 'white' }}>
                <td style={{ textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                <td style={{ textAlign: 'center' }}>{item.quantidade}</td>
                <td>
                  {item.descricao}
                  {item.observacoes && <div style={{ fontSize: '7pt', color: '#666' }}>{item.observacoes}</div>}
                </td>
                <td style={{ textAlign: 'center' }}>{item.unidade || 'un'}</td>
                <td style={{ textAlign: 'center' }}>{item.largura ? Number(item.largura).toFixed(2) : '—'}</td>
                <td style={{ textAlign: 'center' }}>{item.altura ? Number(item.altura).toFixed(2) : '—'}</td>
                <td style={{ textAlign: 'right' }}>{fmt(item.precoUnitario)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.precoTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <table style={{ width: '100%', marginBottom: '8px' }}>
          <tbody>
            <tr>
              <td style={{ width: '60%' }} rowSpan={4}></td>
              <td style={{ textAlign: 'right', color: '#555', paddingRight: '10px', fontSize: '8pt' }}>Subtotal:</td>
              <td style={{ textAlign: 'right', fontWeight: 600, width: '80px' }}>{fmt(subtotal)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', color: '#555', paddingRight: '10px', fontSize: '8pt' }}>Desconto:</td>
              <td style={{ textAlign: 'right' }}>{descontoVal > 0 ? `- ${fmt(descontoVal)}` : fmt(0)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', color: '#555', paddingRight: '10px', fontSize: '8pt' }}>Impostos:</td>
              <td style={{ textAlign: 'right' }}>{impostosVal > 0 ? `+ ${fmt(impostosVal)}` : fmt(0)}</td>
            </tr>
            <tr style={{ borderTop: '1.5px solid #000' }}>
              <td style={{ textAlign: 'right', fontWeight: 700, paddingRight: '10px', paddingTop: '3px' }}>Total:</td>
              <td style={{ textAlign: 'right', fontWeight: 700, paddingTop: '3px', fontSize: '10pt' }}>{fmt(total)}</td>
            </tr>
          </tbody>
        </table>

        <hr className="divider" />

        {/* Conditions Row */}
        <table style={{ width: '100%', fontSize: '8pt', marginBottom: '6px' }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: '#555', fontWeight: 600 }}>Val. proposta:</span>{' '}
                {fmtDate(quote.data)} - {fmtDate(quote.validade)}
              </td>
              <td>
                <span style={{ color: '#555', fontWeight: 600 }}>Prazo de produção:</span>{' '}
                {quote.prazoProd || '—'}
              </td>
              <td>
                <span style={{ color: '#555', fontWeight: 600 }}>Responsável:</span>{' '}
                {quote.seller?.nomeCompleto || '—'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Vencimentos */}
        {vencimentos.length > 0 && (
          <>
            <div style={{ fontSize: '8pt', fontWeight: 600, marginBottom: '3px' }}>Vencimentos:</div>
            <table className="items-table" style={{ width: '60%', marginBottom: '8px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '30px' }}>-</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Prazo (dias)</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th style={{ textAlign: 'left', paddingLeft: '10px' }}>Forma de pagamento</th>
                </tr>
              </thead>
              <tbody>
                {vencimentos.map((v, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ textAlign: 'center' }}>{v.dias === 0 ? 'Entrada' : v.dias}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(v.valor)}</td>
                    <td style={{ paddingLeft: '10px' }}>{quote.formaPagamento || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Observations */}
        {quote.observacoes && (
          <>
            <div style={{ fontSize: '8pt' }}>
              <span style={{ fontWeight: 700 }}>Obs.: </span>
              {quote.observacoes}
            </div>
          </>
        )}

        {/* Legal Text */}
        <div className="legal-text">
          1. Correção ortográfica por conta do cliente; 2. Cliente deverá fornecer print de referência de cor do arquivo, sem o qual não nos comprometemos com as cores impressas; 3. Poderá ocorrer uma pequena variação em relação ao print, em função da mídia e maquinário utilizados. Para maior fidelidade, o cliente deve optar pela prova de cor de máquina; 4. Nas entregas via transportadora, não nos responsabilizamos com o prazo de entrega; 5. As informações sobre tamanho, quantidade e acabamento são de total responsabilidade do cliente. Não nos responsabilizamos por sangria ou quaisquer necessidades especiais não previamente solicitadas.
        </div>

        {/* Signature */}
        <table style={{ width: '100%', marginTop: '24px', fontSize: '8pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '45%', textAlign: 'center', paddingTop: '4px' }}>
                <div className="sig-line"></div>
                <div style={{ marginTop: '4px' }}>Gráfica+ Ltda</div>
              </td>
              <td style={{ width: '10%' }}></td>
              <td style={{ textAlign: 'center', paddingTop: '4px' }}>
                <div className="sig-line"></div>
                <div style={{ marginTop: '4px' }}>
                  {quote.client?.razaoSocial || 'Cliente'}{' '}
                  ({quote.client?.cnpj || quote.client?.cpf || 'Cliente'})
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function paymentTermDias(term: PaymentTerm | undefined, total: number): { dias: number; valor: number }[] {
  if (!term || !term.dias || term.dias.length === 0) return [];
  const parcel = total / term.dias.length;
  return term.dias.map((d) => ({ dias: d, valor: parcel }));
}
