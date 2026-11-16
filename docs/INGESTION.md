# Collecte et traitement IA

## Cadence et pipeline

Un Cron Trigger `*/15 * * * *` déclenche le Worker toutes les 15 minutes (UTC). Il sélectionne les flux actifs arrivés à échéance, récupère les nouveautés, normalise et déduplique, puis lance le traitement IA. Il s’agit d’une cadence de lancement, pas d’une garantie de publication complète en 15 minutes.

Le scheduler assure la planification ; l’IA analyse les données collectées et ne constitue pas une source d’actualité autonome. Conserver les dates d’origine, les sources et les URL. Respecter les limites et cadences des sources.

## Traitement IA proposé

Classer les nouveautés en français selon les thèmes et sujets personnels. Résumés et synthèses sont à préciser. Ne traiter que les nouveaux contenus ou les versions modifiées ; enregistrer modèle, version de consigne et statut. Valider les sorties structurées et les identifiants de thèmes/sujets ; ne jamais remplacer silencieusement le texte original par un texte généré.

Les articles sont des données non fiables : leurs instructions ne doivent ni modifier les consignes du traitement, ni déclencher des outils, ni révéler des données d’autres utilisateurs. Envoyer au fournisseur uniquement les données nécessaires et autorisées, jamais de secrets ou de jetons de session.

## Résilience

Verrou ou bail avec expiration pour éviter les traitements concurrents d’un même flux. Lots bornés, délais, limitation du débit, reprise avec temporisation et nombre d’essais maximal. États explicites : à traiter, en cours, terminé, erreur. Une panne IA ne bloque ni la collecte ni l’accès aux articles déjà disponibles. Répartir le travail sur plusieurs invocations et ajouter Queues si nécessaire après mesure ; ne pas supposer qu’une invocation pourra traiter toutes les sources et tous les utilisateurs.

## Consommation

Aucun budget mensuel n’est imposé. Prévoir limites de lots, longueur de texte, fréquence de retraitement et consommation par utilisateur et globale, modifiables par le Super Admin. Afficher la consommation connue ; ne pas présenter une estimation comme une facture. En cas de limite atteinte, suspendre le traitement IA concerné en conservant les articles collectés et signaler l’état.

## Contenu original

Récupérer RSS/Atom ou API autorisées en priorité. Conserver le texte intégral uniquement lorsque la source l’autorise et qu’il est disponible ; sinon afficher titre, extrait disponible et lien. Ne pas contourner les restrictions d’accès. Nettoyer HTML et ressources incorporées ; garder attribution et URL canonique dans les vues article et résultats IA. Tracer le statut de disponibilité du contenu.

Références :
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/platform/limits/
