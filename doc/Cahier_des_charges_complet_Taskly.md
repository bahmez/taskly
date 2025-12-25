# Cahier des charges (complet et détaillé) — **Taskly**
**Version** : 1.0 (document de référence “pré-projet”)  
**Date de rédaction (référence)** : 02/11/2025  
**Période couverte pour la charge** : du 02/11/2025 au 31/01/2026  
**Équipe** : Younes Bahri, Schekina Ahounou  
**Contexte** : projet d’étude — application web collaborative de gestion de projets et tâches, **inspirée de Trello**.

> Ce document est volontairement rédigé comme s’il avait été produit **avant le démarrage**.  
> Une annexe (en fin de document) fait le lien avec l’état d’avancement réel du repo (backend déjà entamé) afin de **justifier le temps investi** et de cadrer la suite.

## Références
- Cahier des charges initial (version courte) : [doc/Cahier des charges — Application Taskly.pdf](file:///c%3A/Users/youba/Documents/dev/Epitech/taskly/doc/Cahier%20des%20charges%20%E2%80%94%20Application%20Taskly.pdf)
- Dépôt monorepo : `taskly/` (Turborepo, `apps/api`, `apps/web`, `packages/*`)

---

## 1. Présentation générale

### 1.1. Nom et objectif
**Taskly** est une application web de gestion de projets et de tâches en équipe, organisée selon le paradigme :
- **Workspace** (espace de travail / équipe)
- **Board** (tableau)
- **Columns/Lists** (listes)
- **Tickets/Cards** (cartes de tâches)

L’objectif est de reproduire les **fonctionnalités principales de Trello** (MVP réaliste) et de proposer une base technique solide (authentification, permissions, collaboration).

### 1.2. Public cible
- Étudiants / associations / petites équipes
- Petites équipes produit/tech (kanban simple)
- Utilisateurs habitués à Trello (attentes UX fortes)

### 1.3. Enjeux
- **Ergonomie** proche de Trello (apprentissage minimal)
- **Collaboration** (partage, droits, organisation par équipes)
- **Fiabilité** des opérations de réordonnancement/déplacement (drag & drop)
- **Sécurité** (auth Firebase, règles de droits, protection des données)

---

## 2. Parties prenantes

### 2.1. Équipe projet
- **Younes Bahri** — Développement backend/frontend, architecture, CI/CD, coordination
- **Schekina Ahounou** — Développement frontend/backend, intégration Firebase, QA, CI/CD

### 2.2. Parties prenantes “métier”
- Encadrants pédagogiques (validation des livrables, évaluation)
- Utilisateurs tests (pairs / camarades) pour retours UX

---

## 3. Périmètre et objectifs produit

### 3.1. Objectifs fonctionnels (résumé)
- Authentification sécurisée (Firebase Auth)
- Gestion d’équipes (workspaces), membres, rôles, invitations
- Gestion de tableaux (boards) et organisation (colonnes/listes)
- Gestion des cartes/tickets (création, modification, déplacement, archivage)
- Collaboration (consultation partagée, droits, temps réel à terme)
- UX moderne (responsive, fluide, thème clair/sombre)

### 3.2. Hors périmètre (non-MVP)
Ces éléments peuvent être envisagés mais ne sont pas requis pour valider le MVP :
- Paiement / abonnement
- Multi-tenant “enterprise” (SSO, SCIM)
- Editeur markdown avancé, automations “Butler”
- Gestion avancée des dépendances, Gantt, roadmap

### 3.3. Priorisation (MoSCoW)
- **Must have (MVP à livrer)** :
  - Auth Firebase + sécurisation des routes
  - Workspaces : CRUD + membres + rôles + invitations
  - Boards : CRUD + réordonnancement
  - Colonnes : CRUD + réordonnancement
  - Tickets : CRUD (min.) + déplacement + archivage
  - Frontend : navigation + affichage boards/colonnes/cartes + interactions principales
- **Should have (fortement souhaité)** :
  - Commentaires de carte
  - Assignation de membres à une carte
  - Labels + filtres
  - Thème clair/sombre
- **Could have (bonus)** :
  - Pièces jointes
  - Checklist
  - Notifications in-app
  - Historique d’activité
- **Won’t have (pour cette version)** :
  - Automations avancées
  - SSO / admin enterprise
  - Reporting avancé

---

## 4. Hypothèses, contraintes et règles de gestion

### 4.1. Contraintes de projet
- Échéance : **31/01/2026**
- Capacité : **3 jours/semaine/personne**, **2 personnes**
- Architecture : monorepo, séparation `frontend` / `backend` / `packages`
- Auth imposée : Firebase Auth
- Base de données imposée : Firestore (temps réel)

### 4.2. Hypothèses de charge (pour justification)
- **3 jours/semaine** par personne.
- Une “journée” est comptée en :
  - **7h** (hypothèse académique) *ou*
  - **8h** (hypothèse industrie)

> Les tableaux de charge sont donnés en **jours-homme (JH)**, convertibles en heures selon l’hypothèse retenue.

---

## 5. Personas et besoins utilisateurs

### 5.1. Personas
- **Membre (viewer/editor)** : consulte les tableaux, participe aux cartes, organise sa charge.
- **Maintainer** : gère l’équipe (membres), structure les boards, garantit la cohérence.
- **Admin** : contrôle total du workspace, gouvernance, sécurité.

### 5.2. Parcours principaux
- Inscription → création d’un workspace → création d’un board → création de colonnes → création de cartes → déplacement → archivage.
- Invitation d’un membre → attribution d’un rôle → collaboration sur un board.

---

## 6. Spécifications fonctionnelles détaillées

### 6.1. Authentification & gestion de session
- **Inscription / connexion** via Firebase Auth (email/mot de passe).
- **Déconnexion**.
- **Protection des routes** (front) et **guard** côté backend.
- **Synchronisation profil** : création/MAJ d’un “User” applicatif à partir du token Firebase.

**Critères d’acceptation**
- Un utilisateur non authentifié ne peut pas appeler les endpoints protégés.
- Un utilisateur authentifié dispose d’un profil minimal (id, nom, etc.).

### 6.2. Profil utilisateur
#### 6.2.1. Données du profil
- Identifiant technique : `userId` (UID Firebase)
- Champs minimaux :
  - `username`
  - `first_name`, `last_name`
  - `description` (bio courte)
  - `createdAt`, `updatedAt`

#### 6.2.2. Cas d’usage
- **Consulter mon profil**.
- **Mettre à jour mon profil** (champs textuels).
- **Supprimer mon compte** (suppression “applicative” du document utilisateur ; la suppression Firebase peut être hors périmètre MVP).
- **Rechercher un utilisateur** (pour inviter dans un workspace).

**Critères d’acceptation**
- La recherche retourne des utilisateurs pertinents et cappés (ex. 1 à 30 résultats).
- Un utilisateur ne peut modifier que son propre profil.

---

### 6.3. Workspaces (espaces de travail / équipes)
#### 6.3.1. Objectif
Un workspace regroupe des utilisateurs, leurs rôles, et contient des boards.

#### 6.3.2. Gestion des workspaces
- **Créer** un workspace (titre obligatoire, description optionnelle).
- **Lister** les workspaces accessibles à l’utilisateur.
- **Consulter** un workspace (métadonnées + statistiques simples).
- **Modifier** un workspace (titre/description).
- **Archiver/Supprimer** un workspace (MVP : archivage logique).

#### 6.3.3. Membres et rôles (RBAC)
Rôles (MVP) :
- **admin** : contrôle total du workspace.
- **maintainer** : gestion des membres (inviter, changer rôles limités), structure.
- **editor** : édition opérationnelle (boards/cartes) sans gestion membres.
- **viewer** : consultation.

Règles de gestion importantes :
- Interdiction de supprimer le **dernier admin**.
- Un maintainer ne peut attribuer que certains rôles (ex. viewer/editor).

#### 6.3.4. Invitations
- Un admin/maintainer peut **générer une invitation** :
  - rôle ciblé
  - durée de validité (1 à 30 jours, par défaut 7)
  - token unique
- Un utilisateur peut **accepter** ou **refuser** une invitation.
- Une invitation peut être **annulée**.

**Critères d’acceptation**
- Un utilisateur non-membre ne voit pas les données d’un workspace.
- Les rôles appliquent correctement la matrice de permissions.
- Une invitation expirée/cancelled/acceptée ne peut pas être réutilisée.

---

### 6.4. Boards (tableaux)
#### 6.4.1. Objectif
Un board représente un projet/produit, contient des colonnes et des cartes.

#### 6.4.2. Gestion des boards
- **Lister** les boards d’un workspace.
- **Créer** un board (titre obligatoire, couleur/fond optionnel, description optionnelle).
- **Consulter** un board (métadonnées + statistiques).
- **Modifier** un board (titre/description/fond).
- **Archiver/Supprimer** un board (MVP : archivage logique).
- **Réordonner** les boards d’un workspace.

**Critères d’acceptation**
- Le réordonnancement est cohérent (pas de doublons, ordre stable).
- Un board archivé n’apparaît plus dans la liste.

---

### 6.5. Colonnes / Listes (Columns)
#### 6.5.1. Objectif
Les colonnes structurent le workflow (ex. Todo/In progress/Done).

#### 6.5.2. Fonctionnalités
- **Lister** les colonnes d’un board.
- **Créer** une colonne (titre, `key` unique logique, position).
- **Renommer / modifier** une colonne.
- **Supprimer** une colonne (règle : impossible si des tickets actifs existent dans la colonne).
- **Réordonner** les colonnes (drag & drop).
- **Colonnes par défaut** à la création d’un board :
  - Todo / In progress / Done (MVP)

**Critères d’acceptation**
- La suppression d’une colonne contenant des cartes actives est refusée avec un message explicite.
- Les positions sont recalculées proprement après reorder.

---

### 6.6. Cartes / Tickets (Tickets)
#### 6.6.1. Objectif
Une carte représente une tâche/action. Elle vit dans une colonne et peut être déplacée.

#### 6.6.2. Données d’une carte (MVP)
- Identité : `id`, `boardId`, `columnId`
- Contenu :
  - `title` (obligatoire)
  - `description` (optionnelle)
- Organisation :
  - `position` (ordre dans la colonne)
- Cycle de vie :
  - `isArchived`, `archivedAt`
  - `createdAt`, `updatedAt`

#### 6.6.3. Fonctionnalités (MVP)
- **Lister** toutes les cartes d’un board.
- **Lister** les cartes d’une colonne.
- **Créer** une carte dans une colonne (titre obligatoire, description optionnelle).
- **Modifier** une carte (titre/description).
- **Déplacer** une carte :
  - dans la même colonne (changement de position)
  - vers une autre colonne (changement colonne + position)
- **Archiver** une carte.

#### 6.6.4. Extensions “Trello-like” (post-MVP ou MVP+)
- **Labels** (couleur + nom) et filtrage par labels
- **Date limite (due date)** + rappels
- **Checklist(s)** (items cochables)
- **Assignation** de membres (participants)
- **Commentaires** (fil de discussion sur la carte)
- **Pièces jointes** (liens/metadata ; stockage GCS/Firebase Storage)
- **Historique d’activité** (audit log : qui a fait quoi)

**Critères d’acceptation**
- Les actions d’édition/déplacement respectent les permissions.
- Le déplacement conserve un ordre cohérent dans la colonne cible (positions recalculées).

---

### 6.7. Collaboration et temps réel
#### 6.7.1. Objectif
Approche “collaborative” : les changements sont visibles rapidement par les membres.

#### 6.7.2. MVP
- Mise à jour cohérente côté API.
- Frontend rafraîchit via requêtes (invalidations cache) et états de chargement.

#### 6.7.3. Cible Trello-like (temps réel)
- Abonnement en temps réel via Firestore (listeners) ou via un canal serveur (WebSocket) si nécessaire.
- Stratégie conflit :
  - opérations atomiques/transactionnelles pour reorder/move
  - dernière écriture fait foi pour les champs simples

---

### 6.8. Recherche, tri, filtres
- Recherche utilisateur (pour invitations).
- Recherche cartes :
  - par titre
  - par labels
  - par assignés
  - par date limite

---

### 6.9. Paramètres & personnalisation
- **Thème clair/sombre**.
- Préférences utilisateur (langue si besoin, densité UI).

---

### 6.10. Administration (optionnel)
- Tableau de bord admin (statistiques simples, gestion utilisateurs).

---

## 7. Exigences UX / UI

### 7.1. Principes d’interface
- Design minimaliste inspiré Trello.
- Navigation fluide, feedback immédiat.
- Composants réutilisables (design system léger).

### 7.2. Pages principales
- Auth : login/register
- Home : liste des workspaces
- Workspace : boards + membres + invitations
- Board : colonnes + cartes (drag & drop)
- Carte (modal) : détails (description, commentaires, etc.)
- Profil : `/me`

### 7.3. Responsive
- Desktop-first, mais utilisable sur mobile.
- Les interactions drag & drop doivent disposer d’alternatives mobile (boutons “déplacer”).

### 7.4. Accessibilité (minimum)
- Navigation clavier pour actions essentielles.
- Contrastes suffisants.
- Libellés corrects (aria) sur éléments interactifs.

---

## 8. Spécifications techniques

### 8.1. Architecture globale (cible)
- Monorepo **Turborepo** :
  - `apps/api` : backend NestJS (Express)
  - `apps/web` : frontend NextJS (App Router)
  - `packages/*` : briques partagées (auth, database, firebase, shared, trpc)
- Backend :
  - Endpoints HTTP (REST) pour le cœur métier
  - Endpoint `/trpc` pour API typée (évolutif)
- Base de données :
  - Firestore (documents + sous-collections)
- Auth :
  - Firebase Auth (JWT), vérification côté backend via Firebase Admin

### 8.2. Modèle de données Firestore (MVP)
#### 8.2.1. Collections et sous-collections
- `users/{userId}`
- `workspaces/{workspaceId}`
  - `members/{userId}`
  - `invitations/{invitationId}`
- `boards/{boardId}`
  - `columns/{columnId}`
  - `tickets/{ticketId}`

#### 8.2.2. Principes
- **Soft-delete** (archivage) pour éviter les suppressions destructrices.
- **Ordre** via champs numériques (`order`, `position`) + transactions pour reorder.
- **Évolutivité** :
  - ajouter `comments` en sous-collection de ticket
  - ajouter `labels` en sous-collection de board ou document dédié

#### 8.2.3. Indexation (Firestore)
- Index composés nécessaires pour :
  - tickets triés par `columnId` puis `position`
  - invitations filtrées (pending + expiresAt)
  - boards filtrés par `workspaceId` et triés par `order`

---

## 9. API — Spécification (REST + conventions)

### 9.1. Conventions
- Auth : header `Authorization: Bearer <firebase_id_token>`
- Réponses d’erreurs :
  - 400 : validation (champ manquant, format incorrect)
  - 401 : non authentifié
  - 403 : permission manquante / non-membre
  - 404 : ressource inexistante ou archivée
- Pagination (si nécessaire) : `limit`, `cursor` (post-MVP)

### 9.2. Endpoints (MVP)
#### Santé
- `GET /health`

#### Users
- `GET /users/me`
- `PATCH /users/me`
- `DELETE /users/me`
- `GET /users/:id`
- `GET /users/search?q=...&limit=...`

#### Workspaces
- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId`
- `PATCH /api/workspaces/:workspaceId`
- `DELETE /api/workspaces/:workspaceId` (archivage)

#### Membres workspace
- `GET /api/workspaces/:workspaceId/members`
- `POST /api/workspaces/:workspaceId/members`
- `PATCH /api/workspaces/:workspaceId/members/:userId`
- `DELETE /api/workspaces/:workspaceId/members/:userId`

#### Invitations
- `POST /api/workspaces/:workspaceId/invitations`
- `GET /api/workspaces/:workspaceId/invitations`
- `DELETE /api/workspaces/:workspaceId/invitations/:invitationId`
- `POST /api/workspaces/invitations/:token/accept`
- `POST /api/workspaces/invitations/:token/decline`

#### Boards (via workspace)
- `GET /api/workspaces/:workspaceId/boards`
- `POST /api/workspaces/:workspaceId/boards`
- `PATCH /api/workspaces/:workspaceId/boards/order`
- `DELETE /api/workspaces/:workspaceId/boards/:boardId` (archivage)

#### Boards (détails)
- `GET /api/boards/:boardId`
- `PATCH /api/boards/:boardId`

#### Colonnes
- `GET /api/boards/:boardId/columns`
- `POST /api/boards/:boardId/columns`
- `PATCH /api/boards/:boardId/columns/:columnId`
- `DELETE /api/boards/:boardId/columns/:columnId`
- `PATCH /api/boards/:boardId/columns/order`

#### Tickets
- `GET /api/boards/:boardId/tickets`
- `GET /api/boards/:boardId/columns/:columnId/tickets`
- `PATCH /api/boards/:boardId/tickets/:ticketId/move`
- `DELETE /api/boards/:boardId/tickets/:ticketId` (archivage)

### 9.3. Endpoints à ajouter (cible Trello-like)
- `POST /api/boards/:boardId/tickets` (création)
- `PATCH /api/boards/:boardId/tickets/:ticketId` (édition)
- `POST /api/boards/:boardId/tickets/:ticketId/comments`
- `GET /api/boards/:boardId/tickets/:ticketId/comments`
- `POST /api/boards/:boardId/labels`
- `PATCH /api/boards/:boardId/tickets/:ticketId/labels`
- `PATCH /api/boards/:boardId/tickets/:ticketId/dueDate`
- `PATCH /api/boards/:boardId/tickets/:ticketId/assignees`
- `POST /api/boards/:boardId/tickets/:ticketId/attachments`

---

## 10. Sécurité

### 10.1. Authentification
- Firebase Auth (JWT) validé côté backend (Firebase Admin).
- Refus systématique sans token Bearer.

### 10.2. Autorisation (RBAC)
- Contrôle d’accès systématique basé sur :
  - appartenance au workspace
  - rôle (viewer/editor/maintainer/admin)
  - permissions fines (ex. `workspace.members.write`, `board.tickets.write`, etc.)

### 10.3. Règles Firestore (cible)
- Les règles doivent empêcher l’accès direct aux données d’un workspace sans membership.
- Les écritures doivent respecter le rôle.
- (Optionnel) Limiter l’accès client direct (si l’API est la seule voie d’accès).

### 10.4. Validation / robustesse
- Validation des DTOs (champs obligatoires, trim, formats).
- Gestion d’erreurs explicite (messages utiles).
- Prévention des incohérences lors des transactions reorder/move.

---

## 11. Qualité, performance et observabilité

### 11.1. Performance
- Temps de réponse cible API : < 300ms sur opérations simples.
- Transactions Firestore limitées et optimisées (reorder/move).
- Cache côté frontend via React Query / invalidations.

### 11.2. Qualité
- Lint + Typecheck systématiques.
- Tests minimaux :
  - unit tests sur services critiques (permissions, reorder/move)
  - tests d’intégration (endpoints principaux)

### 11.3. Logs
- Logs structurés côté backend (requêtes, erreurs).
- Traçabilité sur actions sensibles (changement de rôle, invitation).

---

## 12. DevOps, CI/CD et déploiement (cible)

### 12.1. CI
Sur chaque push/PR :
- installation (pnpm)
- lint
- typecheck
- build
- tests

### 12.2. CD (cible)
- Déploiement automatique :
  - frontend sur hébergement web (ex. GCP / Vercel / Firebase Hosting)
  - backend sur GCP (ex. Cloud Run) avec variables d’environnement sécurisées

### 12.3. Gestion des secrets
- Credentials Firebase Admin via secret manager (pas en clair dans le repo).
- Variables d’environnement (CORS, PORT, WEB_ORIGIN, etc.).

---

## 13. Planification, charges et justification du temps (02/11/2025 → 31/01/2026)

### 13.1. Capacité théorique
Période : **13 semaines** (≈ 91 jours calendaires).

- Capacité équipe : 2 personnes × 3 jours/semaine = **6 JH/semaine**
- Charge totale : 13 × 6 = **78 JH**

Conversion indicative :
- 78 JH × 7h = **546 heures** (base de chiffrage retenue : **7h/jour**)

### 13.2. Macro-phasage (prévision)
- **Phase A — Cadrage & architecture** : 8 JH
- **Phase B — Backend core (workspaces/boards/listes/cartes + RBAC)** : 28 JH
- **Phase C — Frontend MVP (navigation + CRUD + drag & drop)** : 22 JH
- **Phase D — Collaboration & qualité (temps réel, commentaires, tests)** : 14 JH
- **Phase E — Industrialisation (CI/CD, déploiement, doc)** : 6 JH

Total : **78 JH**

### 13.3. Estimation détaillée en heures (WBS)
Base : **7h/jour**.  
Objectif : fournir une estimation lisible où **chaque tâche et sous-tâche** est chiffrée en heures, et où les totaux correspondent à la capacité projet (**546h**).

**Légende statut** : **Fait** / **En cours** / **À faire**.

**Contrôle de cohérence (somme)** :  
Phase A 56h + Phase B 196h + Phase C 154h + Phase D 98h + Phase E 42h = **546h**.

#### Phase A — Cadrage & architecture (**56h**)
- **A1 — Lancement projet, objectifs, périmètre, MoSCoW** (**7h**) — **Fait**
  - A1.1 Ateliers d’alignement + livrables attendus (**3h**)
  - A1.2 Définition MVP vs extensions Trello-like (**4h**)
- **A2 — Benchmark Trello + user stories** (**7h**) — **Fait**
  - A2.1 Parcours “workspace → board → liste → carte” (**3h**)
  - A2.2 Cas limites (droits, archivage, reorder/move) (**4h**)
- **A3 — Monorepo & conventions (Turborepo/pnpm)** (**7h**) — **Fait**
  - A3.1 Structure `apps/*` + `packages/*` (**4h**)
  - A3.2 Scripts dev/build/typecheck/lint (**3h**)
- **A4 — Socle technique backend/frontend** (**7h**) — **Fait**
  - A4.1 Bootstrap NestJS + NextJS + intégration tRPC (socle) (**5h**)
  - A4.2 Healthcheck + smoke test d’intégration (**2h**)
- **A5 — Firebase (projet, Auth, Firestore, secrets)** (**7h**) — **Fait**
  - A5.1 Initialisation Firebase Admin + providers (**5h**)
  - A5.2 Variables d’environnement / documentation setup (**2h**)
- **A6 — Modèle de données & décisions d’architecture (ADR)** (**7h**) — **Fait**
  - A6.1 Schéma Firestore (collections + sous-collections) (**4h**)
  - A6.2 Stratégie RBAC/permissions (**3h**)
- **A7 — Outillage dev & qualité** (**7h**) — **Fait**
  - A7.1 ESLint/TS config et conventions de code (**4h**)
  - A7.2 README / documentation de lancement (**3h**)
- **A8 — Jeux de requêtes et scénarios API (Postman)** (**7h**) — **Fait**
  - A8.1 Collections users/workspaces/boards (**5h**)
  - A8.2 Scénarios edge cases (403/404/400) (**2h**)

#### Phase B — Backend core (workspaces/boards/listes/cartes + RBAC) (**196h**)
- **B1 — Couche Firebase/DB partagée** (**10h**) — **Fait**
  - B1.1 Providers Firestore/Auth + injection tokens (**6h**)
  - B1.2 Module database + découpage stores/services (**4h**)
- **B2 — Auth backend (guard + CurrentUser) + sync utilisateur** (**14h**) — **Fait**
  - B2.1 Vérification Bearer token + erreurs standard (**6h**)
  - B2.2 Décorateur `CurrentUser` + types request (**3h**)
  - B2.3 `ensureUserExists` (création/upsert profil minimal) (**5h**)
- **B3 — Users (profil + recherche)** (**14h**) — **Fait**
  - B3.1 Modèle + store + service users (**6h**)
  - B3.2 Endpoints `/users/me`, patch, delete (**5h**)
  - B3.3 Recherche prefix multi-champs + cap/limit (**3h**)
- **B4 — Workspaces (CRUD + archivage)** (**21h**) — **Fait**
  - B4.1 Modèle + store workspace (create/get/update/archive) (**8h**)
  - B4.2 Listing workspaces par user (collectionGroup members) (**5h**)
  - B4.3 Controller REST + validations DTO (**8h**)
- **B5 — RBAC workspace + gestion membres** (**28h**) — **Fait**
  - B5.1 Définition permissions (`workspaceRolePermissions`) (**6h**)
  - B5.2 `WorkspaceAccessService` (requirePermission) (**6h**)
  - B5.3 Endpoints membres (list/add/patch/delete) (**10h**)
  - B5.4 Garde-fous : dernier admin + contraintes d’assignation (**6h**)
- **B6 — Invitations workspace** (**21h**) — **Fait**
  - B6.1 Store invitations (create/list/find by token) (**8h**)
  - B6.2 Accept/decline transactionnels + expiration (**9h**)
  - B6.3 Endpoints REST + URL d’invite + validations (**4h**)
- **B7 — Boards (CRUD + reorder + archivage)** (**21h**) — **Fait**
  - B7.1 Store/service boards (create/get/update/archive) (**8h**)
  - B7.2 Reorder boards (transaction, contrôles) (**6h**)
  - B7.3 Endpoints workspace→boards + board get/patch (**7h**)
- **B8 — Colonnes (CRUD + reorder + règles)** (**21h**) — **Fait**
  - B8.1 Colonnes par défaut à la création d’un board (**4h**)
  - B8.2 CRUD colonnes + validations (`title`, `key`) (**9h**)
  - B8.3 Reorder colonnes (transaction + renumérotation) (**6h**)
  - B8.4 Règle suppression interdite si tickets actifs (**2h**)
- **B9 — Tickets (kanban core)** (**28h**) — **En cours**
  - B9.1 Modèle + store/service tickets (structure) (**4h**) — **Fait**
  - B9.2 Listing tickets board/colonne + masquage contenu selon droits (**6h**) — **Fait**
  - B9.3 Déplacement ticket (transaction + renumérotation) (**10h**) — **Fait**
  - B9.4 Archivage ticket (**2h**) — **Fait**
  - B9.5 **Création ticket + édition ticket** (endpoints manquants) (**6h**) — **À faire**
- **B10 — Hardening API (qualité, sécurité, docs)** (**18h**) — **En cours**
  - B10.1 Normalisation messages d’erreur + cas limites (**6h**)
  - B10.2 Revue sécurité (permissions, non-membre, ressources archivées) (**4h**)
  - B10.3 Nettoyage/refactor (cohérence DTO, trim, types) (**4h**)
  - B10.4 Documentation endpoints + Postman à jour (**4h**)

#### Phase C — Frontend MVP (navigation + CRUD + drag & drop) (**154h**)
- **C1 — Socle frontend (Next App Router + styles + data layer)** (**21h**) — **En cours**
  - C1.1 Structure pages/layouts + routing (**6h**)
  - C1.2 Provider API (tRPC/HTTP) + React Query config (**8h**)
  - C1.3 Gestion erreurs/loading/empty states génériques (**4h**)
  - C1.4 Configuration env (`NEXT_PUBLIC_API_URL`) (**3h**)
- **C2 — Auth frontend (Firebase client)** (**21h**) — **À faire**
  - C2.1 Écrans login/register + validation formulaire (**10h**)
  - C2.2 Gestion session/token + refresh + stockage sécurisé (**7h**)
  - C2.3 Protection routes + redirections (**4h**)
- **C3 — Workspaces UI (liste, création, membres, invitations)** (**28h**) — **À faire**
  - C3.1 Liste workspaces + création/édition (**12h**)
  - C3.2 Page workspace : boards + stats (**6h**)
  - C3.3 Membres (liste, ajout, changement rôle, retrait) (**6h**)
  - C3.4 Invitations (générer, lister, annuler, accepter) (**4h**)
- **C4 — Boards UI (liste, création, paramètres, reorder)** (**28h**) — **À faire**
  - C4.1 Liste boards (workspace) + création/archivage (**10h**)
  - C4.2 Paramètres board (titre/description/fond) (**6h**)
  - C4.3 Réordonnancement boards + persistance (**12h**)
- **C5 — Board view (colonnes + tickets) + drag & drop** (**35h**) — **À faire**
  - C5.1 Affichage colonnes + tickets (lecture) (**8h**)
  - C5.2 CRUD colonnes (add/rename/delete) (**8h**)
  - C5.3 Déplacement tickets (d&d) + appel API move (**12h**)
  - C5.4 Reorder colonnes (d&d) + appel API order (**7h**)
- **C6 — Carte (modal) : lecture/édition MVP** (**14h**) — **À faire**
  - C6.1 Modal carte + édition titre/description (**10h**)
  - C6.2 Archivage carte + confirmations UX (**4h**)
- **C7 — Finitions UI/UX (responsive + thème)** (**7h**) — **À faire**
  - C7.1 Responsive minimal (mobile) (**4h**)
  - C7.2 Thème clair/sombre (optionnel) (**3h**)

#### Phase D — Collaboration & qualité (temps réel, commentaires, tests) (**98h**)
- **D1 — Commentaires + activité carte** (**24h**) — **À faire**
  - D1.1 Modèle + store comments (Firestore subcollection) (**8h**)
  - D1.2 Endpoints API (create/list) + permissions (**8h**)
  - D1.3 UI commentaires (liste + saisie) (**8h**)
- **D2 — Labels / due dates / assignations** (**28h**) — **À faire**
  - D2.1 Labels : modèle + endpoints + UI + filtres (**12h**)
  - D2.2 Due date : modèle + UI + indicateurs retard (**8h**)
  - D2.3 Assignations : endpoints + UI sélecteur membres (**8h**)
- **D3 — Collaboration “quasi temps réel”** (**21h**) — **À faire**
  - D3.1 Stratégie invalidation cache (React Query) (**7h**)
  - D3.2 Rafraîchissement intelligent (polling léger / focus refetch) (**7h**)
  - D3.3 (Option) listeners Firestore sur pages critiques (**7h**)
- **D4 — Tests (unit + intégration)** (**18h**) — **À faire**
  - D4.1 Tests permissions & accès (RBAC) (**6h**)
  - D4.2 Tests reorder/move (transactions) (**8h**)
  - D4.3 Tests d’intégration endpoints principaux (**4h**)
- **D5 — Observabilité & robustesse** (**7h**) — **À faire**
  - D5.1 Logs structurés + corrélation erreurs (**4h**)
  - D5.2 Rate limiting basique / protection abuse (optionnel) (**3h**)

#### Phase E — Industrialisation (CI/CD, déploiement, doc) (**42h**)
- **E1 — CI (GitHub Actions)** (**14h**) — **À faire**
  - E1.1 Jobs lint/typecheck/build monorepo (**8h**)
  - E1.2 Tests (si présents) + cache pnpm (**6h**)
- **E2 — Déploiement cloud** (**14h**) — **À faire**
  - E2.1 Backend (Cloud Run) + config env (**8h**)
  - E2.2 Frontend (hosting) + env + routing (**6h**)
- **E3 — Sécurité déploiement (secrets + règles Firestore)** (**7h**) — **À faire**
  - E3.1 Secret management (Firebase Admin creds) (**4h**)
  - E3.2 Règles Firestore minimales (RBAC) (**3h**)
- **E4 — Documentation & soutenance** (**7h**) — **À faire**
  - E4.1 Doc technique (archi + API + schéma Firestore) (**4h**)
  - E4.2 Préparation démo + scénario + slides (optionnel) (**3h**)

### 13.4. Planning calendaire (semaine par semaine)
Hypothèse : 2 personnes × 3 jours/semaine = **6 JH/semaine** (répartition indicative 3 JH / 3 JH).

| Semaine | Période | Objectifs | Répartition (indicative) |
|---|---|---|---|
| S45 | 03/11 → 09/11 | Cadrage, backlog, architecture monorepo, conventions, socle Firebase | Younes: archi/monorepo (3) · Schekina: Firebase/Next socle (3) |
| S46 | 10/11 → 16/11 | Auth backend (guard), user sync, endpoints profil | Younes: guard/auth (3) · Schekina: users store + endpoints (3) |
| S47 | 17/11 → 23/11 | Workspaces CRUD + RBAC workspace + modèles | Younes: workspaces service/store (3) · Schekina: controller + validations (3) |
| S48 | 24/11 → 30/11 | Membres workspace + garde-fous (dernier admin) | Younes: permissions & access service (3) · Schekina: endpoints membres + tests manuels (3) |
| S49 | 01/12 → 07/12 | Invitations (create/list/cancel/accept/decline) + URL d’invite | Younes: store transactions (3) · Schekina: controller + scénarios (3) |
| S50 | 08/12 → 14/12 | Boards (CRUD + reorder) + archivage | Younes: boards store/service (3) · Schekina: endpoints workspace→boards (3) |
| S51 | 15/12 → 21/12 | Colonnes (CRUD + reorder) + règles (no delete with tickets) | Younes: store columns/reorder (3) · Schekina: controller + validations (3) |
| S52 | 22/12 → 28/12 | Tickets (list + move transactionnel + archive) | Younes: move transaction (3) · Schekina: endpoints + tests manuels (3) |
| S01 | 29/12 → 04/01 | Frontend : auth UI + layout + navigation workspaces/boards | Younes: pages + routing (3) · Schekina: UI/UX + data fetching (3) |
| S02 | 05/01 → 11/01 | Frontend board view : colonnes + cartes (liste) | Younes: queries + state (3) · Schekina: composants board/column (3) |
| S03 | 12/01 → 18/01 | Drag & drop colonnes/cartes + mapping API move/reorder | Younes: d&d + intégration (3) · Schekina: UX + edge cases (3) |
| S04 | 19/01 → 25/01 | Fonctionnalités “Should” : commentaires, labels, assignations (selon avancement) | Younes: API extensions (3) · Schekina: UI modal carte (3) |
| S05 | 26/01 → 31/01 | Stabilisation : tests, CI/CD, doc, démo finale | Younes: CI/CD + backend hardening (3) · Schekina: doc + QA + polish UI (3) |

> Remarque : ce planning est volontairement “prévisionnel”, mais il sert de **cadre de justification** de la charge totale (78 JH) et permet de relier les livrables à la période 02/11 → 31/01.

---

## 14. Risques et plans de mitigation
- **Complexité drag & drop** (UX + cohérence données)  
  - Mitigation : implémentation progressive, tests transactionnels move/reorder.
- **Règles Firestore / sécurité**  
  - Mitigation : RBAC côté API + règles minimales côté DB ; revues croisées.
- **Temps réel** (listeners, latence, conflits)  
  - Mitigation : MVP sans temps réel, puis ajout incrémental.
- **Scope creep** (Trello est très riche)  
  - Mitigation : MoSCoW, MVP strict + fonctionnalités bonus listées.

---

## 15. Critères de validation (Definition of Done)
- Auth + profils fonctionnels.
- Un utilisateur peut créer workspace/board/colonnes/cartes et déplacer des cartes.
- Les droits (roles) sont respectés et testables.
- L’app est utilisable sur desktop, avec un minimum de responsive.
- CI passe (lint/typecheck/build) et documentation d’installation est fournie.

---

## 16. Livrables attendus
- Application web fonctionnelle (MVP Trello-like)
- Backend NestJS déployable, sécurisé
- Schéma Firestore documenté
- Documentation (installation, architecture, API)
- Pipeline CI/CD (lint/typecheck/build/tests)

---

## Annexe A — État d’avancement “constaté” (alignement avec le repo)
> Cette annexe sert à **justifier le travail déjà réalisé**, tout en restant cohérent avec un cahier des charges “pré-projet”.

### A.1. Base monorepo et outillage (déjà en place)
- Monorepo Turborepo + `pnpm` workspaces.
- `apps/api` (NestJS) + `apps/web` (NextJS).
- Packages :
  - `@taskly/firebase` (providers Firestore/Auth)
  - `@taskly/auth` (guard + décorateur CurrentUser)
  - `@taskly/database` (services/stores Firestore)
  - `@taskly/shared` (permissions)
  - `@taskly/trpc` (router partagé)

### A.2. Backend — fonctionnalités déjà implémentées (constat)
- **Auth backend** : vérification Bearer token + hydratation `CurrentUser`.
- **Users** : endpoints `/users/me`, update, delete, search.
- **Workspaces** :
  - CRUD + archivage.
  - membres (list/add/patch/delete) avec garde-fous (dernier admin).
  - invitations (create/list/cancel/accept/decline) + expiration.
- **Boards** :
  - création via workspace + list + reorder + archivage.
  - lecture/patch du board.
- **Colonnes** :
  - colonnes par défaut à la création d’un board.
  - CRUD + reorder.
  - suppression interdite si tickets actifs.
- **Tickets** :
  - list (board et colonne)
  - move transactionnel (réindexation positions)
  - archivage

### A.3. Écarts identifiés vs cible Trello-like (reste à faire)
- Création/édition d’un ticket (endpoints manquants).
- Détails de carte : labels, due date, assignations, checklist, commentaires, pièces jointes.
- Frontend réel (au-delà de la page de test tRPC).
- Temps réel (listeners) ou stratégie d’invalidation sophistiquée.
- CI/CD cloud (build + déploiement automatisé).

---

## Annexe B — Notes d’architecture (justification des choix)
- **Firestore “subcollections”** :
  - membership : `workspaces/{id}/members/{userId}` (lookup direct)
  - requêtes transverses : `collectionGroup('members')` pour lister les workspaces d’un user
- **Transactions** :
  - reorder boards/columns : recalcul positions atomique
  - move ticket : recalcul positions source + cible atomique
- **RBAC** :
  - permissions simples (`workspace.*`, `board.*`, `ticket.*`) + matching par préfixe (`.*`)
  - matrice de permissions dissociée (workspace vs board/ticket)
