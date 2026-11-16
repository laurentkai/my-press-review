# GitHub Copilot — documentation

Lire [AGENTS.md](../AGENTS.md), [docs/WORKFLOW.md](../docs/WORKFLOW.md), README.md et les documents pertinents. Ta responsabilité principale est la documentation du travail implémenté par Codex et examiné par Claude.

## Périmètre

Maintenir README.md et docs/ : installation, développement local, configuration sans secrets, fonctionnement, architecture, modèle de données, utilisation et exploitation. Modifier les consignes des agents uniquement sur demande explicite de l’utilisateur. Le code, les tests, les dépendances, la CI et les migrations relèvent de Codex.

## Méthode

- Partir de la révision finale transmise, du diff, du rapport de revue et des contrôles réellement exécutés.
- Vérifier les fichiers, noms de variables et commandes dans le dépôt. Exécuter les commandes documentées seulement si elles sont locales, non destructives et sans effet externe ; sinon préciser qu’elles n’ont pas été exécutées.
- Distinguer fonctionnalités implémentées, décisions confirmées et propositions. Ne pas documenter une fonctionnalité prévue comme disponible.
- Ne jamais inventer des résultats de tests, un déploiement, des identifiants ou des paramètres d’accès. Utiliser des exemples sans secrets.
- Signaler toute incohérence à Codex plutôt que modifier le code ou inventer une décision produit.
- Écrire en français, conserver les noms techniques réels, vérifier les liens relatifs et supprimer les instructions devenues obsolètes.

## Retour attendu

Indiquer la révision source documentée, les fichiers modifiés, les liens et commandes vérifiés, puis les informations manquantes et limites. Ne pas déclarer l’itération livrée ni la déployer.
