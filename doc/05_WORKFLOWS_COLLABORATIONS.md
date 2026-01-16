# Workflows et Collaborations dans Taskly

## 🤝 Collaboration en Équipe

### Paradigme de Collaboration

Taskly est conçu pour permettre à plusieurs utilisateurs de collaborer sur le **même tableau en temps réel**.

```
┌─────────────┐
│   Utilisateur A     │
│  (Firefox)          │
└────────┬────────────┘
         │
         │ (WebSocket / HTTP)
         │
    ┌────▼────┐
    │ Firestore   │
    │ (Real-time) │
    └────┬────────┘
         │
         │ (Listener updates)
         │
┌────────▼─────────┐
│  Utilisateur B    │
│  (Chrome)         │
│ (voit les changes │
│  en direct)       │
└────────────────────┘
```

### Exemple : Deux Utilisateurs Créent une Carte

```
Timeline:

T=0s: Alice clique "New Card"
     ↓ Crée ticket id=123

T=0.1s: Backend: ticket créé
        ↓ Firestore document créé
        ↓ Activity log créé

T=0.2s: Firestore notifie tous les listeners
        ↓ Bob reçoit l'update en temps réel
        ↓ Son UI affiche la nouvelle carte

T=1s: Bob clique sur la carte
      ↓ Ajoute un commentaire
      ↓ Alice voit le commentaire immédiatement
```

---

## 📋 Workflows Courants

### Workflow 1 : Gestion d'une Sprint

```
1. Planification
   ├─ Admin crée un nouveau Board "Sprint #42"
   ├─ Crée les colonnes : "Backlog", "In Progress", "Review", "Done"
   └─ Ajoute des labels : "Bug", "Feature", "Task"

2. Assignation
   ├─ Team lead ajoute des tickets au Backlog
   ├─ Assigne les tickets aux développeurs
   └─ Fixe les due dates

3. Exécution
   ├─ Dev 1 prend un ticket : Backlog → In Progress
   ├─ Dev 2 fait de même
   ├─ Échanges dans les commentaires
   └─ QA ajoute des tickets de bugs trouvés

4. Review & Merge
   ├─ Dev 1 crée une PR
   ├─ Commentaire sur le ticket : "PR #456 ready"
   ├─ Dev 1 déplace : In Progress → Review
   ├─ Reviewer approuve
   └─ Dev 1 déplace : Review → Done

5. Retro
   ├─ Sprint fermé (archivement des tickets)
   ├─ Analyse de l'historique d'activité
   └─ Préparation du prochain sprint
```

### Workflow 2 : Suivi des Bugs

```
1. Bug Signalé
   ├─ QA crée ticket : "Image not rendering"
   ├─ Label: "Bug", Priority: "High"
   └─ Board: "Support"

2. Triage
   ├─ Tech Lead assigne à Dev A
   ├─ Ajoute label : "Backend"
   └─ Fixed due date: demain

3. Investigation
   ├─ Dev A ajoute comment : "Checking image service"
   ├─ Cherche root cause
   └─ Ajoute 2 attachments : screenshots

4. Résolution
   ├─ Dev A crée un fix
   ├─ Ajoute comment : "Fixed in main"
   ├─ Assigne à QA pour test
   └─ Déplace : In Progress → QA Testing

5. Validation
   ├─ QA valide le fix
   ├─ Ajoute comment : "Verified ✅"
   └─ Déplace : QA Testing → Done

6. Archivage
   ├─ Après 2 semaines, ticket archivé
   └─ Reste dans l'historique d'activité
```

---

## 📢 Système de Notifications

### Types de Notifications

| Type | Événement | Destinataire |
|------|-----------|--------------|
| **assigned** | Un ticket m'est assigné | Assigné |
| **mentioned** | Je suis mentionné (@username) | Mentionné |
| **commented** | Quelqu'un commente mon ticket | Auteur + participants |
| **reminder** | Rappel du ticket que j'ai demandé | Utilisateur |
| **team_update** | Un membre rejoint/quitte | Tous les admins |

### Implémentation des Notifications

