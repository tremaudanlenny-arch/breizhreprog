# Breizh Reprog X Ninnin Projet Perf — 1.16

## Nouveautés majeures

- Mapping 3D éditable : active « Mapper en 3D », clique une cellule directement sur la surface, puis utilise les commandes habituelles de l'éditeur.
- Sélection 3D : le point sélectionné est signalé sur la surface et reste synchronisé avec la sélection de la grille.
- Édition 3D : double-clic sur une cellule 3D pour saisir une valeur absolue.
- Raccourcis unifiés : flèches, Ctrl+flèches, Ctrl+A, Ctrl+C, Ctrl+V, + et − fonctionnent aussi avec une sélection issue du mapping 3D.
- Guide intégré : F1 ouvre la documentation des commandes, raccourcis, édition et mapping 3D.
- ATDC : les réglages d'affichage (seuil, saturation, contraste) restent mémorisés par projet, map et SOI.
- Branding : migration des clés locales et événements restants vers Breizh Reprog, avec compatibilité de migration pour les anciennes préférences.
- Release : version applicative alignée sur 1.16 et pipeline de publication Windows conservé pour les releases.

## Commandes

| Touche / action | Fonction |
|---|---|
| Flèches | Déplacer la cellule active |
| Ctrl + flèche | Étendre la sélection |
| Ctrl + A | Sélectionner toute la map et les axes |
| Ctrl + C | Copier |
| Ctrl + V | Coller |
| + / = / pavé numérique + | Augmenter la sélection |
| - / _ / pavé numérique - | Diminuer la sélection |
| Double-clic | Modifier directement une valeur |
| Clic droit | Menu contextuel |
| F1 | Ouvrir le guide |
| Échap | Fermer le panneau/menu actif |

## Mapping 3D

Le mode 3D est disponible pour les maps multi-lignes. Le mode Mapping 3D est désactivé sur les cartes virtuelles ATDC qui restent en lecture seule.

1. Ouvre une map 2D et passe en **3D**.
2. Active **Mapper en 3D**.
3. Clique une cellule sur la surface.
4. Utilise `+` / `-`, les flèches, le presse-papiers ou les opérations de la barre d'outils.
5. Double-clique sur un point pour entrer directement une valeur.
6. Les modifications restent liées au moteur d'édition normal et sont sauvegardées avec la version du projet.
