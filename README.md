# My Press Review

Socle d’une application de revue de presse personnalisée. La révision `c2fb5a875de1ede655a18b4da89a949594bafa83` est déployée sur [workers.dev](https://my-press-review.laurent-kaiser.workers.dev) et comprend un espace d’essai partagé protégé par code ainsi qu’une collecte RSS réelle. Cet espace temporaire ne fournit ni comptes individuels/OAuth, ni IA, ni isolation entre ses utilisateurs : ce n’est pas le produit privé final.

## CI/CD et état de déploiement

Le compte Cloudflare et les paramètres GitHub sont configurés. Le push de l’itération 3 sur `Main` a déclenché avec succès le pipeline automatique, la migration distante et la promotion de la release vers `Production` ([run 43942205690](https://github.com/laurentkai/my-press-review/actions/runs/43942205690)). La production contient les migrations et le runtime de cette révision ; voir [Branches, pipeline et livraison](docs/DELIVERY.md), le [catalogue des sources](docs/SOURCES.md) et le [compte rendu de l’itération 3](docs/iterations/0003.md).

## Développer

Prérequis : Node.js `>=22.12.0` et npm. Depuis la racine du dépôt :

```sh
npm ci
npm run db:migrate:local
npm run dev
```

Le détail des commandes, du prévisualiseur et des limites locales est dans le [guide de développement](docs/DEVELOPMENT.md).

## Documentation

- [Produit : livré et projeté](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Modèle de données actuel et conceptuel](docs/DATA_MODEL.md)
- [Authentification : état et cible](docs/AUTH.md)
- [Collecte et IA : état et cible](docs/INGESTION.md)
- [Étapes de réalisation](docs/ROADMAP.md)
- [Branches et livraison](docs/DELIVERY.md)
- [Décisions et questions](docs/DECISIONS.md)
- [Workflow des agents](docs/WORKFLOW.md)
- [Compte rendu de la première itération](docs/iterations/0001.md)
- [Compte rendu de l’itération CI/CD](docs/iterations/0002.md)

- [Compte rendu des sources et de l’accès privé](docs/iterations/0003.md)
