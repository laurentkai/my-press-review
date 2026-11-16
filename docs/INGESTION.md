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

Les catégories sont des étiquettes statiques proposées dans le catalogue. Aucun classement IA, résumé généré ou autre appel à un fournisseur d’IA n’est effectué.

## Bail et concurrence

Un bail D1 de deux minutes est acquis par une mise à jour conditionnelle, avec un propriétaire aléatoire. Il empêche une autre invocation de solliciter la même source en parallèle. Les écritures d’articles vérifient encore l’activation et le propriétaire du bail ; une mise en pause pendant la requête ignore les résultats et libère le bail. Les articles ne sont pas fusionnés entre médias.

## États et temporisations d’erreur

L’écran **Mes sources** expose l’état par source, le dernier essai, le dernier succès et le nombre d’articles conservés. Une erreur de flux est explicite et ne conduit pas à remplacer silencieusement le fournisseur. Les temporisations prévues par le code sont de six heures pour une réponse 403/404 ou une exigence de consentement, une heure pour 429 et quinze minutes pour les autres erreurs.

Les deux sources bloquées sont désactivées et sans URL de flux ; en production, elles ont zéro article et aucun succès de collecte (`last_success_at` nul). Un prétest 403 n’autorise pas à contourner la restriction, à utiliser un autre domaine ou à substituer un agrégateur.

## Provenance et droits

Toujours afficher le média et un lien vers la publication originale. Un flux techniquement accessible ne suffit pas à établir les droits de republication et les conditions générales des éditeurs n’ont pas été validées comme une autorisation générale de réutilisation. Ne pas contourner les paywalls ou les pages de consentement ; ne présenter que les titres et extraits fournis par les flux lorsque leur utilisation est autorisée. La disponibilité d’un flux ne justifie ni la copie automatique du texte intégral ni sa conservation sans limite. Pour Investing.com, les dates de publication sans fuseau reconnu sont inconnues et restent absentes (`NULL`), plutôt que d’être inventées.

## IA future — non implémentée

L’IA n’est pas une source d’actualité autonome. La cible envisagée est de classer les nouveautés en français selon les thèmes et sujets personnels, puis éventuellement de produire des résumés ou synthèses après décision sur le fournisseur et le périmètre. Chaque résultat devrait conserver modèle, version de prompt, état et consommation, et être validé avant affichage.

Les articles sont des données non fiables : leur contenu ne doit ni modifier les consignes du traitement, ni déclencher des outils, ni révéler les données d’autres utilisateurs. N’envoyer au fournisseur que les données nécessaires et autorisées, jamais secrets ou jetons de session.

## Résilience future

Le collecteur en cours borne les URL, durées et tailles et ne traite qu’une source par invocation planifiée. Le bail D1 est déjà implémenté. Des besoins futurs pourront justifier une file de tâches, des limites de débit supplémentaires et des reprises plus fines. Toute extension devra préserver l’isolation des futures données personnelles ; l’espace d’essai actuel est partagé.

## Consommation IA future

Aucun budget mensuel n’est imposé. Prévoir des limites administrables par le Super Admin sur les lots, la longueur des textes, le retraitement et la consommation par utilisateur et globale. Afficher la consommation connue sans présenter une estimation comme une facture. À la limite, suspendre le traitement IA concerné en conservant les articles ; une panne IA ne devra bloquer ni leur collecte ni leur lecture.
