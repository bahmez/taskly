# Architecture Firestore de Taskly

## 🔥 Pourquoi Firestore ?

### Avantages Choisis
1. **Base de données temps réel** : Listeners permettent les mises à jour en temps réel
2. **Scalabilité** : Croissance automatique sans gestion d'infrastructure
3. **Sécurité intégrée** : Security Rules natives
4. **Intégration Firebase** : Pas besoin d'un serveur auth séparé
5. **SDK officiel** : Support multi-plateforme (Node.js, Web, Mobile)
6. **Serverless** : Coûts basés sur l'utilisation
7. **Transactions ACID** : Garanties sur la cohérence des données

### Comparaison avec PostgreSQL
- **PostgreSQL** : Relationnel, complexe en scalabilité, nécessite un serveur
- **Firestore** : Document-based, scalable par défaut, managed par Google

**Décision** : Firestore choisie pour MVP sur un projet étudiant avec ressources limitées.

## 📋 Schéma des Collections

### 1. **users** - Utilisateurs de l'application
```typescript
// Document: userId (uid Firebase)
{
  id: string;                    // uid Firebase (clé)
  email: string;
  displayName: string;
  photoUrl?: string;             // Avatar user
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes** : email (unique implicite via Firebase Auth)
**Security** : Utilisateurs ne lisent que leurs propres données

---

### 2. **workspaces** - Espaces de travail (équipes)
```typescript
{
  id: string;                    // Firestore doc ID
  title: string;
  description?: string;
  avatar?: string;
  ownerId: string;              // Référence à users
  archivedAt?: Timestamp;       // null = actif
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Sous-collection** : `workspaces/{workspaceId}/members`
**Indexes** : ownerId, archivedAt

---

### 3. **workspaces/{workspaceId}/members** - Membres du workspace
```typescript
{
  id: string;                    // userId
  userId: string;               // Référence à users
  role: 'admin' | 'member';    // Rôle dans le workspace
  joinedAt: Timestamp;
  // Denormalization : email, displayName (pour perf)
  email?: string;
  displayName?: string;
}
```

**Purpose** : Lister rapidement les membres sans JOIN
**Denormalization** : email, displayName copiés pour éviter les lookups

---

### 4. **boards** - Tableaux (kanban)
```typescript
{
  id: string;
  title: string;
  description?: string;
  workspaceId: string;          // Référence à workspaces
  ownerId: string;              // Créateur
  background?: {
    type: 'color' | 'gradient' | 'image';
    value: string;              // hex, CSS gradient, ou image URL
  };
  order: number;                // Pour le réordonnancement
  archivedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes** : workspaceId, archivedAt, order

---

### 5. **boards/{boardId}/columns** - Colonnes (listes)
```typescript
{
  id: string;
  title: string;
  boardId: string;              // Référence
  order: number;                // Position dans le board
  archivedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Purpose** : Chaque colonne contient des tickets
**Order** : Utilisé pour le drag-and-drop

---

### 6. **tickets** - Cartes/Tâches
```typescript
{
  id: string;
  title: string;
  description?: string;
  boardId: string;              // Référence
  columnId: string;             // Colonne actuelle
  workspaceId: string;          // Denormalization (pour queries)
  order: number;                // Position dans la colonne
  ownerId: string;              // Créateur
  
  // Métadonnées
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Timestamp;
  
  // Relations
  assigneeIds: string[];        // Array d'userIds
  labelIds: string[];           // Array de labelIds
  
  // Status
  archivedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes** : boardId, columnId, workspaceId, archivedAt
**Denormalization** : workspaceId permet query rapide par workspace

---

### 7. **boards/{boardId}/labels** - Étiquettes
```typescript
{
  id: string;
  title: string;
  color: string;                // Hex color code
  boardId: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Scope** : Un label appartient à UN board
**Purpose** : Catégoriser les tickets

---

### 8. **tickets/{ticketId}/comments** - Commentaires sur une carte
```typescript
{
  id: string;
  content: string;
  authorId: string;             // Référence à users
  ticketId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Sub-collection** : Hiérarchie logique
**Indexing** : createdAt pour tri

---

### 9. **tickets/{ticketId}/attachments** - Pièces jointes
```typescript
{
  id: string;
  ticketId: string;
  filename: string;
  contentType: string;
  objectPath: string;           // Chemin GCS
  status: 'pending' | 'uploaded';
  createdBy: string;            // userId
  size?: number;                // Bytes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**GCS Integration** : objectPath référence le fichier dans Google Cloud Storage
**Status** : "pending" → "uploaded" après complétude du upload

---

### 10. **notifications** - Notifications pour utilisateurs
```typescript
{
  id: string;
  userId: string;               // Destinataire
  type: 'mention' | 'assignment' | 'comment' | 'reminder';
  title: string;
  message: string;
  resourceId?: string;          // Référence ticket/board/etc
  resourceType?: string;        // 'ticket', 'comment', etc
  isRead: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;
}
```

**TTL** : Optionnellement supprimer après 30 jours si lues
**Indexing** : userId, isRead, createdAt

---

### 11. **activity-logs** - Historique d'activité
```typescript
{
  id: string;
  workspaceId: string;
  boardId?: string;
  ticketId?: string;
  
  action: 'create' | 'update' | 'delete' | 'move' | 'comment';
  resourceType: 'ticket' | 'board' | 'column' | 'comment';
  resourceId: string;
  
  actor: {
    userId: string;
    displayName: string;
  };
  
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  createdAt: Timestamp;
}
```

**Purpose** : Audit trail et historique visible à l'utilisateur
**Indexing** : workspaceId, boardId, ticketId, createdAt

---

### 12. **ticket-reminders** - Rappels de tickets
```typescript
{
  id: string;
  ticketId: string;
  userId: string;               // Utilisateur ayant demandé le rappel
  remindAt: Timestamp;          // Quand envoyer le rappel
  status: 'pending' | 'sent' | 'dismissed';
  createdAt: Timestamp;
  sentAt?: Timestamp;
}
```

**Purpose** : Déclencher notifications à une heure donnée
**Cron Job** : Un service backend interroge régulièrement les reminders "pending"

---

### 13. **invitations** - Invitations en attente
```typescript
{
  id: string;
  workspaceId: string;
  email: string;                // Email invité
  role: 'admin' | 'member';
  token: string;                // Token sécurisé pour accepter
  status: 'pending' | 'accepted' | 'declined';
  createdBy: string;            // userId
  createdAt: Timestamp;
  expiresAt: Timestamp;         // Expiration du lien (7 jours)
  acceptedAt?: Timestamp;
}
```

**Security** : Token aléatoire, pas d'email direct
**TTL** : Supprimer après expiration (via cron)

---

## 🔗 Denormalization Strategy

### Principes
1. **Scalabilité de lecture** : Répliquer les données fréquemment lues
2. **Éviter les N+1 queries** : Inclure infos essentielles dans le document
3. **Trade-off** : Ecritures plus complexes pour lectures plus rapides

### Exemples dans Taskly

#### Example 1 : Members denormalization
```
// Au lieu de :
workspace.members[] = [userId1, userId2]
// ... puis lookup chaque user pour son email

// On fait :
workspace.members[].email = "..."
workspace.members[].displayName = "..."
// Lecture + rapide, write un peu plus complexe
```

#### Example 2 : Tickets denormalization
```
// Ticket inclut workspaceId
// Permet : db.collection('tickets')
//           .where('workspaceId', '==', wsId)
// Sans faire : db.collection('boards')
//               .where('workspaceId', '==', wsId)
//               .get() puis foreach tickets
```

---

## 📊 Indexes et Queries Critiques

### Indexes Composites Requis

```firestore
// Collection: tickets
// Index 1: workspaceId (Asc) + archivedAt (Asc)
// Index 2: boardId (Asc) + columnId (Asc) + order (Asc)

// Collection: boards
// Index 1: workspaceId (Asc) + archivedAt (Asc) + createdAt (Desc)

// Collection: activity-logs
// Index 1: workspaceId (Asc) + createdAt (Desc)
```

### Queries Courants

```typescript
// 1. Lister les boards actifs d'un workspace
db.collection('boards')
  .where('workspaceId', '==', workspaceId)
  .where('archivedAt', '==', null)
  .orderBy('order', 'asc')

// 2. Lister les tickets d'une colonne
db.collection('tickets')
  .where('boardId', '==', boardId)
  .where('columnId', '==', columnId)
  .where('archivedAt', '==', null)
  .orderBy('order', 'asc')

// 3. Lister les commentaires d'un ticket
db.collection('tickets').doc(ticketId)
  .collection('comments')
  .orderBy('createdAt', 'desc')

// 4. Historique d'activité d'un workspace
db.collection('activity-logs')
  .where('workspaceId', '==', workspaceId)
  .orderBy('createdAt', 'desc')
  .limit(100)
```

---

## 🔐 Firestore Security Rules

### Principes
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuth() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function hasWorkspaceRole(workspaceId, role) {
      return isAuth() &&
        exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)) &&
        (role in ['admin', 'member'] && 
         get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)).data.role >= role);
    }
    
    // Collection: users
    match /users/{userId} {
      allow read: if isAuth() && isOwner(userId);
      allow create: if isAuth() && isOwner(userId);
      allow update: if isAuth() && isOwner(userId);
      allow delete: if false;
    }
    
    // Collection: workspaces
    match /workspaces/{workspaceId} {
      allow read: if hasWorkspaceRole(workspaceId, 'member');
      allow create: if isAuth();
      allow update: if hasWorkspaceRole(workspaceId, 'admin');
      allow delete: if hasWorkspaceRole(workspaceId, 'admin');
      
      // Sous-collection: members
      match /members/{userId} {
        allow read: if hasWorkspaceRole(workspaceId, 'member');
        allow write: if hasWorkspaceRole(workspaceId, 'admin');
      }
    }
    
    // Collection: boards
    match /boards/{boardId} {
      allow read: if hasWorkspaceRole(resource.data.workspaceId, 'member');
      allow create: if isAuth() && hasWorkspaceRole(request.resource.data.workspaceId, 'member');
      allow update: if hasWorkspaceRole(resource.data.workspaceId, 'admin');
      allow delete: if hasWorkspaceRole(resource.data.workspaceId, 'admin');
    }
    
    // Collection: tickets
    match /tickets/{ticketId} {
      allow read: if hasWorkspaceRole(resource.data.workspaceId, 'member');
      allow create: if isAuth() && hasWorkspaceRole(request.resource.data.workspaceId, 'member');
      allow update: if hasWorkspaceRole(resource.data.workspaceId, 'member');
      
      // Comments & attachments
      match /{anyResource=**} {
        allow read: if hasWorkspaceRole(resource.data.workspaceId, 'member');
        allow write: if isAuth() && hasWorkspaceRole(resource.data.workspaceId, 'member');
      }
    }
  }
}
```

---

## 📈 Stratégie de Pagination

Pour lister les tickets/boards avec pagination :

```typescript
// Page 1
const snapshot = await db.collection('tickets')
  .where('boardId', '==', boardId)
  .orderBy('order')
  .limit(20)
  .get();

const lastDoc = snapshot.docs[snapshot.docs.length - 1];
const cursor = lastDoc.id;

// Page suivante
const nextPage = await db.collection('tickets')
  .where('boardId', '==', boardId)
  .orderBy('order')
  .startAfter(lastDoc)
  .limit(20)
  .get();
```

**Cursor-based** : Plus scalable que offset, évite duplicatas

---

## 🗑️ Nettoyage et Maintenance

### TTL et Archivage
- **Soft delete** : `archivedAt` au lieu de supprimer
- **TTL** : Firestore TTL policy sur certaines collections (notifications, invitations)
- **Cron jobs** : Backend supprime les données expirées

### Exemple : Supprimer les invitations expirées
```typescript
// Toutes les nuits, supprimer les invitations > 7 jours
const expired = await db.collection('invitations')
  .where('expiresAt', '<', new Date())
  .where('status', '==', 'pending')
  .get();

for (const doc of expired.docs) {
  await doc.ref.delete();
}
```

---

## 📖 Documentation Complémentaire
- [Architecture Globale](./01_ARCHITECTURE_GLOBALE.md)
- [Système des Permissions](./03_SYSTEME_PERMISSIONS.md)
- [Gestion des Tickets](./04_GESTION_TICKETS.md)
