# Authentification et permissions

## État implémenté

Aucune authentification, session applicative ou autorisation n’est implémentée. L’écran de connexion est une maquette ; les boutons Microsoft/Apple sont désactivés et aucun compte n’est créé. L’API annonce ces fournisseurs comme indisponibles et les routes OAuth renvoient `503`. Le schéma D1 contient `users`, `oauth_identities` et `sessions`, sans logique qui les utilise.

Aucun compte Super Admin n’est provisionné. Ne pas utiliser cette démonstration comme application privée ou comme contrôle d’accès opérationnel.

## Cible proposée, non implémentée

Connexion OAuth 2.0 / OpenID Connect via Microsoft (comptes personnels, dont Hotmail/Outlook) et Sign in with Apple, sans demander d’accès aux emails. Prévoir Authorization Code côté serveur, PKCE lorsque le fournisseur le prend en charge, et vérification de `state`, `nonce`, signature, émetteur, audience et expiration des jetons avec une bibliothèque maintenue compatible Workers.

Les sessions applicatives doivent être côté serveur, limitées dans le temps et révocables. Utiliser des cookies `HttpOnly` et `Secure`, avec `SameSite` adapté au retour fournisseur, notamment le retour POST d’Apple ; protéger les mutations contre CSRF. Aucun jeton fournisseur ne doit être stocké dans le JavaScript du navigateur.

Identifier un compte externe par fournisseur et identifiant stable, jamais par email seul ; ne pas fusionner automatiquement deux comptes sur la seule égalité d’adresse email, notamment avec les adresses relais Apple. Le rôle est vérifié côté serveur et jamais choisi par le client. Le compte initial Super Admin doit être explicitement provisionné ; le premier inscrit ne devient pas automatiquement administrateur. Journaliser les actions privilégiées sans secrets.

L’utilisateur pourra gérer et consulter ses sources, thèmes, sujets, filtres et contenus. Le Super Admin pourra gérer la configuration globale, fournisseurs d’authentification, paramètres IA, quotas, état des collectes et admission selon la politique retenue. L’étendue d’accès du Super Admin aux contenus personnels reste à valider : pas d’accès implicite. Ne pas inclure d’articles ni de configuration personnelle dans les fichiers statiques publics ; la coque statique peut présenter la page de connexion. Invitation, liste autorisée ou validation restent à décider.

## Configuration future

Enregistrer une application Microsoft compatible avec les comptes personnels, son identifiant client et son URI de retour HTTPS. Pour Apple, configurer un App ID compatible, un Services ID, le domaine et l’URL de retour, ainsi que la clé privée et la rotation du secret client. Placer les secrets dans Cloudflare Secrets ; ne jamais les exposer dans l’interface Super Admin ni les versionner.

Références consultées le 16 novembre 2026 :

- [Microsoft identity platform et protocole OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [Configurer Sign in with Apple pour le Web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)

## Vérifications à prévoir

Refuser l’accès anonyme aux données ; empêcher la lecture/modification des données d’un autre utilisateur et toute élévation de rôle ; rejeter les jetons invalides ; tester connexion/déconnexion pour chaque fournisseur, révocation d’une session et liaison non autorisée d’un compte. Ces exigences ne sont pas des garanties fournies par le prototype.
