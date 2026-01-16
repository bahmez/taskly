# Gestion des Tickets dans Taskly

## 📌 Concept du Ticket

Un **ticket** (ou **card** en terminologie Trello) est une **unité de travail atomique** dans Taskly.

### Exemple de Ticket
```
┌─────────────────────────────────┐
│ Implémenter authentification   │
├─────────────────────────────────┤
│ Description                     │
│ Intégrer Firebase Auth au front │
│ Priority: High                  │
│ Assigned to: Alice, Bob         │
│ Labels: Backend, Urgent         │
│ Due: 2026-01-31                 │
├─────────────────────────────────┤
│ 3 comments                      │
│ 2 attachments                   │
│ Checklist: 5/8 completed        │
└─────────────────────────────────┘
```

---

## 🔄 Cycle de Vie d'un Ticket

### États du Ticket

```
┌─────────────┐
│   CREATED   │  Créé (dans une colonne)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    ACTIVE   │  Actif, peut être déplacé entre colonnes
└──────┬──────┘
       │ (User clique Archive)
       ↓
┌─────────────┐
│   ARCHIVED  │  Archivé (soft delete)
└─────────────┘
```

### Transitions Autorisées

```
CREATED  → ACTIVE    (automatique ou via update)
         → ARCHIVED  (pas commun)

ACTIVE   → ACTIVE    (déplacement, édition)
         → ARCHIVED  (archivage)

ARCHIVED → ACTIVE    (restauration possible)
```

---

## 🎬 Operations Courantes sur les Tickets

### 1. Créer un Ticket

```typescript
// Endpoint : POST /api/tickets
// ou tRPC : boards.createTicket

interface CreateTicketDto {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  labelIds?: string[];
  assigneeIds?: string[];
}

// Flux :
// 1. Valider l'input (Zod/class-validator)
// 2. Vérifier que board/column existe et appartient au workspace
// 3. Vérifier permissions (user a accès au board)
// 4. Récupérer le dernier order dans la colonne
// 5. Créer le ticket avec order = lastOrder + 1
// 6. Créer un activity log
// 7. Retourner le ticket créé

const ticket = await ticketsService.create({
  boardId: 'board-123',
  columnId: 'col-456',
  title: 'Nouvelle feature',
  ownerId: user.id,
  workspaceId: workspace.id,
  order: 42,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

### 2. Éditer un Ticket

```typescript
// Endpoint : PATCH /api/tickets/:ticketId

interface UpdateTicketDto {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | null;
  // Autres champs sauf columnId (utiliser moveTicket)
}

// Flux :
// 1. Récupérer le ticket
// 2. Vérifier permissions (owner + admin du workspace)
// 3. Valider l'input
// 4. Mettre à jour le document
// 5. Créer un activity log avec les changements
// 6. Retourner le ticket mis à jour

await ticketsService.update(ticketId, {
  title: 'Nouveau titre',
  priority: 'high',
  updatedAt: new Date(),
});
```

### 3. Déplacer un Ticket (Drag & Drop)

```typescript
// Endpoint : PATCH /api/tickets/:ticketId/move
// ou tRPC : boards.moveTicket

interface MoveTicketDto {
  targetColumnId: string;
  targetOrder: number;  // Position dans la colonne
}

// Flux (le plus complexe) :
// 1. Récupérer le ticket ET la colonne source
// 2. Vérifier permissions
// 3. Récupérer les tickets de la colonne cible
// 4. Réorganiser les orders (éviter collisions)
// 5. Mettre à jour le ticket
// 6. Activity log
// 7. Notifier les utilisateurs observateurs

