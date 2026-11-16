# Décisions et questions

## Confirmé

- Branche de développement `Main`, branche de livraison `Production`.
- Application privée multiutilisateur en français ; chaque utilisateur configure ses sources.
- Connexion OAuth/OIDC avec Microsoft (Hotmail compris) et Apple ; architecture extensible.
- Super Admin pour la configuration globale.
- Consultation de type site de presse, classement par thèmes et sujets.
- Collecte toutes les 15 minutes avec traitement IA des nouveautés.
- Afficher autant que possible le contenu original autorisé ; toujours conserver provenance et lien original.
- Un Worker Cloudflare unique avec fichiers statiques, API et scheduler ; D1 pour les données.
- TypeScript ; socle proposé React + Vite et Hono.
- Aucun budget fixé : rendre la consommation et les limites d’usage configurables.

- Collaboration : Codex implémente, Claude réalise les revues de code, GitHub Copilot rédige la documentation ; déroulement dans WORKFLOW.md.

## Questions restantes

1. Admission sur invitation, liste autorisée ou inscription ouverte avec validation ? Quel compte reçoit le rôle initial Super Admin ?
2. Quels médias/flux initiaux au-delà des exemples Le Monde et Le Figaro ?
3. L’IA doit-elle classer les articles, rédiger des résumés individuels, produire une synthèse par sujet, ou combiner ces tâches ? Quel fournisseur ou compte IA est disponible ?
4. Quelle durée de conservation des articles et des résultats IA ?
5. Un sujet peut-il appartenir à plusieurs thèmes ? Faut-il reclasser l’historique après modification des règles ?
6. Favoris, lus/non lus, recherche et notifications : lesquels inclure dans la première version ?
7. Compte Cloudflare, domaine et inscriptions développeur Microsoft/Apple disponibles ? Déploiement manuel ou automatique depuis Production ?

## Hypothèses proposées, non confirmées

Admission contrôlée plutôt qu’accès automatique à toute personne possédant un compte OAuth. IA de classement en premier, autres traitements à préciser. Aucun accès implicite du Super Admin aux données personnelles. Aucun partage de contenus entre utilisateurs sans décision explicite.
