# Système des Permissions de Taskly

## 🔐 Vue d'ensemble

Taskly utilise un système de permissions **hiérarchisé et granulaire** basé sur les **rôles au niveau workspace** et **des vérifications d'accès en cascade** au niveau des ressources.

## 👥 Rôles et Permissions

### Niveaux de Rôles

#### 1. **Owner (Propriétaire)**
- Créateur du workspace
- Rôle automatique lors de la création
- Permissions : **Toutes**

#### 2. **Admin (Administrateur)**
- Rôle assigné manuellement par le propriétaire/admin
- Gestion des membres, invitations, configurations
- Permissions étendues

#### 3. **Member (Membre)**
- Rôle par défaut pour les utilisateurs invités
- Accès aux boards et tickets
- Permissions limitées (lecture + collaboration)

---

## 📊 Matrice des Permissions

### Workspace Level

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Voir workspace | ✅ | ✅ | ✅ |
| Éditer infos | ✅ | ✅ | ❌ |
| Ajouter membres | ✅ | ✅ | ❌ |
| Supprimer membres | ✅ | ✅ | ❌ |
| Gérer rôles | ✅ | ❌ | ❌ |
| Archiver workspace | ✅ | ✅ | ❌ |
| Supprimer workspace | ✅ | ❌ | ❌ |

### Board Level

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Voir board | ✅ | ✅ | ✅ |
| Créer board | ✅ | ✅ | ✅ |
| Éditer board | ✅ | ✅ | ❌ |
| Archiver board | ✅ | ✅ | ❌ |
| Supprimer board | ✅ | ✅ | ❌ |
| Gérer colonnes | ✅ | ✅ | ✅ |
| Gérer labels | ✅ | ✅ | ✅ |

### Ticket Level

| Action | Owner | Admin | Member | Auteur Ticket |
|--------|-------|-------|--------|---------------|
| Voir ticket | ✅ | ✅ | ✅ | ✅ |
| Créer ticket | ✅ | ✅ | ✅ | N/A |
| Éditer ticket | ✅ | ✅ | ❌ | ✅ |
| Archiver ticket | ✅ | ✅ | ❌ | ✅ |
| Ajouter commentaire | ✅ | ✅ | ✅ | ✅ |
| Assigner membre | ✅ | ✅ | ✅ | ✅ |
| Pièces jointes | ✅ | ✅ | ✅ | ✅ |

---

## 🔄 Flux de Vérification des Permissions

### Cascade de Vérification

```
Requête utilisateur
    ↓
1. Authentification ? (FirebaseAuthGuard)
    ↓ Non → 401 Unauthorized
    ↓ Oui
2. Accès au Workspace ?
    ↓ Non → 403 Forbidden
    ↓ Oui
3. Rôle suffisant ?
    ↓ Non → 403 Forbidden
    ↓ Oui
4. Ressource appartient au workspace ?
    ↓ Non → 404 Not Found
    ↓ Oui
5. Action autorisée pour ce rôle ?
    ↓ Non → 403 Forbidden
    ↓ Oui
6. Exécuter l'action
    ↓
7. Retourner le résultat
```

---

## 💻 Implémentation dans le Code

### Package `@taskly/shared`

Définit les types et helper functions :

```typescript
// packages/shared/src/workspace-permissions.ts

/**
 * Rôles possibles dans un workspace
 */
export type WorkspaceRole = 'member' | 'admin' | 'owner';

/**
 * Permissions associées à un rôle
 */
export type Permission =
  | 'workspace.read'
  | 'workspace.update'
  | 'workspace.delete'
  | 'workspace.members.manage'
  | 'board.create'
  | 'board.update'
  | 'board.delete'
  | 'ticket.create'
  | 'ticket.update'
  | 'ticket.delete';

/**
 * Matrice rôle → permissions
 */
const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: [
    'workspace.read',
    'workspace.update',
    'workspace.delete',
    'workspace.members.manage',
    'board.create',
    'board.update',
    'board.delete',
    'ticket.create',
    'ticket.update',
    'ticket.delete',
  ],
  admin: [
    'workspace.read',
    'workspace.update',
    'workspace.members.manage',
    'board.create',
    'board.update',
    'board.delete',
    'ticket.create',
    'ticket.update',
    'ticket.delete',
  ],
  member: [
    'workspace.read',
    'board.create',
    'ticket.create',
    'ticket.update', // Peut éditer ses propres tickets
  ],
};

/**
 * Vérifier si un rôle a une permission
 */
export function hasPermission(
  role: WorkspaceRole,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Obtenir le rôle avec le plus de permissions entre 2
 */
export function maxRole(
  role1: WorkspaceRole,
  role2: WorkspaceRole
): WorkspaceRole {
  const hierarchy = { member: 1, admin: 2, owner: 3 };
  return hierarchy[role1] >= hierarchy[role2] ? role1 : role2;
}
```

