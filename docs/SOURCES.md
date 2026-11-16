# Catalogue des sources

## État de l’itération 3

Le code `c2fb5a8` contient un catalogue serveur de neuf sources pour l’espace d’essai partagé et est déployé sur Cloudflare. Sept flux sont actifs ; Le Soir et Zonebourse restent désactivés après des prétests HTTP 403, sans URL de flux vérifiée. Les comptages locaux historiques et les observations de production sont séparés ci-dessous.

Les catégories indiquées sont des étiquettes proposées dans le catalogue, pas des classifications confirmées ni générées par IA. Les pages d’accueil ne sont pas des flux RSS.

| Source | Page d’accueil | Flux RSS configuré dans le code | Catégorie proposée | Observation en production |
| --- | --- | --- | --- | --- |
| 7sur7 | [7sur7.be](https://www.7sur7.be/) | `https://www.7sur7.be/home/rss.xml` | Belgique · actualités | Actif ; 30 articles collectés par le Cron. Un rafraîchissement immédiat a répondu `not_due`. La page de référence RSS a demandé un consentement lors du prétest. |
| DH Les Sports+ | [dhnet.be](https://www.dhnet.be/) | `https://www.dhnet.be/arc/outboundfeeds/rss/?outputType=xml` | Belgique · actualités | Actif ; 30 articles collectés. [Informations RSS](https://www.dhnet.be/rss/about/). |
| La Libre | [lalibre.be](https://www.lalibre.be/) | `https://www.lalibre.be/arc/outboundfeeds/rss/?outputType=xml` | Belgique · actualités | Actif ; 30 articles collectés. [Informations RSS](https://www.lalibre.be/rss/about/). |
| Le Soir | [lesoir.be](https://www.lesoir.be/) | Aucun flux vérifié | Belgique · actualités | Désactivé après un prétest 403 ; zéro article et `last_success_at` nul. |
| Le Figaro | [lefigaro.fr](https://www.lefigaro.fr/) | `https://www.lefigaro.fr/rss/figaro_actualites.xml` | France · actualités | Actif ; 19 articles collectés. [Page RSS](https://www.lefigaro.fr/rss). |
| Le Journal de Saône-et-Loire (Le JSL) | [lejsl.com](https://www.lejsl.com/) | `https://www.lejsl.com/rss` | Bourgogne · actualités locales | Actif ; 20 articles collectés. Le flux a été validé techniquement, mais aucune page officielle documentant ce flux n’a été trouvée lors du prétest. |
| Investing.com | [investing.com](https://www.investing.com/) | `https://fr.investing.com/rss/news.rss` | Économie · finance | Actif ; 10 articles collectés. Les dates sans fuseau reconnu restent inconnues. [Outils RSS](https://fr.investing.com/webmaster-tools/rss). |
| Zonebourse | [zonebourse.com](https://www.zonebourse.com/) | Aucun flux vérifié | Économie · finance | Désactivé après un prétest 403 ; zéro article et `last_success_at` nul. |
| Gouvernement.lu | [gouvernement.lu](https://gouvernement.lu/) | `https://gouvernement.lu/fr/actualites/toutes_actualites.rss` | Luxembourg · institutionnel | Actif ; 30 articles collectés. [Site en français](https://gouvernement.lu/fr.html). |

### Résultats techniques et portée

Lors d’une collecte locale ponctuelle avant déploiement, les sept flux configurés ont fourni `30 + 30 + 30 + 16 + 20 + 10 + 30 = 166` articles enregistrés et l’API en renvoyait 126, avec un plafond de 20 par source. Après déploiement, le Worker Cloudflare a enregistré `30 + 30 + 30 + 19 + 20 + 10 + 30 = 169` articles ; l’API en affichait 129. Le relevé de production est une observation ponctuelle, pas une garantie de disponibilité continue. Le workflow de déploiement est le [run 43942205690](https://github.com/laurentkai/my-press-review/actions/runs/43942205690).

Les pages de référence liées ci-dessus ont été rapportées lors des prétests. La présence d’un endpoint RSS, même techniquement valide, ne confirme ni l’autorisation d’accès permanente ni les droits de republication ; les conditions générales et autorisations de republication restent à confirmer par source. En particulier, l’accès au contenu ne doit pas contourner un paywall ou une exigence de consentement. Les liens de provenance vers l’éditeur sont toujours nécessaires ; seuls les titres et extraits fournis par les flux et autorisés sont affichés, jamais le texte intégral récupéré automatiquement. Aucune source ne doit être remplacée silencieusement par un agrégateur tiers.

Les statuts et erreurs sont suivis par source. Le Soir et Zonebourse restent visibles comme bloqués et désactivés plutôt que d’être contournés. Leur réactivation attend un flux vérifié et des prétests concluants.

### Capture locale initiale de l’itération 4 — historique

Lors de la première capture locale sur `54e8465`, avant les corrections de revue, les sept collectes ont produit 169 observations de flux (`30 + 30 + 30 + 19 + 20 + 10 + 30`). La liste renvoyée au moment de cette capture contenait 140 articles, dont 84 avec image et 25 marqués `restricted`. Ces mesures historiques ne constituent pas une mesure de la révision corrigée `3973252` et ne sont pas le relevé de production de l’itération 3 (169 articles stockés, 129 affichés), même si les totaux de collecte sont proches.

La révision corrigée `3973252` ajoute les alias de classement, l’avertissement d’abonnement possible quand le statut d’accès est inconnu et l’attribution d’image liée à son contexte. Elle est déployée en production ; cette ancienne capture locale ne mesure pas ce déploiement. Les images du flux utilisent une liste technique de cinq hôtes exacts ; cela ne confirme pas les droits de leur affichage ou de leur conservation. Les détails et limites figurent dans [le compte rendu de l’itération 4](iterations/0004.md).

### Vérification ponctuelle en production après l’itération 4

Le workflow [43951478895](https://github.com/laurentkai/my-press-review/actions/runs/43951478895) a publié `3973252`, appliqué la migration distante `0003` et promu la release vers `Production` (`c9c94ef`). Lors de la vérification navigateur, le workspace renvoyait 140 articles ; dix thèmes étaient présents et 119 articles classés au premier chargement. Un rafraîchissement La Libre a traité 30 éléments (`status: ok`) ; la liste contenait 140 articles au total, dont 20 avec image après cette collecte. Les autres sources continuent de s’enrichir au prochain horaire dû, en respectant 15 minutes minimum : ces observations ne signifient pas que chaque image est déjà disponible.

Ce relevé est un instantané de la vérification post-déploiement, distinct de la collecte de l’itération 3 (169 articles stockés/129 affichés) et de la capture locale antérieure de l’itération 4 (169 observations de flux/140 affichés). Il ne garantit pas la disponibilité permanente des flux.

## Cadence et intégration

La cadence produit visée est de 15 minutes par source. Dans le code, le Cron s’exécute chaque minute, mais ne traite qu’une seule source échue par invocation et impose au moins 15 minutes entre deux collectes d’une source. L’intégration comprend aussi le suivi de l’état, les filtres par catégorie/source et la recherche dans les titres et extraits. L’itération 3 utilisait des catégories de source statiques ; l’itération 4 ajoute un classement déterministe de thèmes/sous-thèmes sans IA, maintenant déployé.

L’espace d’essai est temporairement protégé par un code partagé. Il ne fournit pas d’isolation des sources ou articles entre ses utilisateurs. Le futur produit pourra offrir une sélection et des catégories personnalisées par compte, après définition de l’authentification, des permissions et des règles de contenu.

## Principes de sélection

- Utiliser le flux fourni ou documenté par l’éditeur lorsqu’il est disponible ; enregistrer explicitement les blocages.
- Conserver pour chaque article un lien vers sa publication originale et attribuer clairement sa source.
- Ne pas collecter le texte intégral, contourner un paywall ou déduire des droits de republication de la seule disponibilité d’un flux.
- Afficher l’état réel de chaque source et ses erreurs ; ne pas faire de remplacement silencieux par un tiers.
- Confirmer les catégories et les besoins par pays avant de les traiter comme des exigences produit.
