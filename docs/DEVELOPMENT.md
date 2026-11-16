# Développement local

## Prérequis et installation

Node.js `>=22.12.0` (voir `engines` dans `package.json`) et npm, depuis la racine du dépôt :

```sh
npm ci
npm run db:migrate:local
npm run dev
```

La migration cible uniquement la base Wrangler locale. Elle crée le schéma d’identité initial puis le catalogue et les tables de l’espace d’essai privé ; l’interface de démonstration utilise aussi ses propres fixtures fictives. `database_id` à zéro dans `wrangler.jsonc` est un placeholder local, pas un identifiant Cloudflare à utiliser pour déployer.

## Code d’accès temporaire local

L’itération 3 protège l’espace d’essai partagé par le secret `TEST_ACCESS_CODE` (au moins 24 caractères). En local, le code d’accès est conservé dans `~/.local/share/my-press-review/trial-access-code.txt` avec les permissions `0600`; il est également utilisé par le runtime via `.dev.vars`, fichier ignoré par Git. Le propriétaire peut ouvrir le fichier pour copier le code dans le formulaire de connexion. Ne pas publier sa valeur dans les journaux, commandes enregistrées ou fichiers versionnés.

La valeur du code réel n’est pas reproduite ici. La révision de l’itération 3 est publiée sur Cloudflare ; les résultats de collecte locaux et ceux de production doivent rester distincts.

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

Le déploiement de l’espace d’essai exige aussi le secret GitHub `TEST_ACCESS_CODE`. Le workflow le transmet au Worker avec un fichier JSON temporaire protégé (`umask 077`, suppression par `trap`) via Wrangler `--secrets-file` ; la valeur n’est pas intégrée au bundle ni aux fichiers de release. L’export exclut explicitement `.dev.vars`.

Les scripts `package.json` exposent également ces commandes :

| Commande | Fonction et précautions |
| --- | --- |
| `npm run release:export` | Crée `.release/` depuis le build existant et les migrations. Exige `SOURCE_SHA` (ou `GITHUB_SHA`) au format commit complet de 40 caractères. N’injecte aucun identifiant Cloudflare réel. |
| `npm run release:configure` | Valide `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_D1_DATABASE_ID`, puis copie l’export dans `.deployment/` et y injecte ces identifiants. Le dossier est ignoré par Git ; les identifiants ne sont pas des secrets et peuvent apparaître dans les journaux. |
| `npm run release:promote` | **Mutation distante** : pousse l’instantané vérifié vers `origin/Production`. Ce n’est ni un test ni une commande de vérification courante ; ne l’exécuter que dans le processus de promotion explicitement autorisé. |

`release:export` suppose que `npm run build` a déjà produit les entrées attendues. La préparation complète en CI fait l’export, la configuration, puis un dry-run Wrangler avant toute migration distante. La commande de promotion locale n’est pas nécessaire au développement quotidien et requiert un dépôt distant configuré.

La connexion Cloudflare et le secret/variables GitHub sont configurés ; un premier déploiement manuel a réussi. Les pushes suivants à `Main` déclenchent le même pipeline ; contrôler leur résultat dans GitHub Actions. Les procédures d’activation et de remplacement du jeton avant son expiration sont dans [DELIVERY.md](DELIVERY.md). Ne copiez jamais le token ou les valeurs des variables d’identifiants dans une commande, un fichier suivi par Git ou ces documents.

## État du prototype

La révision `c2fb5a8` a livré l’espace d’essai partagé par code, sept flux RSS actifs et deux sources désactivées. Ses relevés historiques — 166 articles/126 affichés en local et 169/129 en production — sont distincts des vérifications de l’itération 4. OAuth, les comptes individuels, le Super Admin et l’IA restent à implémenter.

La révision corrigée `3973252` après `54e8465` est publiée ; le workflow 43951478895 a réussi 165 tests, build, format, migration distante 0003 et promotion vers `Production` (`c9c94ef`). La seconde revue Claude de `54e8465..3973252` ne relève aucun blocage ni problème majeur et confirme les quatre remarques mineures corrigées. Voir [Sources](SOURCES.md), les comptes rendus [0001](iterations/0001.md), [0002](iterations/0002.md), [0003](iterations/0003.md) et [0004](iterations/0004.md).

Si une base D1 locale a déjà appliqué une ancienne version de `0003_article_reading.sql` avant l’ajout de `reading_metadata_version`, ne pas la réinitialiser. Inspecter d’abord le schéma :

```sh
npx --no-install wrangler d1 execute press-review --local --command "PRAGMA table_info(trial_sources);"
```

Uniquement si le résultat ne contient pas `reading_metadata_version`, ajouter la colonne à la base locale existante :

```sh
npx --no-install wrangler d1 execute press-review --local --command "ALTER TABLE trial_sources ADD COLUMN reading_metadata_version INTEGER NOT NULL DEFAULT 0;"
```