```typescript
// Notification service
@Injectable()
export class NotificationsService {
  /**
   * Notifier un utilisateur
   */
  async create(input: CreateNotificationDto): Promise<Notification> {
    const notification = {
      id: generateId(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      isRead: false,
      createdAt: new Date(),
    };

    await db.collection('notifications').add(notification);

    // Optionnel: WebSocket emit pour temps réel
    this.eventEmitter.emit('notification:created', {
      userId: input.userId,
      notification,
    });

    return notification;
  }

  /**
   * Notifier lors d'une assignation
   */
  async notifyAssigned(
    ticketId: string,
    assigneeId: string,
    assignedBy: string,
  ): Promise<void> {
    const ticket = await db.collection('tickets').doc(ticketId).get();

    await this.create({
      userId: assigneeId,
      type: 'assigned',
      title: 'Nouveau ticket assigné',
      message: `${assignedBy} t'a assigné: "${ticket.data().title}"`,
      resourceId: ticketId,
      resourceType: 'ticket',
    });
  }

  /**
   * Notifier lors d'un commentaire
   */
  async notifyCommented(
    ticketId: string,
    commentAuthorId: string,
    commentContent: string,
  ): Promise<void> {
    const ticket = await db.collection('tickets').doc(ticketId).get();
    const ticketData = ticket.data();

    // Notifier l'auteur du ticket
    if (ticketData.ownerId !== commentAuthorId) {
      await this.create({
        userId: ticketData.ownerId,
        type: 'commented',
        title: 'Nouveau commentaire',
        message: `${commentAuthorId} a commenté: "${commentContent.substring(0, 50)}..."`,
        resourceId: ticketId,
        resourceType: 'ticket',
      });
    }

    // Notifier les assignés
    for (const assigneeId of ticketData.assigneeIds || []) {
      if (assigneeId !== commentAuthorId) {
        await this.create({
          userId: assigneeId,
          type: 'commented',
          title: 'Nouveau commentaire sur ton ticket',
          message: `${commentAuthorId}: "${commentContent.substring(0, 50)}..."`,
          resourceId: ticketId,
          resourceType: 'ticket',
        });
      }
    }
  }

  /**
   * Lister les notifications d'un utilisateur
   */
  async list(userId: string, limit = 50): Promise<Notification[]> {
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

  /**
   * Compter les non-lues
   */
  async countUnread(userId: string): Promise<number> {
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();

    return snapshot.size;
  }

  /**
   * Marquer comme lu
   */
  async markRead(notificationId: string): Promise<void> {
    await db
      .collection('notifications')
      .doc(notificationId)
      .update({
        isRead: true,
        readAt: new Date(),
      });
  }

  /**
   * Marquer tout comme lu
   */
  async markAllRead(userId: string): Promise<number> {
    const unread = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();

    let count = 0;
    for (const doc of unread.docs) {
      await doc.ref.update({
        isRead: true,
        readAt: new Date(),
      });
      count++;
    }

    return count;
  }
}
```

---

## 📊 Historique d'Activité

### Modèle : Activity Log

```typescript
{
  id: string;
  workspaceId: string;
  boardId?: string;
  ticketId?: string;
  
  action: 'create' | 'update' | 'delete' | 'move' | 'comment' | 'assign';
  resourceType: 'workspace' | 'board' | 'column' | 'ticket' | 'comment';
  resourceId: string;
  
  actor: {
    userId: string;
    displayName: string;
  };
  
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  
  createdAt: Timestamp;
}
```

### Exemple : Tracker un Changement

```typescript
// Quand un ticket est mis à jour
await activityLogsService.create({
  workspaceId: ticket.workspaceId,
  boardId: ticket.boardId,
  ticketId: ticket.id,
  action: 'update',
  resourceType: 'ticket',
  resourceId: ticket.id,
  actor: {
    userId: user.id,
    displayName: user.displayName,
  },
  changes: [
    {
      field: 'priority',
      oldValue: 'low',
      newValue: 'high',
    },
    {
      field: 'dueDate',
      oldValue: null,
      newValue: '2026-01-31',
    },
  ],
});
```

### Frontend: Afficher l'Historique

```typescript
// Récupérer l'historique d'un ticket
async getTicketActivity(ticketId: string): Promise<ActivityLog[]> {
  const snapshot = await db
    .collection('activity-logs')
    .where('ticketId', '==', ticketId)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

// Afficher dans un timeline
// "Alice changed priority from low to high - 5 mins ago"
// "Bob added a comment - 10 mins ago"
// "Alice created this ticket - 1 hour ago"
```

---

## 👁️ Système de Watchers (Observateurs)

### Concept

```
┌─────────────────────────────────────┐
│       Ticket "Fix login bug"        │
│                                     │
│  Watching:                          │
│  • Alice (créatrice)                │
│  • Bob (assigné)                    │
│  • Charlie (a commenté)             │
│                                     │
│  Quand quelque chose change:        │
│  → Ils reçoivent une notif          │
│  → Reçoivent les activity logs      │
└─────────────────────────────────────┘
```

### Implémentation

```typescript
// Structure de données
interface WatchStatus {
  ticketId: string;
  userId: string;
  isWatching: boolean;  // true/false
  createdAt: Timestamp;
}

// Récupérer le statut
async getWatchStatus(
  ticketId: string,
  userId: string,
): Promise<boolean> {
  const watch = await db
    .collection('tickets')
    .doc(ticketId)
    .collection('watches')
    .doc(userId)
    .get();

  return watch.exists ? watch.data().isWatching : false;
}

// Activer/désactiver le watching
async setWatchStatus(
  ticketId: string,
  userId: string,
  watching: boolean,
): Promise<void> {
  await db
    .collection('tickets')
    .doc(ticketId)
    .collection('watches')
    .doc(userId)
    .set({
      ticketId,
      userId,
      isWatching: watching,
      createdAt: new Date(),
    });
}

// Obtenir les utilisateurs qui regardent
async getWatchers(ticketId: string): Promise<string[]> {
  const snapshot = await db
    .collection('tickets')
    .doc(ticketId)
    .collection('watches')
    .where('isWatching', '==', true)
    .get();

  return snapshot.docs.map((doc) => doc.data().userId);
}

// Auto-watch quand l'utilisateur interagit
async autoWatchOnInteraction(
  ticketId: string,
  userId: string,
): Promise<void> {
  // Ignorer si déjà watching
  const isWatching = await this.getWatchStatus(ticketId, userId);
  if (isWatching) return;

  // Auto-watch
  await this.setWatchStatus(ticketId, userId, true);
}
```

---

## 🔄 Synchronisation Temps Réel

### Frontend: Listeners Firestore

```typescript
// React component
export function TicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // Listener sur le ticket
    const unsubTicket = onSnapshot(
      doc(db, 'tickets', ticketId),
      (doc) => {
        setTicket(doc.data());
      },
    );

    // Listener sur les commentaires
    const unsubComments = onSnapshot(
      collection(db, `tickets/${ticketId}/comments`),
      (snapshot) => {
        setComments(snapshot.docs.map((doc) => doc.data()));
      },
    );

    // Cleanup
    return () => {
      unsubTicket();
      unsubComments();
    };
  }, [ticketId]);

  return (
    <div>
      <h1>{ticket?.title}</h1>
      <Comments comments={comments} />
    </div>
  );
}
```

### Architecture du Temps Réel

```
Frontend
  ↓ (set listener)
