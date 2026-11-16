# Collecte RSS et traitement IA

## Itération 3 : collecte RSS implémentée dans le code

Le code `c2fb5a8` inclut un collecteur RSS réel pour l’espace d’essai privé partagé et est déployé sur Cloudflare avec la migration D1 `0002`. Sept flux sont actifs ; Le Soir et Zonebourse restent désactivés après des prétests 403 sans flux vérifié. Les résultats locaux et ceux de la première collecte du Worker de production sont rapportés séparément ci-dessous ; aucun chiffre ponctuel ne garantit la disponibilité permanente d’un éditeur.

Lors d’un essai local ponctuel, les sept flux actifs ont fourni `30 + 30 + 30 + 16 + 20 + 10 + 30 = 166` articles enregistrés. L’API de l’espace d’essai a renvoyé 126 articles, avec un plafond de 20 par source. Ce résultat n’est ni une mesure de production ni une garantie de disponibilité continue. Voir le [catalogue](SOURCES.md) et le [compte rendu de l’itération 3](iterations/0003.md).

Lors de la vérification post-déploiement du Worker Cloudflare, les sept sources actives ont fourni `30 + 30 + 30 + 19 + 20 + 10 + 30 = 169` articles ; l’API en affichait 129, avec un plafond de 20 par source. Le Cron avait déjà collecté 30 articles de 7sur7, donc un rafraîchissement explicite a répondu `not_due`. Le Soir et Zonebourse sont restés bloqués sans flux, avec zéro article et `last_success_at` nul. Ces mesures en production sont un instantané de vérification, pas une garantie de collecte continue ni une validation des droits de republication.

## Planification et limites de collecte

Le Cron Trigger s’exécute chaque minute, mais ne traite qu’une seule source échue par invocation. Chaque source respecte un intervalle minimum de 15 minutes. Au démarrage, sept sources échues peuvent donc nécessiter plusieurs invocations, jusqu’à environ sept minutes si le Cron s’exécute normalement. Le bouton privé **Vérifier les nouveautés** demande un rafraîchissement pour chaque source active ; chaque requête ne collecte qu’une source et respecte son intervalle minimum. Une source bloquée sans flux vérifié ne peut pas être activée.

Le collecteur :

- ne demande que les URL HTTPS du catalogue, sur des origines autorisées pour chaque source ; il suit au plus trois redirections, avec une limite de 12 secondes et de 1 Mo par réponse ;
- parse le XML avec Saxes sans DTD, jusqu’à 32 niveaux et 200 articles ; il ne conserve au plus que les 30 premiers articles d’une collecte ;
- ne visite pas les pages d’articles et n’extrait pas le champ `content:encoded` ni le texte intégral ; l’extrait provient uniquement du flux et est limité à 300 caractères ;
- ignore les éléments identifiés `dpp:paid=true` ; une date sans fuseau reconnu est enregistrée comme absente (`NULL`), plutôt que devinée ;
- utilise `ETag` et `Last-Modified` quand le flux les fournit ; une réponse `304` signifie qu’il n’y a pas de nouveauté ;
- conserve au plus 200 articles par source et supprime ceux qui n’ont pas été observés depuis 14 jours. Un article retrouvé est réactualisé avec son nouveau `collected_at` ;
- renvoie au plus 20 articles par source à l’espace d’essai.

Dans l’itération 3, les catégories de source étaient des étiquettes statiques proposées. La révision corrigée `3973252` de l’itération 4, maintenant déployée, ajoute un classement d’articles par règles déterministes (catégories du flux : 100 points, rubriques du chemin URL : 60, titre : 4, extrait : 1), avec une taxonomie commune de dix thèmes. Les alias incluent notamment monde, sports, faits divers, people, conjoncture, finance, mobilité, technologie et immobilier. Le classement ne fait aucun appel IA, n’est pas personnalisé par utilisateur et ne dépend pas de la géographie de la source. La seconde revue Claude de `54e8465..3973252` ne relève aucun blocage ni problème majeur et confirme les quatre remarques mineures corrigées.

## Itération 4 — lecture, images et classement déployés

La migration locale `0003_article_reading.sql` ajoute les champs de thème/sous-thème, catégories éditeur, image/crédit, niveau d’accès, texte de lecture et `reading_metadata_version` ; elle conserve les articles. La version `0` de ce marqueur fait ignorer `ETag` et `Last-Modified`, qui peuvent avoir été réécrits par l’ancien Worker après migration et avant publication ; le nouveau Worker passe à `1` après une collecte réussie. La transition respecte la cadence et les baux. La liste de l’espace d’essai n’inclut pas le texte ; `GET /api/trial/articles/:id` le retourne par une route privée `no-store`, et répond `404` quand l’article n’est pas disponible ou que sa source est en pause.

