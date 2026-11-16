# My Press Review

Socle initial d’une application de revue de presse personnalisée, déployé comme démonstration publique sur [workers.dev](https://my-press-review.laurent-kaiser.workers.dev). L’interface React/Vite affiche uniquement des articles fictifs ; elle n’a pas d’authentification, de collecte ni d’IA, et la configuration des sources n’est pas persistée. Ce site public n’est pas une application privée prête à l’emploi.

## CI/CD et état de déploiement

Le compte Cloudflare et les paramètres GitHub sont configurés. Le premier déploiement a réussi via un lancement manuel du workflow sur `Main`. Les prochains pushes sur `Main` déclenchent le même pipeline ; leurs résultats sont consultables dans [GitHub Actions](https://github.com/laurentkai/my-press-review/actions). Voir [Branches, pipeline et livraison](docs/DELIVERY.md) et le [compte rendu de l’itération 2](docs/iterations/0002.md).

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
