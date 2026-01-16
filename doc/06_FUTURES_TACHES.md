# 🚀 Futures Tâches - Roadmap Post-MVP (T-104, T-105, T-106)

## 📌 Context

Suite à la réalisation **complète du MVP** et de la **documentation exhaustive** en avance par rapport au cahier des charges, l'équipe Taskly a identifié 3 tâches d'amélioration majeure pour enrichir l'application et améliorer l'expérience utilisateur.

### 📊 Avance par Rapport au Cahier des Charges

- ✅ **MVP Complet** : Toutes les fonctionnalités requises livrées
- ✅ **Documentation Complète** : 2000+ lignes de doc en français (non requis)
- ✅ **Tests Exhaustifs** : Vitest + couverture étendue (dépassant les specs)
- ✅ **Swagger API Documentation** : Documentation automatique (bonus)
- ⏰ **Temps Disponible** : 2 semaines avant la deadline du 31/01/2026

### 🎯 Stratégie

Ces 3 tâches représentent la **phase 2** du développement et visent à :
1. **Réduire la friction** lors de l'inscription (auth multi-provider)
2. **Ouvrir l'application** à un public international (i18n)
3. **Améliorer la navigation** pour les utilisateurs avec beaucoup de ressources (search)

---

## 🎟️ T-104 — Authentification Multi-Provider (Google & GitHub)

### 📋 Vue d'Ensemble

Actuellement, les utilisateurs se connectent uniquement via **email/password**. Cette tâche ajoute la possibilité de se connecter via **Google** et **GitHub**, réduisant la friction lors de l'inscription et offrant une meilleure UX.

### 🎯 Objectif