Dans la version déployée de l’itération 4, le texte interne vient uniquement de `description` ou `summary` du flux, nettoyé et limité à 2 000 caractères ; l’extrait reste limité à 300 caractères. Aucun champ `content:encoded` ni aucune page d’article n’est récupéré par cette version. Ce contenu est souvent un texte court (environ 160–470 caractères observés), pas le texte intégral ; Investing.com ne fournit ici que des titres. Les valeurs d’accès `PAYING` et `MEMBER` sont marquées `restricted` : le corps enregistré est vide, seul l’extrait reste disponible et l’interface affiche un avertissement. Les articles `dpp:paid=true` sont ignorés. `unknown` ne signifie pas que le texte est libre ou réutilisable : le lecteur précise explicitement qu’un abonnement peut être nécessaire, y compris pour un article existant qui n’a pas encore été recollecté avec le nouveau parseur.

## Itération 5 — pages publiques et disponibilité stricte (`4c0d9a0`, seconde revue validée, déployée)

Cette extension sépare le collecteur RSS du lecteur de page. Le périmètre corrigé n’affiche que les articles dont la disponibilité est établie : accès explicitement `free` ou contenu accepté `available`/`live`, sauf qu’un marqueur `restricted` l’emporte et masque l’article. Un `unknown` sans corps accepté n’est pas montré, même comme extrait ; aucun contenu d’abonné n’est obtenu par API ou champ de flux. Aucun paywall, connexion, consentement, `403`, règle `robots` ou redirection inter-origine n’est contourné ; aucun cookie ni identifiant éditeur n’est transmis.

### Sources et règles d’extraction

| Source | Comportement du code |
| --- | --- |
| DH et La Libre | La collecte de page n’est tentée que pour un article déjà marqué `free`. Il faut un unique `NewsArticle` JSON-LD indiquant `isAccessibleForFree=true` et un corps visible unique dans le conteneur gratuit, dont le texte correspond au JSON-LD. Une ambiguïté, un désaccord ou l’absence de preuve arrête l’extraction. La lecture est à la demande et `live` ; le corps n’est pas conservé dans D1. |
| Gouvernement.lu | Seule source de lecture de page en arrière-plan : extrait le texte des sélecteurs configurés sous `main`/`cmp-text` (ou `article-body`), exige au moins deux paragraphes, et met en cache un corps accepté dans D1. |
| Le JSL | Retiré de la récupération de page et des essais automatiques tant que son format n’est pas validé ; pas de job de fond ni de retries `source_unverified` inutiles. Le média reste au catalogue, mais ses items `unknown` restent hors de l’API de revue. |
| 7sur7 | Toujours exclu de la récupération de page par politique éditeur (`publisher_policy`). Après une collecte RSS version 2, un item `dpp:paid=false` peut être présenté comme disponible au niveau RSS ; cela n’autorise pas la récupération de page. |
| Le Figaro et Investing.com | Compatibilité non vérifiée ; leurs items sans preuve `free` ou texte accepté restent hors de l’API de revue. Les médias restent au catalogue. |
| Le Soir et Zonebourse | Sans flux configuré dans le catalogue ; pas de corps d’article à demander dans cet essai. |

Cette liste décrit l’allowlist technique de la révision, pas une autorisation juridique de reproduction. Pour toutes les sources, les conditions d’usage et droits restent à établir. La disponibilité inconnue n’est pas une preuve d’accès libre ; l’ancien comportement de l’itération 4, qui gardait certains extraits `PAYING`/`MEMBER`, est historique et remplacé ici par le masquage de tout article réservé.

### Éligibilité API et révocation d’accès

L’API filtre les articles non admissibles avant de calculer les comptages et d’appliquer la limite de 20 par source. Un item est visible si son accès est explicitement `free` ou si son corps est `available`/`live`, et seulement en l’absence de tout marqueur `restricted`. L’accès `unknown` seul ne suffit pas. Le détail d’un article exclu répond `404`, comme un article absent ou d’une source en pause.

Les nouveaux items `PAYING`/`MEMBER` ne sont pas insérés dans D1. Une ligne déjà présente qui devient réservée est révoquée et reste au besoin comme tombstone caché : son titre, son extrait et son corps ne restent pas visibles. `dpp:paid=true` sert en interne à révoquer un item auparavant marqué libre ; il ne rend pas l’item consultable. `dpp:paid=false` est une indication permettant la visibilité RSS après une collecte avec la version de métadonnées 2, sans jamais autoriser à elle seule une lecture de page. Pour 7sur7, cette visibilité RSS n’autorise toujours pas la page d’article.

