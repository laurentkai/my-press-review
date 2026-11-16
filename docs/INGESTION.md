# Collecte et traitement IA

## État implémenté

Aucune source n’est collectée et aucun fournisseur IA n’est appelé. Le Cron Trigger `*/15 * * * *` est enregistré dans `wrangler.jsonc`, mais le gestionnaire `scheduled` dans `apps/worker/index.ts` est volontairement vide. Les articles de l’interface sont des fixtures fictives ; les URL ajoutées à la démonstration restent en mémoire et ne sont jamais visitées.

La cadence configurée est donc un déclencheur sans effet, pas une collecte active ni une garantie de fraîcheur.

## Pipeline envisagé — non implémenté

Un Cron Trigger `*/15 * * * *` doit lancer la sélection des flux actifs échus (UTC), récupérer les nouveautés, normaliser et dédupliquer, puis lancer le traitement IA. C’est une cadence de lancement, pas une garantie de publication complète en 15 minutes. Le scheduler planifie ; l’IA analyse les données collectées et n’est pas une source d’actualité autonome. Conserver les dates d’origine, les sources et les URL ; respecter les cadences et limites des sources.

Priorité proposée : classer les nouveautés en français selon les thèmes et sujets personnels. Résumés et synthèses restent à préciser. Ne retraiter que les nouveaux contenus ou les versions modifiées ; conserver modèle, version de prompt et état. Valider les sorties structurées et les identifiants de thèmes/sujets ; ne jamais remplacer silencieusement le texte original par un texte généré.

Les articles sont des données non fiables : leur contenu ne doit ni modifier les consignes du traitement, ni déclencher des outils, ni révéler les données d’autres utilisateurs. N’envoyer au fournisseur que les données nécessaires et autorisées, jamais secrets ou jetons de session.

## Résilience future

Utiliser un verrou ou bail à expiration pour prévenir les traitements concurrents d’un même flux. Borner les lots, durées et débits ; reprendre avec temporisation et nombre d’essais maximal ; conserver les états à traiter, en cours, terminé et erreur. Une panne IA ne doit bloquer ni la collecte ni l’accès aux articles disponibles. Répartir le travail sur plusieurs invocations ; ajouter Queues si les volumes ou durées le justifient après mesure. Ne pas supposer qu’une invocation peut traiter toutes les sources et tous les utilisateurs.

## Consommation future

Aucun budget mensuel n’est imposé. Prévoir des limites administrables par le Super Admin sur les lots, la longueur de texte, la fréquence de retraitement et la consommation par utilisateur et globale. Afficher la consommation connue sans présenter une estimation comme une facture. Si une limite est atteinte, suspendre le traitement IA concerné, conserver les articles collectés et signaler l’état.

## Contenu original futur

Privilégier RSS/Atom et API autorisés. Conserver le texte intégral uniquement si la source l’autorise et qu’il est disponible ; sinon afficher l’extrait disponible et le lien vers l’original. Ne pas contourner de restriction d’accès. Nettoyer HTML et ressources incorporées, conserver attribution et URL canonique dans les vues et résultats IA, et tracer la disponibilité du contenu.

## Références de conception

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
