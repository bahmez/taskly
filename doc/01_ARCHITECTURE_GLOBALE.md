# Architecture Globale de Taskly

## 📋 Vue d'ensemble

Taskly est une application web collaborative de gestion de projets et tâches, inspirée de Trello. Elle utilise une **architecture monorepo moderne** avec une séparation claire entre le frontend, le backend et les packages partagés.

## 🏗️ Structure du Projet

```
taskly/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── main.ts        # Point d'entrée, Swagger, tRPC setup
│   │   │   ├── app.module.ts  # Module racine
│   │   │   ├── board/         # Gestion des tableaux
│   │   │   ├── ticket/        # Gestion des cartes/tickets
│   │   │   ├── user/          # Gestion des utilisateurs
│   │   │   ├── workspace/     # Gestion des espaces de travail
│   │   │   └── gcs/           # Google Cloud Storage
│   │   └── package.json
│   │
│   └── web/                    # Frontend Next.js
│       ├── src/
│       │   ├── app/           # Routes et pages
│       │   ├── auth/          # Authentification
│       │   ├── components/    # Composants React
│       │   └── lib/           # Utilitaires
│       └── package.json
│
├── packages/                   # Packages partagés
│   ├── auth/                  # Authentification Firebase Guard
│   ├── database/              # Modèles Firestore et services
│   ├── firebase/              # Initialisation Firebase Admin
│   ├── shared/                # Types et permissions partagées
│   ├── trpc/                  # Routeur tRPC
│   └── ui/                    # Composants UI réutilisables
│
└── doc/                        # Documentation
```

## 🔧 Stack Technologique

### Backend
- **Framework** : NestJS (TypeScript)
- **Base de données** : Firestore (Firebase)
- **Authentification** : Firebase Authentication (JWT)
- **API** : REST + tRPC (pour les mutations/queries type-safe)
- **Stockage fichiers** : Google Cloud Storage (GCS)
- **Documentation API** : Swagger/OpenAPI

### Frontend
- **Framework** : Next.js 14+ (React 18)
- **Client API** : tRPC + TanStack Query
- **Styling** : Tailwind CSS
- **Composants** : Radix UI / Shadcn UI
- **Authentification** : Firebase Auth (client)

### DevOps & Qualité
- **Monorepo** : Turborepo
- **Package Manager** : pnpm
- **Tests** : Vitest
- **Linting** : ESLint
- **Type Checking** : TypeScript
- **CI/CD** : Cloud Build (Google Cloud)
- **Conteneurisation** : Docker

## 📊 Architecture en Couches

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│    ├─ Pages & Routes                   │
│    ├─ Components & UI                  │
│    └─ tRPC Client                      │
└─────────────────────────────────────────┘
              ↓↑ (HTTPS)
┌─────────────────────────────────────────┐
│         API Layer (NestJS)              │
│    ├─ Controllers (REST)               │
│    ├─ Services (Logique métier)        │
│    ├─ Guards (Authentification)        │
│    └─ tRPC Router                      │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│    Database Layer (Firestore)           │
│    ├─ Collections (Users, Boards, etc) │
│    ├─ Rules (Sécurité)                 │
│    └─ Indexes                          │
└─────────────────────────────────────────┘
```

## 🔐 Flux d'Authentification

```
1. Utilisateur se connecte (Firebase Auth UI)
   ↓
2. Firebase génère un ID Token (JWT)
   ↓
3. Frontend stocke le token
   ↓
4. Chaque requête API inclut le token en header Authorization
   ↓
5. Backend valide le token via FirebaseAuthGuard
   ↓
6. Contexte tRPC reçoit l'utilisateur authentifié
   ↓
7. Les procédures tRPC accèdent à ctx.user
```

## 📦 Flows de Données

### Flux tRPC (Type-Safe)
```
Frontend (tRPC Client)
  ↓
tRPC Procedure (Backend)
  ↓
Service Business Logic
  ↓
Firestore Database
  ↓
(Response remonte avec type-safety complet)
```

### Flux REST (Documentation Swagger)
```
Frontend (Fetch/HTTP)
  ↓
NestJS Controller + Swagger Decorator
  ↓
Service Business Logic
  ↓
Firestore Database
  ↓
