# Modèle de données

## Schéma défini dans le code

La migration `migrations/0001_identity_and_sources.sql` contient le schéma de base pour le futur modèle d’identité :

| Table | Colonnes et contraintes |
| --- | --- |
| `users` | `id` (clé primaire), `status` (`pending`, `active`, `disabled`, par défaut `pending`), `role` (`user`, `super_admin`, par défaut `user`), `created_at` |
| `oauth_identities` | `provider` (`microsoft` ou `apple`), `provider_subject`, `user_id` référant `users`; clé primaire `(provider, provider_subject)` |
| `sessions` | `token_hash` (clé primaire), `user_id` référant `users`, `expires_at` |
| `sources` | `id`, `owner_id` référant `users`, `name` (1–120 caractères non blancs), `url`, `enabled` (booléen entier, par défaut actif), `created_at`; unicité `(owner_id, url)` |

Cette migration ne crée pas de compte ni d’utilisateur Super Admin. Ces tables ne portent pas encore l’authentification OAuth ni les autorisations applicatives.

La migration `migrations/0002_private_feed_trial.sql` ajoute le stockage de l’espace d’essai temporaire :

| Table | Colonnes et contraintes |
| --- | --- |
| `trial_sources` | `id`, `enabled`, `status`, `last_attempt_at`, `last_success_at`, `next_fetch_at`, `lease_until`, `lease_owner`, `etag`, `last_modified`, `last_item_count` |
| `trial_articles` | `id`, `source_id` référant `trial_sources` avec suppression en cascade, `url`, `title`, `excerpt`, `published_at` nullable, `collected_at`; unicité `(source_id, url)` |
| `trial_sessions` | `token_hash` (clé primaire), `access_key_hash`, `expires_at` |
| `trial_login_limits` | `bucket` (clé primaire), `attempts`, `expires_at` |

La migration initialise neuf lignes dans `trial_sources` : sept activées avec l’état `pending` et Le Soir/Zonebourse désactivées avec `blocked_403`. Les URL de flux et les catégories sont définies dans le catalogue serveur, pas dans `trial_sources`. Les deux lignes bloquées n’ont pas d’URL de flux configurée et leur `last_attempt_at` est `NULL` dans l’état initial.

Les tables `trial_*` ne référencent aucun utilisateur et ne fournissent aucune isolation individuelle : tous les détenteurs du code temporaire utilisent les mêmes sources et articles. Elles sont distinctes du futur schéma `users`/OAuth/`sessions`. La migration 0002 et le runtime de l’itération 3 ont introduit cette base partagée, désormais étendue par la migration 0003 de l’itération 4 ; elle ne constitue pas le futur modèle personnel. Voir [AUTH.md](AUTH.md) et [INGESTION.md](INGESTION.md).

### Migration 0003 — lecture et classement déployés

`migrations/0003_article_reading.sql` est additive : elle conserve les lignes `trial_articles` et ajoute `body_text`, `image_url`, `image_credit`, `access_level` (`free`, `restricted`, `unknown`), `publisher_categories`, `theme` et `subtheme`, ainsi que `reading_metadata_version` à `trial_sources`. Ce marqueur protège l’enrichissement des métadonnées lors du passage de l’ancien Worker au nouveau : à la version `0`, le Worker ignore `ETag` et `Last-Modified`, qui ont pu être réécrits par l’ancien runtime entre la migration et sa publication ; il passe à la version `1` uniquement après une collecte réussie par le nouveau Worker. Cela ne contourne ni `next_fetch_at` ni un bail actif. La migration distante a réussi lors du workflow 43951478895. La migration initiale a été appliquée sur D1 local ; la base locale actuelle a ensuite été complétée par Codex pour inclure `reading_metadata_version`.

Pour les recollectes de l’itération 5, le code `4c0d9a0` exige `reading_metadata_version=2` avant d’accepter les nouveaux marqueurs de gratuité : tant que la valeur est inférieure à `2`, il ignore les validateurs `ETag`/`Last-Modified`, puis ne passe à `2` qu’après une collecte réussie. Cela force la relecture des métadonnées RSS afin qu’un ancien marqueur `free` ne fasse pas conserver un accès qui est devenu réservé.

