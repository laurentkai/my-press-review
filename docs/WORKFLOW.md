# Collaboration et itérations

## Rôles confirmés

Codex implémente, Claude effectue la revue de code et GitHub Copilot rédige la documentation. Codex coordonne le passage de relais et présente le résultat à l’utilisateur. Les échanges entre agents passent par Orca lorsqu’une itération est lancée ; ils ne doivent pas être simulés par un autre agent. Si un agent est indisponible, signaler le blocage sans prétendre avoir obtenu sa revue ou sa documentation.

Ce document configure le processus ; il ne lance pas à lui seul une itération.

## Déroulement

1. **Cadrer — Codex** : définir une tranche fonctionnelle limitée, critères d’acceptation, décisions nécessaires et fichiers concernés. Ne pas bloquer les tâches indépendantes sur une question encore ouverte.
2. **Implémenter — Codex** : réaliser code et vérifications pertinentes. Transmettre le commit de référence, la révision finale ou le diff exact, le comportement attendu, les contrôles exécutés et les limites connues. Fournir au reviewer l’accès aux fichiers non encore commités, si concernés.
3. **Examiner — Claude** : rendre une revue traçable de cette révision, sans éditer le code. Toute modification du diff pendant la revue doit être signalée ; la conclusion ne couvre que la révision examinée.
4. **Corriger — Codex, puis Claude** : traiter les défauts, exécuter les contrôles concernés et soumettre les corrections à une nouvelle revue. Consigner les points non résolus ; aucun blocage ne peut être déclaré clos sans preuve ou décision explicite.
5. **Documenter — GitHub Copilot** : mettre à jour la documentation à partir de la révision revue et des preuves fournies. Une préparation en parallèle est possible sur des fichiers distincts, mais la validation finale porte sur le code stabilisé.
6. **Vérifier et restituer — Codex** : contrôler la cohérence des documents, les liens et l’état Git ; présenter réalisation, revue, validation et points ouverts. Si le code change après la documentation, réévaluer revue et documentation sur le nouveau diff.

## Discipline de travail

- Développement sur Main ou une branche de travail destinée à Main. Production reçoit exclusivement l’export décrit dans DELIVERY.md.
- Éviter les éditions concurrentes des mêmes fichiers. Les agents partagent potentiellement un worktree : annoncer les fichiers réservés et ne pas changer de branche pendant qu’un autre agent y travaille.
- Chaque relais précise cible, périmètre, révision, fichiers autorisés, livrable et contrôles attendus.
- Une revue avec défauts bloquants ou majeurs non résolus empêche de déclarer l’itération terminée. Toute dérogation explicite doit être tracée avec son risque ; les suggestions facultatives peuvent être reportées.
- Ni la revue ni la documentation ne valent autorisation de déployer ou de publier.
- Garder les comptes rendus concis et traçables dans la restitution de l’itération ; ne jamais attribuer un travail à un agent qui ne l’a pas réalisé.

## Première itération envisagée

Initialisation du socle TypeScript, React/Vite, Worker et D1 local, avec commandes de développement et contrôles minimaux. Le périmètre exact sera fixé lors du lancement demandé par l’utilisateur. L’authentification, la collecte et l’IA feront l’objet de tranches suivantes selon les décisions restantes.
