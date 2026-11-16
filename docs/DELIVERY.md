# Branches, CI/CD et livraison

## Branches et autorisation

- `Main` est la branche de développement de référence.
- `Production` reçoit uniquement l’instantané de livraison construit depuis le code déployé ; ne pas y fusionner l’ensemble de `Main`.
- Le déploiement automatique après push à `Main`, puis la promotion de l’instantané vers `Production`, sont autorisés.

## Première activation réelle — 16 novembre 2026

L’utilisateur s’est connecté via le navigateur Orca et a explicitement autorisé la configuration Cloudflare/GitHub et le déploiement. Le secret `CLOUDFLARE_API_TOKEN` et les variables `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_D1_DATABASE_ID` sont configurés ; aucune valeur d’identifiant ni aucun jeton ne doit être recopié dans la documentation. Le jeton utilisateur `my-press-review GitHub deployment`, limité au compte Cloudflare Elinaka, était actif après vérification, avec `Workers Scripts Edit`, `D1 Edit` et `Account Settings Read`, et une expiration au 16 novembre 2027. Il a été transféré directement au secret GitHub sans affichage ni stockage sur disque.

La base D1 `press-review` a été créée avec l’indication de localisation `weur`. Cette indication n’est pas une garantie de résidence des données dans l’Union européenne. L’accès initial est le domaine `workers.dev` ; aucun domaine personnalisé ni autre site n’a été modifié.

