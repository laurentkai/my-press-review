# Modèle de données

## Schéma implémenté

La migration `migrations/0001_identity_and_sources.sql` crée ces quatre tables dans D1 :

| Table | Colonnes et contraintes actuelles |
| --- | --- |
| `users` | `id` (clé primaire), `status` (`pending`, `active`, `disabled`, par défaut `pending`), `role` (`user`, `super_admin`, par défaut `user`), `created_at` |
| `oauth_identities` | `provider` (`microsoft` ou `apple`), `provider_subject`, `user_id` référant `users`; clé primaire `(provider, provider_subject)` |
| `sessions` | `token_hash` (clé primaire), `user_id` référant `users`, `expires_at` |
| `sources` | `id`, `owner_id` référant `users`, `name` (1–120 caractères non blancs), `url`, `enabled` (booléen entier, par défaut actif), `created_at`; unicité `(owner_id, url)` |

Des index existent sur les identités, sessions et sources par utilisateur. La migration n’insère aucune donnée. La présence des tables d’identité et de session ne signifie pas que l’authentification, les sessions ou les permissions fonctionnent : voir [AUTH.md](AUTH.md).

L’interface de démonstration utilise des objets en mémoire typés dans `packages/shared/types.ts`. Ses sources et articles fictifs, ainsi que l’ajout et l’activation/désactivation des sources, ne sont pas stockés en D1.

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

Toutes les données personnelles, sources, flux, articles, règles et résultats IA devront être rattachés à leur propriétaire directement ou par relation vérifiée. Chaque requête et tâche planifiée appliquera ce périmètre ; les identifiants fournis par le client ne suffisent jamais à autoriser un accès. Aucun partage interutilisateur implicite : une mutualisation technique des collectes exige une conception distincte. La configuration globale ne donne pas automatiquement au Super Admin accès aux revues personnelles.

Un média peut posséder plusieurs flux et un article peut provenir de plusieurs flux du même média et rejoindre plusieurs sujets. Dédupliquer les identifiants dans leur flux, puis les URL normalisées dans leur source ; ne pas fusionner automatiquement des articles de médias différents. Conserver séparément date de publication et date de collecte. Désactiver une source ne supprime pas implicitement son historique.

Restent à préciser : sujets appartenant à plusieurs thèmes, syntaxe et priorité des règles, articles sans date, suppression, reclassement rétroactif, favoris et états de lecture.
