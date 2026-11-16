# Étapes de réalisation

## Itération 1 — socle de démonstration (révision `6887f3f`)

Réalisés : application React/Vite, Worker Hono avec ressources statiques, premier schéma D1 et migration locale, filtres et vue de lecture sur contenu fictif, gestion de sources en mémoire, Cron configuré mais sans effet. Voir le [compte rendu](iterations/0001.md).

## Suites à planifier — non réalisées

1. Décider admission, compte initial Super Admin, sources, tâches IA et conservation.
2. Implémenter et tester authentification, sessions et autorisations ; provisionner explicitement les comptes autorisés.
3. Concevoir puis migrer le modèle personnel des flux, thèmes, sujets, articles et règles.
4. Ajouter une collecte autorisée avec validation des URL, limites, déduplication et suivi d’état.
5. Ajouter le traitement IA choisi, ses limites et sa traçabilité.
6. Connecter l’interface aux données persistées et couvrir les parcours, permissions, erreurs et accessibilité.
7. Configurer la cible Cloudflare et une méthode de livraison après autorisation ; aucune mise en production n’a eu lieu.

L’ordre et le périmètre des prochaines étapes restent à confirmer. La liste ne constitue pas un engagement ni une autorisation de déploiement.
