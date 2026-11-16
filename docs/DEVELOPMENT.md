# Développement local

## Prérequis et installation

Node.js `>=22.12.0` (voir `engines` dans `package.json`) et npm, depuis la racine du dépôt :

```sh
npm ci
npm run db:migrate:local
npm run dev
```

La migration cible uniquement la base Wrangler locale. Elle crée le schéma initial sans données de démonstration ; l’interface utilise ses propres fixtures fictives. `database_id` à zéro dans `wrangler.jsonc` est un placeholder local, pas un identifiant Cloudflare à utiliser pour déployer.

## Commandes disponibles

Ces commandes correspondent aux scripts de `package.json` :

| Commande | Fonction |
| --- | --- |
| `npm run dev` | Serveur Vite de développement sur `127.0.0.1`, port `5173` par défaut |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run test` | Tests Vitest (`vitest run`) |
| `npm run build` | Build Vite avec le plugin Cloudflare |
| `npm run check` | Typecheck, tests, puis build |
| `npm run format:check` | Vérifie le format des chemins de code/configuration listés dans `package.json` ; ne couvre pas les documents Markdown |
| `npm run db:migrate:local` | Applique les migrations D1 à la base locale `press-review` |
| `npm run preview` | Prévisualise le build sur `127.0.0.1`, port `4173` par défaut |

Pour prévisualiser, construire d’abord :

```sh
npm run build
npm run preview
```

Vite essaie le port suivant si le port par défaut est occupé. Dans l’environnement de validation de l’itération 1, `4173` appartenait déjà à un autre service ; le preview a donc utilisé `4174`, sans arrêter ni modifier cet autre service. Pour sélectionner explicitement un port libre, par exemple :

```sh
npm run preview -- --port 4174 --strictPort
```

Après tout nouveau build, arrêter puis relancer le serveur preview pour qu’il recharge le manifeste des assets ; un processus déjà lancé peut servir un manifeste périmé.

## Limites du prototype

Les articles et sources affichés sont fictifs. L’ajout et l’activation/désactivation des sources ne durent que jusqu’au rechargement et ne déclenchent aucune requête de collecte. OAuth, session, IA et déploiement ne sont pas configurés. Le Cron Trigger est déclaré mais son gestionnaire est sans effet. Voir le [compte rendu de l’itération 1](iterations/0001.md).