Si une autre base D1 locale a déjà appliqué une ancienne version de `0003` sans cette colonne, ne pas réinitialiser ni effacer la base. Vérifier d’abord `PRAGMA table_info(trial_sources);` et exécuter l’`ALTER TABLE` indiqué dans [DEVELOPMENT.md](DEVELOPMENT.md) uniquement si `reading_metadata_version` est absente.

### Migration 0004 — lecture de pages publiques (déployée)

`migrations/0004_full_article_reading.sql` est additive. Elle ajoute à `trial_articles` `full_text`, `full_status` (`pending`, `available`, `live`, `restricted`, `unavailable`), `full_reason`, `full_fetched_at` et `full_next_fetch_at`. Elle ajoute à `trial_sources` un bail de lecture de page (`article_lease_until`, `article_lease_owner`) et une prochaine collecte (`article_next_fetch_at`), ainsi que `trial_article_robots` pour les règles mises en cache par origine. Les articles et le texte de flux déjà stockés sont conservés.

Seul un corps accepté comme `available` est enregistré dans `full_text`. Le statut `live` indique un corps non écrit dans cette colonne ; s’il résulte d’une lecture à la demande, le texte est livré dans cette réponse seulement. D1 ne conserve que l’état, le motif et les dates nécessaires à la régulation. Les articles réservés ont un corps intégral vide ; les nouveaux `PAYING`/`MEMBER` ne sont pas insérés et les anciens éléments révoqués restent masqués. Le code `4c0d9a0` impose une visibilité API uniquement pour `access_level=free` ou un corps `available`/`live`, en laissant tout `restricted` masqué ; un `unknown` sans texte accepté reste exclu. La migration distante `0004` a été appliquée par le workflow 43960317682, qui a déployé puis promu la release vers `Production` (`8a831a8`).

## Modèle conceptuel futur — non migré

Ces entités décrivent une piste de conception ; elles ne sont pas des tables actuelles :

| Entité envisagée | Données principales |
| --- | --- |
| `GlobalSettings` | paramètres globaux non secrets, version, auteur |
| `Source` | propriétaire utilisateur, nom, site, état actif, méthode autorisée, notes de conditions d’usage |
| `Feed` | source, URL, format, langue, cadence, ETag, Last-Modified, prochaine collecte, dernier succès, erreurs |
| `Theme` | propriétaire, nom, slug, description, ordre, état actif |
| `Subject` | propriétaire, thème, nom, slug, description, état actif |
| `FilterRule` | sujet, critères, exclusions, version, état actif |
| `Article` | source, URL canonique, titre, auteur disponible, langue, dates de publication et de collecte, extrait autorisé |
| `FeedArticle` | flux, article, identifiant externe du flux |
| `ArticleSubject` | article, sujet, règle/version, motif, origine manuelle ou automatique |
| `ArticleContent` | article, contenu nettoyé autorisé, provenance, disponibilité, date de récupération |
| `AIProcessingRun` | utilisateur, article, modèle, version de prompt, état, consommation, résultat validé |
| `AuditEvent` | acteur, action administrative, cible, date, métadonnées sans secrets |
| `CollectionRun` | flux, début, fin, résultat, compteurs, erreur nettoyée |

Les clés, colonnes et contraintes de ce modèle restent à concevoir avant toute migration.

## Principes de conception à conserver

Toutes les données personnelles, sources, flux, articles, règles et résultats IA devront être rattachés à leur propriétaire directement ou par relation vérifiée. Chaque requête et tâche planifiée appliquera ce périmètre ; les identifiants fournis par le client ne suffisent jamais à autoriser un accès. Aucun partage interutilisateur implicite : l’espace d’essai actuel est un partage explicite et temporaire, mais ne doit pas servir de modèle d’isolation pour les comptes futurs. La configuration globale ne donne pas automatiquement au Super Admin accès aux revues personnelles.

Un média peut posséder plusieurs flux et un article peut provenir de plusieurs flux du même média et rejoindre plusieurs sujets. Dédupliquer les identifiants dans leur flux, puis les URL normalisées dans leur source ; ne pas fusionner automatiquement des articles de médias différents. Conserver séparément date de publication et date de collecte. Désactiver une source ne supprime pas implicitement son historique.

Restent à préciser : sujets appartenant à plusieurs thèmes, syntaxe et priorité des règles, articles sans date, suppression, reclassement rétroactif, favoris et états de lecture.
