import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Share2, 
  Mail, 
  Copy, 
  Check, 
  Link2,
  Send,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface SparringShareDialogProps {
  analysisId: string;
  videoName: string;
}

export const SparringShareDialog = ({ analysisId, videoName }: SparringShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState<"link" | "email">("link");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`Voici mon analyse de sparring "${videoName}". J'aimerais avoir ton avis sur mes points à améliorer.`);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // Generate shareable link (in a real app, this would create a share token)
  const shareLink = `${window.location.origin}/shared/sparring/${analysisId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Lien copié dans le presse-papiers !");
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setSending(true);

    try {
      // In a real app, this would send an email via an edge function
      // For now, we'll just show a success message and open the email client
      
      const mailtoLink = `mailto:${email}?subject=Analyse de Sparring KOREV AI - ${videoName}&body=${encodeURIComponent(
        `${message}\n\nVoir l'analyse complète: ${shareLink}\n\n---\nGénéré par KOREV AI - MMA Performance Center`
      )}`;

      window.location.href = mailtoLink;
      
      toast.success("Redirection vers votre client email...");
      setOpen(false);
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Partager avec mon coach
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Partager l'analyse
          </DialogTitle>
          <DialogDescription>
            Envoyez cette analyse à votre coach ou partenaire d'entraînement pour obtenir des conseils personnalisés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Share method selection */}
          <div className="space-y-2">
            <Label>Méthode de partage</Label>
            <Select value={shareMethod} onValueChange={(v) => setShareMethod(v as "link" | "email")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Copier le lien
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Envoyer par email
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shareMethod === "link" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Toute personne ayant ce lien pourra voir l'analyse (sans pouvoir la modifier).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="coach@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message (optionnel)</Label>
                <Textarea
                  id="message"
                  placeholder="Ajouter un message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full gap-2" 
                onClick={handleSendEmail}
                disabled={sending || !email}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer l'analyse
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Quick access buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <p className="w-full text-xs text-muted-foreground mb-2">Partage rapide:</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Regarde mon analyse de sparring KOREV AI: ${shareLink}`)}`;
              window.open(whatsappUrl, '_blank');
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent('Mon analyse de sparring KOREV AI')}`;
              window.open(telegramUrl, '_blank');
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Telegram
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SparringShareDialog;

