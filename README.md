# My Press Review

Site de revue de presse personnalisée : agréger les publications de sources choisies, les organiser par thèmes et sujets, et consulter les articles pertinents au même endroit.

Exemple : thème « Politique française », sujet « Présidentielle française », sources Le Figaro, Le Monde et autres médias sélectionnés. Ces médias sont des exemples, aucun flux n’est encore configuré ou validé.

## État du projet

Cadrage initial uniquement. Aucun site, collecteur, compte Cloudflare ou déploiement n’est encore configuré.

## Choix techniques

TypeScript pour le client, l’API et les collecteurs ; React + Vite pour l’interface ; Hono sur Cloudflare Workers pour l’API ; Cloudflare D1 pour les données ; Cron Triggers pour la collecte. Les versions seront fixées lors de l’initialisation du code.

Cible confirmée : un Worker Cloudflare unique pour les fichiers statiques, l’API et la collecte planifiée toutes les 15 minutes. Application privée avec connexion Microsoft/Hotmail et Apple, configuration personnelle et rôle Super Admin. Le traitement IA classe les nouveautés par thème et sujet ; son rôle éditorial précis reste à confirmer.

## Documents

- [Produit et périmètre](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Modèle de données](docs/DATA_MODEL.md)
- [Branches et livraison](docs/DELIVERY.md)
- [Questions et décisions](docs/DECISIONS.md)
- [Authentification et permissions](docs/AUTH.md)
- [Collecte et traitement IA](docs/INGESTION.md)
- [Étapes de réalisation](docs/ROADMAP.md)
- [Consignes des agents](AGENTS.md)
- [Collaboration : Codex → Claude → GitHub Copilot](docs/WORKFLOW.md)
