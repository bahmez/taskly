# 📋 Guide de Contribution à Taskly

Ce document explique comment contribuer efficacement au projet Taskly en respectant l'architecture et les standards établis.

## 🎯 Avant de Commencer

### Lire la Documentation
1. Commencer par [README.md](./README.md)
2. Lire [Architecture Globale](./01_ARCHITECTURE_GLOBALE.md)
3. Lire les documents pertinents selon ta tâche

### Comprendre la Stack
- **Backend** : NestJS + TypeScript
- **Frontend** : Next.js + React + TypeScript
- **Database** : Firestore (NoSQL)
- **Tests** : Vitest
- **Monorepo** : Turborepo + pnpm

---

## 🔄 Workflow de Contribution

### 1. Préparation
```bash
# Fork le repo (si nécessaire)
git clone https://github.com/youba/taskly.git
cd taskly

# Installer les dépendances
pnpm install

# Créer une branche
git checkout -b feat/ma-feature
```

### 2. Développement

#### A. Ajouter une Feature au Backend

**Exemple : Ajouter un nouveau champ "priority" aux tickets**

##### Étape 1 : Mettre à jour le modèle Firestore
```typescript
// packages/database/src/tickets/ticket.model.ts
export interface Ticket {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // ← NOUVEAU
  // ... reste du modèle
}
```

##### Étape 2 : Créer/mettre à jour le service
```typescript
// apps/api/src/ticket/ticket.service.ts
async updateTicket(
  ticketId: string,
  update: UpdateTicketDto,  // Doit inclure priority
): Promise<Ticket> {
  await this.assertCanUpdateTicket(ticketId);
  return await db.collection('tickets').doc(ticketId).update(update);
}
```

##### Étape 3 : Ajouter le DTO pour Swagger
```typescript
// apps/api/src/ticket/ticket.controller.ts
export class UpdateTicketDto {
  title?: string;
  priority?: 'low' | 'medium' | 'high';  // ← NOUVEAU
}

@Patch('/:ticketId')
@ApiBody({ type: UpdateTicketDto })
async updateTicket(@Body() dto: UpdateTicketDto) {
  // ...
}
```

##### Étape 4 : Mettre à jour tRPC si nécessaire
```typescript
// packages/trpc/src/index.ts
export const appRouter = t.router({
  boards: t.router({
    updateTicket: t.procedure
      .input(z.object({
        ticketId: z.string(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Logique
      }),
  }),
});
```

##### Étape 5 : Tester
```bash
# Tests unitaires
pnpm test

# Type checking
pnpm run typecheck

# Linting
pnpm lint
```

#### B. Ajouter une Feature au Frontend

**Exemple : Afficher le priority dans la carte**

##### Étape 1 : Utiliser tRPC pour fetcher
```typescript
// apps/web/src/components/ticket/ticket-card.tsx
export function TicketCard({ ticketId }: { ticketId: string }) {
  const { data: ticket } = api.boards.getTicket.useQuery({ ticketId });

  return (
    <div className="card">
      <h3>{ticket?.title}</h3>
      {ticket?.priority && (
        <span className={`badge badge-${ticket.priority}`}>
          {ticket.priority}
        </span>
      )}
    </div>
  );
}
```

##### Étape 2 : Ajouter des styles
```css
/* apps/web/src/components/ticket/ticket-card.css */
.badge-high {
  @apply bg-red-100 text-red-800;
}
.badge-medium {
  @apply bg-yellow-100 text-yellow-800;
}
.badge-low {
  @apply bg-green-100 text-green-800;
}
```

##### Étape 3 : Tester
```bash
pnpm test
pnpm run typecheck
```

---

## 🛡️ Points Clés pour Chaque Type de Feature

### Feature de Permission

**Checklist** :
- [ ] Ajouter la permission à `@taskly/shared/workspace-permissions.ts`
- [ ] Vérifier la permission dans le Guard NestJS
- [ ] Tester que les rôles incorrects sont refusés
- [ ] Ajouter un test unitaire

**Exemple** :
```typescript
// Ajouter permission
export const ROLE_PERMISSIONS = {
  admin: [..., 'ticket.priority.update'],
};

// Vérifier dans le controller
await this.workspaceAccessService.assertHasPermission(
  user.id,
  workspaceId,
  'ticket.priority.update',
);
```

### Feature de Base de Données

**Checklist** :
- [ ] Ajouter le champ au modèle Firestore
- [ ] Migrer les données existantes (si needed)
- [ ] Ajouter un index Firestore si query complexe
- [ ] Tester les queries avec plusieurs documents