Le workflow manuel sur `Main` a réussi le 16 novembre 2026 : [exécution 43887904122](https://github.com/laurentkai/my-press-review/actions/runs/43887904122). `verify` a réussi en 27 s, `deploy` en 45 s (dry-run, point de récupération D1, migration distante `0001` et publication), et `promote` en 13 s. Le Worker publié est la version `42df32f1-d5a0-4275-9353-d4e14b3e3789`.

La source est le commit Main distant `ab62f1fe094ecec1bc687e89b4e66652cbb45a1c` ; au moment de la vérification, `Main` local et la branche de travail `init-all-agents` pointaient aussi sur ce commit. Les références locale et distante `Production` sont à `4ef7328`, qui contient l’instantané correspondant ; son arbre ne contient que `migrations/`, `public/`, `release.json`, `worker/` et `wrangler.json`. Le manifeste de release référence la source dans `sourceSha`. Les validations détaillées figurent dans [le compte rendu d’activation](iterations/0002.md).

Ce premier déploiement a été déclenché manuellement avec `workflow_dispatch`. Les pushes suivants sur `Main` exécutent le même pipeline ; vérifier dans [GitHub Actions](https://github.com/laurentkai/my-press-review/actions) le résultat associé au SHA source, puis le manifeste de `Production`.

## Publication de l’itération 3

La révision `c2fb5a875de1ede655a18b4da89a949594bafa83` a été intégrée à `Main` et poussée ; le push a déclenché le déploiement automatique [run 43942205690](https://github.com/laurentkai/my-press-review/actions/runs/43942205690). `verify` a réussi en 23 s (format, 57 tests, typecheck, build et migration locale), `deploy` en 43 s (migration distante `0002` et injection du secret `TEST_ACCESS_CODE`) et `promote` en 8 s.

La branche distante et la référence locale `Production` sont à `3c9a4b1`. Son manifeste `release.json` identifie `c2fb5a875de1ede655a18b4da89a949594bafa83` comme `sourceSha`. Le Worker de production est accessible sur [my-press-review.laurent-kaiser.workers.dev](https://my-press-review.laurent-kaiser.workers.dev) ; la migration `0002` et l’espace d’essai sont maintenant en ligne.

La vérification navigateur de production a confirmé le contrôle d’accès : `GET /api/trial/session` sans cookie renvoie `authenticated: false` et `available: true`, `GET /api/trial/workspace` renvoie `401` sans session, puis un login avec le code valide renvoie `200` et ouvre une session. Même authentifié, `GET /api/admin/users` répond `401`; un nouvel appel anonyme au workspace avec `credentials: omit` est également refusé.

Le Worker a collecté les sept flux actifs : 169 articles enregistrés, dont 30 déjà collectés par le Cron pour 7sur7 (`refresh` a répondu `not_due`), puis 30 DH, 30 La Libre, 19 Le Figaro, 20 Le JSL, 10 Investing.com et 30 Gouvernement.lu. L’API en affichait 129, avec une limite de 20 par source. Le Soir et Zonebourse sont restés bloqués sans flux, avec zéro article et `last_success_at` nul. Le relevé local antérieur de 166 articles/126 affichés reste distinct.

## Publication de l’itération 4

La révision corrigée `3973252152195ae6c3105b4663a84db37dfc7b00` après `54e8465` ajoute le classement des articles, les images des flux et la lecture interne. Le workflow [43951478895](https://github.com/laurentkai/my-press-review/actions/runs/43951478895) a réussi : `verify` a validé 165 tests, le build, le format et la migration locale ; `deploy` a appliqué la migration distante `0003` et publié le Worker ; `promote` a promu la release vers `Production`. La promotion initiale de cette révision a produit le commit `c9c94ef` sur `Production`.

La seconde revue Claude de `54e8465..3973252` ne relève aucun blocage ni problème majeur et confirme que les quatre remarques mineures ont été corrigées. Les contrôles rapportés comprennent 68 tests de classement et trois tests de régression sur les crédits et ETag.

La vérification navigateur de production a observé un workspace `200` avec 140 articles au moment de la capture ; dix thèmes étaient présents et 119 articles classés au premier chargement. Un rafraîchissement La Libre a traité 30 éléments avec statut `ok` ; la liste contenait 140 articles au total, dont 20 avec image après cette collecte. Un article d’accès `FREE` a renvoyé 275 caractères par l’API privée (`200`, `no-store`), tandis que le même détail sans identifiants a répondu `401`. Le contrôle visuel a confirmé le lecteur, une image chargée, son crédit, le lien original, le focus sur `H1` et l’absence de débordement à 390 px.

Ces observations sont des instantanés, pas une garantie que toutes les sources sont déjà enrichies en images : les collectes suivantes respectent le prochain horaire dû et l’intervalle minimal de 15 minutes. Les nombres de l’itération 3 (169 articles stockés, 129 affichés) restent historiques et distincts des 140 articles vus après le déploiement de l’itération 4. Voir le [compte rendu de l’itération 4](iterations/0004.md).

## Itération 5 — publiée en production

La première version `f9cf7fd` a reçu une remarque majeure (M1) et cinq remarques mineures de Claude ; le code corrigé est figé à `4c0d9a0a0af992c8ab4a353990e8779062862300`. Codex rapporte 270 tests, typecheck, build, format et `git diff --check` réussis. La seconde revue de Claude ne relève aucun blocage ni remarque majeure et confirme la résolution de M1 et des cinq remarques mineures de la passe précédente ; quatre points mineurs non bloquants restent à suivre. Le workflow [43960317682](https://github.com/laurentkai/my-press-review/actions/runs/43960317682) a réussi la migration distante `0004`, le déploiement et la promotion de la release vers `Production` (`8a831a8`).

Les observations locales de la première version (`f9cf7fd`) restent historiques et ne valident pas `4c0d9a0`. L’analyse Claude hors ligne de quatre exemples HTML reste une comparaison exploratoire, et les benchmarks Node ne garantissent pas la consommation CPU sur Workers/plan Free. Les vérifications navigateur de production sont détaillées dans le [compte rendu 0005](iterations/0005.md) ; elles ne démontrent ni la disponibilité permanente ni une complétude garantie par média.

La vérification post-déploiement a observé 30 articles disponibles et zéro `restricted` dans la liste ; les réponses privées et les lectures DH/Gouvernement/La Libre, dont les cas `live`, réservé et corps introuvable, ainsi que l’interface desktop/mobile, sont détaillés dans [0005](iterations/0005.md). Ce sont des contrôles ponctuels et non une garantie de contenu complet ou de disponibilité permanente.

## Vérification continue

`.github/workflows/deploy.yml` vérifie les pull requests ciblant `Main` et les pushes sur `Main` (ainsi qu’un déclenchement manuel sur `Main`). Le job de vérification exécute, dans l’ordre :

```sh
npm ci
npm run format:check
npm run check
npm run db:migrate:local
```

`npm run check` effectue le typecheck, les tests Vitest et le build Vite/Cloudflare. Le contrôle rapporté pour l’itération 3 compte 57 tests (29 dans le contrôle de l’itération 2). La migration de ce job ne cible que la base D1 locale.

Sur `Main`, le build vérifié est transféré comme artefact `verified-build-<run_id>` ; le job de déploiement télécharge cet artefact au lieu de reconstruire les bundles. Il lance `npm ci --ignore-scripts` pour disposer de Wrangler et des scripts de préparation, sans relancer le build/tests. Les artefacts de build et de release expirent après un jour, avec remplacement en cas de rerun du même workflow.

La préparation de release en CI exécute :

```sh
npm ci --ignore-scripts
node scripts/assert-current-main.mjs
npm run release:export
npm run release:configure
npx --no-install wrangler deploy --config .deployment/wrangler.json --dry-run
```

Le job vérifie ensuite à nouveau le `Main` distant avant d’enregistrer le point de récupération, d’appliquer les migrations distantes et de publier le Worker.

## Configuration et garde-fous du déploiement

Le job de déploiement a la permission GitHub `contents: read`. Il ne poursuit que si les trois paramètres Cloudflare et le secret d’accès d’essai sont configurés :

| Paramètre GitHub | Type | Rôle |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Authentification Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Identifiant du compte Cloudflare ciblé |
| `CLOUDFLARE_D1_DATABASE_ID` | Variable | Identifiant de la base D1 de production ciblée |
| `TEST_ACCESS_CODE` | Secret | Code d’accès temporaire à l’espace d’essai |

Si un paramètre Cloudflare manque ou si le secret `TEST_ACCESS_CODE` est absent/vide, le workflow publie une notice et un résumé « Deployment not configured » ; aucun déploiement Cloudflare ni promotion vers `Production` n’est effectué. Les identifiants de compte et de base sont des identifiants, pas des secrets, et leurs variables peuvent apparaître dans les journaux publics ; ne jamais y placer un secret.

Le workflow transmet `TEST_ACCESS_CODE` au Worker via un fichier JSON temporaire protégé (`umask 077`, suppression par `trap`) et Wrangler `--secrets-file`. Le code n’est pas placé dans le bundle de release. L’export exclut explicitement `.dev.vars`, fichier local ignoré par Git.

Les scripts valident le format des deux identifiants et refusent le placeholder D1 tout-zéro. Ils les injectent seulement dans `.deployment/wrangler.json`, répertoire ignoré par Git. L’export `.release/wrangler.json` conserve un `database_id` placeholder et n’a pas d’`account_id` réel.

Avant le déploiement, le workflow vérifie que le SHA complet du checkout correspond encore au `Main` distant, prépare l’export puis lance un dry-run Wrangler. Il revérifie le `Main` distant juste avant la migration distante. Une seconde vérification avant la promotion empêche aussi un ancien rerun de modifier `Production`. Les exécutions liées à `Main` partagent un groupe de concurrence unique avec `cancel-in-progress: false` : une migration/déploiement en cours n’est pas interrompu par un autre run.

## Export, migration et promotion

`npm run release:export` fabrique `.release/` à partir du build déjà présent dans `dist/` et des migrations. Il exige un SHA source complet (`SOURCE_SHA`, ou `GITHUB_SHA` en CI). L’export autorisé contient les assets compilés, le bundle Worker, les migrations, une configuration Wrangler avec placeholder et `release.json` (SHA source, version Wrangler, empreintes SHA-256). Il exclut code source, documentation, tests, identifiants réels et secrets. Une liste d’autorisation stricte refuse les nouveaux types de fichiers, chunks Worker ou champs de configuration tant qu’ils n’ont pas été explicitement validés.

Avant les migrations distantes, le workflow enregistre le résultat de `wrangler d1 time-travel info` comme artefact `d1-recovery-<run_id>` conservé sept jours. Cette information n’est pas une restauration automatique. Les migrations doivent rester compatibles avec le Worker N-1 ; revenir à un bundle antérieur ne restaure pas la base. Toute restauration de D1 doit être décidée et effectuée explicitement.

Le workflow enregistre d’abord le point de récupération puis exécute les commandes distantes suivantes :

```sh
npx --no-install wrangler d1 time-travel info press-review --config .deployment/wrangler.json --json > "$RUNNER_TEMP/d1-before.json"
npx --no-install wrangler d1 migrations apply press-review --remote --config .deployment/wrangler.json
umask 077
export DEPLOY_SECRETS_PATH="$RUNNER_TEMP/worker-secrets.json"
trap 'rm -f "$DEPLOY_SECRETS_PATH"' EXIT
node -e 'require("fs").writeFileSync(process.env.DEPLOY_SECRETS_PATH, JSON.stringify({TEST_ACCESS_CODE:process.env.TEST_ACCESS_CODE}))'
npx --no-install wrangler deploy --config .deployment/wrangler.json --secrets-file "$DEPLOY_SECRETS_PATH"
```

`.deployment/wrangler.json` contient les identifiants réels injectés localement dans le runner. Après migration et déploiement réussis, `.release/` est transféré comme artefact `deployed-release-<run_id>`. Un job séparé, accordé `contents: write`, promeut exactement cet instantané vers la branche `Production`, en préservant son historique. Il n’exécute pas npm et le token GitHub n’est utilisé qu’à cette étape. Le push de `GITHUB_TOKEN` vers `Production` ne déclenche pas un autre workflow ; la promotion est terminée par ce workflow lui-même.

En cas d’échec avant le déploiement, la branche `Production` n’est pas modifiée ; toutefois, une migration distante peut déjà avoir réussi avant un échec ultérieur de publication du Worker. Si `Main` avance après le déploiement ou si la promotion échoue, l’exécution peut être rouge alors que le service Cloudflare est déjà publié et `Production` encore inchangée. Diagnostiquer cet état puis relancer le workflow sur le `Main` courant ; ne pas relancer l’ancien commit. Après expiration des artefacts, relancer le workflow complet sur `Main` courant.

## Accès et rotation du jeton

L’accès Cloudflare et les paramètres GitHub requis sont maintenant configurés. Le premier déploiement a confirmé le fonctionnement des permissions de publication Worker et migration D1. Le jeton est limité au compte Cloudflare ciblé et porte les permissions configurées `Workers Scripts Edit`, `D1 Edit` et `Account Settings Read`. Une zone ou un domaine n’est pas requis pour le site initial `workers.dev`.

Le jeton expire le 16 novembre 2027 : le remplacer avant cette date. Créer un nouveau jeton limité au même compte et aux permissions requises, remplacer directement le secret GitHub `CLOUDFLARE_API_TOKEN` sans afficher ni enregistrer le secret sur disque, puis vérifier un déploiement réussi avant de révoquer l’ancien jeton. Ne jamais copier le secret ou les valeurs des variables d’identifiants dans les documents ou journaux.

## Désactivation de l’espace d’essai

Pour fermer l’accès temporaire et désactiver le traitement planifié, remplacer le secret GitHub `TEST_ACCESS_CODE` par la valeur courte non secrète `disabled` (moins de 24 caractères), puis déployer le `Main` courant. Le Worker rejette cette valeur pour l’authentification et n’exécute pas la collecte planifiée. Ne pas supprimer uniquement le secret GitHub : le Worker déjà publié conserverait son secret et le workflow ne pourrait pas déployer sans une valeur non vide. En cas de fermeture urgente, retirer le secret du Worker Cloudflare et définir également `TEST_ACCESS_CODE=disabled` dans GitHub, afin qu’un futur déploiement n’y réintroduise pas l’ancien code.

La désactivation arrête l’authentification et le traitement planifié, sans supprimer les articles, sessions ou compteurs en D1. Le déclencheur Cron reste configuré ; son gestionnaire retourne immédiatement, sans collecte ni purge des sessions ou compteurs expirés. Pour rouvrir l’espace, utiliser un nouveau code fort d’au moins 24 caractères et mettre à jour GitHub, le fichier local `~/.local/share/my-press-review/trial-access-code.txt` et `.dev.vars` sans Git ; ne jamais réutiliser l’ancien code, car les sessions non expirées (huit heures au maximum) y sont liées.
