import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";

type PurchaseOrderData = {
  id: string;
  codigo: string;
  ordemCompraNumero: string | null;
  material: string;
  quantidade: string | null;
  unidade: string | null;
  osRelacionada: string | null;
  tipoCompra: string | null;
  urgencia: string | null;
  observacao: string | null;
  solicitanteNome: string | null;
  status: string;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
  createdAt: string;
  supplier?: {
    nome: string;
    cnpjCpf?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    contato?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    condicaoPagamentoPadrao?: string | null;
    prazoMedioEntrega?: string | null;
  };
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const TIPO_LABEL: Record<string, string> = {
  os: "OS", estoque: "Estoque", expediente: "Expediente", manutencao: "Manutenção", outro: "Outro",
};
const URG_LABEL: Record<string, string> = {
  normal: "Normal", urgente: "Urgente", muito_urgente: "Muito urgente",
};

export default function PurchasePrintPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery<PurchaseOrderData>({
    queryKey: ["/api/purchase-requests", id, "print"],
    queryFn: async () => {
      const pr = await fetch(`/api/purchase-requests/${id}`, { credentials: "include" }).then((r) => r.json());
      let supplier;
      if (pr.fornecedorId) {
        supplier = await fetch(`/api/suppliers/${pr.fornecedorId}`, { credentials: "include" }).then((r) => r.json()).catch(() => undefined);
      }
      return { ...pr, supplier };
    },
  });

  useEffect(() => {
    if (order && !isLoading) {
      document.title = `Ordem de Compra ${order.ordemCompraNumero || order.codigo}`;
    }
  }, [order, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando ordem de compra...</p>
      </div>
    );
  }
  if (!order) return <div className="p-8">Ordem não encontrada.</div>;

  const sup = order.supplier;
  const enderecoPartes = [
    sup?.logradouro,
    sup?.numero ? `nº ${sup.numero}` : null,
    sup?.bairro,
    sup?.cidade,
    sup?.estado,
    sup?.cep,
  ].filter(Boolean);
  const endereco = enderecoPartes.join(", ") || "—";

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
          font-size: 9pt;
          color: #000;
          line-height: 1.4;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 4px 6px; }
        .divider { border: none; border-top: 2px solid #1e3a8a; margin: 8px 0; }
        .divider-light { border: none; border-top: 0.5px solid #ccc; margin: 4px 0; }
        .section-title { font-size: 7.5pt; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 20px; font-size: 8.5pt; margin-bottom: 8px; }
        .info-label { color: #555; font-weight: 600; }
        .items-table th { background: #1e3a8a; color: white; font-size: 8pt; font-weight: 700; text-align: left; }
        .items-table td { border-bottom: 0.5px solid #ddd; font-size: 8.5pt; }
        .sig-line { border-top: 1px solid #000; width: 100%; display: block; margin-top: 30px; }
        .badge-urgente { background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 3px; font-size: 8pt; font-weight: 600; }
        .badge-muito-urgente { background: #fee2e2; color: #991b1b; padding: 1px 6px; border-radius: 3px; font-size: 8pt; font-weight: 600; }
      `}</style>

      <div className="no-print" style={{ background: '#f5f5f5', padding: '16px 20px', display: 'flex', justifyContent: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <button onClick={() => window.print()} style={{ background: '#1e40af', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          🖨 Imprimir / Salvar PDF
        </button>
        <button onClick={() => window.history.back()} style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          ← Voltar
        </button>
      </div>

      <div className="print-page">
        {/* Header */}
        <table style={{ width: '100%', marginBottom: '4px' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                <div style={{ fontSize: '18pt', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.5px' }}>Gráfica+</div>
                <div style={{ fontSize: '7pt', color: '#666', marginTop: '2px', letterSpacing: '0.5px' }}>SISTEMA GRÁFICO INDUSTRIAL</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{ fontSize: '16pt', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px' }}>ORDEM DE COMPRA</div>
                <div style={{ fontSize: '9pt', marginTop: '4px' }}>
                  Nr.: <strong style={{ fontSize: '11pt' }}>{order.ordemCompraNumero || order.codigo}</strong>
                </div>
                <div style={{ fontSize: '8.5pt', color: '#444', marginTop: '2px' }}>
                  Data: <strong>{fmtDate(order.aprovadoEm || order.createdAt)}</strong>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="divider" />

        {/* Supplier Section */}
        <div className="section-title">Dados do Fornecedor</div>
        {sup ? (
          <div className="info-grid" style={{ marginBottom: '10px' }}>
            <div><span className="info-label">Fornecedor: </span>{sup.nome}</div>
            <div><span className="info-label">CNPJ/CPF: </span>{sup.cnpjCpf || "—"}</div>
            <div><span className="info-label">Contato: </span>{sup.contato || "—"}</div>
            <div><span className="info-label">Telefone: </span>{sup.telefone || sup.whatsapp || "—"}</div>
            <div><span className="info-label">E-mail: </span>{sup.email || "—"}</div>
            <div><span className="info-label">Prazo médio entrega: </span>{sup.prazoMedioEntrega || "—"}</div>
            <div style={{ gridColumn: '1/-1' }}><span className="info-label">Endereço: </span>{endereco}</div>
            {sup.condicaoPagamentoPadrao && (
              <div style={{ gridColumn: '1/-1' }}><span className="info-label">Condição de pagamento: </span>{sup.condicaoPagamentoPadrao}</div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: '10px', fontSize: '8.5pt' }}>
            <span className="info-label">Fornecedor: </span>{order.fornecedorNome || "—"}
          </div>
        )}

        <hr className="divider-light" />

        {/* Item Section */}
        <div className="section-title" style={{ marginTop: '8px' }}>Item Solicitado</div>
        <table className="items-table" style={{ marginBottom: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Material / Descrição</th>
              <th style={{ textAlign: 'center', width: '12%' }}>Quantidade</th>
              <th style={{ textAlign: 'center', width: '10%' }}>Unidade</th>
              <th style={{ textAlign: 'center', width: '12%' }}>Tipo</th>
              <th style={{ textAlign: 'center', width: '12%' }}>Urgência</th>
              <th style={{ textAlign: 'center', width: '14%' }}>OS Relacionada</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>{order.material}</td>
              <td style={{ textAlign: 'center' }}>{order.quantidade || "—"}</td>
              <td style={{ textAlign: 'center' }}>{order.unidade || "—"}</td>
              <td style={{ textAlign: 'center' }}>{TIPO_LABEL[order.tipoCompra || ""] || order.tipoCompra || "—"}</td>
              <td style={{ textAlign: 'center' }}>
                {order.urgencia === "urgente" ? (
                  <span className="badge-urgente">Urgente</span>
                ) : order.urgencia === "muito_urgente" ? (
                  <span className="badge-muito-urgente">Muito Urgente</span>
                ) : (
                  "Normal"
                )}
              </td>
              <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{order.osRelacionada || "—"}</td>
            </tr>
          </tbody>
        </table>

        {order.observacao && (
          <div style={{ fontSize: '8.5pt', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700 }}>Observações: </span>{order.observacao}
          </div>
        )}

        <hr className="divider-light" />

        {/* Approval info */}
        <div style={{ fontSize: '8pt', color: '#555', marginTop: '8px', marginBottom: '20px' }}>
          <span style={{ fontWeight: 600 }}>Solicitado por: </span>{order.solicitanteNome || "—"}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <span style={{ fontWeight: 600 }}>Aprovado por: </span>{order.aprovadoPor || "—"}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <span style={{ fontWeight: 600 }}>Data de aprovação: </span>{fmtDate(order.aprovadoEm)}
        </div>

        {/* Signatures */}
        <table style={{ width: '100%', marginTop: '40px', fontSize: '8.5pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '42%', textAlign: 'center' }}>
                <span className="sig-line"></span>
                <div style={{ marginTop: '5px' }}>
                  <div style={{ fontWeight: 600 }}>Responsável pela Compra</div>
                  <div style={{ color: '#555' }}>{order.aprovadoPor || "Aprovador"}</div>
                </div>
              </td>
              <td style={{ width: '16%' }}></td>
              <td style={{ width: '42%', textAlign: 'center' }}>
                <span className="sig-line"></span>
                <div style={{ marginTop: '5px' }}>
                  <div style={{ fontWeight: 600 }}>Fornecedor</div>
                  <div style={{ color: '#555' }}>{sup?.nome || order.fornecedorNome || "Fornecedor"}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '30px', borderTop: '0.5px solid #ccc', paddingTop: '6px', fontSize: '7pt', color: '#888', textAlign: 'center' }}>
          Gráfica+ — Ordem de Compra {order.ordemCompraNumero || order.codigo} — Gerada em {fmtDate(new Date().toISOString())}
        </div>
      </div>
    </>
  );
}
