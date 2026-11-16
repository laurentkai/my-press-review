# Branches et livraison

## Politique de branches

- `Main` est la branche de développement de référence : elle conserve code, documentation, tests, outils et configuration.
- `Production` est réservée à un export contrôlé des seuls fichiers nécessaires au déploiement ; ne pas y fusionner l’ensemble de `Main`.
- Le travail de la première itération a été documenté sur la branche `init-all-agents`, révision `6887f3f`, avec `Main` comme destination. Son intégration à `Main` est prévue et autorisée, mais reste à réaliser par le coordinateur ; cette documentation ne change pas de branche et ne réalise ni commit ni fusion.

## État de livraison

Aucun export contrôlé, script de promotion, environnement Cloudflare configuré ou déploiement n’existe. Il n’y a pas de commande de déploiement documentée. Le `database_id` à zéro de `wrangler.jsonc` est un placeholder de développement local seulement et ne doit pas servir à une cible réelle.

La migration D1 locale est distincte du bundle applicatif. La configuration des accès et ressources Cloudflare, la cible de déploiement et son autorisation restent à fournir.

## Processus futur, à construire et valider

1. Valider une révision source et ses contrôles.
2. Construire les ressources de manière reproductible.
3. Créer un export à partir d’une liste explicite de fichiers autorisés.
4. Vérifier contenu, secrets, empreintes et compatibilité des migrations.
5. Promouvoir uniquement l’export dans `Production` en gardant la référence à la révision source.
6. Déployer vers une cible autorisée et vérifier le service.

Ce processus est une proposition de travail, pas une automatisation active. Un retour à un bundle antérieur ne restaure pas la base : les migrations devront rester compatibles et une stratégie de sauvegarde sera nécessaire avant une mise en production.