HTTP Response + Swagger Schema Validation
```

## 🎯 Principes d'Architecture

### 1. **Séparation des Responsabilités**
- **Controllers** : Gèrent les requêtes HTTP/tRPC
- **Services** : Logique métier et opérations Firestore
- **Guards** : Authentification et autorisation
- **Models** : Définitions des types/interfaces

### 2. **Type-Safety End-to-End**
- TypeScript strict partout
- tRPC pour les mutations/queries côté API
- Schemas Firestore codifiés avec Zod/types

### 3. **Monorepo avec Turborepo**
- Packages partagées pour réduire la duplication
- Build/test/lint centralisé via `turbo`
- Caching pour accélérer les builds

### 4. **Modularité NestJS**
- Chaque feature (board, ticket, user) → son module
- Importation déclarative dans AppModule
- Isolement des dépendances

### 5. **Authentification Décentralisée**
- Firebase Auth gère sessions
- JWT vérifié côté backend
- Contexte utilisateur passé aux services

## 🚀 Déploiement

### Environnements
- **Development** : Local, hot-reload activé
- **Staging** : Cloud Build, branche `main` (optionnel)
- **Production** : Cloud Build, tags de release

### Infrastructure
- **Backend** : Cloud Run (serverless containers)
- **Frontend** : Vercel / Cloud Run / Static hosting
- **Database** : Firestore (managed)
- **Storage** : Google Cloud Storage (GCS)

## 📝 Cycle de Vie d'une Requête

### Exemple : Créer une nouvelle carte

```
1. Utilisateur clique "Créer carte" (Frontend)
   ↓
2. Dialog/Modal s'ouvre, form soumise
   ↓
3. tRPC call avec données : { boardId, title, description, ... }
   ↓
4. Backend reçoit : POST /trpc/boards.createTicket
   ↓
5. Guard valide token JWT
   ↓
6. Service BoardsService.createTicket() exécute
   ↓
7. Vérification des permissions (est-ce que user a accès au board ?)
   ↓
8. Création du document Firestore
   ↓
9. Log d'activité créé
   ↓
10. Réponse JSON remonte au frontend (type-safe)
   ↓
11. TanStack Query met en cache et met à jour l'UI
```

## 🔄 Patterns Utilisés

### Pattern Repository (Services)
```typescript
// Services comme "repositories"
class BoardsService {
  getBoardById(boardId: string)
  listBoardsForWorkspace(workspaceId: string)
  createBoard(input: CreateBoardDto)
  updateBoard(boardId: string, input: UpdateBoardDto)
}
```

### Pattern Guard (Authentification)
```typescript
// Décorateur Guard vérifie les permissions
@UseGuards(FirebaseAuthGuard)
@Post('/boards')
async createBoard(@CurrentUser() user, @Body() dto) {
  // user est garanti d'être authentifié
}
```

### Pattern Decorator (Injection)
```typescript
// Récupère l'utilisateur automatiquement
@CurrentUser() user: User
// Équivalent à @Param, @Body, @Query
```

## 📚 Flux Information

```
            Frontend (React)
                 ↑ ↓
         (HTTP + WebSocket)
                 ↑ ↓
        Backend (NestJS + tRPC)
                 ↑ ↓
    (Firestore SDK + Admin SDK)
                 ↑ ↓
           Firestore Database
```

## 🛡️ Sécurité

### Niveaux de Sécurité
1. **Transport** : HTTPS obligatoire
2. **Authentification** : JWT Firebase
3. **Autorisation** : Vérification des rôles/permissions
4. **Données** : Firestore Security Rules (server-side)
5. **Input Validation** : Zod/DTOs côté backend

## 📊 Scalabilité

- **Firestore** : Scalable horizontalement (managed)
- **Cloud Run** : Auto-scaling basé sur requêtes
- **CDN** : Frontend statique sur CDN
- **Cache** : TanStack Query côté client, Redis possible côté backend

---

## 📖 Documentation Complémentaire

- [Architecture de la Base de Données](./02_FIRESTORE_ARCHITECTURE.md)
- [Système des Permissions](./03_SYSTEME_PERMISSIONS.md)
- [Gestion des Tickets](./04_GESTION_TICKETS.md)
- [Workflow et Collaborations](./05_WORKFLOWS_COLLABORATIONS.md)
