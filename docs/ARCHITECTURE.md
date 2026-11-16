# Architecture

## Socle implémenté

- **Interface** : React 19 et Vite 8, en TypeScript ; les fixtures de démonstration se trouvent dans `apps/web/src/demo.ts`.
- **API/runtime** : Hono sur Cloudflare Workers dans `apps/worker/index.ts`. Wrangler/Vite relie le Worker aux ressources statiques et à la base D1.
- **Données** : migration `migrations/0001_identity_and_sources.sql`, appliquée à la base D1 locale.
- **Planification** : le Cron Trigger Wrangler est configuré sur `*/15 * * * *` (UTC), mais son gestionnaire est sans effet.

L’API expose le statut et les fournisseurs annoncés ; les fournisseurs OAuth répondent qu’ils ne sont pas configurés. Il n’existe pas encore d’API de connexion, de sessions actives, de collecte ou d’administration des données.

## Fonctionnement local

Les scripts npm et leurs commandes exactes sont documentés dans [DEVELOPMENT.md](DEVELOPMENT.md). L’interface de démonstration est indépendante des données D1. La migration crée le schéma initial, mais aucun utilisateur, rôle, session ou contenu n’est préinséré.

Dans `wrangler.jsonc`, `database_id` vaut `00000000-0000-0000-0000-000000000000` : c’est un placeholder du dépôt, pas un identifiant Cloudflare utilisable ni une configuration de production.

## Architecture cible, non implémentée

Le Worker unique avec ressources statiques, API privée, D1 et collecte planifiée reste la cible. Le pipeline envisagé est : sélection de flux échus, récupération autorisée, validation et normalisation, déduplication, persistance, puis classement IA et consultation authentifiée. Aucune de ces étapes de collecte ou de traitement n’est présente. Les schémas détaillés sont séparés entre [modèle actuel et modèle conceptuel](DATA_MODEL.md), [authentification](AUTH.md) et [collecte](INGESTION.md).

La cible devra aussi traiter les entrées de flux comme non fiables, limiter les requêtes sortantes et isoler les données par utilisateur. Ne pas interpréter ces exigences de conception comme une protection SSRF ou une isolation déjà implémentée.
