# 📚 Documentation Taskly

Bienvenue dans la documentation technique de **Taskly**, une application web collaborative de gestion de projets inspirée de Trello.

## 🎯 Vue d'Ensemble

Taskly permet à des équipes de collaborer sur des tableaux kanban avec :
- **Workspaces** : Espaces de travail d'équipe
- **Boards** : Tableaux kanban
- **Tickets** : Cartes de tâches
- **Collaboration** : Commentaires, assignations, notifications
- **Permissions** : Gestion des rôles et accès

## 📖 Documents Disponibles

### 1. [Architecture Globale](./01_ARCHITECTURE_GLOBALE.md)
**Pour comprendre** comment Taskly est structuré.

- **Contenu** :
  - Structure du monorepo
  - Stack technologique (NestJS, Next.js, Firestore, etc.)
  - Architecture en couches
  - Flux d'authentification
  - Déploiement et scalabilité

**À lire en premier** : Ce document vous donne une vue d'ensemble du système.

---

### 2. [Firestore Architecture](./02_FIRESTORE_ARCHITECTURE.md)
**Pour comprendre** comment les données sont structurées.

- **Contenu** :
  - Pourquoi Firestore ? (avantages vs PostgreSQL)
  - Schéma complet des collections (users, workspaces, boards, tickets, etc.)
  - Denormalization strategy
  - Indexes et queries critiques
  - Security Rules Firestore
  - Stratégie de pagination et nettoyage

**À lire si** : Vous travaillez avec la base de données ou optimisez les performances.

---

### 3. [Système des Permissions](./03_SYSTEME_PERMISSIONS.md)
**Pour comprendre** comment l'accès est contrôlé.

- **Contenu** :
  - Rôles (Owner, Admin, Member)
  - Matrice des permissions
  - Cascade de vérification
  - Implémentation dans le code (Guards, Services)
  - Permissions au niveau ticket
  - Flux d'invitation et onboarding
  - Sécurité et audit logs

**À lire si** : Vous implémentez une fonctionnalité qui modifie l'accès aux ressources.

---

### 4. [Gestion des Tickets](./04_GESTION_TICKETS.md)
**Pour comprendre** comment fonctionnent les tickets.

- **Contenu** :
  - Concept du ticket et cycle de vie
  - Opérations (créer, éditer, déplacer, archiver)
  - Commentaires
  - Assignations
  - Labels (étiquettes)
  - Checklists
  - Pièces jointes et uploads GCS
  - Rappels
  - Cas d'usage avancés

**À lire si** : Vous travaillez sur les tickets ou le drag-and-drop.

---

### 5. [Workflows et Collaborations](./05_WORKFLOWS_COLLABORATIONS.md)
**Pour comprendre** comment les utilisateurs collaborent.

- **Contenu** :
  - Paradigme de collaboration temps réel
  - Workflows courants (sprint, bug tracking)
  - Système de notifications
  - Historique d'activité
  - Système de watchers
  - Synchronisation temps réel (Firestore listeners)
  - Optimisations de performance
  - Intégrations futures (webhooks, Slack)

**À lire si** : Vous implémentez des features de collaboration ou de notifications.

---

### 6. [Futures Tâches - Roadmap Phase 2](./06_FUTURES_TACHES.md)
**Pour comprendre** les améliorations planifiées post-MVP.

- **Contenu** :
  - Context et avance par rapport au cahier des charges
  - **T-104** : Authentification Multi-Provider (Google & GitHub)
  - **T-105** : Internationalisation (Français & Anglais)
  - **T-106** : Recherche de Boards et Workspaces
  - Estimation de temps et complexité
  - Chronologie et allocation d'équipe
  - Critères de succès

**À lire si** : Vous contribuez aux améliorations futures ou voulez comprendre la roadmap du projet.

---

## 🗂️ Organiser ta Lecture

### Pour les Nouveaux Contributeurs
```
1. Architecture Globale (01_*.md)
   ↓
2. Firestore Architecture (02_*.md) 
   ↓
3. Système des Permissions (03_*.md)
   ↓
4. Gestion des Tickets (04_*.md)
   ↓
5. Workflows et Collaborations (05_*.md)
```

### Par Rôle

#### **Frontend Developer**
```
1. Architecture Globale
2. Gestion des Tickets
3. Workflows et Collaborations
4. (Optionnel) Système des Permissions
```

#### **Backend Developer**
```
1. Architecture Globale
2. Firestore Architecture
3. Système des Permissions
4. Gestion des Tickets
```

#### **DevOps / Infrastructure**
```
1. Architecture Globale → section Déploiement
2. Firestore Architecture → section Security Rules
3. (Optionnel) Gestion des Tickets → section GCS
```

#### **QA / Tester**
```
1. Architecture Globale
2. Gestion des Tickets
3. Workflows et Collaborations
4. Système des Permissions
```

---

## 🔑 Concepts Clés

### Workspace
- **Qu'est-ce que c'est** : Un espace de travail (équipe)
- **Exemple** : "Mon startup", "Mon projet collectif"
- **Membres** : Invités avec des rôles (Admin, Member)
- **Contient** : Plusieurs boards

