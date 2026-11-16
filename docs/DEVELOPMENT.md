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

## CI et outils de release

Le workflow GitHub Actions utilise Node.js 24 et exécute :

```sh
npm ci
npm run format:check
npm run check
npm run db:migrate:local
```

Il applique la migration uniquement à D1 local. Sur `Main`, le build vérifié est conservé comme artefact puis transmis au job de déploiement ; le job installe les outils avec `npm ci --ignore-scripts` et ne reconstruit pas l’application. Les détails du pipeline, de ses garde-fous et des conditions d’accès sont dans [DELIVERY.md](DELIVERY.md).

Les scripts `package.json` exposent également ces commandes :

| Commande | Fonction et précautions |
| --- | --- |
| `npm run release:export` | Crée `.release/` depuis le build existant et les migrations. Exige `SOURCE_SHA` (ou `GITHUB_SHA`) au format commit complet de 40 caractères. N’injecte aucun identifiant Cloudflare réel. |
| `npm run release:configure` | Valide `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_D1_DATABASE_ID`, puis copie l’export dans `.deployment/` et y injecte ces identifiants. Le dossier est ignoré par Git ; les identifiants ne sont pas des secrets et peuvent apparaître dans les journaux. |
| `npm run release:promote` | **Mutation distante** : pousse l’instantané vérifié vers `origin/Production`. Ce n’est ni un test ni une commande de vérification courante ; ne l’exécuter que dans le processus de promotion explicitement autorisé. |

`release:export` suppose que `npm run build` a déjà produit les entrées attendues. La préparation complète en CI fait l’export, la configuration, puis un dry-run Wrangler avant toute migration distante. La commande de promotion locale n’est pas nécessaire au développement quotidien et requiert un dépôt distant configuré.

La connexion Cloudflare et le secret/variables GitHub sont configurés ; un premier déploiement manuel a réussi. Les pushes suivants à `Main` déclenchent le même pipeline ; contrôler leur résultat dans GitHub Actions. Les procédures d’activation et de remplacement du jeton avant son expiration sont dans [DELIVERY.md](DELIVERY.md). Ne copiez jamais le token ou les valeurs des variables d’identifiants dans une commande, un fichier suivi par Git ou ces documents.

## Limites du prototype

Le site Cloudflare déployé reste une démonstration publique : articles et sources fictifs, ajout et activation/désactivation en mémoire, sans collecte. OAuth, session et IA ne sont pas configurés ; le Cron Trigger est déclaré mais son gestionnaire est sans effet. Voir le [compte rendu de l’itération 1](iterations/0001.md) et celui de l’[activation CI/CD](iterations/0002.md).
