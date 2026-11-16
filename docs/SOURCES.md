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

## Cadence et intégration

La cadence produit visée est de 15 minutes par source. Dans le code, le Cron s’exécute chaque minute, mais ne traite qu’une seule source échue par invocation et impose au moins 15 minutes entre deux collectes d’une source. L’intégration comprend aussi le suivi de l’état, les filtres par catégorie/source et la recherche dans les titres et extraits. Les étiquettes de catégorie sont statiques ; il n’y a pas de classement par IA.

L’espace d’essai est temporairement protégé par un code partagé. Il ne fournit pas d’isolation des sources ou articles entre ses utilisateurs. Le futur produit pourra offrir une sélection et des catégories personnalisées par compte, après définition de l’authentification, des permissions et des règles de contenu.

## Principes de sélection

- Utiliser le flux fourni ou documenté par l’éditeur lorsqu’il est disponible ; enregistrer explicitement les blocages.
- Conserver pour chaque article un lien vers sa publication originale et attribuer clairement sa source.
- Ne pas collecter le texte intégral, contourner un paywall ou déduire des droits de republication de la seule disponibilité d’un flux.
- Afficher l’état réel de chaque source et ses erreurs ; ne pas faire de remplacement silencieux par un tiers.
- Confirmer les catégories et les besoins par pays avant de les traiter comme des exigences produit.
