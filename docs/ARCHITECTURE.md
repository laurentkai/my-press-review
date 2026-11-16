# Architecture

## État implémenté dans le code

- **Interface** : React 19 et Vite 8, en TypeScript ; les fixtures de démonstration sont dans `apps/web/src/demo.ts`.
- **API/runtime** : Hono sur Cloudflare Workers dans `apps/worker/index.ts`, relié aux ressources statiques et à D1.
- **Modèle initial** : migration `migrations/0001_identity_and_sources.sql` pour le futur modèle d’identité et de sources.
- **Espace d’essai privé** : `migrations/0002_private_feed_trial.sql`, des tables `trial_*`, des routes privées et un accès temporaire partagé par code. Ce modèle est séparé du futur modèle OAuth.
- **Collecte RSS** : catalogue de neuf sources, dont sept flux actifs et deux sources bloquées/désactivées ; Cron Wrangler chaque minute, une seule source échue traitée par invocation et un intervalle minimum de 15 minutes par source. Voir [INGESTION.md](INGESTION.md) et [SOURCES.md](SOURCES.md).

Les routes OAuth Microsoft/Apple répondent toujours qu’elles ne sont pas configurées (`503`) : l’accès par code n’est pas OAuth. Les routes de l’essai protègent l’espace partagé, mais ne fournissent ni identité individuelle, ni cloisonnement des données, ni compte Super Admin. L’API d’administration existante reste protégée.

La révision `c2fb5a875de1ede655a18b4da89a949594bafa83` a introduit en production le runtime de l’espace d’essai et ses migrations ; les résultats correspondants sont consignés dans le compte rendu de l’itération 3.

La révision corrigée de l’itération 4 (`3973252152195ae6c3105b4663a84db37dfc7b00`) ajoute la migration `0003_article_reading.sql`, un classement déterministe, l’extraction d’images depuis certains flux et la route privée `GET /api/trial/articles/:id`. Elle est publiée en production par le workflow 43951478895 ; la migration distante `0003` et la promotion vers `Production` (`c9c94ef`) ont réussi. La seconde revue Claude de `54e8465..3973252` ne relève aucun blocage ni problème majeur et confirme la correction des quatre remarques mineures.

## Fonctionnement local et livraison

Les commandes npm sont documentées dans [DEVELOPMENT.md](DEVELOPMENT.md). L’interface fictive reste disponible pour la démonstration. La migration `0001` crée le futur schéma d’identité sans utilisateur ni rôle préinscrit ; la migration `0002` ajoute le catalogue de sources et le schéma de l’espace d’essai. Le code d’accès temporaire ne crée pas de compte personnel.

Dans `wrangler.jsonc`, `database_id` vaut `00000000-0000-0000-0000-000000000000` : c’est un placeholder du dépôt, pas un identifiant Cloudflare utilisable ni une configuration de production. La release déployée injecte les paramètres réels dans son fichier `.deployment` éphémère, sans les committer.

## Architecture cible, partiellement implémentée

Le Worker unique avec ressources statiques, API privée, D1 et collecte planifiée est partiellement réalisé dans l’espace d’essai. L’authentification OAuth, les comptes individuels, l’isolation des données par utilisateur et le traitement IA restent à faire. Le pipeline RSS de l’essai ne récupère que les flux configurés ; il ne visite pas les pages d’articles. Les schémas détaillés sont séparés entre [modèle actuel et modèle conceptuel](DATA_MODEL.md), [authentification](AUTH.md) et [collecte](INGESTION.md).

La cible devra aussi traiter les entrées de flux comme non fiables, limiter les requêtes sortantes et isoler les données par utilisateur. Ne pas interpréter ces exigences de conception comme une garantie contre toutes les attaques SSRF ou comme une isolation interutilisateur déjà implémentée dans l’espace d’essai partagé.