async moveTicket(
  ticketId: string,
  targetColumnId: string,
  targetOrder: number,
): Promise<Ticket> {
  // Transaction Firestore
  return await db.runTransaction(async (transaction) => {
    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticket = (await transaction.get(ticketRef)).data();

    const sameColumn = ticket.columnId === targetColumnId;

    if (sameColumn) {
      // Réordonner dans la même colonne
      await transaction.update(ticketRef, {
        order: targetOrder,
        updatedAt: new Date(),
      });
    } else {
      // Réordonner entre colonnes
      // 1. Récupérer les tickets de la colonne cible
      const targetTickets = await transaction.get(
        db.collection('tickets')
          .where('columnId', '==', targetColumnId)
          .orderBy('order'),
      );

      // 2. Insérer le ticket à la position
      const targetTicketDocs = targetTickets.docs;
      for (let i = targetOrder; i < targetTicketDocs.length; i++) {
        transaction.update(targetTicketDocs[i].ref, {
          order: i + 1,
        });
      }

      // 3. Mettre à jour le ticket déplacé
      transaction.update(ticketRef, {
        columnId: targetColumnId,
        order: targetOrder,
        updatedAt: new Date(),
      });
    }

    return { id: ticketId, ...ticket };
  });
}
```

### 4. Archiver un Ticket

```typescript
// Endpoint : DELETE /api/tickets/:ticketId
// ou PATCH /api/tickets/:ticketId/archive

// Flux :
// 1. Récupérer le ticket
// 2. Vérifier permissions
// 3. Soft delete : archiveAt = now()
// 4. Activity log
// 5. Notifier les utilisateurs

