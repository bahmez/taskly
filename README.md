# 🚀 Taskly — Application Collaborative de Gestion de Projets

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Firestore](https://img.shields.io/badge/Firestore-NoSQL-orange)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Une application web collaborative pour gérer vos projets et tâches, inspirée de Trello**

[📖 Documentation](#-documentation) • [🏗️ Architecture](#-architecture) • [🚀 Démarrage](#-démarrage-rapide) • [👥 Équipe](#-équipe)

</div>

---

## 📋 À Propos

**Taskly** est une application web moderne et collaborative pour la gestion de projets et de tâches en équipe. Le projet reproduit les fonctionnalités principales de **Trello** dans une architecture moderne avec un focus sur :

- ✅ **Type-safety end-to-end** (TypeScript strict + tRPC)
- ✅ **Collaboration temps réel** (Firestore listeners)
- ✅ **Sécurité robuste** (Firebase Auth + permissions granulaires)
- ✅ **Performance** (denormalization, pagination, caching)
- ✅ **UX moderne** (Responsive, Dark mode, Drag & drop)

### 🎯 Concept

Taskly permet aux équipes d'organiser leur travail via :
- **Workspaces** : Espaces de travail collaboratifs
- **Boards** : Tableaux kanban
- **Colonnes** : Listes de tâches
- **Tickets** : Cartes avec commentaires, assignations, attachments

---

## 👥 Équipe

| Nom | Rôle | Responsabilités |
|-----|------|-----------------|
| **Younes Bahri** | Lead Developer | Architecture, Backend, DevOps, Coordination |
| **Schekina Ahounou** | Developer | Frontend, Backend, Firebase, QA |

**Établissement** : Epitech 
**Période** : Novembre 2025 - Janvier 2026  
**Contexte** : Projet pédagogique de fin d'études

---

## 🏗️ Architecture

### Structure du Monorepo

```
taskly/
├── apps/
│   ├── api/              # Backend NestJS
│   │   ├── src/
│   │   │   ├── board/    # Gestion des tableaux
│   │   │   ├── ticket/   # Gestion des cartes
│   │   │   ├── user/     # Gestion des utilisateurs
│   │   │   ├── workspace/# Gestion des équipes
│   │   │   └── main.ts   # Point d'entrée
│   │   └── package.json
│   │
│   └── web/              # Frontend Next.js
│       ├── src/
│       │   ├── app/      # Routes et pages
│       │   ├── auth/     # Authentification
│       │   ├── components/
│       │   └── lib/
│       └── package.json
│
├── packages/             # Packages partagés
│   ├── auth/            # Firebase Auth Guard
│   ├── database/        # Modèles Firestore
│   ├── firebase/        # Firebase config
│   ├── shared/          # Types et permissions
│   ├── trpc/            # Router tRPC
│   └── ui/              # Composants réutilisables
│
└── doc/                 # Documentation
```

### Stack Technologique

**Frontend** : Next.js 14, React 18, TypeScript, Tailwind CSS, tRPC Client

**Backend** : NestJS, Express, TypeScript, tRPC Server

**Database** : Firestore (NoSQL), Firebase Realtime, Security Rules

**Auth** : Firebase Authentication (JWT), Guards NestJS

**Storage** : Google Cloud Storage (GCS), Signed URLs

**Testing** : Vitest, Testing Library

**Monorepo** : Turborepo, pnpm workspaces

**DevOps** : Docker, Cloud Build, Cloud Run, GitHub

---

## ✨ Fonctionnalités Implémentées

### ✅ MVP Complet (Livré)

- **Authentification & Autorisation**
  - Firebase Auth (email/password)
  - JWT verification côté backend
  - Guards NestJS pour protection des routes
  - Rôles & permissions granulaires (Owner, Admin, Member)

- **Gestion des Workspaces**
  - Créer/éditer/archiver des workspaces
  - Invitation de membres avec tokens sécurisés
  - Gestion des rôles
  - Historique d'activité

- **Gestion des Tableaux**
  - CRUD boards avec Swagger docs
  - Backgrounds personnalisés (couleurs, gradients, images Unsplash)
  - Réordonnancement

- **Gestion des Colonnes**
  - CRUD colonnes
  - Réordonnancement (order-based)

- **Gestion des Tickets**
  - CRUD tickets
  - Drag & drop entre colonnes (transactions Firestore)
  - Commentaires avec édition
  - Assignations
  - Labels par board
  - Checklists avec items
  - Pièces jointes (GCS avec signed URLs)
  - Rappels programmables
  - Archivage (soft delete)

- **Collaboration**
  - Temps réel via Firestore listeners
  - Système de notifications
  - Historique d'activité complet
  - Watchers/Observateurs

- **Documentation**
  - Swagger/OpenAPI pour REST API
  - tRPC type-safe avec introspection
  - 2000+ lignes de documentation technique en français

---

## 🚀 Démarrage Rapide

### Pré-requis

- Node.js 20+ LTS
- pnpm 9.x (ou via Corepack)
- Git

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/youba/taskly.git
cd taskly

# 2. Activer pnpm (via Corepack)
corepack enable
corepack prepare pnpm@9.12.3 --activate

# 3. Installer les dépendances
pnpm install
```

### Lancer en Développement

```bash
# Lancer tout (frontend + backend)
pnpm dev
```

Les services démarrent sur :
- Frontend : `http://localhost:3000`
- Backend : `http://localhost:4000`
- API Docs : `http://localhost:4000/docs` (Swagger)
- Health Check : `http://localhost:4000/health`

### Configuration Optionnelle

Variables d'environnement :

```bash
# Backend
PORT=4000                          # Port du serveur
CORS_ORIGIN=http://localhost:3000 # Origine CORS
NODE_ENV=development              # Environnement

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000 # URL API
```

---

## 📦 Scripts Disponibles

### Tests & Qualité

```bash
# Lancer tous les tests
pnpm test

# Vérifier les types TypeScript
pnpm run typecheck

# Linter le code
pnpm lint

# Mode watch
pnpm test:watch
```

### Build & Déploiement

```bash
# Builder tous les packages
pnpm build

# Vérifier le build
pnpm run verify

# Déployer (déclenche Cloud Build)
git push origin main
```

---

## 📚 Documentation

Une **documentation complète en français** (2000+ lignes) est disponible dans `doc/` :

| Document | Contenu | Durée |
|----------|---------|-------|
| [doc/SOMMAIRE.md](./doc/SOMMAIRE.md) | Guide rapide par rôle | 2 min |
| [doc/README.md](./doc/README.md) | Vue d'ensemble | 5 min |
| [doc/01_ARCHITECTURE_GLOBALE.md](./doc/01_ARCHITECTURE_GLOBALE.md) | Architecture complète | 15 min |
| [doc/02_FIRESTORE_ARCHITECTURE.md](./doc/02_FIRESTORE_ARCHITECTURE.md) | Database & Collections | 25 min |
| [doc/03_SYSTEME_PERMISSIONS.md](./doc/03_SYSTEME_PERMISSIONS.md) | Permissions & Sécurité | 20 min |
| [doc/04_GESTION_TICKETS.md](./doc/04_GESTION_TICKETS.md) | Tickets & Opérations | 30 min |
| [doc/05_WORKFLOWS_COLLABORATIONS.md](./doc/05_WORKFLOWS_COLLABORATIONS.md) | Collaboration temps réel | 25 min |
| [doc/CONTRIBUTION_GUIDELINES.md](./doc/CONTRIBUTION_GUIDELINES.md) | Guide de contribution | 15 min |
| [doc/INDEX.md](./doc/INDEX.md) | Index & FAQ complet | Navigation |

### Chemins de Lecture par Rôle

- **Frontend Developer** : SOMMAIRE → 01 → 04 → 05
- **Backend Developer** : SOMMAIRE → 01 → 02 → 03 → 04
- **DevOps** : SOMMAIRE → 01 (déploiement section)
- **QA / Tester** : SOMMAIRE → 01 → 03 → 04 → 05

---

## 🤝 Contribuer

Avant de contribuer, lire [doc/CONTRIBUTION_GUIDELINES.md](./doc/CONTRIBUTION_GUIDELINES.md).

### Workflow

1. Fork le repository
2. Créer une branche : `git checkout -b feat/ma-feature`
3. Commiter : `git commit -am 'feat: ajouter ma feature'`
4. Tester : `pnpm test && pnpm run typecheck && pnpm lint`
5. Push : `git push origin feat/ma-feature`
6. Ouvrir une Pull Request

### Checklist avant PR

- Tests ajoutés/passants
- Type checking : `pnpm run typecheck` ✅
- Linting : `pnpm lint` ✅
- Documentation mise à jour
- Commits au format : `<type>(<scope>): <description>`

---

## 🐛 Signaler un Bug

Trouvé un bug? Ouvrez une [GitHub Issue](https://github.com/youba/taskly/issues) avec :

- **Titre** : Description en 1 phrase
- **Description** : Pas à pas pour reproduire
- **Comportement attendu/actuel** : Différence
- **Screenshots** : Si applicable
- **Environnement** : OS, Node version, etc.

---

## 📊 Status du Projet

### ✅ Complet

- ✅ Architecture monorepo (Turborepo)
- ✅ Backend NestJS + tRPC + Swagger
- ✅ Frontend Next.js + React
- ✅ Authentification Firebase
- ✅ Permissions & rôles
- ✅ Firestore database (13 collections)
- ✅ Tests unitaires (Vitest)
- ✅ Documentation technique complète
- ✅ API Swagger docs

### 📋 Potentielles Améliorations

- Webhooks & intégrations externes
- Slack/Teams integration
- Advanced reporting
- Custom automations
- Mobile app (React Native)

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir [LICENSE](LICENSE) pour plus de détails.

---

## 📞 Contact & Support

- **Issues** : [GitHub Issues](https://github.com/youba/taskly/issues)
- **Discussions** : [GitHub Discussions](https://github.com/youba/taskly/discussions)
- **Documentation** : [doc/](./doc/)

---

## 🙏 Remerciements

Merci à :
- **Firebase** pour l'authentification et la database
- **NestJS** pour le framework backend
- **Next.js** pour le framework frontend
- **Turborepo** pour la gestion du monorepo
- **Épita** pour le contexte pédagogique

---

<div align="center">

**Fait avec ❤️ par Younes Bahri & Schekina Ahounou**

2025 © Taskly - Tous droits réservés

</div>
