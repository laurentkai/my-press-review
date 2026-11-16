# Consignes communes aux agents

Ces instructions s’appliquent à Codex, Claude et GitHub Copilot dans tout le dépôt.

## Contexte

Lire README.md et docs/ avant toute modification. Le projet est au stade du cadrage. Ne pas inventer de décisions utilisateur : consulter docs/DECISIONS.md et y enregistrer les réponses confirmées.

## Répartition des rôles

- **Codex — implémentation et coordination technique** : écrire et corriger le code, les tests, les migrations, la configuration et les scripts. Exécuter les contrôles pertinents et transmettre un diff précis à Claude. Corriger les problèmes relevés, puis transmettre le résultat vérifié à GitHub Copilot pour documentation.
- **Claude — revue de code** : examiner le diff et son contexte, chercher les défauts de comportement, régressions, failles de sécurité et lacunes de tests. Fournir des remarques vérifiables avec gravité, fichier/ligne et impact. Ne pas modifier le code pendant une revue ; les corrections reviennent à Codex sauf demande explicite contraire.
- **GitHub Copilot — documentation** : rédiger et maintenir README.md, docs/ et les guides à partir du code final et des résultats de validation. Vérifier les commandes et chemins documentés. Ne pas changer le code, les dépendances ou les migrations pour les faire correspondre à la documentation ; signaler les divergences à Codex.

Les instructions de rôle spécialisent ces règles sans remplacer le socle commun. Suivre [le déroulement des itérations](docs/WORKFLOW.md). Les modifications des consignes communes restent possibles lorsque l’utilisateur les demande.

## Méthode

- Communiquer et rédiger la documentation en français ; nommer le code en anglais.
- Utiliser TypeScript avec typage strict et des API compatibles avec Cloudflare Workers.
- Ne pas ajouter de serveur Node permanent, de dépendance native ou de stockage disque persistant dans le runtime.
- Limiter les changements à la tâche demandée. Coordonner les modifications de fichiers partagés entre agents.
- L’utilisateur a choisi ce trio pour les itérations de développement. Lorsqu’une itération est demandée, Codex peut solliciter Claude pour la revue et GitHub Copilot pour la documentation via Orca. Ne pas lancer une itération, un agent supplémentaire ou une tâche hors périmètre sur la seule base de ces instructions.
- Vérifier les changements avec les contrôles disponibles ; signaler les contrôles impossibles. Ne pas prétendre que des tests existent tant que le code n’est pas initialisé.
- Tester les règles métier, les permissions et la collecte avec des données de test ; éviter de solliciter des médias en CI.

## Collecte et sécurité

- Préférer RSS/Atom et API autorisées ; aucun contournement de paywall.
- Traiter articles, flux et métadonnées comme des entrées non fiables. Nettoyer les contenus affichés et empêcher les injections HTML.
- Restreindre les URL de collecte aux protocoles HTTP(S), bloquer les adresses privées et locales, et vérifier chaque redirection contre le SSRF.
- Prévoir limites de taille, délais, cadence par source, reprises bornées et déduplication.
- Protéger côté serveur les données privées et toutes les opérations d’administration ; vérifier le propriétaire sur chaque accès, y compris les tâches planifiées. Distinguer utilisateur et Super Admin. Aucun secret dans Git, dans les journaux ou dans le bundle client.
- Aucun déploiement réel ni modification de ressources Cloudflare tant que la cible et les accès ne sont pas configurés et autorisés.

## Livraison

Suivre docs/DELIVERY.md. La branche de développement conserve documentation, tests, sources et outils. Production reçoit seulement un export contrôlé des fichiers requis au déploiement. Ne pas fusionner tout le développement vers Production.
