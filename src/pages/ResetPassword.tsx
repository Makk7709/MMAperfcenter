import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { newPasswordSchema } from '@/lib/passwordPolicy';

// Landing page of the password recovery e-mail. Supabase turns the link into
// a session before this page renders; without it the link is invalid or expired.
export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = newPasswordSchema.safeParse(password);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    if (password !== confirmation) {
      toast.error('Les deux mots de passe ne correspondent pas');
      return;
    }

    setIsSaving(true);
    const { error } = await updatePassword(validation.data);
    setIsSaving(false);
    if (error) {
      toast.error('Impossible de modifier le mot de passe : ' + error.message);
      return;
    }
    toast.success('Mot de passe modifié');
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-accent/20 bg-card/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Nouveau mot de passe</CardTitle>
          <CardDescription className="text-center">
            {session
              ? 'Choisissez votre nouveau mot de passe.'
              : 'Ce lien est invalide ou a expiré. Demandez-en un nouveau depuis la page de connexion.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmation</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          ) : (
            <Button asChild className="w-full">
              <Link to="/auth">Retour à la connexion</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
