# Documentation KOREV Performance Center

Index de la documentation opérationnelle et utilisateur du projet **KOREV Performance Center** (MMA perf center).

> **Note :** La documentation d'audit, de gouvernance technique et de valorisation se trouve dans [`docs/audit/`](audit/). Les documents ci-dessous complètent cet ensemble sans le dupliquer.

---

## Documentation utilisateur

| Document | Description |
|---|---|
| [Manuel utilisateur](user/MANUEL_UTILISATEUR.md) | Guide pas à pas : inscription, onboarding, tableau de bord, entraînement, nutrition, Coach IA, analyse sparring, gamification Wolf Pack, abonnements, profil, meutes, rôles admin/coach |

---

## Documentation technique

| Document | Description |
|---|---|
| [Architecture](architecture/ARCHITECTURE.md) | Vue d'ensemble système, stack, flux de données, sécurité (RLS, auth), intégrations externes |
| [Base de données](architecture/DATABASE.md) | Schéma relationnel, tables principales, RLS, fonctions SQL, migrations, drift résiduel |
| [Edge Functions](architecture/EDGE_FUNCTIONS.md) | Catalogue des 8 fonctions Deno, authentification, variables d'environnement, contrats |

---

## Documentation développement et déploiement

| Document | Description |
|---|---|
| [Guide de développement](development/DEVELOPMENT.md) | Prérequis, configuration `.env`, installation, serveur local, tests, lint, build, CI |
| [Guide de déploiement](development/DEPLOYMENT.md) | Mise en production : Supabase, Stripe, Sentry, Edge Functions, hébergement frontend |

---

## Documentation d'audit (référence)

| Document | Description |
|---|---|
| [Documentation technique standardisée](audit/PROJECT_DOCUMENTATION_STANDARD.md) | Référence technique complète pour audit et transmission |
| [Schema drift](audit/SCHEMA_DRIFT.md) | Écarts types générés ↔ migrations versionnées |
| [Launch readiness](audit/LAUNCH_READINESS.md) | Checklist de mise en production commerciale |
| [TypeScript strictness roadmap](audit/TYPESCRIPT_STRICTNESS_ROADMAP.md) | Trajectoire d'activation du mode strict |
| [Legacy cleanup](audit/LEGACY_CLEANUP.md) | Inventaire et plan de retrait des modules legacy |
| [Sonar remediation](audit/SONAR_REMEDIATION.md) | Notes de remédiation qualité code |

---

## Parcours recommandé

| Profil | Documents à consulter |
|---|---|
| **Utilisateur final** | Manuel utilisateur |
| **Développeur rejoignant le projet** | Guide de développement → Architecture → Base de données → Edge Functions |
| **Ops / DevOps** | Guide de déploiement → Edge Functions → Launch readiness |
| **Auditeur / due diligence** | Documentation technique standardisée (audit) + Architecture + Schema drift |

---

© KOREV AI — Documentation interne et opérationnelle.