### Board
- **Qu'est-ce que c'est** : Un tableau kanban
- **Exemple** : "Sprint #42", "Backlog", "Support"
- **Contient** : Colonnes et tickets

### Column
- **Qu'est-ce que c'est** : Une liste/colonne
- **Exemple** : "To Do", "In Progress", "Done"
- **Contient** : Tickets (cartes de tâches)

### Ticket
- **Qu'est-ce que c'est** : Une carte de tâche
- **Exemple** : "Implémenter authentification"
- **Peut avoir** : Commentaires, assignations, labels, due date, checklists

### Permission
- **Qu'est-ce que c'est** : Action autorisée pour un rôle
- **Exemple** : "Member ne peut pas archiver un board"
- **Vérifié** : À chaque requête (server-side)

---

## 🛠️ Stack et Technologies

### Backend
- **NestJS** : Framework TypeScript
- **Firestore** : Base de données NoSQL
- **Firebase Auth** : Authentification JWT
- **tRPC** : API type-safe
- **Swagger** : Documentation API

### Frontend
- **Next.js** : Framework React
- **TanStack Query** : Gestion d'état/cache
- **Firebase Auth** : Authentification côté client
- **Tailwind CSS** : Styling
- **tRPC Client** : Appels API type-safe

### DevOps
- **Monorepo** : Turborepo
- **Tests** : Vitest
- **Linting** : ESLint
- **Type Safety** : TypeScript strict
- **CI/CD** : Cloud Build

---

## 🎯 Quick Start

### Avant de coder
1. Lire **[01_ARCHITECTURE_GLOBALE.md](./01_ARCHITECTURE_GLOBALE.md)** (10-15 min)
2. Identifier ton rôle dans le document "Par Rôle" ci-dessus
3. Lire les docs pertinentes pour ta tâche

### Pendant le développement
- Revenir à la doc appropriée pour clarifier un concept
- Chercher des exemples de code dans les documents
- Vérifier les permissions avant d'implémenter une feature

### Après avoir livré du code
- Mettre à jour la doc si tu as modifié l'architecture
- Ajouter des exemples si tu as créé un workflow nouveau

---

## 📝 Exemples de Codes

Tous les documents incluent des **exemples TypeScript** pour illustrer les concepts :

```typescript
// Exemple : Créer un ticket
await ticketsService.create({
  boardId: 'board-123',
  columnId: 'col-456',
  title: 'Nouvelle feature',
  ownerId: user.id,
  workspaceId: workspace.id,
});
```

---

## 🔐 Sécurité

### Principes Appliqués
1. **Authentification** : JWT Firebase obligatoire
2. **Autorisation** : Vérification des permissions à chaque requête
3. **Validation** : Input validation côté backend
4. **HTTPS** : Obligatoire en production
5. **Firestore Rules** : Security Rules natives

### Sections Sécurité
- [Système des Permissions](./03_SYSTEME_PERMISSIONS.md#-sécurité-des-permissions)
- [Firestore Architecture](./02_FIRESTORE_ARCHITECTURE.md#-firestore-security-rules)

---

## 🚀 Performance et Scalabilité

### Optimisations Clés
- **Denormalization** : Éviter les N+1 queries
- **Pagination** : Cursor-based pour scalabilité
- **Indexes** : Firestore indexes configurés
- **Caching** : TanStack Query côté frontend
- **Transactions** : ACID transactions Firestore

### Sections Performance
- [Gestion des Tickets](./04_GESTION_TICKETS.md#-operations-courantes-sur-les-tickets)
- [Workflows](./05_WORKFLOWS_COLLABORATIONS.md#-gestion-des-performances)

---

## ❓ FAQ

### Comment ajouter une nouvelle feature ?
1. Lire la doc pertinente
2. Identifier les permissions requises
3. Mettre à jour l'architecture si nécessaire
4. Implémenter backend → frontend
5. Tester les permissions
6. Mettre à jour la doc si changements majeurs

### Où vérifier les permissions ?
→ [Système des Permissions](./03_SYSTEME_PERMISSIONS.md)

### Quelle est la structure Firestore ?
→ [Firestore Architecture](./02_FIRESTORE_ARCHITECTURE.md)

### Comment fonctionne le drag-and-drop ?
→ [Gestion des Tickets - Déplacer un Ticket](./04_GESTION_TICKETS.md#3-déplacer-un-ticket-drag--drop)

### Comment implémenter une notification ?
→ [Workflows - Système de Notifications](./05_WORKFLOWS_COLLABORATIONS.md#-système-de-notifications)

---

## 📞 Support

- **Questions générales** : Consulter la doc appropriée
- **Bug** : Créer une issue GitHub
- **Architecture** : Discuter avec l'équipe core

---

## 📅 Changelog de la Doc

| Date | Changement |
|------|-----------|
| 2026-01-16 | Documentation initiale créée |

---

## 📄 License

Documentation © 2026 Taskly Team

---

**Dernière mise à jour** : 2026-01-16
