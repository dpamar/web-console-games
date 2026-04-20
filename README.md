# Web Console Games

Portages JavaScript de jeux classiques BSD et jeux originaux en mode console web.

Ouvrir `index.html` pour accéder au menu de sélection.

## Jeux disponibles

- **BCD** - Convertisseur décimal → BCD (bsdgames)
- **Caesar** - Chiffrement César (bsdgames)
- **Cluedo** - Jeu de déduction (original)
- **Factor** - Décomposition en facteurs premiers (bsdgames)
- **Mille Bornes** - Jeu de cartes (bsdgames)
- **Morse** - Traducteur code Morse (bsdgames)
- **Number** - Convertisseur nombre → texte (bsdgames)
- **Pig Latin** - Traducteur Pig Latin (bsdgames)
- **Pierre-Papier-Ciseaux** - Jeu classique (bsdgames)
- **Rain** - Animation de pluie (bsdgames)

## Méthodologie de portage

Les portages ont été réalisés à 100% via Claude avec les principes suivants :

### Conversion du code C

- **JavaScript idiomatique** : Le code C est converti en JavaScript moderne (ES6+)
- **Gestion du flux de contrôle** : Les labels et goto du C sont transformés selon le pattern `label → function` et `goto → return`
  - Exemple : `l2012: ...` devient `function l2012() { ... }` et `goto l2012` devient `return l2012()`
- **Fonctions save** : Ignorées pour l'instant (sauvegarde non implémentée)

### Adaptation de l'interface

Pour les jeux à sortie console directe (BCD, Caesar, Factor, etc.) :
- **Output** : Transposition vers les classes `Console` / `ConsoleLine` / `ConsoleStyleFactory`
- **Input** : Transposition vers `KeyboardManager`

Pour Mille Bornes :
- **Ncurses** : Conversion a minima de la bibliothèque ncurses vers l'API Console

### Générateurs aléatoires

Les jeux utilisent des générateurs de nombres pseudo-aléatoires avec seed pour garantir la reproductibilité des tests.

## Structure du projet

```
webgames/
├── index.html              # Menu de sélection
├── adventure.html          # Point d'entrée direct Adventure
├── cluedo.html             # Point d'entrée direct Cluedo
├── css/
│   ├── console.css         # Styles partagés
│   └── cluedo.css          # Styles spécifiques Cluedo
└── js/
    ├── ui/                 # Composants d'affichage partagés
    │   ├── Console.js      # Gestion de l'écran
    │   ├── ConsoleLine.js  # Construction de lignes stylées
    │   └── ConsoleStyleFactory.js
    ├── core/
    │   └── KeyboardManager.js  # Gestion des événements clavier
    ├── GameSelector.js     # Menu de sélection de jeu
    ├── adventure/          # Colossal Cave Adventure
    │   ├── start.js        # Point d'entrée
    │   ├── main.js         # Boucle principale
    │   ├── subr.js         # Fonctions auxiliaires
    │   ├── vocab.js        # Vocabulaire et objets
    │   ├── io.js           # Entrées/sorties
    │   ├── done.js         # Score et fin de partie
    │   ├── random.js       # Générateur avec seed
    │   └── glorkz.json     # Données du jeu
    ├── cluedo/             # Cluedo
    │   ├── main.js
    │   ├── ui/
    │   ├── models/
    │   ├── mechanics/
    │   └── logic/
    ├── bcd/                # BCD
    ├── caesar/             # Caesar
    ├── factor/             # Factor
    └── ... (autres jeux)
```

## Ajouter un nouveau jeu

### 1. Structure des fichiers

Créer la structure suivante :

```
js/mygame/
├── main.js         # Point d'entrée (exporte start())
└── ...             # Autres fichiers du jeu
```

### 2. Point d'entrée JavaScript

Créer `js/mygame/main.js` :