Firestore
  ↓ (document changed)
Firestore
  ↓ (emit update)
Frontend
  ↓ (React state updated)
UI (re-rendered)
```

---

## 🚀 Gestion des Performances

### Problèmes Courants

#### Problème 1 : Trop de listeners
```
❌ MAUVAIS: Ouvrir un listener pour chaque ticket dans une liste
✅ BON: Utiliser la pagination + listeners sélectifs
```

#### Problème 2 : Notifications spam
```
❌ MAUVAIS: Notifier à chaque keystroke
✅ BON: Debounce ou notifier seulement quand terminer
```

#### Problème 3 : Denormalization oubliée
```
❌ MAUVAIS: Lookup l'utilisateur pour chaque commentaire
✅ BON: Inclure displayName dans le commentaire
```

### Bonnes Pratiques

```typescript
// 1. Pagination des commentaires
async getComments(
  ticketId: string,
  pageSize = 20,
  cursor?: string,
): Promise<Comment[]> {
  let query = db
    .collection('tickets')
    .doc(ticketId)
    .collection('comments')
    .orderBy('createdAt', 'desc')
    .limit(pageSize);

  if (cursor) {
    query = query.startAfter(cursor);
  }

  return (await query.get()).docs.map((doc) => doc.data());
}

// 2. Debounce les mises à jour
const debouncedUpdate = debounce(
  (ticketId: string, data: any) => {
    ticketsService.update(ticketId, data);
  },
  1000, // Attendre 1s après dernier keystroke
);

// 3. Batch les opérations
async moveMultipleTickets(
  moves: Array<{ ticketId: string; columnId: string; order: number }>,
): Promise<void> {
  return await db.runTransaction(async (transaction) => {
    for (const move of moves) {
      const ticketRef = db.collection('tickets').doc(move.ticketId);
      transaction.update(ticketRef, {
        columnId: move.columnId,
        order: move.order,
      });
    }
  });
}
```

---

## 🎯 Intégrations Futures

### Webhooks
```typescript
// Notifier un système externe
async notifyExternal(event: WorkspaceEvent): Promise<void> {
  const workspace = await workspacesService.get(event.workspaceId);

  if (!workspace.webhookUrl) return;

  await fetch(workspace.webhookUrl, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}
```

### Slack Integration
```
Utilisateur crée un ticket → 
  → POST à Slack webhook → 
  → Message dans #general
```

### Exports et Reports
```typescript
// Exporter l'historique d'un sprint
async exportSprintReport(boardId: string): Promise<string> {
  const tickets = await ticketsService.list(boardId);
  const activities = await activityLogsService.list(boardId);

  return generateMarkdownReport(tickets, activities);
}
```

---

## 📖 Documentation Complémentaire
- [Architecture Globale](./01_ARCHITECTURE_GLOBALE.md)
- [Gestion des Tickets](./04_GESTION_TICKETS.md)
- [Système des Permissions](./03_SYSTEME_PERMISSIONS.md)