**Exemple** :
```typescript
// Vérifier les indexes en Firestore console
// Collection: tickets
// Query: where workspaceId + where priority + orderBy createdAt
// → Créer un index composite si nécessaire
```

### Feature d'Authentification

**Checklist** :
- [ ] Vérifier que le JWT est valide
- [ ] Mettre à jour le contexte tRPC si new user info
- [ ] Tester l'expiration du token
- [ ] Ajouter les logs appropriés

### Feature de Performance

**Checklist** :
- [ ] Ajouter un index Firestore
- [ ] Vérifier la pagination si liste longue
- [ ] Benchmarker avant/après
- [ ] Ajouter un commentaire expliquant l'optimisation

---

## 📝 Conventions de Code

### Naming

```typescript
// Services (Repository pattern)
class TicketsService {
  async getById(ticketId: string): Promise<Ticket> { }
  async list(boardId: string): Promise<Ticket[]> { }
  async create(input: CreateTicketDto): Promise<Ticket> { }
  async update(ticketId: string, input: UpdateTicketDto): Promise<Ticket> { }
  async delete(ticketId: string): Promise<void> { }
}

// Controllers (camelCase)
@Controller('/api/tickets')
export class TicketController {
  @Get('/:ticketId')
  async getTicket(@Param('ticketId') ticketId: string) { }
}

// Components (PascalCase)
export function TicketCard({ ticketId }: Props) { }

// Variables (camelCase)
const maxRetries = 3;
const ticketSnapshot = await db.collection('tickets').get();
```

### Imports

```typescript
// Ordre d'imports
// 1. External libraries
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

// 2. Internal packages
import { TicketsService } from '@taskly/database';
import { hasPermission } from '@taskly/shared';

// 3. Local files
import { TicketDto } from './ticket.dto';
import { WorkspaceAccessService } from '../workspace/workspace-access.service';
```

### JSDoc Comments

```typescript
/**
 * Récupère un ticket par son ID.
 * Vérifie que l'utilisateur a accès au workspace.
 * @param ticketId - L'ID du ticket
 * @returns Le ticket ou null s'il n'existe pas
 * @throws NotFoundException si le ticket n'existe pas
 * @throws ForbiddenException si l'utilisateur n'a pas accès
 */
async getTicket(ticketId: string): Promise<Ticket> { }
```

### Error Handling

```typescript
// NestJS exceptions
throw new NotFoundException('Ticket not found');
throw new ForbiddenException('Cannot access this resource');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Token invalid');

// Custom errors (si needed)
class TicketNotFoundError extends NotFoundException {
  constructor(ticketId: string) {
    super(`Ticket ${ticketId} not found`);
  }
}
```

---

## 🧪 Testing

### Tester une Feature

```typescript
// apps/api/src/ticket/ticket.service.spec.ts
describe('TicketService', () => {
  let service: TicketService;

  beforeEach(() => {
    service = new TicketService(/* deps */);
  });

  it('should create a ticket', async () => {
    const ticket = await service.create({
      boardId: 'board-1',
      title: 'Test ticket',
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.title).toBe('Test ticket');
  });

  it('should throw if permission denied', async () => {
    await expect(() =>
      service.updateTicket('ticket-1', { priority: 'high' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

### Tester les Permissions

```typescript
describe('Ticket permissions', () => {
  it('member cannot delete ticket', async () => {
    // Setup: user with role 'member'
    const user = { id: 'user-1', role: 'member' };

    // Act & Assert
    await expect(() =>
      ticketService.deleteTicket('ticket-1', user),
    ).rejects.toThrow(ForbiddenException);
  });

  it('admin can delete ticket', async () => {
    // Setup: user with role 'admin'
    const user = { id: 'user-1', role: 'admin' };

    // Act
    await ticketService.deleteTicket('ticket-1', user);

    // Assert: should succeed
  });
});
```

---

## 📝 Commits et PRs

### Format de Commit
```
<type>(<scope>): <description>

<body>

<footer>
```

**Types** : feat, fix, docs, style, refactor, test, chore
**Scope** : ticket, board, workspace, auth, etc.

**Exemples** :
```
feat(ticket): add priority field

- Add priority enum to ticket model
- Add priority to Firestore schema
- Add priority to API response

Fixes #123
```

```
fix(permission): allow member to edit own ticket

Member role was incorrectly denied from editing
own created tickets. Now checks ticket.ownerId.

Fixes #456
```

### PR Template

```markdown
## Description
Brève description de la PR

