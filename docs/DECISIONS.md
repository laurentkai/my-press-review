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
- Pour l’itération 3 seulement, accès temporaire par un code partagé à un espace d’essai privé ; ce choix ne tranche pas l’authentification de la cible ni l’isolation par utilisateur.
- Catalogue initial demandé : neuf sources ; sept flux configurés et actifs, Le Soir et Zonebourse désactivés après prétests 403 sans flux vérifié. Les catégories restent des étiquettes proposées, pas des classifications confirmées ni IA.
- Déploiement automatique autorisé après commit poussé sur `Main`, avec promotion contrôlée vers `Production` ; le premier déploiement manuel a réussi, les pushes suivants sur `Main` déclenchent le même pipeline.
- Collaboration : Codex implémente, Claude réalise les revues de code, GitHub Copilot rédige la documentation ; déroulement dans [WORKFLOW.md](WORKFLOW.md).

Ces décisions décrivent l’orientation produit et technique ; elles ne signifient pas que les fonctionnalités sont déjà livrées. Le socle disponible est décrit dans [PRODUCT.md](PRODUCT.md) et [le compte rendu de l’itération 1](iterations/0001.md).

## Questions restantes

1. Admission sur invitation, liste autorisée ou inscription ouverte avec validation ? Quel compte reçoit le rôle initial Super Admin ?
2. Quels médias/flux ajouter au catalogue initial, et quel processus suivre si une source demandée reste inaccessible ?
3. L’IA doit-elle classer les articles, rédiger des résumés individuels, produire une synthèse par sujet, ou combiner ces tâches ? Quel fournisseur ou compte IA est disponible ?
4. Quelle durée de conservation des articles et des résultats IA ?
5. Un sujet peut-il appartenir à plusieurs thèmes ? Faut-il reclasser l’historique après modification des règles ?
6. Favoris, lus/non lus, recherche et notifications : lesquels inclure dans la première version ?
7. Les inscriptions développeur Microsoft/Apple sont-elles disponibles ? Le compte Cloudflare et le déploiement initial sont configurés sur `workers.dev` ; le recours à un domaine personnalisé reste à décider.

## État opérationnel

Le Worker et la base D1 `press-review` sont déployés sur Cloudflare. La révision `c2fb5a8` a été intégrée à `Main`, livrée par le pipeline automatique et promue dans `Production` ; elle ajoute un espace d’essai partagé protégé par code et la collecte RSS. OAuth, IA, comptes individuels et Super Admin ne sont pas implémentés. `database_id` à zéro dans `wrangler.jsonc` reste un placeholder du dépôt ; les identifiants réels sont injectés uniquement dans `.deployment` en CI. Le déploiement utilise `workers.dev` sans domaine personnalisé.
