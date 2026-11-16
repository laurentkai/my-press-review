# Branches, CI/CD et livraison

## Branches et autorisation

- `Main` est la branche de développement de référence.
- `Production` reçoit uniquement l’instantané de livraison construit depuis le code déployé ; ne pas y fusionner l’ensemble de `Main`.
- Le déploiement automatique après push à `Main`, puis la promotion de l’instantané vers `Production`, sont autorisés.

Le workflow et les scripts sont présents dans le dépôt, mais l’accès Cloudflare et les paramètres GitHub requis ne sont pas encore configurés. Les validations décrites ici ont été réalisées localement avant le premier push ; aucun déploiement Cloudflare n’a eu lieu. La révision documentée est `125d81a` sur la branche locale `init-all-agents`; elle n’est pas à elle seule une preuve d’intégration distante ou de publication.

## Vérification continue

`.github/workflows/deploy.yml` vérifie les pull requests ciblant `Main` et les pushes sur `Main` (ainsi qu’un déclenchement manuel sur `Main`). Le job de vérification exécute, dans l’ordre :

```sh
npm ci
npm run format:check
npm run check
npm run db:migrate:local
```

`npm run check` effectue le typecheck, les tests Vitest (29 au total dans cette révision) et le build Vite/Cloudflare. La migration de ce job ne cible que la base D1 locale.

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

Le job de déploiement a la permission GitHub `contents: read`. Il ne poursuit que si les trois paramètres suivants sont définis :

| Paramètre GitHub | Type | Rôle |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Authentification Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Identifiant du compte Cloudflare ciblé |
| `CLOUDFLARE_D1_DATABASE_ID` | Variable | Identifiant de la base D1 de production ciblée |

Si l’un manque, le workflow publie une notice et un résumé « Deployment not configured » ; aucun déploiement Cloudflare ni promotion vers `Production` n’est effectué. Les identifiants de compte et de base sont des identifiants, pas des secrets, et leurs variables peuvent apparaître dans les journaux publics ; ne jamais y placer le token.

Les scripts valident le format des deux identifiants et refusent le placeholder D1 tout-zéro. Ils les injectent seulement dans `.deployment/wrangler.json`, répertoire ignoré par Git. L’export `.release/wrangler.json` conserve un `database_id` placeholder et n’a pas d’`account_id` réel.

Avant le déploiement, le workflow vérifie que le SHA complet du checkout correspond encore au `Main` distant, prépare l’export puis lance un dry-run Wrangler. Il revérifie le `Main` distant juste avant la migration distante. Une seconde vérification avant la promotion empêche aussi un ancien rerun de modifier `Production`. Les exécutions liées à `Main` partagent un groupe de concurrence unique avec `cancel-in-progress: false` : une migration/déploiement en cours n’est pas interrompu par un autre run.

## Export, migration et promotion

`npm run release:export` fabrique `.release/` à partir du build déjà présent dans `dist/` et des migrations. Il exige un SHA source complet (`SOURCE_SHA`, ou `GITHUB_SHA` en CI). L’export autorisé contient les assets compilés, le bundle Worker, les migrations, une configuration Wrangler avec placeholder et `release.json` (SHA source, version Wrangler, empreintes SHA-256). Il exclut code source, documentation, tests, identifiants réels et secrets. Une liste d’autorisation stricte refuse les nouveaux types de fichiers, chunks Worker ou champs de configuration tant qu’ils n’ont pas été explicitement validés.

Avant les migrations distantes, le workflow enregistre le résultat de `wrangler d1 time-travel info` comme artefact `d1-recovery-<run_id>` conservé sept jours. Cette information n’est pas une restauration automatique. Les migrations doivent rester compatibles avec le Worker N-1 ; revenir à un bundle antérieur ne restaure pas la base. Toute restauration de D1 doit être décidée et effectuée explicitement.

Le workflow enregistre d’abord le point de récupération puis exécute les commandes distantes suivantes :

```sh
npx --no-install wrangler d1 time-travel info press-review --config .deployment/wrangler.json --json > "$RUNNER_TEMP/d1-before.json"
npx --no-install wrangler d1 migrations apply press-review --remote --config .deployment/wrangler.json
npx --no-install wrangler deploy --config .deployment/wrangler.json
```

`.deployment/wrangler.json` contient les identifiants réels injectés localement dans le runner. Après migration et déploiement réussis, `.release/` est transféré comme artefact `deployed-release-<run_id>`. Un job séparé, accordé `contents: write`, promeut exactement cet instantané vers la branche `Production`, en préservant son historique. Il n’exécute pas npm et le token GitHub n’est utilisé qu’à cette étape. Le push de `GITHUB_TOKEN` vers `Production` ne déclenche pas un autre workflow ; la promotion est terminée par ce workflow lui-même.

En cas d’échec avant le déploiement, la branche `Production` n’est pas modifiée ; toutefois, une migration distante peut déjà avoir réussi avant un échec ultérieur de publication du Worker. Si `Main` avance après le déploiement ou si la promotion échoue, l’exécution peut être rouge alors que le service Cloudflare est déjà publié et `Production` encore inchangée. Diagnostiquer cet état puis relancer le workflow sur le `Main` courant ; ne pas relancer l’ancien commit. Après expiration des artefacts, relancer le workflow complet sur `Main` courant.

## Accès à configurer

La connexion Cloudflare de l’utilisateur est encore attendue ; aucune permission réelle n’a été vérifiée. Le token Cloudflare ciblé devra disposer de `Workers Scripts Edit`, `D1 Edit` et `Account Read`. Une zone ou un domaine n’est pas requis pour la première cible `workers.dev`. Les permissions effectives seront vérifiées à la première connexion et au premier déploiement autorisé.