```javascript
import { Console } from '../ui/Console.js';
import { ConsoleLine } from '../ui/ConsoleLine.js';
import { ConsoleStyleFactory } from '../ui/ConsoleStyleFactory.js';
import { KeyboardManager } from '../core/KeyboardManager.js';

// Définir les styles spécifiques au jeu
const Style = ConsoleStyleFactory.createStyles({
    TITLE: 'game-title',
    HIGHLIGHT: 'game-highlight',
    ERROR: 'game-error'
});

async function main() {
    while (true) {
        Console.clearScreen();

        // Affichage avec styles
        ConsoleLine.displayText('Mon Super Jeu', Style.TITLE);
        ConsoleLine.displayEmptyLine();

        // Créer un gestionnaire clavier
        const keyboard = KeyboardManager.createScoped();

        // Écouter les touches
        keyboard.on('ArrowUp', () => {
            ConsoleLine.displayText('Haut pressé');
        });

        keyboard.on('Enter', () => {
            ConsoleLine.displayText('Entrée pressée');
        });

        keyboard.start();

        // Logique du jeu...

        // Nettoyer
        keyboard.cleanup();

        // Redemander si on rejoue
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText('Rejouer ? (o/n)');
        
        const response = await waitForKey();
        if (response !== 'o') break;
    }
}

// Export pour le menu de sélection
export async function start() {
    await main();
    
    ConsoleLine.displayEmptyLine();
    ConsoleLine.displayText('Appuyez sur une touche pour revenir au menu...');
    
    return new Promise((resolve) => {
        const handler = () => {
            document.removeEventListener('keydown', handler);
            resolve();
        };
        document.addEventListener('keydown', handler);
    });
}

// Auto-start en mode standalone
const isStandalone = window.location.pathname.includes('mygame.html');
if (isStandalone) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
}

// Fonction utilitaire
function waitForKey() {
    return new Promise((resolve) => {
        const handler = (e) => {
            document.removeEventListener('keydown', handler);
            resolve(e.key);
        };
        document.addEventListener('keydown', handler);
    });
}
```

### 3. Page HTML standalone

Créer `mygame.html` à la racine :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon Super Jeu</title>
    <link rel="stylesheet" href="css/console.css">
    <link rel="stylesheet" href="css/mygame.css">
</head>
<body>
    <div id="output-container"></div>
    <script type="module" src="js/mygame/main.js"></script>
</body>
</html>
```

### 4. Styles CSS

Créer `css/mygame.css` :

```css
.game-title {
    color: #00ff00;
    font-weight: bold;
    font-size: 1.2em;
}

.game-highlight {
    background-color: #333;
    color: #ffff00;
}

.game-error {
    color: #ff0000;
}
```

### 5. Ajouter au menu de sélection

Éditer `main.js` à la racine et ajouter le jeu :

```javascript
const GAMES = [
    // ... jeux existants
    {
        name: 'Mon Super Jeu',
        module: './js/mygame/main.js',
        description: 'Description du jeu'
    }
];
```

## Exemples d'utilisation des composants

### Console

```javascript
import { Console } from '../ui/Console.js';

// Effacer l'écran
Console.clearScreen();

// Positionner le curseur
Console.setCursor(0, 0);
```

### ConsoleLine

```javascript
import { ConsoleLine } from '../ui/ConsoleLine.js';

// Afficher du texte simple
ConsoleLine.displayText('Bonjour');

// Afficher avec un style
ConsoleLine.displayText('Erreur !', 'error-style');

// Ligne vide
ConsoleLine.displayEmptyLine();

// Texte avec highlighting
const line = new ConsoleLine();
line.addText('Score: ');
line.addText('150', 'highlight');
line.display();
```

### ConsoleStyleFactory

```javascript
import { ConsoleStyleFactory } from '../ui/ConsoleStyleFactory.js';

// Créer des styles pour le jeu
const Style = ConsoleStyleFactory.createStyles({
    HEADER: 'my-header',
    MENU_SELECTED: 'my-menu-selected',
    DANGER: 'my-danger'
});

// Utiliser les styles
ConsoleLine.displayText('Titre', Style.HEADER);
ConsoleLine.displayText('Option', Style.MENU_SELECTED);
```

### KeyboardManager

```javascript
import { KeyboardManager } from '../core/KeyboardManager.js';

// Créer un gestionnaire scopé
const keyboard = KeyboardManager.createScoped();

// S'abonner à des touches
keyboard.on('ArrowUp', () => {
    console.log('Haut');
});

keyboard.on('Enter', () => {
    console.log('Entrée');
});

keyboard.on('Escape', () => {
    console.log('Échap');
});

// Démarrer l'écoute
keyboard.start();

// Plus tard, nettoyer
keyboard.cleanup();
```
