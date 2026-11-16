# Authentification et permissions

## Périmètre confirmé

Application privée multiutilisateur. Connexion via Microsoft pour les comptes personnels, dont Hotmail/Outlook, et via Sign in with Apple. OAuth 2.0 / OpenID Connect servent à établir l’identité ; aucune permission de lecture des emails n’est demandée.

## Architecture proposée

Flux Authorization Code côté serveur, PKCE lorsque pris en charge par le fournisseur, state et nonce vérifiés. Vérifier signature, émetteur, audience et expiration des jetons avec une bibliothèque maintenue compatible Workers. Les sessions applicatives utilisent des cookies HttpOnly et Secure, une durée limitée et une révocation côté serveur. Adapter SameSite au retour fournisseur, notamment au retour POST Apple ; protéger les mutations contre CSRF.

Identifier un compte externe par fournisseur et identifiant stable, jamais par email seul. Ne pas fusionner automatiquement deux comptes sur la seule égalité d’adresse email, notamment avec les adresses relais Apple. Aucun jeton fournisseur dans le stockage JavaScript du navigateur.

## Rôles

- Utilisateur : gérer et consulter ses sources, thèmes, sujets, filtres et contenus.
- Super Admin : gérer les paramètres globaux, fournisseurs d’authentification, paramètres IA, quotas, état des collectes et admission des utilisateurs selon la politique retenue.

Le rôle est vérifié côté serveur et jamais choisi par le client. Le compte initial Super Admin est provisionné explicitement ; le premier inscrit ne devient pas automatiquement administrateur. Les actions privilégiées sont journalisées sans secrets. L’étendue d’accès aux contenus personnels reste à valider ; pas d’accès implicite.

## Accès privé

Protéger API et contenus ; ne pas inclure d’articles ni de configuration personnelle dans les fichiers statiques publics. La coque statique peut présenter la page de connexion. Le mécanisme d’admission (invitation ou validation) reste à choisir.

## Configuration nécessaire

Enregistrement de l’application Microsoft compatible comptes personnels, identifiant client et retour HTTPS. Pour Apple : configuration développeur, App ID compatible, Services ID, domaine et URL de retour, clé privée et rotation du secret client. Tous les secrets résident dans Cloudflare Secrets. L’interface Super Admin n’expose jamais les secrets existants.

Références consultées le 16 novembre 2026 :
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/

## Vérifications à prévoir

Accès anonyme refusé aux données ; impossibilité de lire/modifier celles d’un autre utilisateur ; élévation de rôle refusée ; jetons invalides rejetés ; connexion et déconnexion pour chaque fournisseur ; session révoquée inutilisable ; tentative de liaison de compte non autorisée refusée.
