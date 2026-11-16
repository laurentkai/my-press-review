# Produit et périmètre

## Objectif

Application privée en français, pour plusieurs utilisateurs authentifiés. Chaque utilisateur configure ses sources et sa revue. Un Super Admin gère la configuration globale.

Construire une revue de presse à partir de médias sélectionnés, avec une interface de consultation et une administration des sources, thèmes, sujets et filtres.

## Concepts

- Source : média et méthode de collecte ; un média peut proposer plusieurs flux.
- Thème : grande catégorie, par exemple politique française.
- Sujet : dossier suivi dans un thème, par exemple présidentielle française.
- Filtre : règle d’inclusion/exclusion fondée sur mots-clés, source, langue ou dates. Sa portée et ses opérateurs restent à confirmer.
- Article : publication d’une source ; un article peut apparaître dans plusieurs sujets.

## Première version proposée

- Connexion : Microsoft (comptes personnels Hotmail/Outlook) et Apple ; autres fournisseurs extensibles.
- Super Admin : configuration globale et paramètres de collecte/IA.
- Administration personnelle : créer, modifier, activer ou désactiver sources et flux ; organiser thèmes et sujets ; gérer et prévisualiser les règles.
- Collecte toutes les 15 minutes avec traitement IA : importer les nouveautés, dédupliquer, enregistrer l’état et les erreurs de chaque flux.
- Consultation : présentation de type site de presse, navigation par thème et sujet, cartes d’articles et vue de lecture. Conserver systématiquement source, date et lien original. Afficher le contenu intégral lorsque son acquisition et sa reproduction sont autorisées ; sinon afficher l’extrait disponible et ouvrir l’original. Identifier les contenus produits par IA.
- Afficher la dernière collecte réussie ; distinguer un flux vide d’un flux en erreur.
- Interface en français, utilisable sur mobile et au clavier, avec états vides, chargement et erreur.

## À confirmer

Fournisseur et rôle exact de l’IA, mode d’admission des utilisateurs, sources initiales, conservation, recherche, favoris, états de lecture et notifications. Aucun budget imposé au cadrage ; prévoir des limites d’usage administrables et une visibilité sur la consommation.

## Critères de réussite

Une source autorisée peut être ajoutée et testée depuis l’administration ; sa collecte peut être relancée sans doublon ; un article pertinent rejoint le bon sujet ; une exclusion est explicable ; l’échec d’un flux ne bloque pas les autres ; une requête non autorisée ne peut pas modifier la configuration.