Si le corps d’une page contient un texte indiquant que l’article est réservé aux abonnés, l’extraction échoue avec `unavailable/possible_access_restriction` ; elle ne classe pas abusivement l’article comme `restricted`. Seul l’extrait reste affichable si la gratuité est confirmée par ailleurs.

### Récupération, règles robots et limites

- Seules les URL HTTPS de l’hôte exact du site ou du flux inscrit au catalogue sont acceptées ; les URL avec identifiants, port explicite ou fragment sont refusées. Les redirections sont manuelles, limitées à trois sauts et soumises au même contrôle d’hôte.
- Les réponses ne transmettent pas les cookies du navigateur (`credentials: omit`). Le collecteur accepte HTML/XHTML seulement, limite la réponse à 2 Mo et interrompt après 15 secondes.
- `robots.txt` est évalué pour l’agent `MyPressReview`. Les règles valides sont mises en cache une heure ; un échec/non-disponibilité est mis en cache 15 minutes et bloque la récupération (« fail closed »). Un refus par `robots` arrête la tentative. Le délai appliqué est au moins 15 secondes, ou le `crawl-delay` valide s’il est supérieur.
- Les redirections des pages d’articles vers une autre origine sont refusées ; celles de `robots.txt` restent limitées aux hôtes du catalogue.
- Sur Workers, `HTMLRewriter` retire les charges inertes avant l’extraction `htmlparser2` en TypeScript ; les scripts JSON-LD sont conservés pour les vérifications d’accès. Le fallback Node ne bénéficie pas de cette prétransformation native et ne justifie aucune garantie de CPU Workers.
- Le corps extrait doit mesurer entre 400 et 80 000 caractères et ne pas présenter les marqueurs connus de troncature (« lire la suite », points de suspension, etc.). Au-delà de 80 000, il est rejeté, jamais tronqué. Ce seuil et ces marqueurs ne prouvent pas à eux seuls que le contenu est complet : aucun texte de chapô ou corps manifestement partiel ne doit être qualifié d’intégral.

### Stockage, routes et affichage

La migration additive `0004_full_article_reading.sql` conserve les articles et ajoute les statuts `pending`, `available`, `live`, `restricted`, `unavailable`, les motifs et horodatages. Le lecteur privé déclenche `POST /api/trial/articles/:id/content` à l’ouverture seulement quand la politique permet une tentative ; cette mutation exige l’origine attendue et les réponses API sont `no-store`. `GET /api/trial/articles/:id` renvoie le corps sauvegardé seulement pour un statut `available`, sinon `404` si l’item n’est pas admissible. Le workspace de liste n’inclut pas le corps ; il élimine les items non admissibles avant comptages et limite.

Un corps `noarchive` n’est pas écrit dans `full_text` D1. Pour DH/La Libre, les pages `noarchive` sont lues en direct à la demande : leur texte est renvoyé dans la réponse POST pour la lecture courante et n’est pas archivé dans un cache client ; l’API est `no-store`. D1 garde uniquement l’état/motif et les dates de prochaine tentative. Le Cron ne planifie qu’un job Gouvernement.lu quand aucun flux RSS n’est dû ; il ne lance pas un batch de pages JSL/Gouvernement. Le bouton RSS conserve deux rafraîchissements en parallèle, et deux lectures de pages provenant de sources distinctes peuvent également être ouvertes en parallèle (par exemple Gouvernement.lu et DH). Les baux RSS et article sont exclusifs par source. Le délai minimal de 15 secondes ou le `crawl-delay` est calculé depuis la fin de la requête.

Un contenu `available` est conservé et n’est pas recollecté inutilement ; un item `restricted` ou une erreur permanente ne fait pas l’objet de retries. Seules les erreurs transitoires sont retentées après `nextAttemptAt`. Les anciens items qui deviennent réservés sont révoqués et masqués, leur corps intégral est purgé et les nouveaux `PAYING`/`MEMBER` ne sont pas ajoutés. Les contrôles client renforcent ces règles, mais le filtre API reste la limite d’accès.

La collecte RSS utilise `reading_metadata_version=2` pour assurer la relecture des métadonnées de disponibilité : en-dessous de la version 2, les validateurs `ETag`/`Last-Modified` sont ignorés jusqu’à une collecte réussie qui confirme les nouvelles métadonnées. Le marqueur est alors passé à 2. La transition respecte la cadence et les baux.

L’interface n’affiche que les items admis par l’API ; elle ne garde pas un extrait de flux réservé en solution de repli. Ces mécanismes n’affirment pas de droit de republication, ne changent pas le modèle d’accès partagé par code et n’ajoutent ni OAuth, ni comptes individuels, ni IA.

