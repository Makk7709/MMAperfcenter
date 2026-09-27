import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { z } from 'zod';
import { newPasswordSchema } from '@/lib/passwordPolicy';
import { KorevLogo } from '@/components/brand/KorevLogo';
import { Eyebrow } from '@/components/brand/Eyebrow';
import { GoldParticles } from '@/components/brand/GoldParticles';

const emailSchema = z.string().email({ message: "Email invalide" });

// Existing accounts may have shorter passwords: sign-in only checks presence.
const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Mot de passe requis" }),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  fullName: z.string().max(100, { message: "Nom trop long (100 caractères maximum)" }).optional(),
});

const INVALID_CREDENTIALS = 'Email ou mot de passe incorrect';
const EMAIL_NOT_CONFIRMED = 'Confirmez votre adresse e-mail via le lien reçu avant de vous connecter';
const EMAIL_TAKEN = 'Cet email est déjà utilisé';
const RATE_LIMITED = 'Trop de tentatives. Patientez quelques minutes avant de réessayer';
const WEAK_PASSWORD = 'Mot de passe trop faible. Choisissez un mot de passe plus robuste';
const EMAIL_NOT_AUTHORIZED = "Cette adresse e-mail n'est pas autorisée";

const AUTH_ERROR_BY_CODE: Record<string, string> = {
  invalid_credentials: INVALID_CREDENTIALS,
  email_not_confirmed: EMAIL_NOT_CONFIRMED,
  user_already_exists: EMAIL_TAKEN,
  email_exists: EMAIL_TAKEN,
  over_email_send_rate_limit: "Trop d'e-mails envoyés. Patientez quelques minutes avant de réessayer",
  over_request_rate_limit: RATE_LIMITED,
  weak_password: WEAK_PASSWORD,
  email_address_not_authorized: EMAIL_NOT_AUTHORIZED,
};

// Older Auth servers only send the English message, without `code`.
const authErrorMessage = (error: AuthError, fallback: string): string => {
  if (error.code && AUTH_ERROR_BY_CODE[error.code]) return AUTH_ERROR_BY_CODE[error.code];
  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials')) return INVALID_CREDENTIALS;
  if (message.includes('email not confirmed')) return EMAIL_NOT_CONFIRMED;
  if (message.includes('already registered')) return EMAIL_TAKEN;
  if (error.status === 429 || message.includes('rate limit') || message.includes('security purposes')) return RATE_LIMITED;
  if (message.includes('weak password') || message.includes('password should')) return WEAK_PASSWORD;
  if (message.includes('not authorized')) return EMAIL_NOT_AUTHORIZED;
  return fallback;
};

type LocationState = { from?: { pathname?: string; search?: string } } | null;

const redirectTarget = (state: LocationState): string => {
  const from = state?.from;
  if (!from?.pathname?.startsWith('/') || from.pathname.startsWith('//') || from.pathname === '/auth') return '/';
  return from.pathname + (from.search ?? '');
};

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = signInSchema.parse(formData);
      
      const { error } = await signIn(validation.email, validation.password);
      
      if (error) {
        toast.error(authErrorMessage(error, 'Erreur lors de la connexion. Réessayez dans un instant.'));
        return;
      }

      toast.success('Connexion réussie !');
      navigate(redirectTarget(location.state as LocationState), { replace: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("Vous devez accepter les CGU et CGV pour créer un compte");
      return;
    }
    setIsLoading(true);

    try {
      const validation = signUpSchema.parse(formData);
      
      const { error } = await signUp(validation.email, validation.password, validation.fullName);
      
      if (error) {
        toast.error(authErrorMessage(error, 'Erreur lors de l\'inscription. Réessayez dans un instant.'));
        return;
      }

      toast.success('Inscription réussie ! Vérifiez vos emails pour confirmer votre compte.');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailSchema.safeParse(formData.email);
    if (!email.success) {
      toast.error(email.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    const { error } = await requestPasswordReset(email.data);
    setIsLoading(false);
    if (error) {
      console.error('Password reset request failed:', error.message);
      toast.error(authErrorMessage(error, 'Impossible d\'envoyer le lien de réinitialisation. Réessayez dans un instant.'));
      return;
    }
    // Same message whether or not the account exists (no e-mail enumeration).
    toast.success('Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\'être envoyé.');
    setResetMode(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="korev-grid absolute inset-0" />
      <GoldParticles />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-10">
        <section className="animate-korev-rise">
          <KorevLogo className="h-10 sm:h-14" />
          <Eyebrow parts={["KOREV", "Performance Center"]} className="mt-6 sm:mt-10" />
          <h1 className="korev-display mt-4 text-4xl sm:mt-5 sm:text-6xl lg:text-7xl">
            Entraînez-vous.
            <span className="korev-rule my-3 sm:my-4" aria-hidden />
            Mesurez.
            <br />
            <span className="text-korev-gold">Progressez.</span>
          </h1>
          <p className="mt-6 hidden max-w-md text-lg text-muted-foreground sm:block">
            Votre centre de performance pour les sports de combat : entraînement, nutrition et analyse vidéo de sparring par IA.
          </p>
          <ul className="mt-8 hidden space-y-2.5 sm:block">
            {[
              ["PRISM", "Analyse vidéo IA"],
              ["Coach", "IA personnel"],
              ["Team", "Progression collective"],
            ].map(([name, role]) => (
              <li key={name} className="korev-eyebrow flex items-center gap-3 text-foreground/85">
                <span className="korev-bullet" aria-hidden />
                {name}
                <span className="text-korev-gold/60" aria-hidden>/</span>
                <span className="text-korev-gold/80">{role}</span>
              </li>
            ))}
          </ul>
        </section>

        <Card className="korev-frame korev-chamfer w-full max-w-md justify-self-center animate-korev-rise [--chamfer:18px] [animation-delay:120ms] lg:justify-self-end">
          <CardHeader className="space-y-3">
            <Eyebrow parts={["Accès", "Membre"]} bullet />
            <CardTitle className="korev-display text-3xl">Authentification</CardTitle>
            <CardDescription>
              Connectez-vous ou créez un compte pour accéder à votre espace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {resetMode ? (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Envoi...' : 'Recevoir un lien de réinitialisation'}
                  </Button>
                  <Button type="button" variant="link" className="w-full" onClick={() => setResetMode(false)}>
                    Retour à la connexion
                  </Button>
                </form>
                ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                  <Button type="button" variant="link" className="w-full" onClick={() => setResetMode(true)}>
                    Mot de passe oublié ?
                  </Button>
                </form>
                )}
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Nom complet</Label>
                    <Input
                      id="signup-fullname"
                      name="fullName"
                      type="text"
                      placeholder="Votre nom complet"
                      maxLength={100}
                      value={formData.fullName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="signup-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="signup-terms" className="text-xs leading-snug text-muted-foreground font-normal cursor-pointer">
                      J'ai lu et j'accepte les{' '}
                      <Link to="/legal" target="_blank" className="text-primary underline">
                        Conditions Générales d'Utilisation et de Vente
                      </Link>{' '}
                      ainsi que la politique de confidentialité.
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !acceptedTerms}>
                    {isLoading ? 'Inscription...' : 'Créer un compte'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}