# Décisions et questions

## Confirmé

- Branche de développement `Main`, branche de livraison `Production`.
- Application privée multiutilisateur en français ; chaque utilisateur configure ses sources.
- Connexion OAuth/OIDC avec Microsoft (Hotmail compris) et Apple ; architecture extensible.
- Super Admin pour la configuration globale.
- Consultation de type site de presse, classement par thèmes et sujets.
- Collecte toutes les 15 minutes avec traitement IA des nouveautés.
- Afficher autant que possible le contenu original autorisé ; toujours conserver provenance et lien original.
- Un Worker Cloudflare unique avec fichiers statiques (Static Assets), API et scheduler ; D1 pour les données.
- TypeScript ; socle proposé React + Vite et Hono.
- Aucun budget fixé : rendre la consommation et les limites d’usage configurables.
- Collaboration : Codex implémente, Claude réalise les revues de code, GitHub Copilot rédige la documentation ; déroulement dans [WORKFLOW.md](WORKFLOW.md).

Ces décisions décrivent l’orientation produit et technique ; elles ne signifient pas que les fonctionnalités sont déjà livrées. Le socle disponible est décrit dans [PRODUCT.md](PRODUCT.md) et [le compte rendu de l’itération 1](iterations/0001.md).

## Questions restantes

1. Admission sur invitation, liste autorisée ou inscription ouverte avec validation ? Quel compte reçoit le rôle initial Super Admin ?
2. Quels médias/flux initiaux au-delà des exemples Le Monde et Le Figaro ?
3. L’IA doit-elle classer les articles, rédiger des résumés individuels, produire une synthèse par sujet, ou combiner ces tâches ? Quel fournisseur ou compte IA est disponible ?
4. Quelle durée de conservation des articles et des résultats IA ?
5. Un sujet peut-il appartenir à plusieurs thèmes ? Faut-il reclasser l’historique après modification des règles ?
6. Favoris, lus/non lus, recherche et notifications : lesquels inclure dans la première version ?
7. Quel compte Cloudflare et domaine seront utilisés, et les inscriptions développeur Microsoft/Apple sont-elles disponibles ? Le déploiement depuis `Production` sera-t-il manuel ou automatique ?

## État opérationnel

Le socle local possède un schéma D1 initial et une interface de démonstration. OAuth, collecte et IA ne sont pas configurés ou actifs. Aucun compte Super Admin n’est créé, aucune ressource Cloudflare n’est provisionnée et aucun déploiement n’a été effectué. `database_id` à zéro dans `wrangler.jsonc` est un placeholder local, pas une valeur à déployer.
