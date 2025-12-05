import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Palette, 
  Mail, 
  Bell, 
  Shield,
  Save,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const handleSave = () => {
    toast.success("Paramètres sauvegardés");
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground mt-1">
            Configurez les paramètres de votre plateforme
          </p>
        </div>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>
              Personnalisez l'apparence de votre plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">Nom de l'application</Label>
              <Input id="app-name" defaultValue="KOREV AI" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" defaultValue="Performance Center" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Couleur principale</Label>
                <div className="flex gap-2">
                  <Input id="primary-color" type="color" defaultValue="#FACC15" className="w-16 h-10 p-1" />
                  <Input defaultValue="#FACC15" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bg-color">Couleur de fond</Label>
                <div className="flex gap-2">
                  <Input id="bg-color" type="color" defaultValue="#0A0A0A" className="w-16 h-10 p-1" />
                  <Input defaultValue="#0A0A0A" className="flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact & Support
            </CardTitle>
            <CardDescription>
              Informations de contact pour le support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support-email">Email de support</Label>
              <Input id="support-email" type="email" placeholder="support@korevai.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord">Lien Discord</Label>
              <Input id="discord" placeholder="https://discord.gg/..." />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Gérez les notifications de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications email</p>
                <p className="text-sm text-muted-foreground">Envoyer des emails de bienvenue aux nouveaux utilisateurs</p>
              </div>
              <Button variant="outline" size="sm">Configurer</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alertes admin</p>
                <p className="text-sm text-muted-foreground">Recevoir des alertes pour les nouveaux abonnements</p>
              </div>
              <Button variant="outline" size="sm">Configurer</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Paramètres de sécurité et d'authentification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dashboard Supabase</p>
                <p className="text-sm text-muted-foreground">Accéder à la console Supabase pour gérer l'authentification</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://supabase.com/dashboard/project/vpvfkazmfvxbpffymodg" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir
                </a>
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dashboard Stripe</p>
                <p className="text-sm text-muted-foreground">Gérer les paiements et abonnements</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder les paramètres
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
