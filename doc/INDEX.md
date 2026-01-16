# 📑 Index de la Documentation Taskly

Une navigation complète de toute la documentation technique de Taskly.

## 📚 Documents Disponibles

### **README.md** - Point de Départ
- 🎯 Vue d'ensemble du projet
- 🗂️ Guide de lecture par rôle
- 📖 Description de chaque document
- ❓ FAQ courants
- 🔑 Concepts clés

**👉 Commencer ici**

---

## 📖 Documentation Principale (5 documents)

### **1️⃣ [01_ARCHITECTURE_GLOBALE.md](./01_ARCHITECTURE_GLOBALE.md)**
**Durée de lecture** : 15-20 minutes

#### Contenu
- 🏗️ Structure du monorepo (`apps/` + `packages/`)
- 🔧 Stack technologique (NestJS, Next.js, Firestore, etc.)
- 📊 Architecture en couches (Frontend ↔ API ↔ Database)
- 🔐 Flux d'authentification (JWT Firebase)
- 📦 Flows de données (tRPC + REST)
- 🎯 Principes d'architecture
- 🚀 Déploiement et scalabilité
- 📝 Cycle de vie d'une requête

#### Pour Qui
- Nouveaux contributeurs
- Frontend developers
- Backend developers
- Tech leads

#### Points Clés
```
Frontend (Next.js + React)
    ↓
API (NestJS + tRPC)
    ↓
Database (Firestore)
```

---

### **2️⃣ [02_FIRESTORE_ARCHITECTURE.md](./02_FIRESTORE_ARCHITECTURE.md)**
**Durée de lecture** : 25-30 minutes

#### Contenu
- 🔥 Pourquoi Firestore ? (vs PostgreSQL)
- 📋 13 Collections Firestore détaillées :
  - `users` - Utilisateurs
  - `workspaces` - Espaces de travail
  - `workspaces/{wId}/members` - Membres
  - `boards` - Tableaux kanban
  - `boards/{bId}/columns` - Colonnes
  - `tickets` - Cartes de tâches
  - `boards/{bId}/labels` - Étiquettes
  - `tickets/{tId}/comments` - Commentaires
  - `tickets/{tId}/attachments` - Pièces jointes
  - `notifications` - Notifications
  - `activity-logs` - Historique d'activité
  - `ticket-reminders` - Rappels
  - `invitations` - Invitations en attente
- 🔗 Denormalization strategy
- 📊 Indexes et queries critiques
- 🔐 Firestore Security Rules
- 📈 Pagination et nettoyage

#### Pour Qui
- Backend developers (priorité 1)
- Database architects
- Optimiseurs de performance
- DevOps engineers

#### Points Clés
```
Firestore = Base NoSQL temps réel
+ Scalabilité horizontale
+ Security Rules natives
- Pas de JOINs (besoin denormalization)
```

---

### **3️⃣ [03_SYSTEME_PERMISSIONS.md](./03_SYSTEME_PERMISSIONS.md)**
**Durée de lecture** : 20-25 minutes

#### Contenu
- 👥 3 Rôles (Owner, Admin, Member)
- 📊 Matrice des permissions (Workspace, Board, Ticket)
- 🔄 Cascade de vérification des permissions
- 💻 Implémentation dans le code :
  - `@taskly/shared/workspace-permissions.ts`
  - `WorkspaceAccessService`
  - `FirebaseAuthGuard`
  - `@CurrentUser` decorator
- 🎫 Permissions au niveau Ticket (auteur + rôle)
- 🔗 Flux d'invitation et onboarding
- 🛡️ Sécurité et audit logs

#### Pour Qui
- Backend developers (priorité 1)
- Security engineers
- Feature developers

#### Points Clés
```
Hiérarchie des rôles:
member < admin < owner

Vérification à chaque request:
1. Authentification ? (JWT)
2. Accès workspace ?
3. Rôle suffisant ?
4. Exécuter l'action
```

---

### **4️⃣ [04_GESTION_TICKETS.md](./04_GESTION_TICKETS.md)**
**Durée de lecture** : 30-35 minutes

#### Contenu
- 📌 Concept du ticket et cycle de vie
- 🔄 États (Created → Active → Archived)
- 🎬 6 Opérations principales :
  - Créer un ticket
  - Éditer un ticket
  - Déplacer un ticket (Drag & Drop - complexe)
  - Archiver un ticket
  - Ajouter commentaires
  - Assigner des utilisateurs