Le code corrigé `4c0d9a0` a passé 270 tests, typecheck, build, format et `git diff --check`, selon Codex. La seconde revue de Claude ne relève aucun blocage ni point majeur ; quatre constats mineurs restent à suivre. Le workflow 43960317682 a appliqué la migration distante `0004`, déployé puis promu la release vers `Production` (`8a831a8`). Les résultats navigateur desktop et mobile (390 px sans débordement) sont détaillés dans [0005](iterations/0005.md).

Les images proviennent des champs image des flux (`media:content`, `media:thumbnail` ou `enclosure`) et sont limitées dans le code à cinq hôtes exacts : `images.7sur7.be`, `www.dhnet.be`, `www.lalibre.be`, `i.f1g.fr` et `content-media.investing.com`. Le navigateur les charge directement avec chargement différé et `no-referrer` ; il n’y a ni proxy d’image ni cache image côté application. Le crédit suit le contexte de l’image retenue : il peut hériter des métadonnées englobantes de l’élément média, de l’article, du groupe ou du contenu, mais jamais d’une image sœur. Cette liste technique ne confirme pas les droits de republication ou de stockage.

La vérification post-déploiement du workflow 43951478895 a observé un workspace `200` de 140 articles, dix thèmes et 119 articles classés au premier chargement. Un rafraîchissement La Libre a traité 30 éléments avec statut `ok` ; la liste contenait 140 articles au total, dont 20 avec image après cette collecte. Les autres sources continuent de s’enrichir à leur prochain horaire dû, en respectant l’intervalle minimum de 15 minutes ; cette capture ne signifie pas que chaque image est déjà disponible.

## Bail et concurrence

Un bail D1 de deux minutes est acquis par une mise à jour conditionnelle, avec un propriétaire aléatoire. Il empêche une autre invocation de solliciter la même source en parallèle. Les écritures d’articles vérifient encore l’activation et le propriétaire du bail ; une mise en pause pendant la requête ignore les résultats et libère le bail. Les articles ne sont pas fusionnés entre médias.

## États et temporisations d’erreur

L’écran **Mes sources** expose l’état par source, le dernier essai, le dernier succès et le nombre d’articles conservés. Une erreur de flux est explicite et ne conduit pas à remplacer silencieusement le fournisseur. Les temporisations prévues par le code sont de six heures pour une réponse 403/404 ou une exigence de consentement, une heure pour 429 et quinze minutes pour les autres erreurs.

Les deux sources bloquées sont désactivées et sans URL de flux ; en production, elles ont zéro article et aucun succès de collecte (`last_success_at` nul). Un prétest 403 n’autorise pas à contourner la restriction, à utiliser un autre domaine ou à substituer un agrégateur.

## Provenance et droits

Toujours afficher le média et un lien vers la publication originale. Un flux ou une page techniquement accessible ne suffit pas à établir les droits de republication ; les conditions générales des éditeurs n’ont pas été validées comme une autorisation générale de réutilisation. Ne contourner ni paywall, ni page de consentement, ni réponse `403`, ni `robots`; ne pas utiliser de compte ou cookie d’abonné. La récupération de pages de l’itération 5 est limitée à certaines sources ; son résultat de publication n’est pas encore confirmé. Pour les sources non vérifiées et les articles réservés, l’API masque l’item, sans laisser l’extrait du flux en repli. Pour Investing.com, les dates de publication sans fuseau reconnu sont inconnues et restent absentes (`NULL`), plutôt que d’être inventées.

## IA future — non implémentée

L’IA n’est pas une source d’actualité autonome. La cible envisagée est de classer les nouveautés en français selon les thèmes et sujets personnels, puis éventuellement de produire des résumés ou synthèses après décision sur le fournisseur et le périmètre. Chaque résultat devrait conserver modèle, version de prompt, état et consommation, et être validé avant affichage.

Les articles sont des données non fiables : leur contenu ne doit ni modifier les consignes du traitement, ni déclencher des outils, ni révéler les données d’autres utilisateurs. N’envoyer au fournisseur que les données nécessaires et autorisées, jamais secrets ou jetons de session.

## Résilience future

Le collecteur en cours borne les URL, durées et tailles et ne traite qu’une source par invocation planifiée. Le bail D1 est déjà implémenté. Des besoins futurs pourront justifier une file de tâches, des limites de débit supplémentaires et des reprises plus fines. Toute extension devra préserver l’isolation des futures données personnelles ; l’espace d’essai actuel est partagé.

## Consommation IA future

Aucun budget mensuel n’est imposé. Prévoir des limites administrables par le Super Admin sur les lots, la longueur des textes, le retraitement et la consommation par utilisateur et globale. Afficher la consommation connue sans présenter une estimation comme une facture. À la limite, suspendre le traitement IA concerné en conservant les articles ; une panne IA ne devra bloquer ni leur collecte ni leur lecture.
