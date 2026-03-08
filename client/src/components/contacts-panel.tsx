import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, User, Phone, Mail, Star, StarOff, Pencil, Trash2,
  Calendar, Instagram, Linkedin, ChevronDown, ChevronUp,
  ShieldCheck, DollarSign, Package, CheckCircle2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@shared/schema";
import { format } from "date-fns";

interface ContactFormData {
  nomeCompleto: string;
  cargo: string;
  setor: string;
  telefone: string;
  whatsapp: string;
  email: string;
  dataNascimento: string;
  instagram: string;
  linkedin: string;
  observacoes: string;
  contatoPrincipal: boolean;
  podeAprovarCompras: boolean;
  podeAprovarOrcamento: boolean;
  recebeFinanceiro: boolean;
  recebeProducao: boolean;
  status: boolean;
}

const emptyForm: ContactFormData = {
  nomeCompleto: "",
  cargo: "",
  setor: "",
  telefone: "",
  whatsapp: "",
  email: "",
  dataNascimento: "",
  instagram: "",
  linkedin: "",
  observacoes: "",
  contatoPrincipal: false,
  podeAprovarCompras: false,
  podeAprovarOrcamento: false,
  recebeFinanceiro: false,
  recebeProducao: false,
  status: true,
};

function contactToForm(c: Contact): ContactFormData {
  return {
    nomeCompleto: c.nomeCompleto || "",
    cargo: c.cargo || "",
    setor: c.setor || "",
    telefone: c.telefone || "",
    whatsapp: c.whatsapp || "",
    email: c.email || "",
    dataNascimento: c.dataNascimento || "",
    instagram: c.instagram || "",
    linkedin: c.linkedin || "",
    observacoes: c.observacoes || "",
    contatoPrincipal: c.contatoPrincipal || false,
    podeAprovarCompras: c.podeAprovarCompras || false,
    podeAprovarOrcamento: c.podeAprovarOrcamento || false,
    recebeFinanceiro: c.recebeFinanceiro || false,
    recebeProducao: c.recebeProducao || false,
    status: c.status !== false,
  };
}

interface ContactCardProps {
  contact: Contact;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}

