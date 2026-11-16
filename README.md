# My Press Review

Socle initial d’une application de revue de presse personnalisée. L’interface de démonstration React/Vite et le Worker Cloudflare fournissent un schéma D1 initial et des routes API de statut, mais pas d’authentification, de collecte ou d’IA. Les contenus et sources de l’interface sont fictifs et leur configuration n’est pas persistée.

## CI/CD et état de déploiement

Le workflow vérifie les pull requests vers `Main` et les commits poussés sur `Main`. Le déploiement automatique après push à `Main` et la promotion contrôlée vers `Production` sont autorisés, mais restent inactifs tant que la connexion Cloudflare et les paramètres GitHub requis ne sont pas configurés. Aucun déploiement Cloudflare n’a encore eu lieu. Les exécutions de vérification sont consultables dans l’onglet Actions du dépôt GitHub. Voir [Branches, pipeline et livraison](docs/DELIVERY.md) et le [compte rendu de l’itération 2](docs/iterations/0002.md).

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
