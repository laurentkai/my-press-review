# Étapes de réalisation

## Itération 1 — socle de démonstration (révision `6887f3f`)

Réalisés : application React/Vite, Worker Hono avec ressources statiques, premier schéma D1 et migration locale, filtres et vue de lecture sur contenu fictif, gestion de sources en mémoire, Cron configuré mais sans effet. Voir le [compte rendu](iterations/0001.md).

## Itération 2 — pipeline CI/CD (révision `125d81a`)

Réalisés : workflow de vérification PR/Main, artefacts build vérifiés, export allowlisté, configuration éphémère, vérifications contre un Main obsolète, bookmark de récupération D1, déploiement Cloudflare et promotion séparée vers `Production`. Sept remarques de la première revue Claude ont été corrigées et aucune n’est bloquante selon la seconde revue. Voir le [compte rendu](iterations/0002.md).

L’accès Cloudflare et les paramètres GitHub sont configurés ; un premier workflow lancé manuellement sur `Main` a déployé le Worker et promu l’instantané vers `Production`. Les pushes suivants sur `Main` déclenchent le même pipeline ; les exécutions et leur résultat restent traçables dans GitHub Actions.

## Suites à planifier — non réalisées

1. Surveiller le résultat des déploiements automatiques et la promotion correspondante à chaque livraison.
2. Décider admission, compte initial Super Admin, sources, tâches IA et conservation.
3. Implémenter et tester authentification, sessions et autorisations ; provisionner explicitement les comptes autorisés.
4. Concevoir puis migrer le modèle personnel des flux, thèmes, sujets, articles et règles.
5. Ajouter une collecte autorisée avec validation des URL, limites, déduplication et suivi d’état.
6. Ajouter le traitement IA choisi, ses limites et sa traçabilité.
7. Connecter l’interface aux données persistées et couvrir les parcours, permissions, erreurs et accessibilité.

Les suites produit restent à planifier. Aucune connexion OAuth, collecte réelle, IA ou persistance des sources de démonstration n’est disponible. Le token Cloudflare configuré doit être remplacé avant son expiration le 16 novembre 2027 ; voir [DELIVERY.md](DELIVERY.md).
