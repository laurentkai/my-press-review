# Branches et livraison

## Organisation demandée

- `Main` : branche de développement confirmée, avec sources, documents, tests, scripts et configuration.
- `Production` : uniquement les fichiers requis pour déployer, exportés depuis un commit validé de Main.
- Le nom confirmé est `Main`. La branche locale `main` a été renommée en `Main` via un nom temporaire, pour gérer le disque macOS insensible à la casse. Son worktree principal reste associé à la branche renommée et ses commits sont inchangés. Le changement éventuel de branche distante par défaut sera traité séparément.

Production existe au commit initial vide ; aucun déploiement n’est possible à ce stade. Les documents de cadrage sont versionnés depuis `init-all-agents` et intégrés à `Main` par avance rapide. Aucun push ni déploiement n’est effectué pendant ce cadrage.

## Promotion proposée

1. Valider un commit de développement avec typage, contrôles et tests disponibles.
2. Construire le site et le Worker dans un environnement reproductible.
3. Générer un répertoire de livraison depuis une liste explicite de fichiers autorisés.
4. Vérifier que le résultat contient les fichiers de déploiement, aucun secret, document de cadrage, test ou cache.
5. Enregistrer l’export dans Production avec référence au commit source et empreintes des bundles.
6. Déployer Production vers les ressources Cloudflare prévues, puis vérifier consultation, API et accès administrateur.

Ne pas fusionner intégralement la branche de développement dans Production. La CI et le script d’export restent à implémenter ; aucune automatisation n’est active.

## Contenu envisagé de Production

Fichiers statiques construits, bundle Worker, configuration Wrangler sans secrets, migrations D1 nécessaires et, uniquement si la méthode de déploiement l’exige, manifeste minimal et verrou de dépendances de déploiement. Les chemins exacts seront fixés lors du premier build et pour le Worker unique avec Static Assets.

## Exploitation

Production contient le nécessaire pour déployer, pas les secrets ni les données D1. Les migrations et données sont gérées séparément des bundles. Un retour à un bundle précédent ne restaure pas une base : prévoir compatibilité des migrations et sauvegarde. Confirmer déploiement automatique ou manuel avant connexion GitHub/Cloudflare. Aucun changement de branche distante par défaut à ce stade.
