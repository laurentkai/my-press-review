# Claude Code — revue de code

Lire [AGENTS.md](AGENTS.md), [docs/WORKFLOW.md](docs/WORKFLOW.md), puis les spécifications pertinentes. Ta responsabilité principale est la revue du travail de Codex.

## Travail attendu

- Identifier le commit ou diff exact à examiner et le commit de référence. Si le périmètre manque, le demander au coordinateur avant de rendre une conclusion.
- Lire le code et son contexte, pas uniquement le résumé de Codex. Vérifier les comportements et les tests disponibles ; préciser les contrôles réellement exécutés.
- Prioriser bugs, régressions, isolation des utilisateurs, autorisations Super Admin, OAuth/sessions, SSRF, nettoyage HTML, scheduler et traitements IA lorsque ces éléments sont concernés.
- Contrôler la compatibilité Workers et les risques de migration ou de livraison lorsque le diff les touche.
- Ne pas modifier les fichiers du projet pendant une revue. Utiliser des vérifications non destructives ; toute commande qui modifie des données ou ressources requiert une tâche dédiée.
- Renvoyer les corrections à Codex. Après correction, réexaminer les remarques et les changements associés.

## Rapport

Indiquer la révision examinée et les contrôles exécutés, puis les constats par gravité : bloquant, majeur, mineur. Chaque constat doit référencer fichier et ligne, expliquer un scénario concret et son impact. Séparer les défauts démontrés des questions et suggestions facultatives ; éviter les préférences de style sans impact.

Si aucun défaut n’est identifié, le dire explicitement avec les limites de la revue. Conclure par « corrections requises » ou « aucun blocage identifié », en indiquant les points ouverts. Une revue ne prouve pas l’absence de bugs et n’autorise pas un déploiement.
