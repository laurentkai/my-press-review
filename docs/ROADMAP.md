# Étapes de réalisation

## Itération 1 — socle de démonstration (révision `6887f3f`)

Réalisés : application React/Vite, Worker Hono avec ressources statiques, premier schéma D1 et migration locale, filtres et vue de lecture sur contenu fictif, gestion de sources en mémoire, Cron configuré mais sans effet. Voir le [compte rendu](iterations/0001.md).

## Itération 2 — pipeline CI/CD (révision `125d81a`)

Réalisés : workflow de vérification PR/Main, artefacts build vérifiés, export allowlisté, configuration éphémère, vérifications contre un Main obsolète, bookmark de récupération D1, déploiement Cloudflare et promotion séparée vers `Production`. Sept remarques de la première revue Claude ont été corrigées et aucune n’est bloquante selon la seconde revue. Voir le [compte rendu](iterations/0002.md).

L’accès Cloudflare et les paramètres GitHub sont configurés ; un premier workflow lancé manuellement sur `Main` a déployé le Worker et promu l’instantané vers `Production`. Les pushes suivants sur `Main` déclenchent le même pipeline ; les exécutions et leur résultat restent traçables dans GitHub Actions.

## Itération 3 — sources et accès d’essai (`c2fb5a8`)

Implémentés et déployés : neuf sources au catalogue, sept flux RSS actifs et deux sources bloquées/désactivées sans flux vérifié ; accès partagé temporaire par code, sessions et API d’essai ; collecte RSS, statuts par source, articles persistés dans les tables `trial_*` et interface de consultation. La production a enregistré 169 articles (129 visibles via l’API) ; les résultats locaux historiques étaient 166/126.

La revue Claude a conclu à l’absence de blocage ou de nouveau défaut démontré ; les remarques mineures ont été corrigées ou circonscrites/documentées. Les contrôles rapportés comprennent 57 tests, check/build/format, actionlint, dry-run avec IDs factices et vérification visuelle desktop/mobile. Le push vers `Main` a ensuite déclenché avec succès le workflow 43942205690, la migration distante 0002, le déploiement et la promotion. Voir le [compte rendu](iterations/0003.md).

## Itération 4 — classement, images et lecture (livrée)

La révision corrigée `3973252` après `54e8465` est déployée : taxonomie commune de thèmes/sous-thèmes avec alias, classement déterministe, images des flux et lecture interne avec lien original et avertissement d’abonnement possible quand l’accès est inconnu. Le workflow 43951478895 a réussi avec 165 tests, build, format et migration distante 0003, puis promu la release vers `Production` (`c9c94ef`). La seconde revue Claude ne relève aucun blocage ni problème majeur et confirme les quatre remarques mineures corrigées. Les vérifications navigateur et les limites sont détaillées dans le [compte rendu](iterations/0004.md).

## Itération 5 — articles disponibles (déployée)

Le code corrigé `4c0d9a0` expose uniquement les articles explicitement libres ou dont le texte est `available`/`live`, sauf marqueur `restricted`, avec filtre API avant limite/comptages et `404` au détail des items exclus. Les articles d’abonnés et `unknown` sans preuve positive restent masqués. Codex rapporte 270 tests ; Claude ne relève aucun blocage ni majeur, avec quatre points mineurs à suivre. Le workflow [43960317682](https://github.com/laurentkai/my-press-review/actions/runs/43960317682) a publié le code et promu `Production` (`8a831a8`). Les preuves et limites sont dans [0005](iterations/0005.md).

## Suites à planifier — non réalisées

1. Surveiller les états de collecte et la disponibilité des flux en production, sans interpréter une collecte ponctuelle comme une garantie de service.
2. Définir l’admission, le compte initial Super Admin, les catégories de source confirmées et les conditions d’usage des flux.
3. Implémenter et tester OAuth, comptes individuels, sessions et permissions ; provisionner explicitement les comptes autorisés et isoler leurs données.
4. Concevoir puis migrer le modèle personnel des flux, thèmes, sujets, articles et règles ; remplacer le partage d’essai temporaire.
5. Décider le fournisseur IA, ses tâches, limites, traçabilité et conservation, puis implémenter et tester le traitement.
6. Compléter favoris, lecture, recherche, notifications, accessibilité et parcours de gestion de données personnelles.

Les catégories géographiques statiques de l’itération 3 sont distinctes du classement déterministe de l’itération 4 ; aucun des deux n’utilise l’IA. Le token Cloudflare configuré doit être remplacé avant son expiration le 16 novembre 2027 ; voir [DELIVERY.md](DELIVERY.md).
