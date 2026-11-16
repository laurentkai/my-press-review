# Authentification et permissions

## Itération 3 : accès temporaire par code

Le code `c2fb5a875de1ede655a18b4da89a949594bafa83` est déployé dans l’espace de production. Il ajoute un accès temporaire à un espace d’essai partagé ; ce n’est ni une authentification OAuth ni un système de comptes individuels. Les routes OAuth restent indisponibles.

Le code d’accès est généré aléatoirement et doit contenir au moins 24 caractères. Le secret GitHub `TEST_ACCESS_CODE` est configuré pour le déploiement ; en local, le code est disponible dans `~/.local/share/my-press-review/trial-access-code.txt` (permissions `0600`) et peut être configuré dans `.dev.vars`, ignoré par Git. Le propriétaire peut ouvrir ce fichier pour copier le code dans le formulaire de connexion. Ne pas exposer sa valeur dans les journaux, commandes enregistrées ou fichiers versionnés.

`POST /api/trial/login` exige un en-tête `Origin`. Une session temporaire est créée avec un jeton opaque dont le hash est stocké en D1 et lié au hash du code d’accès. Le cookie `__Host-review_trial` est `Secure`, `HttpOnly`, `SameSite=Strict`, limité à la racine et valide huit heures. La déconnexion exige également `Origin`, révoque la session et est idempotente.

Les routes `/api/trial/*` protègent l’espace d’essai. Un accès par code ne constitue pas un rôle ni une identité par utilisateur : tous les détenteurs voient le même espace et les mêmes articles, sans isolation ni personnalisation individuelle. Aucun compte Super Admin n’est provisionné ; une demande avec le code d’essai ne donne pas accès à `/api/admin/*`.

La vérification navigateur de production a confirmé que `/api/trial/session` sans cookie renvoie `authenticated: false` et `available: true`, que `/api/trial/workspace` renvoie `401` sans session, puis que la connexion valide renvoie `200` et qu’une session suivante est authentifiée. Même authentifié, `/api/admin/users` répond `401` ; un nouvel accès au workspace sans identifiants est également refusé.

La connexion applique une limite D1 de huit tentatives par fenêtre de dix minutes et par IP. Cette mesure n’est pas une protection contre un flood distribué ; ce risque reste à traiter avant tout usage plus large.

## Fermeture et rotation de l’accès d’essai

Ces procédures s’appliquent au runtime de l’itération 3 actuellement déployé :

- Pour désactiver l’accès et la collecte planifiée, remplacer le secret GitHub `TEST_ACCESS_CODE` par la valeur courte non secrète `disabled` (moins de 24 caractères), puis déployer le `Main` courant. La validation du Worker refuse alors la connexion et le Cron n’exécute pas la collecte.
- Ne pas supprimer uniquement le secret GitHub : le Worker déjà publié conserverait son secret, tandis que le workflow exige une valeur non vide et ne pourrait plus effectuer un nouveau déploiement.
- En cas de fermeture urgente, retirer le secret du Worker Cloudflare et définir aussi `TEST_ACCESS_CODE=disabled` dans GitHub afin qu’un déploiement ultérieur ne réintroduise pas l’ancien code.
- La fermeture désactive l’accès et le traitement planifié, sans supprimer les articles, sessions ou compteurs en D1. Le déclencheur Cron reste configuré chaque minute, mais son gestionnaire retourne immédiatement : il ne collecte plus et ne purge plus les sessions ou compteurs expirés.
- Pour rouvrir, générer un nouveau code fort d’au moins 24 caractères, mettre à jour le secret GitHub et les fichiers locaux sans Git, puis déployer. Ne pas réutiliser un ancien code : un changement de code invalide les sessions liées à l’ancien hash ; rétablir cet ancien code pourrait rendre de nouveau acceptables des sessions non expirées (durée maximale huit heures).

## Authentification future — non implémentée

La cible est une connexion OAuth 2.0 / OpenID Connect via Microsoft (comptes personnels, dont Hotmail/Outlook) et Sign in with Apple, sans demander d’accès aux emails. Prévoir Authorization Code côté serveur, PKCE lorsque le fournisseur le prend en charge, et vérification de `state`, `nonce`, signature, émetteur, audience et expiration des jetons avec une bibliothèque maintenue compatible Workers.

Les sessions personnelles devront être révocables et liées à l’utilisateur ; protéger les mutations contre CSRF. Aucun jeton fournisseur ne doit être stocké dans le JavaScript du navigateur. Identifier un compte externe par fournisseur et identifiant stable, jamais par email seul ; ne pas fusionner automatiquement deux comptes sur la seule égalité d’adresse. Les rôles seront vérifiés côté serveur, jamais choisis par le client.

Aucun compte Super Admin n’est créé. Le premier compte administrateur doit être explicitement provisionné ; le premier inscrit ne le devient pas automatiquement. L’étendue d’accès du Super Admin aux contenus personnels reste à valider. Invitation, liste autorisée ou validation restent aussi à décider pour la cible à plusieurs comptes.

### Configuration future

Enregistrer une application Microsoft compatible avec les comptes personnels, son identifiant client et son URI de retour HTTPS. Pour Apple, configurer un App ID compatible, un Services ID, le domaine et l’URL de retour, ainsi que la clé privée et la rotation du secret client. Placer les secrets dans Cloudflare Secrets ; ne jamais les exposer dans l’interface Super Admin ni les versionner.

Références consultées le 16 novembre 2026 :

- [Microsoft identity platform et protocole OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [Configurer Sign in with Apple pour le Web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)

## Vérifications à prévoir pour OAuth

Refuser l’accès anonyme aux données ; empêcher la lecture/modification des données d’un autre utilisateur et toute élévation de rôle ; rejeter les jetons invalides ; tester connexion/déconnexion pour chaque fournisseur, révocation d’une session et liaison non autorisée d’un compte. Ces exigences ne sont pas garanties par l’accès d’essai partagé.