- Permettre aux utilisateurs de se connecter en 1 clic via Google
- Permettre aux utilisateurs de se connecter en 1 clic via GitHub
- Améliorer le taux de conversion (moins d'abandons au signup)
- Gérer automatiquement la création d'utilisateurs

### 📝 Ce Qui Sera Réalisé

#### Backend (NestJS)

```
Firebase Configuration
├─ Activer Google Sign-In
├─ Activer GitHub OAuth
└─ Configurer les redirect URIs

NestJS Backend
├─ Mettre à jour FirebaseAuthGuard
├─ Supporter les providers (Google, GitHub, Email)
├─ Implémenter la fusion de comptes (même email)
├─ Auto-création d'utilisateurs pour nouveaux providers
└─ Logs et analytics d'authentification
```

#### Frontend (Next.js)

```
UI Components
├─ Composant SocialAuthButtons
├─ Intégration Google Sign-In
├─ Intégration GitHub OAuth
└─ Gestion des erreurs gracieuse

User Profile
├─ Afficher le provider utilisé
├─ Lier/délier des comptes
└─ Session management multi-provider
```

#### Tests & Sécurité

```
Tests
├─ Flow complet Google Sign-In
├─ Flow complet GitHub OAuth
├─ Fusion de comptes (email existant)
├─ Edge cases et erreurs

Sécurité
├─ Validation des tokens OAuth
├─ Rate limiting sur auth endpoints
├─ Protection des clés secrètes (env vars)
└─ Audit logs des authentifications
```

### ✅ Checklist

- [ ] Firebase : Activer Google & GitHub
- [ ] Backend : Mettre à jour les guards d'auth
- [ ] Backend : Gérer fusion de comptes
- [ ] Frontend : Créer SocialAuthButtons
- [ ] Frontend : Intégrer Google Sign-In
- [ ] Frontend : Intégrer GitHub OAuth
- [ ] Tests : Valider tous les flows
- [ ] Sécurité : Validator les tokens
- [ ] Documentation : Mettre à jour les guides d'auth

### 📊 Estimation

| Métrique | Valeur |
|----------|--------|
| **Points** | 8-13 |
| **Durée** | 2-3 jours |
| **Complexité** | Medium |
| **Effort** | 1 personne (Backend + Frontend) |

### 🔗 Impact

- ✅ Améliore le UX d'inscription
- ✅ Réduit les abandonnes
- ✅ Offre plus de flexibilité aux utilisateurs
- ✅ Modernise l'authentification

---

## 🎟️ T-105 — Internationalisation (FR/EN)

### 📋 Vue d'Ensemble

Actuellement, l'application est **entièrement en français**. Cette tâche ajoute le support complet de l'**anglais**, permettant à un public international d'utiliser Taskly dans leur langue préférée.

### 🎯 Objectif

- Rendre l'application accessible aux utilisateurs anglophones
- Implémenter un système d'i18n extensible pour ajouter d'autres langues
- Sauvegarder la préférence de langue par utilisateur
- Supporter la détection automatique de la langue du navigateur

### 📝 Ce Qui Sera Réalisé

#### Setup & Infrastructure

```
Framework i18n
├─ Intégrer next-i18next (ou react-intl)
├─ Configurer Next.js pour routing multi-langue
├─ Structure de traductions en JSON
└─ Système de fallback (EN si FR non disponible)
```

#### Traductions Complètes

```
Authentification
├─ Pages de login/signup
├─ Messages de validation
└─ Erreurs d'authentification

Application
├─ Navigation et menus
├─ Workspaces et boards
├─ Tickets et opérations
├─ Commentaires et assignations
└─ Notifications

Système
├─ Messages d'erreur
├─ Popups de confirmation
├─ Tooltips et placeholders
└─ Documentation in-app
```

#### Frontend Components

```
User Interface
├─ Sélecteur de langue visible
├─ Icônes drapeaux (FR/EN)
├─ Persistance de la préférence (localStorage)
└─ Synchronisation avec le profil utilisateur
```

#### Tests & Qualité

```
Validation
├─ Vérifier aucun texte non traduit
├─ Tester le changement de langue
├─ Vérifier la persistance
├─ Tester les chemins i18n
└─ Accessibilité (pas de cut-off text)
```

### ✅ Checklist

- [ ] Setup i18n framework
- [ ] Configurer routing multi-langue
- [ ] Créer structure de traductions
- [ ] Traduire authentification
- [ ] Traduire application complète
- [ ] Traduire système (erreurs, notifications)
- [ ] Créer sélecteur de langue UI
- [ ] Persister la préférence
- [ ] Tests complets
- [ ] Documentation guide i18n

### 📊 Estimation

| Métrique | Valeur |
|----------|--------|
| **Points** | 13-21 |
| **Durée** | 4-5 jours |
| **Complexité** | Medium-High |
| **Effort** | 1-2 personnes (Frontend prioritaire) |

### 🔗 Impact

- ✅ Ouvre le marché international
- ✅ Augmente l'audience potentielle
- ✅ Améliore l'inclusivité
- ✅ Système extensible pour plus de langues

---

## 🎟️ T-106 — Recherche de Boards et Workspaces

### 📋 Vue d'Ensemble

Actuellement, les utilisateurs naviguent via une **sidebar statique** pour accéder à leurs workspaces et boards. Cette tâche ajoute une **barre de recherche globale** (type Spotlight/Command Palette) pour accéder rapidement aux ressources.

### 🎯 Objectif

- Permettre une recherche instantanée de workspaces et boards
- Implémenter un UX moderne (Cmd+K / Ctrl+K)
- Améliorer la navigation pour les utilisateurs avec beaucoup de ressources
- Supporter la recherche fuzzy et les filters

### 📝 Ce Qui Sera Réalisé

#### Frontend Components

```
Search UI
├─ Composant SearchBar global
├─ Shortcut Cmd+K / Ctrl+K
├─ Recherche instantanée (debounced)
├─ Résultats en temps réel
├─ Distinction visuelle (boards vs workspaces)
├─ Navigation au clavier (↑↓ Enter)
└─ Accessibilité complète (WCAG 2.1 AA)
```

#### Backend API

```
tRPC Procedures
├─ search.all(query)
├─ search.workspaces(query)
├─ search.boards(query)
└─ Filtrage par permissions
```

#### Firestore Database

```
Optimizations
├─ Vérifier les indexes existants
├─ Créer indexes composites
│  ├─ workspaceId + title
│  └─ userId + title
└─ Optimiser les queries
```

#### Tests & Performance

```
Validation
├─ Tester recherche workspaces
├─ Tester recherche boards
├─ Vérifier les permissions
├─ Tester keyboard navigation
├─ Vérifier l'accessibilité

Performance
├─ Mesurer latence (< 200ms)
├─ Vérifier les indexes
├─ Limiter les résultats
└─ Debounce la recherche
```

### ✅ Checklist

- [ ] Créer composant SearchBar
- [ ] Implémenter shortcut Cmd+K / Ctrl+K
- [ ] Créer procédure tRPC search
- [ ] Implémenter recherche Firestore
- [ ] Optimiser avec indexes
- [ ] Tester recherche workspaces
- [ ] Tester recherche boards
- [ ] Vérifier permissions
- [ ] Tester performance
- [ ] Tester keyboard shortcuts

### 📊 Estimation

| Métrique | Valeur |
|----------|--------|
| **Points** | 8-13 |
| **Durée** | 2-3 jours |
| **Complexité** | Medium |
| **Effort** | 1-2 personnes (Frontend + Backend) |

### 🔗 Impact

- ✅ Améliore la navigation
- ✅ Réduit les clics pour accéder aux ressources
- ✅ UX moderne et fluide
- ✅ Scalable pour beaucoup de ressources

---

## 📊 Résumé Global

### Tableau Récapitulatif

| Ticket | Titre | Objectif | Points | Durée | Complexité |
|--------|-------|----------|--------|-------|-----------|
| **T-104** | Auth Multi-Provider | Connexion Google/GitHub | 8-13 | 2-3j | Medium |
| **T-105** | Internationalisation | Support FR/EN | 13-21 | 4-5j | Medium-High |
| **T-106** | Recherche | Search globale Cmd+K | 8-13 | 2-3j | Medium |
| | **TOTAL** | **Roadmap Phase 2** | **29-47** | **8-11j** | **Medium** |

### 🎯 Allocation de Temps

**Équipe** : Younes Bahri + Schekina Ahounou (2 personnes)  
**Période** : 8-11 jours de travail  
**Deadline** : 31/01/2026 (avant fin du projet)

### 📅 Chronologie Proposée

```
Semaine 1 (Jan 20-24)
├─ T-104 (Auth) : 2-3 jours
├─ T-106 (Search) : 2-3 jours
└─ Intégration & tests

Semaine 2 (Jan 27-31)
├─ T-105 (i18n) : 4-5 jours
└─ Finalisation & démonstration finale
```

### ✅ Critères de Succès

- ✅ Tous les tests passent (`pnpm test`)
- ✅ Type checking réussit (`pnpm run typecheck`)
- ✅ Linting correct (`pnpm lint`)
- ✅ Documentation mise à jour
- ✅ Aucune régression sur MVP existant
- ✅ Performance acceptable (< 200ms)

### 📈 Impact Attendu

- **Augmentation d'engagement** : Auth multi-provider → moins d'abandons
- **Audience internationale** : i18n FR/EN → marché étendu
- **Meilleure UX** : Recherche → navigation fluide
- **Démonstration impressionnante** : Phase 2 montre l'étendue du projet

### 🔗 Dépendances

- Aucune dépendance inter-tickets
- Peuvent être développés en parallèle
- Tous dépendent du MVP existant (livré ✅)

---

## 📚 Ressources

### Authentication
- [Firebase Social Auth](https://firebase.google.com/docs/auth/web/google-signin)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)

### Internationalisation
- [next-i18next](https://next-i18next.com/)
- [i18n Best Practices](https://www.smashingmagazine.com/2020/11/internationalization-localization-static-site-generation/)

### Search UX
- [Command Palette Pattern](https://brandonigg.github.io/command-palette/)
- [Spotlight (macOS)](https://support.apple.com/en-us/HT204014)

---

## 🙏 Notes

Ces 3 tâches représentent une excellente opportunité pour :
- Consolider les compétences acquises
- Déployer un vrai projet en production
- Démontrer l'extensibilité de l'architecture

**Temps estimé total** : 8-11 jours de travail en équipe de 2  
**Deadline respectée** : ✅ Oui (31/01/2026)  
**Valeur ajoutée** : ⭐⭐⭐⭐⭐

---

**Document créé** : 16 janvier 2026  
**Statut** : Phase 2 en planification  
**Priorité** : P2 (Medium)