## Type de changement
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Performance

## Changes
- Ajouter le champ X à Y
- Mettre à jour la permissionZ
- Ajouter tests pour W

## Testing
Comment tester cette feature

## Screenshots (si UI)
[Ajouter screenshots]

## Checklist
- [ ] Tests ajoutés/passants
- [ ] Type checking passe
- [ ] Linting passe
- [ ] Doc mise à jour
```

---

## 🚀 Déploiement

### Avant de Déployer

**Checklist** :
- [ ] `pnpm test` passe
- [ ] `pnpm run typecheck` passe
- [ ] `pnpm lint` passe
- [ ] Pas de console.log en production
- [ ] Env variables configurées
- [ ] Migrations Firestore faites

### En Production

```bash
# Build
pnpm build

# Test build
pnpm test:build

# Déployer
git tag v1.2.3
git push origin v1.2.3
# → Cloud Build est déclenché automatiquement
```

---

## 🐛 Déboguer

### Backend

```bash
# Logs détaillés
NODE_ENV=development pnpm run dev

# Attach debugger
node --inspect src/main.ts

# Firefox DevTools
about:debugging#/runtime/this-firefox
```

### Frontend

```bash
# Logs détaillés
NEXT_DEBUG=true pnpm run dev

# Network tab dans DevTools
# Firestore listeners dans Firestore Emulator
```

### Firestore

```bash
# Emulator local
firebase emulators:start

# Console
https://console.firebase.google.com
```

---

## 📚 Ressources Utiles

### Documentation Interne
- [Architecture Globale](./01_ARCHITECTURE_GLOBALE.md)
- [Firestore Architecture](./02_FIRESTORE_ARCHITECTURE.md)
- [Système des Permissions](./03_SYSTEME_PERMISSIONS.md)
- [Gestion des Tickets](./04_GESTION_TICKETS.md)
- [Workflows et Collaborations](./05_WORKFLOWS_COLLABORATIONS.md)

### Ressources Externes
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [tRPC Documentation](https://trpc.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## 💡 Best Practices

### 1. Toujours Vérifier les Permissions
```typescript
// ❌ MAUVAIS
async deleteTicket(ticketId: string): Promise<void> {
  await db.collection('tickets').doc(ticketId).delete();
}

// ✅ BON
async deleteTicket(ticketId: string, userId: string): Promise<void> {
  const ticket = await this.getTicket(ticketId);
  await this.workspaceAccessService.assertHasPermission(
    userId,
    ticket.workspaceId,
    'ticket.delete',
  );
  await db.collection('tickets').doc(ticketId).delete();
}
```

### 2. Utiliser les Transactions pour Atomicité
```typescript
// ❌ MAUVAIS (peut laisser état inconsistent)
await db.collection('tickets').doc(ticketId).update({ ... });
await db.collection('activity-logs').add({ ... });

// ✅ BON
await db.runTransaction(async (transaction) => {
  transaction.update(db.collection('tickets').doc(ticketId), { ... });
  transaction.set(db.collection('activity-logs').doc(), { ... });
});
```

### 3. Denormalize Quand Cela Fait Sens
```typescript
// ❌ MAUVAIS (N+1 queries)
for (const ticket of tickets) {
  const author = await db.collection('users').doc(ticket.ownerId).get();
  console.log(author.data().displayName);
}

// ✅ BON (denormalized)
for (const ticket of tickets) {
  console.log(ticket.ownerDisplayName); // Stocké dans ticket
}
```

### 4. Tester les Cas Limites
```typescript
it('should handle empty lists', async () => {
  const result = await service.list('non-existent-board');
  expect(result).toEqual([]);
});

it('should handle special characters in title', async () => {
  const ticket = await service.create({
    title: '<script>alert("xss")</script>',
  });
  expect(ticket.title).toBe('<script>alert("xss")</script>');
  // HTML échappé par le frontend
});
```

### 5. Documenter les Décisions
```typescript
/**
 * Ne pas utiliser de listener en temps réel ici pour éviter
 * les costs Firebase (1 read per second per listener).
 * À la place, polling tous les 30s via cron job.
 * 
 * TODO: Évaluer la feasibilité d'un WebSocket custom.
 */
async listTickets(boardId: string): Promise<Ticket[]> { }
```

---

## ❓ Questions ?

- **Architecture** : Ouvrir une issue "discussion"
- **Bug** : Ouvrir une issue avec reproduction
- **Feature request** : Ouvrir une issue avec description

---

**Happy coding! 🚀**
