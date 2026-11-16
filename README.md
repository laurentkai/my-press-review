# My Press Review

Socle initial d’une application de revue de presse personnalisée. La première itération fournit une interface de démonstration React/Vite et un Worker Cloudflare avec routes API de statut et d’authentification non configurées, un schéma D1 initial et un déclencheur planifié sans collecte. Les contenus et sources de l’interface sont fictifs ; aucune authentification, collecte, IA, persistance des sources de l’interface ou mise en production n’est disponible.

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
