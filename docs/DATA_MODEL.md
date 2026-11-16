# Modèle de données proposé

Schéma conceptuel, à préciser avant les migrations.

| Entité | Données principales |
| --- | --- |
| User | identifiant interne, statut, rôle utilisateur ou Super Admin |
| OAuthIdentity | utilisateur, fournisseur, identifiant stable du fournisseur ; unicité fournisseur + identifiant |
| Session | utilisateur, expiration, révocation, empreinte du jeton |
| GlobalSettings | paramètres globaux non secrets, version, auteur |
| Source | propriétaire utilisateur, nom, site, actif, méthode autorisée, notes de conditions d’usage |
| Feed | source, URL, format, langue, cadence, ETag, Last-Modified, prochaine collecte, dernier succès, erreurs |
| Theme | propriétaire utilisateur, nom, slug, description, ordre, actif |
| Subject | propriétaire utilisateur, thème, nom, slug, description, actif |
| FilterRule | sujet, critères, exclusions, version, actif |
| Article | source, URL canonique, titre, auteur disponible, langue, date de publication, date de collecte, extrait autorisé |
| FeedArticle | flux, article, identifiant externe du flux |
| ArticleSubject | article, sujet, règle/version, motif, origine manuelle ou automatique |
| ArticleContent | article, contenu nettoyé autorisé, provenance, statut de disponibilité, date de récupération |
| AIProcessingRun | utilisateur, article, modèle, version de prompt, état, consommation, résultat validé |
| AuditEvent | acteur, action administrative, cible, date, métadonnées sans secrets |
| CollectionRun | flux, début, fin, résultat, compteurs, erreur nettoyée |

## Isolation

Toutes les données personnelles, sources, flux, articles, règles et résultats IA sont rattachés à leur propriétaire, directement ou par relation vérifiée. Chaque requête et tâche planifiée applique ce périmètre. Les identifiants fournis par le client ne suffisent jamais à autoriser un accès. Aucun partage interutilisateur implicite ; une éventuelle mutualisation technique des collectes exigera une conception séparée. La configuration globale ne donne pas automatiquement accès aux revues personnelles au Super Admin.

## Invariants

Un média possède plusieurs flux. Un article peut provenir de plusieurs flux du même média et rejoindre plusieurs sujets. Dédupliquer les identifiants dans leur flux et les URL normalisées dans leur source ; ne pas fusionner automatiquement deux articles de médias différents. Conserver les dates de publication et de collecte séparément. Désactiver une source ne doit pas supprimer implicitement son historique.

## Points ouverts

Sujets appartenant à plusieurs thèmes, syntaxe et priorité des règles, traitement des articles sans date, politique de suppression et reclassement rétroactif. Favoris et états de lecture restent à confirmer.