function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border rounded-lg bg-card overflow-visible"
      data-testid={`card-contact-${contact.id}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-foreground text-sm">{contact.nomeCompleto}</p>
                {contact.contatoPrincipal && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 no-default-active-elevate">
                    <Star className="w-2.5 h-2.5 mr-0.5" /> Principal
                  </Badge>
                )}
                {!contact.status && (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500 no-default-active-elevate">
                    Inativo
                  </Badge>
                )}
              </div>
              {contact.cargo && (
                <p className="text-xs text-muted-foreground">{contact.cargo}{contact.setor ? ` · ${contact.setor}` : ""}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-contact-${contact.id}`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onEdit(contact)}
              data-testid={`button-edit-contact-${contact.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(contact.id)}
              data-testid={`button-delete-contact-${contact.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick info row */}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {contact.telefone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />{contact.telefone}
            </span>
          )}
          {contact.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />{contact.email}
            </span>
          )}
          {contact.dataNascimento && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(contact.dataNascimento + "T00:00:00"), "dd/MM")}
            </span>
          )}
        </div>

        {/* Permissions chips */}
        <div className="mt-2 flex flex-wrap gap-1">
          {contact.podeAprovarCompras && (
            <Badge variant="outline" className="text-xs border-green-200 text-green-700 dark:border-green-800 dark:text-green-400 no-default-active-elevate">
              <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Aprova compras
            </Badge>
          )}
          {contact.podeAprovarOrcamento && (
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400 no-default-active-elevate">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Aprova orçamento
            </Badge>
          )}
          {contact.recebeFinanceiro && (
            <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400 no-default-active-elevate">
              <DollarSign className="w-2.5 h-2.5 mr-0.5" /> Financeiro
            </Badge>
          )}
          {contact.recebeProducao && (
            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400 no-default-active-elevate">
              <Package className="w-2.5 h-2.5 mr-0.5" /> Produção
            </Badge>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
          {contact.instagram && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Instagram className="w-3.5 h-3.5" />
              <span>{contact.instagram}</span>
            </div>
          )}
          {contact.linkedin && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Linkedin className="w-3.5 h-3.5" />
              <span>{contact.linkedin}</span>
            </div>
          )}
          {contact.observacoes && (
            <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
              {contact.observacoes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ContactFormDialogProps {
  open: boolean;
  contact?: Contact;
  clientId: string;
  onClose: () => void;
}

function ContactFormDialog({ open, contact, clientId, onClose }: ContactFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<ContactFormData>(contact ? contactToForm(contact) : emptyForm);

  const set = (field: keyof ContactFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const mutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (contact) {
        await apiRequest("PATCH", `/api/contacts/${contact.id}`, data);
      } else {
        await apiRequest("POST", `/api/clients/${clientId}/contacts`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: contact ? "Contato atualizado." : "Contato adicionado com sucesso.",
      });
      onClose();
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      toast({ title: `Erro: ${err.message}`, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomeCompleto.trim()) {
      toast({ title: "Nome completo é obrigatório.", variant: "destructive" });
      return;
    }
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? "Editar Contato" : "Adicionar Contato"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="contact-nome">Nome completo *</Label>
              <Input
                id="contact-nome"
                value={form.nomeCompleto}
                onChange={(e) => set("nomeCompleto", e.target.value)}
                placeholder="João da Silva"
                data-testid="input-contact-nome"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-cargo">Cargo / Função</Label>
              <Input
                id="contact-cargo"
                value={form.cargo}
                onChange={(e) => set("cargo", e.target.value)}
                placeholder="Gerente de Marketing"
                data-testid="input-contact-cargo"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-setor">Setor</Label>
              <Input
                id="contact-setor"
                value={form.setor}
                onChange={(e) => set("setor", e.target.value)}
                placeholder="Marketing"
                data-testid="input-contact-setor"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-telefone">Telefone</Label>
              <Input
                id="contact-telefone"
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="(11) 99999-9999"
                data-testid="input-contact-telefone"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-whatsapp">WhatsApp</Label>
              <Input
                id="contact-whatsapp"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="(11) 99999-9999"
                data-testid="input-contact-whatsapp"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-email">E-mail</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="joao@empresa.com"
                data-testid="input-contact-email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-aniversario">Data de Aniversário</Label>
              <Input
                id="contact-aniversario"
                type="date"
                value={form.dataNascimento}
                onChange={(e) => set("dataNascimento", e.target.value)}
                data-testid="input-contact-aniversario"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-instagram">Instagram</Label>
              <Input
                id="contact-instagram"
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="@usuario"
                data-testid="input-contact-instagram"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-linkedin">LinkedIn</Label>
              <Input
                id="contact-linkedin"
                value={form.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
                placeholder="linkedin.com/in/usuario"
                data-testid="input-contact-linkedin"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="contact-obs">Observações</Label>
              <Textarea
                id="contact-obs"
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={2}
                placeholder="Observações sobre o contato..."
                data-testid="input-contact-observacoes"
                className="mt-1"
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Permissões e notificações</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { field: "contatoPrincipal", label: "Contato principal", icon: Star },
                { field: "podeAprovarCompras", label: "Pode aprovar compras", icon: ShieldCheck },
                { field: "podeAprovarOrcamento", label: "Pode aprovar orçamento", icon: CheckCircle2 },
                { field: "recebeFinanceiro", label: "Recebe financeiro", icon: DollarSign },
                { field: "recebeProducao", label: "Recebe produção/status", icon: Package },
                { field: "status", label: "Contato ativo", icon: User },
              ].map(({ field, label, icon: Icon }) => (
                <div key={field} className="flex items-center justify-between gap-2 py-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <Label className="text-sm font-normal cursor-pointer">{label}</Label>
                  </div>
                  <Switch
                    checked={form[field as keyof ContactFormData] as boolean}
                    onCheckedChange={(v) => set(field as keyof ContactFormData, v)}
                    data-testid={`switch-contact-${field}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-contact">
              {mutation.isPending ? "Salvando..." : contact ? "Salvar alterações" : "Adicionar contato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ContactsPanelProps {
  clientId: string;
}

export function ContactsPanel({ clientId }: ContactsPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/clients", clientId, "contacts"],
    queryFn: () => fetch(`/api/clients/${clientId}/contacts`).then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Contato removido." });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Erro ao remover contato.", variant: "destructive" }),
  });

  function openEdit(c: Contact) {
    setEditContact(c);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditContact(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Contatos</h3>
          <p className="text-xs text-muted-foreground">
            {contacts ? `${contacts.length} contato${contacts.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditContact(undefined); setDialogOpen(true); }}
          data-testid="button-add-contact"
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : contacts?.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <User className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setDialogOpen(true)}
            data-testid="button-add-first-contact"
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar contato
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts?.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              onEdit={openEdit}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <ContactFormDialog
        open={dialogOpen}
        contact={editContact}
        clientId={clientId}
        onClose={closeDialog}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
