# My Press Review

Application de revue de presse en français, publiée sur [workers.dev](https://my-press-review.laurent-kaiser.workers.dev). La version `4c0d9a0` propose thèmes, images et lecture de certaines pages publiques ; elle exclut les articles réservés et les accès non confirmés. L’espace d’essai est partagé par code, sans OAuth, comptes individuels ni IA.

Le [workflow 43960317682](https://github.com/laurentkai/my-press-review/actions/runs/43960317682) a appliqué la migration `0004`, déployé le Worker puis promu la release vers `Production`. Les 270 tests passent et la seconde revue de Claude ne relève aucun blocage. Les sources compatibles, les vérifications de production et les limites sont détaillées dans le [compte rendu 0005](docs/iterations/0005.md), le [catalogue](docs/SOURCES.md) et le [guide de livraison](docs/DELIVERY.md).

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
- [Itération 4 — classement, images et lecture](docs/iterations/0004.md)
- [Itération 5 — lecture des articles disponibles, seconde revue validée](docs/iterations/0005.md)