### Service Backend : WorkspaceAccessService

```typescript
// apps/api/src/workspace/workspace-access.service.ts

@Injectable()
export class WorkspaceAccessService {
  constructor(
    @Inject(WorkspacesService)
    private workspacesService: WorkspacesService,
  ) {}

  /**
   * Obtenir le rôle de l'utilisateur dans un workspace
   */
  async getUserRole(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceRole | null> {
    const member = await this.workspacesService.getMember(
      workspaceId,
      userId,
    );
    return member?.role ?? null;
  }

  /**
   * Vérifier l'accès au workspace
   */
  async assertCanAccessWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const role = await this.getUserRole(userId, workspaceId);
    if (!role) {
      throw new ForbiddenException(
        'Accès refusé au workspace',
      );
    }
  }

  /**
   * Vérifier une permission spécifique
   */
  async assertHasPermission(
    userId: string,
    workspaceId: string,
    permission: Permission,
  ): Promise<void> {
    const role = await this.getUserRole(userId, workspaceId);
    if (!role || !hasPermission(role, permission)) {
      throw new ForbiddenException(
        `Permission refusée: ${permission}`,
      );
    }
  }

  /**
   * Vérifier que le ticket appartient au workspace
   */
  async assertTicketInWorkspace(
    ticketId: string,
    workspaceId: string,
  ): Promise<void> {
    const ticket = await this.ticketsService.getById(ticketId);
    if (!ticket || ticket.workspaceId !== workspaceId) {
      throw new NotFoundException('Ticket not found');
    }
  }
}
```

### Guard NestJS

```typescript
// packages/auth/src/firebase-auth.guard.ts

/**
 * Guard : Vérifie l'authentification JWT Firebase
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(@Inject(FIREBASE_AUTH) private firebaseAuth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decoded = await this.firebaseAuth.verifyIdToken(token);
      request.user = { id: decoded.uid, ...decoded };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

/**
 * Décorateur : Injecter l'utilisateur actuel
 */
export const CurrentUser = createParamDecorator(
  (data, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### Utilisation dans un Contrôleur

```typescript
// apps/api/src/board/board.controller.ts

@Controller('/api/boards')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth('bearer')
export class BoardController {
  constructor(
    private boardsService: BoardsService,
    private workspaceAccessService: WorkspaceAccessService,
  ) {}

  /**
   * Mettre à jour un tableau
   */
  @Patch('/:boardId')
  @ApiParam({ name: 'boardId' })
  @ApiBody({ type: PatchBoardDto })
  async updateBoard(
    @Param('boardId') boardId: string,
    @Body() updateDto: PatchBoardDto,
    @CurrentUser() user: User,
  ) {
    // 1. Récupérer le board
    const board = await this.boardsService.getBoard(boardId);
    if (!board) throw new NotFoundException('Board not found');

    // 2. Vérifier l'accès au workspace
    await this.workspaceAccessService.assertCanAccessWorkspace(
      user.id,
      board.workspaceId,
    );

    // 3. Vérifier la permission
    await this.workspaceAccessService.assertHasPermission(
      user.id,
      board.workspaceId,
      'board.update',
    );

    // 4. Exécuter l'action
    return this.boardsService.updateBoard(boardId, updateDto);
  }
}
```

---

## 🎫 Permissions au Niveau Ticket

### Cas Spécial : Auteur du Ticket

```typescript
// Membres peuvent éditer leurs propres tickets
async assertCanUpdateTicket(
  userId: string,
  ticketId: string,
  workspaceId: string,
): Promise<void> {
  // 1. Vérifier l'accès workspace
  await this.assertCanAccessWorkspace(userId, workspaceId);

  // 2. Récupérer le ticket
  const ticket = await this.ticketsService.getById(ticketId);

  // 3. Vérifier que le ticket appartient au workspace
  if (ticket.workspaceId !== workspaceId) {
    throw new NotFoundException('Ticket not found');
  }

  // 4. Vérifier la permission
  const role = await this.getUserRole(userId, workspaceId);

  // Admin/Owner peuvent toujours éditer
  if (role === 'admin' || role === 'owner') {
    return;
  }

  // Members peuvent éditer leurs propres tickets
  if (role === 'member' && ticket.ownerId === userId) {
    return;
  }

  throw new ForbiddenException('Cannot update this ticket');
}
```

---

## 🔗 Invitation et Onboarding

### Flux d'Invitation

```
1. Admin crée une invitation
   → Document 'invitation' avec email, role, token
   
