# Cluedo Web

Portage HTML/CSS/JS du jeu Cluedo en mode console.

## Architecture

Le projet est structuré pour réutiliser au maximum la logique Java existante :

### Stratégie de portage

- ✅ **Porter tel quel** : toute la logique métier et UI (traduction 1:1 Java → JS)
- ✅ **Réimplémenter uniquement** : la couche de rendu (Console, ConsoleLine, ConsoleStyle)
- ✅ **Compatible Java** : même implémentation Random pour reproductibilité cross-platform

### Structure des dossiers

```
cluedo-web/
├── index.html              # Point d'entrée HTML
├── css/
│   └── styles.css         # Styles console-like
├── js/
│   ├── main.js            # Point d'entrée JS
│   ├── models/            # Card, Deck, CardType
│   ├── mechanics/         # Proposition, Action, Player, GameEngine
│   ├── logic/             # KnowledgeGrid, KnowledgeException, KnowledgeDebug
│   ├── ui/                # InteractiveInterface, MainMenu, UndoManager
│   │   ├── Console.js     # ✅ Adapter ANSI → DOM
│   │   ├── ConsoleStyle.js # ✅ Mapping couleurs ANSI → CSS
│   │   └── ConsoleLine.js  # ✅ Builder de lignes stylées
│   └── utils/
│       ├── JavaRandom.js   # ✅ Implementation compatible java.util.Random
│       └── SettingsManager.js # ✅ Singleton de configuration
```

### État actuel

- ✅ **Phase 1** : Couche de rendu (Console, ConsoleLine, ConsoleStyle)
- ✅ **Phase 2** : Modèles de base (Card, Deck, CardType, Proposition, Action)
- ✅ **Phase 3** : Logique métier (KnowledgeGrid, KnowledgeException, KnowledgeDebug)
- ✅ **Phase 4** : Joueurs et moteur (Player, GameEngine)
- ✅ **Phase 5** : Interface utilisateur (UndoManager, MainMenu, InteractiveInterface)
- ✅ **Phase 6** : Intégration complète (main.js avec boucle de jeu)

### ✅ Portage complet !

Le jeu est entièrement fonctionnel avec toutes les fonctionnalités :
- 2 modes de jeu (REEL et ENIGME)
- IA avancée avec déduction logique
- Interface 3 zones avec navigation clavier
- Undo/Redo
- Recherche Vi-style
- Reproductibilité cross-platform (Java ↔ JS)

### Lancer le projet

**Option 1 : Directement dans le navigateur**
```bash
# Double-cliquer sur index.html
```

**Option 2 : Serveur local (recommandé)**
```bash
python3 -m http.server 8000
# Puis ouvrir http://localhost:8000
```

### Paramètres URL

Vous pouvez passer des paramètres dans l'URL :
- `?seed=123456` : Seed spécifique pour reproductibilité
- `?verbose=true` : Mode verbose (logs détaillés)
- `?no-highlight=true` : Désactiver les highlights de cartes

Exemple : `http://localhost:8000?seed=42&verbose=true`

### Commandes clavier

**Menu principal**
- `↑↓` : Naviguer entre les options
- `Tab` : Basculer mode/paramètres
- `Espace` : Cocher/décocher les cases
- `Entrée` : Éditer seed / Valider
- `ESC` : Annuler édition seed
- `1/2` : Sélection directe par numéro

**Zone Grille**
- `Flèches` : Naviguer dans la grille
- `+` : Marquer "possède"
- `-` : Marquer "ne possède pas"
- `X` : Marquer "solution" (personne n'a)
- `0-9, A-Z` : Notes personnelles
- `U` : Undo
- `R` : Redo
- `Backspace` : Effacer

**Zone Information**
- `↑↓` : Scroller l'historique
- `/` : Lancer une recherche
- `n` : Résultat suivant
- `G` : Aller à la fin
- `5G` : Aller au tour 5
- `ESC` : Annuler la recherche

**Zone Propositions**
- `Gauche/Droite` : Changer de liste
- `Haut/Bas` : Naviguer dans la liste
- `Entrée` : Faire une proposition
- `A` : Faire une accusation

**Global**
- `Tab` / `Shift-Tab` : Naviguer entre les zones
- `N` : Nouvelle partie

### Contraintes

- ❌ **Aucune dépendance externe** : pur HTML/CSS/JS
- ✅ **Rendu console-like** identique au Java
- ✅ **Mêmes commandes clavier**
- ✅ **Reproductibilité cross-platform** via seed

### Compatibilité

Testé sur :
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Nécessite : ES6 modules, BigInt
