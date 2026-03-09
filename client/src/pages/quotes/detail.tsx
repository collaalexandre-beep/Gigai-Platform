import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Calendar, User, FileText, Clock, DollarSign,
  Layers, Building2, Phone, Mail, MapPin, Printer, ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import type { Quote, QuoteItem, Client, Contact, Seller, PaymentTerm } from "@shared/schema";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: quote, isLoading } = useQuery<Quote & { 
    client?: Client, 
    contact?: Contact, 
    seller?: Seller, 
    paymentTerm?: PaymentTerm,
    items: QuoteItem[] 
  }>({
    queryKey: ["/api/quotes", id],
    queryFn: async () => {
      const q = await fetch(`/api/quotes/${id}`).then(r => r.json());
      const items = await fetch(`/api/quotes/${id}/items`).then(r => r.json());
      
      // Fetch related data if IDs exist
      let client, contact, seller, paymentTerm;
      if (q.clientId) client = await fetch(`/api/clients/${q.clientId}`).then(r => r.json());
      if (q.contactId) contact = await fetch(`/api/contacts/${q.contactId}`).then(r => r.json());
      if (q.sellerId) seller = await fetch(`/api/sellers/${q.sellerId}`).then(r => r.json());
      if (q.prazosPagamentoId) paymentTerm = await fetch(`/api/payment-terms`).then(r => r.json()).then((pts: PaymentTerm[]) => pts.find(pt => pt.id === q.prazosPagamentoId));

      return { ...q, items, client, contact, seller, paymentTerm };
    },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  if (!quote) return <div className="p-6 text-center">Orçamento não encontrado.</div>;

  const formatCurrency = (val: string | number | null) => {
    if (!val) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
  };

  const subtotal = quote.items.reduce((acc, item) => acc + Number(item.precoTotal || 0), 0);
  const descontoVal = subtotal * (Number(quote.desconto || 0) / 100);
  const impostosVal = subtotal * (Number(quote.impostos || 0) / 100);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/quotes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.numero}</h1>
              <StatusBadge value={quote.status} type="quote" />
            </div>
            <p className="text-sm text-muted-foreground">
              Criado em {quote.data ? format(new Date(quote.data), "dd/MM/yyyy") : "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/quotes/${id}/print`} target="_blank">
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/quotes/${id}/edit`}>Editar Orçamento</Link>
          </Button>
          {quote.status === "aprovado" && (
            <Button className="bg-primary">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Converter em Pedido
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client & Seller Info */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm font-semibold">Detalhes do Cliente</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{quote.client?.nomeFantasia || quote.client?.razaoSocial}</p>
                  <p className="text-xs text-muted-foreground">{quote.client?.razaoSocial}</p>
                  <p className="text-xs text-muted-foreground">CNPJ: {quote.client?.cnpj}</p>
                </div>
              </div>
              {quote.contact && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm">{quote.contact.nomeCompleto}</p>
                    <p className="text-xs text-muted-foreground">{quote.contact.cargo}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {quote.client?.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {quote.client?.telefone || "—"}
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>{quote.client?.logradouro}, {quote.client?.numero}<br/>{quote.client?.cidade}/{quote.client?.estado}</span>
              </div>
            </div>
          </CardContent>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Responsável Comercial:</span>
              <span>{quote.seller?.nomeCompleto || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Commercial Conditions */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Condições Comerciais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Validade:</span>
              <span className="font-medium">{quote.validade ? format(new Date(quote.validade), "dd/MM/yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Prazo Prod:</span>
              <span className="font-medium">{quote.prazoProd || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Pagamento:</span>
              <span className="font-medium">{quote.paymentTerm?.nome || "—"}</span>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Forma:</p>
              <p className="font-medium">{quote.formaPagamento || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="md:col-span-3">
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-muted-foreground" /> Itens</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Descrição</th>
                  <th className="text-center px-4 py-2 font-medium">Medidas (m)</th>
                  <th className="text-center px-4 py-2 font-medium">Qtd</th>
                  <th className="text-right px-4 py-2 font-medium">Unitário</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quote.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.descricao}</p>
                      {item.observacoes && <p className="text-xs text-muted-foreground mt-0.5">{item.observacoes}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {item.largura && item.altura ? `${item.largura} × ${item.altura}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.quantidade} {item.unidade}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(item.precoUnitario)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(item.precoTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-6 flex flex-col items-end space-y-2 border-t pt-4">
              <div className="flex justify-between w-64 text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {Number(quote.desconto) > 0 && (
                <div className="flex justify-between w-64 text-sm text-green-600">
                  <span>Desconto ({quote.desconto}%):</span>
                  <span>- {formatCurrency(descontoVal)}</span>
                </div>
              )}
              {Number(quote.impostos) > 0 && (
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-muted-foreground">Impostos ({quote.impostos}%):</span>
                  <span>+ {formatCurrency(impostosVal)}</span>
                </div>
              )}
              <div className="flex justify-between w-64 text-lg font-bold border-t pt-2 mt-2">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(quote.valorTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observations */}
        {quote.observacoes && (
          <Card className="md:col-span-3">
            <CardHeader><CardTitle className="text-sm font-semibold">Observações</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