- 🏷️ Labels (étiquettes)
- ✅ Checklists (listes de contrôle)
- 📎 Pièces jointes (GCS)
- ⏰ Rappels
- 📊 Cas d'usage avancés

#### Pour Qui
- Frontend developers (priorité 1)
- Backend developers
- QA / testers

#### Points Clés
```
Ticket = Unité de travail
Opérations complexes:
- Déplacement (réordonnancement)
- Drag & Drop (client-side + server)
```

---

### **5️⃣ [05_WORKFLOWS_COLLABORATIONS.md](./05_WORKFLOWS_COLLABORATIONS.md)**
**Durée de lecture** : 25-30 minutes

#### Contenu
- 🤝 Paradigme de collaboration temps réel
- 📋 2 Workflows courants :
  - Gestion d'une Sprint (planif → exec → review)
  - Suivi des bugs (signalé → investigation → résolution)
- 📢 Système de notifications (5 types)
- 📊 Historique d'activité (Activity logs)
- 👁️ Système de watchers (observateurs)
- 🔄 Synchronisation temps réel (Firestore listeners)
- 🎯 Optimisations de performance (debounce, batch)
- 🚀 Intégrations futures (webhooks, Slack)

#### Pour Qui
- Frontend developers
- Backend developers
- Product managers
- QA / testers

#### Points Clés
```
Collaboration = Multiple users + Real-time updates
Firestore listeners = Auto-sync UI quand data change
```

---

### **📋 [CONTRIBUTION_GUIDELINES.md](./CONTRIBUTION_GUIDELINES.md)**
**Durée de lecture** : 15-20 minutes

#### Contenu
- 🎯 Avant de commencer (lire la doc, stack)
- 🔄 Workflow de contribution (fork, branch, dev, test)
- 🛡️ Points clés pour chaque type de feature
- 📝 Conventions de code (naming, imports, JSDoc, errors)
- 🧪 Testing (unitaires, permissions, edge cases)
- 📝 Commits et PRs (format, template)
- 🚀 Déploiement (checklist, production)
- 🐛 Déboguer (backend, frontend, Firestore)
- 💡 Best practices (permissions, transactions, denormalization)

#### Pour Qui
- Nouveaux contributeurs
- Développeurs de toutes les spécialités
- Code reviewers

#### Points Clés
```
Workflow = Documentation → Development → Testing → PR
Standards = TypeScript strict + Tests + JSDoc
```

---

## 🗂️ Documents Supplémentaires

### Cahier des Charges
- **[Cahier_des_charges_complet_Taskly.md](./Cahier_des_charges_complet_Taskly.md)** - Spécifications complètes du projet (PDF également disponible)

---

## 🎯 Chemins de Lecture par Rôle

