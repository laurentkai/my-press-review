# My Press Review

Socle d’une application de revue de presse personnalisée. La révision corrigée `3973252152195ae6c3105b4663a84db37dfc7b00` est publiée sur [workers.dev](https://my-press-review.laurent-kaiser.workers.dev) ; elle ajoute le classement déterministe, les images des flux et la lecture interne à l’espace d’essai partagé par code. Cet espace temporaire ne fournit ni comptes individuels/OAuth, ni IA, ni isolation entre ses utilisateurs : ce n’est pas le produit privé final.

La seconde revue Claude de `54e8465..3973252` ne relève aucun blocage ni problème majeur et confirme la correction des quatre remarques mineures. Le workflow [43951478895](https://github.com/laurentkai/my-press-review/actions/runs/43951478895) a réussi, appliqué la migration distante `0003` et promu la release vers `Production` (`c9c94ef`). Voir [Branches, pipeline et livraison](docs/DELIVERY.md) et le [compte rendu de l’itération 4](docs/iterations/0004.md).

## CI/CD et état de déploiement

Le compte Cloudflare et les paramètres GitHub sont configurés. L’itération 3 avait été livrée par le [run 43942205690](https://github.com/laurentkai/my-press-review/actions/runs/43942205690) ; l’itération 4 est maintenant publiée par le [run 43951478895](https://github.com/laurentkai/my-press-review/actions/runs/43951478895). Voir [Branches, pipeline et livraison](docs/DELIVERY.md), le [catalogue des sources](docs/SOURCES.md) et les [comptes rendus des itérations 3](docs/iterations/0003.md) et [4](docs/iterations/0004.md).

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
