# Étapes de réalisation

## Itération 1 — socle de démonstration (révision `6887f3f`)

Réalisés : application React/Vite, Worker Hono avec ressources statiques, premier schéma D1 et migration locale, filtres et vue de lecture sur contenu fictif, gestion de sources en mémoire, Cron configuré mais sans effet. Voir le [compte rendu](iterations/0001.md).

## Itération 2 — pipeline CI/CD (révision `125d81a`)

Réalisés : workflow de vérification PR/Main, artefacts build vérifiés, export allowlisté, configuration éphémère, vérifications contre un Main obsolète, bookmark de récupération D1, et étapes de déploiement Cloudflare/promotion séparée vers `Production`. Le pipeline est implémenté, mais aucun déploiement réel n’a été effectué. Sept remarques de la première revue Claude ont été corrigées et aucune n’est bloquante selon la seconde revue. Voir le [compte rendu](iterations/0002.md).

L’autodéploiement après push à `Main` et la promotion vers `Production` sont autorisés, mais la connexion Cloudflare et les paramètres GitHub requis restent à configurer ; aucun vrai déploiement n’a été effectué. La première validation de permissions et le premier déploiement réel restent donc à faire.

## Suites à planifier — non réalisées

1. Connecter le compte Cloudflare et configurer le secret et les variables GitHub ; vérifier les permissions réelles puis exécuter le premier workflow autorisé.
2. Décider admission, compte initial Super Admin, sources, tâches IA et conservation.
3. Implémenter et tester authentification, sessions et autorisations ; provisionner explicitement les comptes autorisés.
4. Concevoir puis migrer le modèle personnel des flux, thèmes, sujets, articles et règles.
5. Ajouter une collecte autorisée avec validation des URL, limites, déduplication et suivi d’état.
6. Ajouter le traitement IA choisi, ses limites et sa traçabilité.
7. Connecter l’interface aux données persistées et couvrir les parcours, permissions, erreurs et accessibilité.

Les suites produit restent à planifier. L’intégration du code dans le dépôt distant, la configuration Cloudflare/GitHub et le premier déploiement sont distincts : l’automatisation est autorisée, mais l’accès Cloudflare est encore attendu.
