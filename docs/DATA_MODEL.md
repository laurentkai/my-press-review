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

Les tables `trial_*` ne référencent aucun utilisateur et ne fournissent aucune isolation individuelle : tous les détenteurs du code temporaire utilisent les mêmes sources et articles. Elles sont distinctes du futur schéma `users`/OAuth/`sessions`. La migration 0002 et le runtime de l’itération 3 sont déployés sur Cloudflare ; cette base d’essai reste partagée et ne constitue pas le futur modèle personnel. Voir [AUTH.md](AUTH.md) et [INGESTION.md](INGESTION.md).

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
