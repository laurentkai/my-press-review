# Produit et périmètre

## Livré dans la première itération

- Une interface React/Vite de démonstration en français, avec navigation, filtres par thème et sujet, recherche, vue de lecture et mise en page adaptée au mobile.
- Des articles, thèmes et sources entièrement fictifs, explicitement signalés comme tels.
- Un écran de gestion de sources de démonstration : ajout et activation/désactivation en mémoire uniquement, perdus au rechargement ; aucune URL n’est collectée.
- Un Worker Hono avec ressources statiques, routes de statut et de fournisseurs OAuth déclarés indisponibles, et réponses privées/non trouvées définies par défaut.
- Un premier schéma D1 pour utilisateurs, identités OAuth, sessions et sources.
- Un Cron Trigger configuré toutes les 15 minutes, dont le gestionnaire ne fait volontairement aucun travail.

Ce socle n’est pas une application connectée : il n’y a ni authentification ou session fonctionnelle, ni compte Super Admin, ni collecte, ni traitement IA, ni persistance de la configuration de l’interface.

## Cible produit, non livrée

Application privée en français où chaque utilisateur configure et consulte sa revue ; un Super Admin gère la configuration globale. Les concepts et capacités ci-dessous sont une cible future, pas des fonctionnalités disponibles.

### Concepts

- **Source** : média et méthode de collecte ; un média peut proposer plusieurs flux.
- **Thème** : grande catégorie, par exemple politique française.
- **Sujet** : dossier suivi dans un thème, par exemple présidentielle française.
- **Filtre** : règle d’inclusion/exclusion fondée sur mots-clés, source, langue ou dates ; portée et opérateurs restent à confirmer.
- **Article** : publication d’une source ; un article peut apparaître dans plusieurs sujets.

### Capacités proposées

- Connexion Microsoft (comptes personnels Hotmail/Outlook) et Apple ; autres fournisseurs extensibles.
- Administration Super Admin de la configuration globale et des paramètres de collecte/IA ; administration personnelle des sources/flux, thèmes, sujets et filtres.
- Collecte autorisée toutes les 15 minutes avec traitement IA des nouveautés, déduplication et suivi de l’état et des erreurs de chaque flux.
- Consultation par thème et sujet, cartes et vue de lecture. Conserver source, date et lien original ; afficher le contenu original lorsqu’acquisition et reproduction sont autorisées, sinon l’extrait disponible et un lien vers l’original. Identifier clairement tout contenu produit par IA.
- Afficher la dernière collecte réussie et distinguer un flux vide d’un flux en erreur.
- Interface française utilisable sur mobile et au clavier, avec états vides, chargement et erreur.

## Critères de réussite futurs

Une source autorisée peut être ajoutée et testée ; sa collecte peut être relancée sans doublon ; un article pertinent rejoint le bon sujet ; une exclusion est explicable ; l’échec d’un flux ne bloque pas les autres ; une requête non autorisée ne peut pas modifier la configuration.

## Questions ouvertes

Fournisseur et rôle exact de l’IA, mode d’admission des utilisateurs, sources initiales, durée de conservation, recherche, favoris, états de lecture et notifications. Aucun budget n’est imposé ; la cible prévoit des limites d’usage administrables et une visibilité sur la consommation.