### 👨‍💼 **Product Manager**
1. README.md (5 min)
2. 01_ARCHITECTURE_GLOBALE.md (vue d'ensemble) (10 min)
3. 05_WORKFLOWS_COLLABORATIONS.md (workflows) (15 min)

**Total : 30 minutes**

---

### 👨‍💻 **Frontend Developer**
1. **README.md** (5 min)
2. **01_ARCHITECTURE_GLOBALE.md** (15 min)
3. **04_GESTION_TICKETS.md** (30 min) ← Focus
4. **05_WORKFLOWS_COLLABORATIONS.md** (25 min) ← Focus
5. CONTRIBUTION_GUIDELINES.md (15 min)

**Total : 1h 30 min**

**Ordre Prioritaire** : 1 → 2 → 4 → 5 → 3 → 5

---

### 🔧 **Backend Developer**
1. **README.md** (5 min)
2. **01_ARCHITECTURE_GLOBALE.md** (15 min)
3. **02_FIRESTORE_ARCHITECTURE.md** (30 min) ← Focus
4. **03_SYSTEME_PERMISSIONS.md** (20 min) ← Focus
5. **04_GESTION_TICKETS.md** (30 min)
6. CONTRIBUTION_GUIDELINES.md (15 min)

**Total : 1h 55 min**

**Ordre Prioritaire** : 1 → 2 → 3 → 2 → 4 → 5 → 6

---

### 🛡️ **DevOps / Infrastructure**
1. **README.md** (5 min)
2. **01_ARCHITECTURE_GLOBALE.md** (déploiement section) (10 min)
3. **02_FIRESTORE_ARCHITECTURE.md** (Security Rules) (15 min)
4. CONTRIBUTION_GUIDELINES.md (déploiement section) (10 min)

**Total : 40 minutes**

---

### 🧪 **QA / Tester**
1. **README.md** (5 min)
2. **01_ARCHITECTURE_GLOBALE.md** (10 min)
3. **03_SYSTEME_PERMISSIONS.md** (20 min) ← Focus
4. **04_GESTION_TICKETS.md** (30 min) ← Focus
5. **05_WORKFLOWS_COLLABORATIONS.md** (25 min) ← Focus
6. CONTRIBUTION_GUIDELINES.md (testing section) (10 min)

**Total : 1h 40 min**

---

## 🔑 Concepts Clés Expliqués

### Workspace (Espace de Travail)
- **Document** : [01_ARCHITECTURE_GLOBALE.md#concepts-clés](./01_ARCHITECTURE_GLOBALE.md)
- **Détails** : [02_FIRESTORE_ARCHITECTURE.md#collection-2-workspaces](./02_FIRESTORE_ARCHITECTURE.md)
- **Permissions** : [03_SYSTEME_PERMISSIONS.md#workspace-level](./03_SYSTEME_PERMISSIONS.md)

### Board (Tableau)
- **Document** : [01_ARCHITECTURE_GLOBALE.md#concepts-clés](./01_ARCHITECTURE_GLOBALE.md)
- **Détails** : [02_FIRESTORE_ARCHITECTURE.md#collection-4-boards](./02_FIRESTORE_ARCHITECTURE.md)

### Ticket (Carte de Tâche)
- **Document** : [04_GESTION_TICKETS.md#concept-du-ticket](./04_GESTION_TICKETS.md)
- **Détails** : [02_FIRESTORE_ARCHITECTURE.md#collection-6-tickets](./02_FIRESTORE_ARCHITECTURE.md)
- **Opérations** : [04_GESTION_TICKETS.md#opérations-courantes](./04_GESTION_TICKETS.md)
- **Collaboration** : [05_WORKFLOWS_COLLABORATIONS.md](./05_WORKFLOWS_COLLABORATIONS.md)

### Permission
- **Document** : [03_SYSTEME_PERMISSIONS.md](./03_SYSTEME_PERMISSIONS.md)
- **Rôles** : [03_SYSTEME_PERMISSIONS.md#rôles-et-permissions](./03_SYSTEME_PERMISSIONS.md)
- **Matrice** : [03_SYSTEME_PERMISSIONS.md#matrice-des-permissions](./03_SYSTEME_PERMISSIONS.md)

---

## 🔍 Index par Sujet

### Architecture
- [01_ARCHITECTURE_GLOBALE.md](./01_ARCHITECTURE_GLOBALE.md) - Vue d'ensemble complète
- [01_ARCHITECTURE_GLOBALE.md#-structure-du-projet](./01_ARCHITECTURE_GLOBALE.md) - Structure du monorepo
- [01_ARCHITECTURE_GLOBALE.md#-stack-technologique](./01_ARCHITECTURE_GLOBALE.md) - Tech stack

### Database
- [02_FIRESTORE_ARCHITECTURE.md](./02_FIRESTORE_ARCHITECTURE.md) - Architecture complète
- [02_FIRESTORE_ARCHITECTURE.md#-schéma-des-collections](./02_FIRESTORE_ARCHITECTURE.md) - 13 collections
- [02_FIRESTORE_ARCHITECTURE.md#-denormalization-strategy](./02_FIRESTORE_ARCHITECTURE.md) - Denormalization

### Authentification
- [01_ARCHITECTURE_GLOBALE.md#-flux-dauthentification](./01_ARCHITECTURE_GLOBALE.md) - Flux JWT
- [03_SYSTEME_PERMISSIONS.md](./03_SYSTEME_PERMISSIONS.md) - Permissions

### Sécurité
- [03_SYSTEME_PERMISSIONS.md#-sécurité-des-permissions](./03_SYSTEME_PERMISSIONS.md) - Best practices
- [02_FIRESTORE_ARCHITECTURE.md#-firestore-security-rules](./02_FIRESTORE_ARCHITECTURE.md) - Rules

### Tickets & Drag-and-Drop
- [04_GESTION_TICKETS.md](./04_GESTION_TICKETS.md) - Opérations complètes
- [04_GESTION_TICKETS.md#3-déplacer-un-ticket-drag--drop](./04_GESTION_TICKETS.md) - Déplacement complexe

### Collaboration
- [05_WORKFLOWS_COLLABORATIONS.md](./05_WORKFLOWS_COLLABORATIONS.md) - Collaboration temps réel
- [05_WORKFLOWS_COLLABORATIONS.md#-système-de-notifications](./05_WORKFLOWS_COLLABORATIONS.md) - Notifications
- [05_WORKFLOWS_COLLABORATIONS.md#-système-de-watchers](./05_WORKFLOWS_COLLABORATIONS.md) - Watchers

### Performance
- [05_WORKFLOWS_COLLABORATIONS.md#-gestion-des-performances](./05_WORKFLOWS_COLLABORATIONS.md) - Optimisations
- [02_FIRESTORE_ARCHITECTURE.md#-stratégie-de-pagination](./02_FIRESTORE_ARCHITECTURE.md) - Pagination

### Testing
- [CONTRIBUTION_GUIDELINES.md#-testing](./CONTRIBUTION_GUIDELINES.md) - Tests
- [CONTRIBUTION_GUIDELINES.md#-déboguer](./CONTRIBUTION_GUIDELINES.md) - Debugging

---

## ❓ FAQ Rapides

| Question | Réponse |
|----------|---------|
| Qu'est-ce que Taskly ? | [README.md#-vue-densemble](./README.md) |
| Comment s'organise le code ? | [01_ARCHITECTURE_GLOBALE.md](./01_ARCHITECTURE_GLOBALE.md) |
| Pourquoi Firestore ? | [02_FIRESTORE_ARCHITECTURE.md#-pourquoi-firestore](./02_FIRESTORE_ARCHITECTURE.md) |
| Comment fonctionnent les permissions ? | [03_SYSTEME_PERMISSIONS.md](./03_SYSTEME_PERMISSIONS.md) |
| Comment créer un ticket ? | [04_GESTION_TICKETS.md#1-créer-un-ticket](./04_GESTION_TICKETS.md) |
| Comment fonctionne le drag-and-drop ? | [04_GESTION_TICKETS.md#3-déplacer-un-ticket](./04_GESTION_TICKETS.md) |
| Comment implémenter une notification ? | [05_WORKFLOWS_COLLABORATIONS.md#-système-de-notifications](./05_WORKFLOWS_COLLABORATIONS.md) |
| Comment contribuer ? | [CONTRIBUTION_GUIDELINES.md](./CONTRIBUTION_GUIDELINES.md) |

---

## 📊 Statistiques de la Documentation

| Document | Lignes | Sections | Exemples Code |
|----------|--------|----------|----------------|
| 01_ARCHITECTURE_GLOBALE.md | ~200 | 10 | 5+ |
| 02_FIRESTORE_ARCHITECTURE.md | ~350 | 15 | 10+ |
| 03_SYSTEME_PERMISSIONS.md | ~350 | 12 | 8+ |
| 04_GESTION_TICKETS.md | ~400 | 14 | 15+ |
| 05_WORKFLOWS_COLLABORATIONS.md | ~350 | 12 | 10+ |
| CONTRIBUTION_GUIDELINES.md | ~250 | 10 | 8+ |
| **TOTAL** | **~1900** | **~73** | **~56+** |

---

## 🎯 Prochaines Étapes

### Après avoir lu la Documentation
1. ✅ Choisir une petite tâche
2. ✅ Lire [CONTRIBUTION_GUIDELINES.md](./CONTRIBUTION_GUIDELINES.md)
3. ✅ Forker et créer une branche
4. ✅ Implémenter
5. ✅ Tester (`pnpm test`, `pnpm run typecheck`, `pnpm lint`)
6. ✅ Ouvrir une PR

### Pour les Updates de Documentation
- Quand vous découvrez quelque chose d'important : mettez à jour la doc
- Quand vous implémentez une nouvelle feature : documentez-la
- Quand vous trouvez une meilleure façon de faire : mettez à jour le guide

---

## 📞 Questions ?

- **Quelle doc lire** : Voir "Chemins de lecture par rôle"
- **Comment faire X** : Chercher dans l'index
- **Bug/Feature** : Ouvrir une issue GitHub
- **Architecture question** : Ouvrir une discussion

---

**Dernière mise à jour** : 2026-01-16  
**Auteur** : Équipe Taskly  
**License** : Documentation © 2026
