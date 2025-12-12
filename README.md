# Taskly — Monorepo Turborepo (NestJS + NextJS + tRPC)

Taskly est une application web collaborative de gestion de projets et de tâches **inspirée de Trello** (tableaux → listes → cartes), développée dans le cadre d’un projet d’étude.

Le cahier des charges complet est disponible ici : [doc/Cahier des charges — Application Taskly.pdf]().

## Architecture du monorepo

- `apps/web` : **NextJS** (frontend)
- `apps/api` : **NestJS** (backend, monté sur Express)
- `packages/trpc` : **routeur tRPC partagé** (types partagés client/serveur)
- `packages/shared` : **types & modèles** partagés (MVP)

## Pré-requis

- **Node.js 20+**
- **pnpm** (via Corepack recommandé)

## Installation

À la racine du repo :

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install
```

## Lancer le projet en local

Dans un terminal à la racine :

```bash
pnpm dev
```

### Ports par défaut

- **Frontend** : `http://localhost:3000`
- **Backend** : `http://localhost:4000`
  - Healthcheck : `GET http://localhost:4000/health`
  - tRPC : `http://localhost:4000/trpc`

### Configuration (optionnelle)

- **CORS (backend)** : variable `CORS_ORIGIN` (par défaut `http://localhost:3000`)
- **Port backend** : variable `PORT` (par défaut `4000`)
- **URL backend côté frontend** : `NEXT_PUBLIC_API_URL` (par défaut `http://localhost:4000`)

> Note : dans cet environnement, la création de fichiers `.env*` peut être bloquée. Vous pouvez donc définir ces variables directement dans votre terminal (PowerShell) ou via la configuration de votre IDE.

## Ce qui est déjà implémenté (MVP technique)

- **Monorepo Turborepo** avec workspaces (`apps/*`, `packages/*`)
- **Backend NestJS** :
  - route `GET /health`
  - montage tRPC sur `/trpc`
- **Frontend NextJS** :
  - provider tRPC + React Query
  - page d’accueil qui appelle `hello` (preuve que l’intégration fonctionne)

## Fonctionnalités attendues (cahier des charges)

Objectif : reproduire les fonctionnalités principales de Trello dans une version personnalisée nommée Taskly.

- **Authentification** : Firebase Auth (email/mot de passe), sécurisation des routes, profil (nom/photo/email)
- **Tableaux** : création/édition/suppression, couleur d’arrière-plan, partage et collaboration
- **Listes** : ajout/renommage/réordonnancement/suppression, drag & drop
- **Cartes** : CRUD + déplacement, description, labels, date limite, pièces jointes, commentaires, “terminée”
- **Collaboration temps réel** : Firestore (updates instantanées), attribution de membres, commentaires/notifications
- **UI** : inspirée Trello, responsive, thème clair/sombre

(Voir le détail complet dans le PDF.)  
Source : [Cahier des charges — Application Taskly]()

## Scripts utiles

- `pnpm dev` : lance tout en mode développement (turbo)
- `pnpm build` : build de tous les packages/apps
- `pnpm typecheck` : vérifie les types
- `pnpm lint` : lint monorepo


