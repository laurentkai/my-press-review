# Architecture initiale

## Langage et socle

Choix : TypeScript. Il partage types et validations entre interface, API et collecte, et convient au runtime Workers sans serveur permanent.

Socle proposé : React + Vite (interface), Hono (API), D1 (SQL et migrations), Cron Triggers (collecte). Choisir les versions et le gestionnaire de paquets au démarrage du code, puis versionner le verrouillage des dépendances.

## Hébergement

Décision confirmée : un Worker unique avec Static Assets, API et collecte planifiée. Interface et API partagent la même origine. D1 conserve les données. Aucun projet Pages séparé.

Référence : https://developers.cloudflare.com/workers/static-assets/

## Parcours des données

Cron `*/15 * * * *` (UTC, toutes les 15 minutes) → sélection des flux à collecter → requête conditionnelle HTTP (ETag/Last-Modified) → validation et parsing → normalisation et déduplication → enregistrement D1 → traitement IA des nouveautés → classement par thème/sujet → consultation authentifiée par API.

Limiter le nombre de flux et le travail par invocation selon le plan Cloudflare ; planifier progressivement plutôt que supposer une collecte illimitée. Ajouter Queues seulement si les volumes ou durées le nécessitent.

## Organisation envisagée

- apps/web/ : consultation et administration.
- apps/worker/ : API, collecte et déclencheur planifié.
- packages/shared/ : contrats et validations communs.
- migrations/ : schéma D1 versionné.
- tests/ : vérifications métier et intégration.
- scripts/ : export de livraison et contrôles.

Ces répertoires ne sont pas encore implémentés.

## Sécurité et exploitation

Application privée, authentification Microsoft/Hotmail et Apple selon docs/AUTH.md. Isolation des données par utilisateur et rôle Super Admin. Autorisation serveur pour chaque mutation. Validation des URL et redirections pour empêcher SSRF ; neutralisation du HTML des flux ; limites de taille et délais ; journaux sans secrets. Séparer développement et production, bases et secrets compris. Prévoir migrations, sauvegarde D1 et procédure de restauration avant première mise en production.

## Contenus

Conserver uniquement les métadonnées et extraits autorisés, avec provenance et lien original. RSS/Atom et API en priorité. Aucune hypothèse de disponibilité de flux pour les médias cités. IA prévue pour le scheduler, fournisseur et modèle à choisir. Le scheduler pilote la collecte ; les nouveautés sont traitées par lots avec limites configurables, résultats validés et traçabilité. Voir docs/INGESTION.md.
