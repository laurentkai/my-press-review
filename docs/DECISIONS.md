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
- Catalogue initial demandé : neuf sources ; sept flux configurés et actifs, Le Soir et Zonebourse désactivés après prétests 403 sans flux vérifié. Les catégories géographiques/financières associées aux sources restent des étiquettes proposées, pas des classifications confirmées.
- Demande de l’itération 4 confirmée : classer les articles par thème/sous-thème, utiliser les images présentes dans les flux originaux et proposer une lecture interne avec lien vers l’éditeur. Cette demande ne confirme ni droits de republication ni recours à l’IA.
- Demande de l’itération 5 confirmée : afficher uniquement les articles dont la disponibilité est établie ; ne jamais reprendre un article d’abonné, même sous forme d’extrait. Le contenu réservé ne sera pas obtenu via API ou champ de flux, et aucun paywall, consentement, `403`, authentification ou règle `robots` ne sera contourné. `unknown` sans preuve positive est hors périmètre ; un texte incomplet ne doit jamais être présenté comme intégral. Le code corrigé `4c0d9a0` applique ce périmètre ; Codex rapporte 270 tests, et la seconde revue Claude ne relève aucun blocage ni point majeur. La publication a réussi via le workflow 43960317682, avec contrôles navigateur en production. Voir [0005](iterations/0005.md).
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
8. Faut-il suspendre les flux du Figaro, du JSL et d’Investing.com tant qu’aucun accès gratuit n’est confirmé, ou les garder actifs mais invisibles dans la revue ?

## État opérationnel

Le Worker et la base D1 `press-review` sont déployés sur Cloudflare. La révision `c2fb5a8` a introduit l’espace d’essai partagé protégé par code et la collecte RSS. La révision corrigée de l’itération 4 (`3973252`, après `54e8465`) ajoute le classement, les images de flux et la lecture interne ; le workflow 43951478895 a réussi la migration distante 0003 et promu le code vers `Production` (`c9c94ef`). La seconde revue Claude de `54e8465..3973252` ne relève aucun blocage ni problème majeur et confirme la correction des quatre remarques mineures. La première version de l’itération 5 (`f9cf7fd`) a reçu une remarque majeure (M1) et cinq remarques mineures ; le code corrigé est figé sur `4c0d9a0`, avec 270 tests rapportés. La seconde revue ne relève aucun blocage ni majeur, mais quatre points mineurs restent à suivre. Le workflow 43960317682 a appliqué la migration distante 0004, déployé puis promu le code en `Production` (`8a831a8`). OAuth, IA et comptes individuels ne sont pas implémentés. `database_id` à zéro dans `wrangler.jsonc` reste un placeholder du dépôt ; les identifiants réels sont injectés uniquement dans `.deployment` en CI. Le déploiement utilise `workers.dev` sans domaine personnalisé.