async archiveTicket(ticketId: string): Promise<void> {
  await db.collection('tickets').doc(ticketId).update({
    archivedAt: new Date(),
  });

  await activityLogsService.create({
    action: 'archive',
    resourceType: 'ticket',
    resourceId: ticketId,
  });
}
```

---

## 💬 Gestion des Commentaires

### Structure des Commentaires

```typescript
{
  id: string;
  ticketId: string;
  content: string;
  authorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Édits ultérieurs
  editHistory?: Array<{
    content: string;
    editedAt: Timestamp;
  }>;
}
```

### Opérations

```typescript
// Ajouter un commentaire
async addComment(
  ticketId: string,
  content: string,
  authorId: string,
): Promise<Comment> {
  const comment = {
    id: generateId(),
    ticketId,
    content,
    authorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db
    .collection('tickets')
    .doc(ticketId)
    .collection('comments')
    .doc(comment.id)
    .set(comment);

  // Notifier les utilisateurs
  await notificationsService.notifyCommentAdded(
    ticketId,
    authorId,
    content,
  );

  return comment;
}

// Éditer un commentaire
async updateComment(
  ticketId: string,
  commentId: string,
  newContent: string,
  userId: string,
): Promise<Comment> {
  const commentRef = db
    .collection('tickets')
    .doc(ticketId)
    .collection('comments')
    .doc(commentId);

  const comment = await commentRef.get();

  // Vérifier que c'est l'auteur
  if (comment.data().authorId !== userId) {
    throw new ForbiddenException('Cannot edit others comments');
  }

  // Ajouter à l'historique d'édits
  const updatedComment = {
    ...comment.data(),
    content: newContent,
    updatedAt: new Date(),
    editHistory: [
      ...(comment.data().editHistory || []),
      {
        content: comment.data().content,
        editedAt: comment.data().updatedAt,
      },
    ],
  };

  await commentRef.update(updatedComment);
  return updatedComment;
}
```

---

## 👥 Gestion des Assignations

### Modèle : Assignees

```typescript
// Lister les assignés
async getAssigneeIds(ticketId: string): Promise<string[]> {
  const ticket = await db.collection('tickets').doc(ticketId).get();
  return ticket.data().assigneeIds || [];
}

// Ajouter un assigné
async addAssignee(
  ticketId: string,
  userId: string,
): Promise<string[]> {
  const ticket = await db.collection('tickets').doc(ticketId).get();
  const assigneeIds = new Set(ticket.data().assigneeIds || []);

  if (assigneeIds.has(userId)) {
    return Array.from(assigneeIds); // Déjà assigné
  }

  assigneeIds.add(userId);

  await db.collection('tickets').doc(ticketId).update({
    assigneeIds: Array.from(assigneeIds),
  });

  // Notifier l'utilisateur
  await notificationsService.notifyAssigned(ticketId, userId);

  return Array.from(assigneeIds);
}

// Supprimer un assigné
async removeAssignee(
  ticketId: string,
  userId: string,
): Promise<string[]> {
  const ticket = await db.collection('tickets').doc(ticketId).get();
  const assigneeIds = new Set(ticket.data().assigneeIds || []);

  assigneeIds.delete(userId);

  await db.collection('tickets').doc(ticketId).update({
    assigneeIds: Array.from(assigneeIds),
  });

  return Array.from(assigneeIds);
}
```

---

## 🏷️ Gestion des Labels (Étiquettes)

### Modèle : Labels

```typescript
// Board peut avoir plusieurs labels
{
  id: string;
  boardId: string;
  title: string;        // "Bug", "Feature", etc
  color: string;        // Hex code
  order: number;
  createdAt: Timestamp;
}

// Ticket peut avoir plusieurs labels
{
  id: string;
  labelIds: string[];   // Array de label IDs
}
```

### Opérations

```typescript
// Créer un label sur un board
async createLabel(
  boardId: string,
  title: string,
  color: string,
): Promise<Label> {
  const labels = await db
    .collection('boards')
    .doc(boardId)
    .collection('labels')
    .orderBy('order', 'desc')
    .limit(1)
    .get();

  const maxOrder = labels.empty ? 0 : labels.docs[0].data().order;

  const label = {
    id: generateId(),
    boardId,
    title,
    color,
    order: maxOrder + 1,
    createdAt: new Date(),
  };

  await db
    .collection('boards')
    .doc(boardId)
    .collection('labels')
    .doc(label.id)
    .set(label);

  return label;
}

// Ajouter un label à un ticket
async addLabel(ticketId: string, labelId: string): Promise<string[]> {
  const ticket = await db.collection('tickets').doc(ticketId).get();
  const labelIds = new Set(ticket.data().labelIds || []);

  labelIds.add(labelId);

  await db.collection('tickets').doc(ticketId).update({
    labelIds: Array.from(labelIds),
  });

  return Array.from(labelIds);
}
```

---

## ✅ Checklists dans les Tickets

### Modèle : Checklist

```typescript
{
  id: string;
  ticketId: string;
  title: string;
  items: ChecklistItem[];
  order: number;
  createdAt: Timestamp;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  createdAt: Timestamp;
}
```

### Opérations

```typescript
// Créer une checklist
async createChecklist(
  ticketId: string,
  title: string,
): Promise<Checklist> {
  const checklist = {
    id: generateId(),
    ticketId,
    title,
    items: [],
    order: 0,
    createdAt: new Date(),
  };

  await db
    .collection('tickets')
    .doc(ticketId)
    .collection('checklists')
    .doc(checklist.id)
    .set(checklist);

  return checklist;
}

// Ajouter un item à une checklist
async addChecklistItem(
  ticketId: string,
  checklistId: string,
  text: string,
): Promise<ChecklistItem> {
  const checklistRef = db
    .collection('tickets')
    .doc(ticketId)
    .collection('checklists')
    .doc(checklistId);

  const checklist = await checklistRef.get();
  const items = checklist.data().items || [];

  const newItem: ChecklistItem = {
    id: generateId(),
    text,
    completed: false,
    order: items.length,
    createdAt: new Date(),
  };

  items.push(newItem);

  await checklistRef.update({ items });
  return newItem;
}

// Cocher/décocher un item
async updateChecklistItem(
  ticketId: string,
  checklistId: string,
  itemId: string,
  completed: boolean,
): Promise<ChecklistItem> {
  const checklistRef = db
    .collection('tickets')
    .doc(ticketId)
    .collection('checklists')
    .doc(checklistId);

  const checklist = await checklistRef.get();
  const items = checklist.data().items || [];

  const itemIndex = items.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) {
    throw new NotFoundException('Item not found');
  }

  items[itemIndex].completed = completed;

  await checklistRef.update({ items });
  return items[itemIndex];
}
```

---

## 📎 Pièces Jointes

### Modèle : Attachment

```typescript
{
  id: string;
  ticketId: string;
  filename: string;
  contentType: string;
  objectPath: string;     // Path dans GCS
  status: 'pending' | 'uploaded';
  createdBy: string;      // userId
  size?: number;
  createdAt: Timestamp;
}
```

### Flux d'Upload

```
1. Frontend demande une URL signée
   → POST /api/tickets/:ticketId/attachments/generate-url
   ← Retourne { url: "https://gcs.signed.url", attachment: {...} }

2. Frontend upload directement dans GCS
   → PUT {url} avec le fichier

3. Frontend confirme l'upload
   → PATCH /api/tickets/:ticketId/attachments/:id/complete

4. Backend marque comme uploaded
   → Status: 'pending' → 'uploaded'
