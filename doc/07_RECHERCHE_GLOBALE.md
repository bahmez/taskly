# Recherche Globale dans Taskly

## 📋 Vue d'ensemble

La fonctionnalité de recherche globale permet aux utilisateurs de trouver rapidement des workspaces et boards à travers toute l'application.

## 🎯 Fonctionnalités

### Raccourci Clavier
- **Cmd+K** (macOS) / **Ctrl+K** (Windows/Linux)
- Ouvre instantanément le dialogue de recherche depuis n'importe quelle page

### Recherche en Temps Réel
- **Debounced** : 300ms de délai pour éviter trop de requêtes
- **Instantanée** : Les résultats apparaissent dès que vous tapez
- **Performante** : Limite automatique à 20 résultats par type

### Navigation au Clavier
- **↑↓** : Naviguer entre les résultats
- **Enter** : Ouvrir le résultat sélectionné
- **Esc** : Fermer le dialogue
- **Clear** : Bouton pour vider la recherche

### Distinction Visuelle
- **Workspaces** : Icône de briefcase (💼)
- **Boards** : Icône de layout (📋)
- **Badge de type** : "Workspace" ou "Board" sur chaque résultat
- **Workspace parent** : Affiché sous les boards

## 🏗️ Architecture

### Backend (tRPC)

#### Procédure `search.all`

```typescript
search: router({
  all: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      // 1. Récupère tous les workspaces de l'utilisateur
      // 2. Filtre par query (titre et description)
      // 3. Récupère tous les boards de ces workspaces
      // 4. Filtre les boards par query
      // 5. Retourne les résultats structurés
    })
})
```

#### Filtrage
- **Case-insensitive** : La recherche ignore la casse
- **Multi-champs** : Recherche dans le titre ET la description
- **Permissions** : Seuls les workspaces/boards accessibles sont retournés

### Frontend (React)

#### Composant `SearchDialog`

**État**
- `open` : Contrôle l'ouverture du dialogue
- `query` : Texte de recherche actuel
- `debouncedQuery` : Query avec debounce de 300ms
- `selectedIndex` : Index du résultat sélectionné

**Hooks**
- `useEffect` : Pour le debounce de la query
- `useEffect` : Pour le raccourci clavier global (Cmd+K)
- `useEffect` : Pour la navigation au clavier (↑↓ Enter Esc)
- `useEffect` : Pour le scroll automatique du résultat sélectionné
- `api.search.all.useQuery` : Pour la requête tRPC

#### Navigation dans la Navbar

```tsx
<button onClick={() => setSearchOpen(true)}>
  <Search />
  <span>Rechercher</span>
  <kbd>⌘K</kbd>
</button>

<SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
```

## 🔍 Flux de Recherche

```
┌─────────────────┐
│ User tape "proj" │
└────────┬─────────┘
         │
         ├─ Immediate: query = "proj"
         │
         ├─ 300ms debounce
         │
         ▼
┌─────────────────────┐
│ debouncedQuery = "proj" │
└────────┬────────────┘
         │
         ├─ tRPC Query triggered
         │
         ▼
┌─────────────────────┐
│ Backend:            │
│ 1. Get user workspaces │
│ 2. Filter by "proj" │
│ 3. Get all boards   │
│ 4. Filter by "proj" │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Results displayed:  │
│ - Projet Marketing  │
│ - Projet Dev        │
│ - Board Projet 2024 │
└─────────────────────┘
```

## 🎨 UX/UI

### États du Dialogue

1. **Vide** (pas de query)
   - Message : "Start typing to search workspaces and boards…"

2. **Chargement**
   - Message : "Loading…"
   - Spinner ou texte de chargement

3. **Aucun résultat**
   - Message : "No results found for '{query}'"

4. **Résultats affichés**
   - Liste scrollable (max 400px)
   - Hover et sélection au clavier
   - Footer avec raccourcis clavier

### Couleurs (Theme Dark)
- Background : `#1d2125`
- Border : `#9fadbc29`
- Text primary : `#b6c2cf`
- Text secondary : `#9fadbc`
- Selected : `#579dff` (bleu Trello)
- Hover : `#a6c5e229`

## 📊 Performances

### Optimisations

1. **Debounce** : Réduit le nombre de requêtes
2. **Limite de résultats** : Maximum 20 par type
3. **Query enabled** : Ne lance pas la requête si query vide
4. **Memo des résultats** : Évite les recalculs inutiles

### Métriques Cibles
- **Temps de réponse** : < 200ms
- **Debounce delay** : 300ms
- **Résultats max** : 40 (20 workspaces + 20 boards)

## 🔐 Sécurité et Permissions

### Filtrage Backend
- Seuls les workspaces où l'utilisateur est membre sont cherchés
- Les boards sont filtrés par workspace accessible
- Pas de fuite d'information sur les workspaces/boards inaccessibles

### Validation
- Query min 1 caractère
- Query max 200 caractères
- Limit min 1, max 50

## 🚀 Évolutions Futures

### Court Terme (T-107+)
- [ ] Recherche de tickets
- [ ] Filtres avancés (par date, par assigné)
- [ ] Tri des résultats (pertinence, récent, alphabétique)

### Moyen Terme
- [ ] Recherche full-text avec Algolia ou ElasticSearch
- [ ] Highlights des termes recherchés
- [ ] Historique de recherche
- [ ] Suggestions de recherche

### Long Terme
- [ ] Recherche sémantique (AI)
- [ ] Recherche vocale
- [ ] Recherche dans les commentaires et descriptions

## 🧪 Tests

### Tests Frontend
```typescript
// Vérifier l'ouverture avec Cmd+K
// Vérifier le debounce
// Vérifier la navigation au clavier
// Vérifier la sélection d'un résultat
```

### Tests Backend
```typescript
// Vérifier le filtrage des workspaces
// Vérifier le filtrage des boards
// Vérifier les permissions
// Vérifier la limite de résultats
```

## 📝 Documentation Utilisateur

### Comment utiliser la recherche ?

1. **Ouvrir la recherche**
   - Cliquer sur le champ de recherche dans la navbar
   - Ou utiliser **Cmd+K** (Mac) / **Ctrl+K** (Windows)

2. **Taper votre recherche**
   - Les résultats apparaissent en temps réel
   - La recherche fonctionne sur les titres et descriptions

3. **Naviguer dans les résultats**
   - Utilisez la souris ou les flèches ↑↓
   - Appuyez sur **Enter** pour ouvrir un résultat
   - **Esc** pour fermer le dialogue

4. **Comprendre les résultats**
   - **Briefcase icon** = Workspace
   - **Layout icon** = Board
   - Les boards affichent leur workspace parent
