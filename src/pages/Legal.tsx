import { ArrowLeft, AlertTriangle, Shield, CreditCard, Scale, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

const Legal = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Mentions légales</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            Mentions légales – Conditions d'utilisation & Conditions générales de vente
          </h1>
          <p className="text-muted-foreground">
            KOREV Performance Center — Application de coaching MMA
          </p>
        </div>

        {/* Warning Card */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Avertissement :</strong> Ce document est fourni à titre informatif. 
              Il doit être revu et validé par le service juridique de KOREV AI avant toute contractualisation effective.
            </p>
          </CardContent>
        </Card>

        {/* Section 1: Mentions légales */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">1. Mentions légales — Éditeur de l'application</h2>
          </div>
          <div className="space-y-3 text-muted-foreground pl-7">
            <p><strong className="text-foreground">Raison sociale :</strong> KOREV AI — SASU</p>
            <p><strong className="text-foreground">Siège social :</strong> 20 Route d'Uriage, 38320 Herbeys, France</p>
            {/* TODO juridique : remplacer par le SIRET définitif une fois l'immatriculation finalisée. */}
            <p><strong className="text-foreground">SIRET :</strong> en cours d'immatriculation — informations communiquées sur demande à contact@korev-ai.com</p>
            <p><strong className="text-foreground">Email :</strong> contact@korev-ai.com</p>
            {/* TODO juridique : nommer le représentant légal effectif lors de la mise à jour des CGU. */}
            <p><strong className="text-foreground">Directeur de la publication :</strong> Représentant légal de KOREV AI — SASU</p>
            {/* TODO juridique : préciser l'hébergeur exact + RCS + adresse postale dans la politique de confidentialité définitive. */}
            <p><strong className="text-foreground">Hébergement :</strong> Supabase Inc. (infrastructure cloud associée). Coordonnées détaillées disponibles dans la politique de confidentialité.</p>
          </div>
        </section>

        <Separator />

        {/* Section 2: Objet */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">2. Objet de l'application</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              KOREV Performance Center est une application SaaS (Software as a Service) d'optimisation sportive 
              dédiée aux arts martiaux mixtes (MMA) et sports de combat.
            </p>
            <p>
              L'application propose des outils d'analyse de performance, de préparation tactique et de coaching 
              assisté par intelligence artificielle.
            </p>
            <p>
              <strong className="text-foreground">Public cible :</strong> L'usage de l'application est réservé aux athlètes licenciés 
              auprès d'une fédération sportive reconnue et aux coachs autorisés exerçant dans un cadre professionnel.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 3: Avertissement médical */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-2xl font-bold">3. Avertissement médical</h2>
          </div>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">KOREV Performance Center n'est pas un dispositif médical</strong> au sens 
                de la réglementation européenne (Règlement UE 2017/745).
              </p>
              <p>
                L'application ne se substitue en aucun cas à l'avis d'un médecin, kinésithérapeute, nutritionniste 
                ou tout autre professionnel de santé habilité.
              </p>
              <p>
                <strong className="text-foreground">L'utilisateur reste seul responsable de son intégrité physique.</strong> Il 
                lui appartient de consulter un professionnel de santé avant de débuter tout programme sportif et 
                de s'assurer de son aptitude à la pratique des sports de combat.
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Section 4: Accès au service */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">4. Accès au service</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              L'accès à KOREV Performance Center nécessite la création d'un compte utilisateur nominatif. 
              Les identifiants de connexion sont strictement personnels et confidentiels.
            </p>
            <p>
              L'utilisateur s'engage à ne pas partager ses identifiants avec des tiers et à notifier 
              immédiatement KOREV AI de toute utilisation non autorisée de son compte.
            </p>
            <p>
              KOREV AI se réserve le droit de suspendre ou de résilier tout compte en cas d'utilisation 
              abusive, frauduleuse ou contraire aux présentes conditions.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 5: Licence d'utilisation */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">5. Licence d'utilisation</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              KOREV AI accorde à l'utilisateur un droit d'usage personnel, non exclusif, non transférable 
              et révocable sur l'application KOREV Performance Center, pour la durée de son abonnement.
            </p>
            <p><strong className="text-foreground">Il est strictement interdit de :</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Partager l'accès à l'application avec des tiers, notamment des concurrents directs ou indirects</li>
              <li>Copier, modifier, désassembler, décompiler ou procéder à de l'ingénierie inverse (reverse engineering) sur l'application</li>
              <li>Utiliser l'application à des fins illicites ou contraires aux bonnes mœurs</li>
              <li>Extraire ou tenter d'extraire les données ou algorithmes de l'application</li>
            </ul>
          </div>
        </section>

        <Separator />

        {/* Section 6: Propriété intellectuelle */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">6. Propriété intellectuelle</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              L'application KOREV Performance Center, la marque KOREV, le logo, l'ensemble des contenus 
              (textes, images, vidéos, algorithmes, modèles d'IA) et le code source sont la propriété 
              exclusive de KOREV AI ou de ses partenaires licenciés.
            </p>
            <p>
              Toute reproduction, représentation, modification ou exploitation non autorisée constitue 
              une contrefaçon sanctionnée par le Code de la propriété intellectuelle.
            </p>
            <p>
              <strong className="text-foreground">Données utilisateur :</strong> Les données sportives personnelles 
              (performances, statistiques, analyses) restent la propriété de l'utilisateur. KOREV AI 
              dispose d'une licence d'utilisation à des fins d'amélioration du service.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 7: Paiements - CGV */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">7. Paiements — Conditions Générales de Vente</h2>
          </div>
          <div className="space-y-4 text-muted-foreground">
            <h3 className="text-lg font-semibold text-foreground">7.1 Offres et tarification</h3>
            <p>
              KOREV Performance Center propose plusieurs formules d'abonnement dont les caractéristiques 
              et tarifs sont détaillés sur la page de tarification de l'application. Les prix sont 
              affichés en euros (EUR), toutes taxes comprises (TTC) pour les particuliers, 
              ou hors taxes (HT) pour les professionnels.
            </p>

            <h3 className="text-lg font-semibold text-foreground">7.2 Nature de la prestation</h3>
            <p>
              L'abonnement correspond à une prestation de service SaaS (logiciel en tant que service) 
              dématérialisée. L'accès au service est fourni immédiatement après validation du paiement.
            </p>

            <h3 className="text-lg font-semibold text-foreground">7.3 Paiement sécurisé</h3>
            <p>
              Les paiements sont traités de manière sécurisée par notre partenaire <strong className="text-foreground">Stripe</strong>. 
              KOREV AI ne stocke aucune donnée bancaire. Stripe est certifié PCI-DSS niveau 1, 
              le plus haut niveau de certification de l'industrie des paiements.
            </p>

            <h3 className="text-lg font-semibold text-foreground">7.4 Renouvellement automatique</h3>
            <p>
              Sauf résiliation par l'utilisateur avant la date d'échéance, l'abonnement est 
              automatiquement renouvelé pour une période identique. L'utilisateur peut gérer 
              son abonnement depuis son espace personnel ou le portail client Stripe.
            </p>

            <h3 className="text-lg font-semibold text-foreground">7.5 Droit de rétractation et remboursement</h3>
            <p>
              Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation 
              ne peut être exercé pour les contrats de fourniture de contenu numérique non fourni 
              sur support matériel dont l'exécution a commencé après accord préalable exprès du 
              consommateur et renoncement exprès à son droit de rétractation.
            </p>
            <p>
              [CONDITIONS DE REMBOURSEMENT EXCEPTIONNELLES — À définir par KOREV AI]
            </p>

            <h3 className="text-lg font-semibold text-foreground">7.6 Facturation</h3>
            <p>
              Les factures sont envoyées par email à l'adresse associée au compte utilisateur 
              et sont également accessibles depuis l'espace personnel de l'utilisateur.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 8: RGPD */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">8. Données personnelles — RGPD</h2>
          </div>
          <div className="space-y-3 text-muted-foreground">
            <p>
              KOREV AI, en qualité de responsable de traitement, s'engage à traiter les données 
              personnelles des utilisateurs conformément au Règlement Général sur la Protection 
              des Données (RGPD - Règlement UE 2016/679) et à la loi Informatique et Libertés.
            </p>
            <p>
              <strong className="text-foreground">Catégories de données traitées :</strong> données 
              d'identification (email, nom), données sportives et physiques (poids, taille, âge, 
              discipline, niveau, objectifs, blessures, historique d'entraînement), données 
              nutritionnelles (apports déclarés, scans de produits), médias (vidéos de sparring 
              uploadées). Aucun diagnostic médical n'est produit par l'application.
            </p>
            <p>
              <strong className="text-foreground">Finalités :</strong> fourniture du service, 
              personnalisation des recommandations sportives et nutritionnelles, suivi de 
              progression, facturation des abonnements.
            </p>
            <p>
              Les données ne sont pas transmises à des tiers sans le consentement de l'utilisateur, 
              sauf obligation légale ou sous-traitants techniques nécessaires (hébergement, paiement, 
              passerelle d'analyse IA).
            </p>
            {/* TODO juridique : publier la politique de confidentialité définitive et insérer son URL ci-dessous. */}
            <p>
              Pour plus d'informations sur le traitement des données personnelles, veuillez consulter 
              notre <strong className="text-foreground">Politique de confidentialité</strong> 
              (en cours de finalisation — disponible sur demande à contact@korev-ai.com).
            </p>
            <p>
              <strong className="text-foreground">Droits de l'utilisateur :</strong> accès, 
              rectification, effacement, portabilité, opposition, limitation du traitement. 
              Ces droits peuvent être exercés en contactant : contact@korev-ai.com.
            </p>
            <p>
              <strong className="text-foreground">Rappel — application non médicale :</strong> les 
              analyses produites par KOREV Performance Center (statistiques d'entraînement, retours 
              IA, analyse vidéo de sparring) ont une valeur strictement indicative. En cas de 
              blessure, pathologie ou doute sur l'aptitude à la pratique, l'avis d'un professionnel 
              de santé reste impératif.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 9: Disponibilité */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">9. Disponibilité, maintenance et évolutions</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              KOREV AI s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la 
              disponibilité de l'application. Toutefois, aucune garantie absolue de disponibilité 
              ou d'absence d'interruption ne peut être fournie.
            </p>
            <p>
              Des opérations de maintenance, mises à jour ou évolutions peuvent être effectuées 
              sans préavis. KOREV AI s'efforcera de minimiser l'impact sur les utilisateurs et 
              d'informer en cas d'interruption prolongée.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 10: Responsabilité */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">10. Responsabilité</h2>
          </div>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Les recommandations fournies par l'intelligence artificielle de KOREV Performance Center 
              constituent une <strong className="text-foreground">aide à la décision</strong> et ne sauraient engager 
              la responsabilité de KOREV AI quant aux résultats sportifs obtenus.
            </p>
            <p>
              <strong className="text-foreground">Les sports de combat comportent des risques inhérents</strong> (blessures, 
              traumatismes). L'utilisateur reconnaît être informé de ces risques et pratiquer sous 
              sa propre responsabilité.
            </p>
            <p>
              La responsabilité de KOREV AI ne pourra être engagée qu'en cas de faute prouvée et 
              sera limitée au montant des sommes effectivement versées par l'utilisateur au cours 
              des 12 derniers mois, dans les limites autorisées par la loi applicable.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 11: Durée et résiliation */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">11. Durée et résiliation</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Le contrat d'utilisation de KOREV Performance Center est conclu pour une durée 
              indéterminée, avec des périodes d'abonnement renouvelables (mensuel ou annuel).
            </p>
            <p>
              L'utilisateur peut résilier son abonnement à tout moment depuis son espace personnel 
              ou le portail client Stripe. La résiliation prend effet à la fin de la période 
              d'abonnement en cours, sans remboursement au prorata.
            </p>
            <p>
              KOREV AI se réserve le droit de résilier le contrat en cas de violation des présentes 
              conditions, sans préjudice des dommages et intérêts éventuellement dus.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 12: Loi applicable */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">12. Loi applicable et juridiction</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Les présentes conditions sont régies par le <strong className="text-foreground">droit français</strong>.
            </p>
            <p>
              En cas de litige, les parties s'efforceront de trouver une solution amiable. 
              À défaut d'accord, le litige sera soumis aux tribunaux compétents du ressort 
              du <strong className="text-foreground">Tribunal de Grenoble</strong> [ou autre juridiction — à préciser].
            </p>
          </div>
        </section>

        <Separator />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4 pb-8">
          <p>Dernière mise à jour : Décembre 2024</p>
          <p className="mt-2">© 2024 KOREV AI — SASU. Tous droits réservés.</p>
        </div>
      </main>
    </div>
  );
};

export default Legal;