```

### Implémentation

```typescript
// Demander une URL signée
async createAttachmentUpload(
  ticketId: string,
  filename: string,
  contentType: string,
): Promise<{ url: string; attachment: Attachment }> {
  // Créer le document attachment
  const attachment = {
    id: generateId(),
    ticketId,
    filename: sanitizeFilename(filename),
    contentType,
    objectPath: `tickets/${ticketId}/${generateId()}-${filename}`,
    status: 'pending',
    createdBy: currentUser.id,
    createdAt: new Date(),
  };

  // Sauvegarder en tant que pending
  await db
    .collection('tickets')
    .doc(ticketId)
    .collection('attachments')
    .doc(attachment.id)
    .set(attachment);

  // Générer URL signée
  const url = await gcsService.signedUploadUrl({
    objectPath: attachment.objectPath,
    contentType,
  });

  return { url, attachment };
}

// Marquer comme uploaded
async completeAttachment(
  ticketId: string,
  attachmentId: string,
): Promise<Attachment> {
  const attachmentRef = db
    .collection('tickets')
    .doc(ticketId)
    .collection('attachments')
    .doc(attachmentId);

  await attachmentRef.update({
    status: 'uploaded',
  });

  return (await attachmentRef.get()).data();
}

// Télécharger un attachment
async getAttachmentDownload(
  ticketId: string,
  attachmentId: string,
): Promise<{ url: string }> {
  const attachment = await db
    .collection('tickets')
    .doc(ticketId)
    .collection('attachments')
    .doc(attachmentId)
    .get();

  if (!attachment.exists || attachment.data().status !== 'uploaded') {
    throw new NotFoundException('Attachment not found');
  }

  const url = await gcsService.signedDownloadUrl({
    objectPath: attachment.data().objectPath,
  });

  return { url };
}
```

---

## ⏰ Rappels de Tickets

### Modèle : Reminder

```typescript
{
  id: string;
  ticketId: string;
  userId: string;         // Qui a demandé le rappel
  remindAt: Timestamp;    // Quand rappeler
  status: 'pending' | 'sent' | 'dismissed';
  createdAt: Timestamp;
  sentAt?: Timestamp;
}
```

### Cron Job Backend

```typescript
// Toutes les minutes, checker les reminders dus
async dispatchReminders(): Promise<void> {
  const now = new Date();

  // Récupérer les reminders dus
  const reminders = await db
    .collection('ticket-reminders')
    .where('status', '==', 'pending')
    .where('remindAt', '<=', now)
    .get();

  for (const reminder of reminders.docs) {
    const data = reminder.data();

    // Créer une notification
    await notificationsService.create({
      userId: data.userId,
      type: 'reminder',
      title: 'Rappel: Ticket à voir',
      resourceId: data.ticketId,
      resourceType: 'ticket',
    });

    // Marquer comme envoyé
    await reminder.ref.update({
      status: 'sent',
      sentAt: new Date(),
    });
  }
}
```

---

## 📊 Cas d'Utilisation Avancés

### Cas 1 : Déplacer plusieurs tickets

```typescript
// Déplacer plusieurs tickets dans une colonne
async moveTickets(
  boardId: string,
  targetColumnId: string,
  ticketIds: string[],
): Promise<void> {
  return await db.runTransaction(async (transaction) => {
    for (let i = 0; i < ticketIds.length; i++) {
      const ticketRef = db.collection('tickets').doc(ticketIds[i]);
      transaction.update(ticketRef, {
        columnId: targetColumnId,
        order: i,
      });
    }
  });
}
```

### Cas 2 : Archiver tous les tickets d'une colonne

```typescript
async archiveColumnTickets(
  boardId: string,
  columnId: string,
): Promise<number> {
  const tickets = await db
    .collection('tickets')
    .where('boardId', '==', boardId)
    .where('columnId', '==', columnId)
    .where('archivedAt', '==', null)
    .get();

  let count = 0;
  for (const doc of tickets.docs) {
    await doc.ref.update({
      archivedAt: new Date(),
    });
    count++;
  }

  return count;
}
```

---

## 📖 Documentation Complémentaire
- [Architecture Globale](./01_ARCHITECTURE_GLOBALE.md)
- [Système des Permissions](./03_SYSTEME_PERMISSIONS.md)
- [Firestore Architecture](./02_FIRESTORE_ARCHITECTURE.md)