2. Email envoyé à l'adresse (lien avec token)

3. Utilisateur clique sur lien
   → Valide le token
   
4. Frontend fait accepter l'invitation
   → POST /invitations/accept { token }
   
5. Backend vérifie le token
   → Crée le member dans le workspace
   
6. Invite acceptée, utilisateur peut accéder
```

### Implémentation

```typescript
// Créer une invitation
async createInvitation(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  invitedBy: string,
): Promise<Invitation> {
  // Vérifier que l'inviteur est admin
  await this.assertHasPermission(
    invitedBy,
    workspaceId,
    'workspace.members.manage',
  );

  // Créer le document invitation
  const token = generateSecureToken();
  const invitation = {
    workspaceId,
    email,
    role,
    token,
    status: 'pending',
    createdBy: invitedBy,
    createdAt: new Date(),
    expiresAt: addDays(new Date(), 7),
  };

  await db.collection('invitations').add(invitation);

  // Envoyer email (async)
  await sendInvitationEmail(email, token);

  return invitation;
}

// Accepter une invitation
async acceptInvitation(token: string): Promise<void> {
  // Chercher l'invitation
  const invSnapshot = await db.collection('invitations')
    .where('token', '==', token)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (invSnapshot.empty) {
    throw new NotFoundException('Invitation not found or expired');
  }

  const invitation = invSnapshot.docs[0].data();

  // Vérifier l'expiration
  if (new Date() > invitation.expiresAt.toDate()) {
    throw new ForbiddenException('Invitation expired');
  }

  // Récupérer l'utilisateur actuel
  const user = await this.usersService.getByEmail(invitation.email);

  // Créer le membership
  await this.workspacesService.upsertMember(
    invitation.workspaceId,
    user.id,
    {
      role: invitation.role,
    },
  );

  // Marquer l'invitation comme acceptée
  await invSnapshot.docs[0].ref.update({
    status: 'accepted',
    acceptedAt: new Date(),
  });
}
```

---

## 🛡️ Sécurité des Permissions

### Principes

1. **Vérification Server-Side Toujours** : Jamais faire confiance au frontend
2. **Principe du Moindre Privilège** : Donner juste ce qui est nécessaire
3. **Logs d'Audit** : Tracer toute action sensible
4. **Expiration des Invitations** : 7 jours max
5. **Tokens Sécurisés** : Générer avec `crypto.randomBytes()`

### Exemple : Audit Log

```typescript
// Enregistrer chaque action sensible
async logAction(
  workspaceId: string,
  action: string,
  userId: string,
  resourceId: string,
): Promise<void> {
  await db.collection('activity-logs').add({
    workspaceId,
    action,
    actor: { userId, displayName: user.displayName },
    resourceId,
    createdAt: new Date(),
  });
}

// Utilisation
await this.logAction(workspaceId, 'member_added', userId, newMemberId);
```

---

## 📖 Documentation Complémentaire
- [Architecture Globale](./01_ARCHITECTURE_GLOBALE.md)
- [Firestore Architecture](./02_FIRESTORE_ARCHITECTURE.md)
- [Gestion des Tickets](./04_GESTION_TICKETS.md)
