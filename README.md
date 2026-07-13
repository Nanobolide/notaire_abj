# NOTARIA — Plateforme SaaS multi-études de gestion notariale (socle V3.5)

**V3.5 — AUDIT FINAL DES DEUX EXPERTS (notaire + développeur, 30 ans chacun)**

Aucune fonctionnalité nouvelle : cette version est une revue de sécurité et de propreté de bout en
bout, avec correction des rares points trouvés. Rien ne s'éloigne de la base validée.

CE QUI A ÉTÉ VÉRIFIÉ (et tient)
• Sécurité des routes : les 27 routes API ont un contrôle d'accès. Les seules sans exiger* sont
  login, logout, session et recuperation — publiques à juste titre. recuperation est anti-énumération
  (ne révèle jamais si un compte existe) et ne modifie rien directement.
• Forfaits : le contrôle est fait CÔTÉ SERVEUR (route offres), pas seulement en cachant l'onglet.
  Un appel direct à l'API avec un forfait insuffisant est refusé. Contournement impossible.
• Cohérence financière : total des frais, émoluments et reste à recouvrer identiques entre le tableau
  de bord et la comptabilité. La ventilation couvre exactement le total. Aucun trop-perçu absurde.
• Secret professionnel : isolation entre études intacte ; audit_log et avis inaccessibles même au
  rôle applicatif ; les offres ne portent aucune donnée nominative (garde-fou testé).
• Robustesse : les écrans nouveaux (super-admin, offres, cloche) initialisent leurs listes à [] ;
  aucun .map sur données nulles — pas d'écran blanc possible.

CE QUI A ÉTÉ CORRIGÉ
• db/demo.sql : ancien fichier de démonstration orphelin (remplacé depuis par src/lib/demo-data.js),
  supprimé pour éviter toute confusion. La référence morte dans le README a été corrigée.

CE QUI EST NORMAL (signalé pour mémoire, aucune action nécessaire)
• Colonnes « dormantes » prestations_annexes et taux_tva : conservées en base (DEFAULT 0) mais
  n'entrent dans AUCUN calcul ni affichage. Inoffensives ; on les garde pour ne rien casser et
  pouvoir les réactiver un jour sans reconstruire.

RIEN N'A ÉTÉ AJOUTÉ DE TROP, RIEN NE MANQUE AU PÉRIMÈTRE VALIDÉ.


**V3.4 — RENSEIGNEMENT, FORFAITS, OFFRES (feuille de route codée)**

VENTILATION DE LA DÉMO
• Chaque dossier de démonstration est ventilé comme un comptable : 15 % droits d'État, 5 % débours,
  80 % émoluments. Somme exacte (aucun écart), montants jamais négatifs. Ne touche QUE la démo.

ACCÈS « RENSEIGNEMENT » (5e niveau)
• Nouveau niveau, sans toucher aux quatre existants. Peut ouvrir Appels & Courriers et y saisir ;
  ne voit NI les Actes, NI aucun montant, NI la comptabilité, NI les réglages. Vérifié cloisonné.
  Contrainte CHECK de la base élargie ; disponible dans l'écran Comptes.

FORFAITS (Ami · Essentiel · Pro · Pro Max)
• Au départ, le forfait ne fait que CLASSER les études : aucune restriction active
  (reglages_plateforme.forfaits_restrictions_actives = false). Rien ne casse.
• Les distinctions sont préparées et documentées ci-dessous, prêtes à être activées un jour.

SERVICE D'OFFRES « Proposition de vente / d'achat »
• Codé, mais ÉTEINT par défaut (reglages_plateforme.offres_actives = false). Activable par le
  super_admin depuis l'onglet Réglages. Réservé aux forfaits Pro et Pro Max (vérifié).
• Garde-fou déontologique GRAVÉ dans le code : une offre ne contient jamais de donnée nominative
  du client — seulement le bien, la ville, un prix indicatif, le contact de l'étude. Testé.
• Écran /offres côté étude ; onglet visible uniquement si le service est actif ET le forfait autorisé.

ANNONCES — QUI LES VOIT
• Réglage annonces_visibles_par : « tous » (notaire + collaborateurs) ou « notaire » seul.
  Modifiable par le super_admin. Les offres ont leur propre onglet, séparé de la cloche 🔔.

NOUVEAUX RÉGLAGES PLATEFORME (super_admin)
• Table reglages_plateforme (clé/valeur) + onglet « Réglages » : interrupteur des offres,
  application des restrictions de forfait, visibilité des annonces. Toutes les routes super-admin
  sont protégées par exigerSuperAdmin.

AUDIT DES DEUX EXPERTS (avant livraison)
• Notaire : Renseignement cloisonné ✅ · garde-fou secret professionnel ✅ · offres par forfait ✅.
• Informaticien : démo 15/5/80 exacte ✅ · isolation RLS intacte ✅ · routes protégées ✅ ·
  réglage « qui voit » correct ✅ · service d'offres éteint/allumé/par forfait ✅.
• Non-régression : matrice d'accès intacte (Formaliste ne voit pas la compta) · débours jamais
  remboursés · 13 étapes · Visite Client · l'application compile · base créée sans erreur.

--------------------------------------------------------------------------------
CE QUE CHAQUE FORFAIT PRÉVOIT (pour mémoire — non appliqué tant que non activé)
--------------------------------------------------------------------------------
AMI       — bêta-testeurs et confrères proches. Accès complet, tarif offert ou réduit, en échange
            de retours. Comptes illimités. Badge « période de test ».
ESSENTIEL — petite étude. Comptes limités (proposé : 5). Suivi financier simple (total facturé,
            payé, reste). Export simple. Pas d'offres immobilières.
PRO       — toutes les fonctions. Comptes illimités. Comptabilité complète (ventilation, rentabilité
            par acte et par collaborateur, balance des tiers). Import Excel + export total +
            sauvegarde programmée. Accès aux offres immobilières (si le service est activé).
PRO MAX   — grandes études / multi-offices. Tout le Pro, plus priorité de support. Cible privilégiée
            des offres immobilières. À créer au moment de l'activation du service d'offres.

Rappel : ces distinctions sont PRÉPARÉES mais NON APPLIQUÉES au départ. Le super_admin les activera
une par une via l'onglet Réglages, sans casser l'existant.


**V3.3 — DEUX FEUILLES DE DÉCISIONS CODÉES (corrections + super administrateur)**

SECTION 1 · CORRECTIONS
• Affichage mobile de la Comptabilité : les tableaux financiers sont désormais défilables
  horizontalement (classe .table-scroll) au lieu de se chevaucher. Les autres écrans, non concernés,
  sont inchangés.
• Écran Comptes : filets de lignes, survol, et surlignage or de la ligne en cours de modification.
• Mot de passe (C3) : le 🔑 ouvre un vrai panneau « nouveau mot de passe + valider », ou génération
  au choix. L'action « réinitialiser » existante est conservée intacte.
• Compte Accueil (C4) : plus de clignotement des Actes. La page attend la confirmation du droit
  avant tout affichage ; un Accueil voit un message clair, jamais les données.

SECTION 2 · LISTES
• Nature du dossier : liste unique et complète, « Autres » en dernier (déjà en base — les captures
  venaient d'une base non recréée).
• Étape / Statut : remplacée par les 13 étapes du parcours réel (Recensement → CMPF → Terminé/Annulé).
  Les dossiers de démonstration ont été ré-alignés pour ne laisser aucun vide.

SECTION 3 · SUPER ADMINISTRATEUR
• Espace /super-admin réservé à l'éditeur (helper exigerSuperAdmin — le seul contrôle légitimement
  fondé sur `role`). Lien visible uniquement par le super_admin.
• Forfaits (P9) : chaque étude porte un forfait — Ami · Essentiel · Pro · Pro Max. Le super_admin le
  change et peut activer/désactiver une étude. Le rôle applicatif peut modifier le forfait et le statut,
  mais PAS le nom d'une étude (GRANT restreint, vérifié : permission denied).
• Annonces (P10) : le super_admin diffuse une annonce (information / mise à jour / maintenance) à
  toutes les études, une sélection, ou un forfait. Cloche 🔔 côté étude avec compteur de non-lues et
  « marquer comme lu ». Ciblage vérifié étanche : une annonce « sélection » ne fuit pas vers une étude
  non ciblée.
• Import Excel (P7) : dans Paramètres, à côté des réglages. Bouton « Télécharger le modèle »,
  puis import par le NOTAIRE (pas le super_admin : secret professionnel) avec APERÇU et CONFIRMATION.
  Les dossiers déjà présents ne sont jamais écrasés ; lignes vides ignorées, lignes invalides rejetées
  avec anomalies affichées. Import testé de bout en bout, anti-doublon compris.

GARANTIES RE-VÉRIFIÉES (rien cassé)
• Matrice d'accès intacte : le Formaliste ne voit PAS la Comptabilité ; celle-ci reste réservée au
  Notaire, au Notaire salarié et au Comptable.
• Isolation RLS entre études : intacte. Journaux inviolables. Débours jamais remboursés (aucun résidu).
• Schéma et seed se créent sans erreur ; l'application compile.

NON FAIT (signalé, comme convenu)
• Renommer « Standard » en « Saisie simple » : non appliqué, car non tranché par vous. Aucun risque à
  le faire, il suffit de le confirmer. Le 5e niveau « simple saisie » n'a pas été créé (ma reco : inutile).
• Feature-gating des forfaits : pour l'instant le forfait ne fait que CLASSER l'étude ; il n'ouvre ni ne
  ferme encore de fonctions (à définir plus tard, sans casser).


**V3.2 — CORRECTIONS D'APRÈS LES CAPTURES D'ÉCRAN**

Image 1 — Le **Super Administrateur** apparaissait dans le menu « Responsable (reçu par) ».
  Aucun client d'une étude ne demande à parler à l'éditeur du logiciel. Il est désormais exclu
  de TOUS les menus (`role <> 'super_admin'`), dans les actes comme dans les appels, et de la
  liste des comptes de l'étude.

Image 2 — **Écran Comptes entièrement repensé.** Formulaire replié derrière « + Ajouter un
  collaborateur ». MODIFICATION EN LIGNE : le crayon ✏️ ouvre la ligne, on modifie dans le
  tableau, ✅ enregistre, ✖️ annule — exactement comme le registre des actes. Actions en icônes
  sur la ligne concernée : ✏️ 🔑 🔓 ⏸️ 🗑️. Badges de niveau colorés, légende en pied de tableau.
  Mot de passe provisoire généré sans caractères ambigus (ni O/0 ni l/1), affiché une seule fois
  dans un encadré, avec bouton Copier.

Images 3 et 4 — **Le tableau de bord est une succession de trois sous-sections** :
  ① SUIVI DES ACTES ET MINUTES · ② JOURNAL DES APPELS ET COURRIERS · ③ TABLEAU DE BORD —
  COMPTABILITÉ. « Comptabilité » disparaît du menu principal : ce n'était pas un écran à part.
  Le bloc « Suivi financier » isolé est supprimé.

Image 5 — **Visite Client** est bien dans le référentiel `type_flux` (ordre 4). Si le menu ne la
  montre pas, c'est que la base n'a pas été recréée avec le nouveau `db/seed.sql`.

Image 6 — Champs **« Prestations annexes »** et case **« Débours remboursés par le client »**
  RETIRÉS du formulaire et de tous les calculs. Il reste : Émoluments · Droits d'État · Débours ·
  Autres dépenses (+ motif). Le total ventilé s'affiche sous les champs et se compare au total
  des frais annoncés : ✓ vert s'il correspond, ⚠ rouge sinon.

**Accès du Comptable (12/12 conformes)** : il a exactement les droits d'un clerc rédacteur —
les deux registres, la saisie de la prévision — PLUS la ventilation et le volet financier.
Il ne gère ni les comptes, ni les paramètres, et ne supprime aucun compte.

**Deux failles trouvées à l'audit final et corrigées** :
  – `/api/dashboard` ne renvoyait pas `dossiers_a_ventiler` : la sous-section ③ aurait affiché
    « undefined dossier en attente ».
  – L'export Excel exportait encore la colonne « Prestations annexes », supprimée du métier.
    Une fois de plus, la faille était dans la surface secondaire, jamais dans l'écran.

Formules vérifiées (4/4) : le total des frais est le point de départ, la ventilation le répartit,
le reste à payer = frais − versé, aucun trop-perçu inventé. Démo : 24 dossiers ventilés au
centime, 6 laissés « à ventiler ». Isolation, journaux inviolables, avis illisibles : intacts.

**V3.1 — CORRECTIONS DE L'AUDIT UTILISATEUR**

P0 · BLOQUANTS
• **Écran blanc du Comptable** : /tableau-de-bord appelait `s.presence.map()` alors que `presence`
  n'est renvoyé qu'aux Notaires → exception client, page vide. 12 accès non protégés au total.
  Tous sécurisés (`?.` et `|| []`), plus un `error.js` global : une donnée manquante ne fait
  plus disparaître une page.
• **Menus « Responsable »** : `estRedacteur()` ne reconnaît plus une liste figée mais tout libellé
  commençant par « Notaire » ou « Clerc » (Notaire en second, Clerc principal, Clerc 1…).
  Registre des appels : le menu s'appelle désormais « Responsable (reçu par) » et son FILTRE
  lit la même liste dynamique (il pointait encore sur un référentiel statique).
  Un acte sans responsable est attribué au Notaire par défaut.

P2 · LOGIQUE COMPTABLE — la plus importante
• **Le total des frais est le point de départ**, pas le résultat. Le clerc saisit ce que paie le
  client ; le comptable le VENTILE en Droits d'État + Débours + Émoluments. La ventilation
  répartit le total, elle ne le recrée pas. Tableau de bord, écran Comptabilité et export Excel
  lisent tous `honoraires_totaux` : une seule vérité (vérifié : 5 870 000 F partout).
• **Les débours ne sont JAMAIS remboursés** : colonne `debours_rembourses`, case à cocher,
  compteurs « non remboursés » et « à rembourser » — tout est supprimé du code et de la base.
• **Plus de trop-perçu absurde** : un dossier non ventilé affiche « À ventiler », pas un solde
  négatif. Le trop-perçu n'apparaît que si l'encaissé dépasse un total réel.
• Tableaux financiers lisibles : montants alignés à droite, chiffres tabulaires, lignes zébrées.
• **Le Comptable a les accès d'un collaborateur, PLUS la Comptabilité.** Plus aucun champ ne lui
  est masqué : la distinction gênait plus qu'elle ne protégeait. Il n'a ni les comptes, ni les
  paramètres, ni le tableau de bord Actes.

P3 · TABLEAU DE BORD — le bloc « Suivi financier » isolé disparaît ; il devient « ③ Point financier
— l'essentiel » (émoluments, total facturé, payé, reste) avec un lien vers le détail.

P4 · Nouveau type de flux **« Visite Client »** pour le client qui se déplace sans appeler.

P1 · Écran Comptes : l'identifiant EST le nom affiché (un seul champ), « Nom et prénom » devient
l'état civil facultatif. Formulaire replié derrière « + Nouveau collaborateur ».

P5 · **Tri par colonne** sur les deux registres (10 colonnes pour les actes, 8 pour les appels),
avec ▲▼, détection automatique nombre/date/texte, vides toujours en bas.

Démo : 24 dossiers ventilés au centime près, 6 laissés « à ventiler » pour montrer le badge.
Audit final : matrice 6/6 conforme, aucune fuite vers Clerc/Accueil, isolation, journaux
inviolables, avis illisibles, révocation immédiate.

**V3.0 — L'EXPORT EXCEL DISAIT ENCORE L'ANCIENNE VÉRITÉ**

• **C22 (l'export contredisait les écrans)** : après C19, le tableau de bord et /comptabilite
  calculaient sur la ventilation — mais /api/exports gardait la colonne « Honoraires » lisant
  `honoraires_totaux` (la prévision du clerc), et le « Reste » se calculait dessus. Le Notaire
  téléchargeait un fichier qui contredisait ses deux écrans, et pouvait afficher un reste NÉGATIF
  (exemple réel : total 2 397 100, réglé 4 000 000 → reste −1 602 900).
  L'export expose désormais : Émoluments · Droits d'État · Débours · Prestations annexes ·
  Autres dépenses · Total facturé · Réglé · Reste à payer — la même formule que partout ailleurs.
  Les frais annoncés apparaissent à part, jamais confondus avec le total.
  Vérifié : tableau de bord = écran Comptabilité = export Excel = 5 870 000 F.
• **C23 (fuite des notes internes par l'export)** : les colonnes « Difficultés » et « Observations »
  étaient exportées à TOUS ceux qui pouvaient exporter — donc au Comptable, à qui C15 les interdit.
  `filtrerActe` n'était jamais appliqué à l'export. Corrigé : le Comptable ne les reçoit plus.
  C'était la même erreur que C11 : on sécurise l'écran, on oublie le fichier.
• La colonne « Échéance ? », supprimée du tableau, l'est enfin aussi de l'export.
  La colonne « Formalités » y apparaît.
• Le Clerc rédacteur exporte sa prévision (frais annoncés, réglé) et rien de la ventilation.

Transactionnel vérifié empiriquement : un versement aberrant refusé par `plafondReglement()`
après l'UPDATE déclenche bien le ROLLBACK de `withTenant` — la base reste intacte (montant à 0).

Exports par profil : Accueil 403 · Formaliste aucun montant · Clerc prévision seule ·
Comptable ventilation sans notes internes · Notaire tout.

**V2.9 — LA DETTE I8 EST SOLDÉE : une seule vérité sur l'argent**

• **C19 (deux écrans, deux vérités)** : /api/dashboard calculait le financier sur `honoraires_totaux`
  (la PRÉVISION du clerc) tandis que /api/comptabilite calculait sur la VENTILATION du comptable.
  Le Notaire lisait deux chiffres d'affaires différents selon l'écran ouvert.
  Désormais la VENTILATION fait foi partout. `honoraires_totaux` n'est plus qu'une prévision,
  affichée séparément sous le libellé « Frais annoncés par les clercs (non contractuelle) ».
  Quand elle diffère du total ventilé, l'écart est AFFICHÉ, jamais masqué.
• **C20 (le comptable était bloqué)** : `if (montant_regle > honoraires_totaux) → 400`. Un Comptable
  qui ventilait un dossier dont le clerc n'avait pas saisi de prévision voyait sa saisie refusée.
  Nouvelle fonction `plafondReglement()` : le versé se compare au total ventilé s'il existe,
  à la prévision sinon. Présente en POST ET en PATCH (le PATCH avait le même défaut).
  Testé : ventilation seule → plafond 5 870 000, versé 4 000 000 accepté ; versé aberrant refusé.
• **C21 (démonstration fausse)** : `honoraires_totaux` de la démo valait 2 397 100 alors que la
  ventilation donnait 2 290 000 — un écart de 107 100 F, la TVA oubliée après l'option A.
  30 actes régénérés : 0 écart, 0 versé supérieur au total.

Vérifié : tableau de bord et écran Comptabilité affichent le MÊME total facturé (42 412 000 F sur
la démo), le même reste à recouvrer, et les émoluments (14 841 000 F) comme unique revenu de l'étude.

Matrice : 10 contrôles conformes. Isolation, journaux inviolables, avis illisibles, zéro
interpolation SQL, aucun montant ni motif de dépense ne fuit vers un Clerc ou l'Accueil.

**V2.8 — LE COMPTABLE PEUT ENFIN VENTILER**

Le maillon manquant : les champs comptables existaient en base et le serveur les acceptait,
mais AUCUN formulaire ne permettait de les saisir. Le Comptable voyait les colonnes sans
pouvoir rien y écrire. Corrigé.

• **Bloc « Ventilation comptable »** dans le formulaire des actes, encadré or, réservé au Notaire
  et au Comptable : Émoluments · Droits d'État · Débours · Prestations annexes · Autres dépenses
  (+ motif) · case « Débours remboursés ». Le total facturé se calcule en direct sous les champs.
• **Option A (validée)** : la TVA n'entre plus dans le total facturé ni dans l'affichage.
  Total facturé = émoluments + droits d'État + débours + prestations annexes + autres dépenses.
  Vérifié en base : 2 500 000 + 3 000 000 + 200 000 + 50 000 + 120 000 = 5 870 000.
  La colonne `taux_tva` et le champ Paramètres restent en place, simplement inutilisés — rien
  n'est détruit si le comptable la réclame un jour.
• Nouvelles colonnes `autres_depenses` et `autres_depenses_motif` (redressement, imprévu…).

**Contradiction résolue entre deux propositions validées** : la n°3 dit « le clerc saisit la
prévision », la n°7 dit « aucun montant pour le niveau Standard ». Trois niveaux distincts :
  – PRÉVISION (frais annoncés + versé) : Notaires, Comptable et Clercs rédacteurs — `saisitPrevision`
  – VENTILATION (émoluments / droits / débours / autres) : Notaires et Comptable — `voitMontants`
  – NOTES INTERNES (observations, difficultés) : tous sauf le Comptable
Testé sur 5 profils : Accueil et Formaliste ne voient NI prévision NI ventilation ; le Clerc voit
sa prévision mais pas la ventilation ; le Comptable voit tout le financier mais pas les notes.

Failles recherchées après coup : aucune. Isolation, journaux inviolables, avis illisibles,
zéro interpolation SQL, zéro fuite de montant vers un Clerc ou l'Accueil.

**V2.7 — les trois failles du 5e audit sont fermées**

• **C16 (anonymat trahi — la plus grave)** : /api/avis faisait `fonction || s.fonction || null`.
  Le collaborateur qui choisissait « Je préfère ne pas le dire » voyait sa fonction enregistrée
  quand même, par repli silencieux sur sa session. Dans une petite étude, une seule personne est
  comptable : c'était la désigner. La fonction n'est plus conservée QUE si l'auteur l'a déclarée
  lui-même. Aucun repli. (Testé : null → null, chaîne vide → null.)
• **C17** : la proposition n°1 dit « le Formaliste ne saisit plus de montants ». La colonne avait
  disparu de l'écran, mais `saisitDepenses(Formaliste)` valait encore true : il pouvait injecter
  un `depenses_formalites` par l'API. Masquer un champ n'est pas le protéger.
  `saisitDepenses` = Notaire + Comptable. Nouveau `modifieFormalites` (statut seul) = + Formaliste.
  Testé : Formaliste → montants NON, statut OUI. Clerc → NON, NON.
• **C18 (balance des tiers fausse)** : `GROUP BY a.id` produisait une ligne par ACTE. Un client
  ayant trois dossiers apparaissait trois fois, sans jamais son total. Désormais `GROUP BY
  p.nom_partie` sur la première partie de l'acte (celle qui règle) : UNE ligne par client, avec le
  nombre réel de dossiers et le solde cumulé. C'est le sens même d'une balance des tiers.
• **I11** : le taux de TVA était concaténé dans le SQL. Il passe en paramètre lié ($1::numeric).

Écran Comptes assaini : libellés de niveaux courts, explication discrète sous le champ,
badges de couleur sobre dans le tableau (bleu Administrateur, vert Notaire salarié, or Comptable).

Rappel du modèle comptable, tel que validé : le clerc saisit les frais annoncés et ce que le client
a versé ; le COMPTABLE ventile ensuite le réel en Droits d'État / Débours / Émoluments. Seuls les
émoluments sont un revenu de l'étude. Total facturé = émoluments + TVA + droits + débours + annexes.

**V2.6 — LE VOLET COMPTABLE EST ENFIN À L'ÉCRAN**

Écran COMPTES (refonte après retour « trop confus ») :
• Un seul champ « Nom du collaborateur » (nom_complet et nom_affiche fusionnés).
• Le mot de passe provisoire passe sur sa propre ligne (le libellé chevauchait le menu Niveau d'accès).
• Le « 0 » parasite dans la colonne Actions vient de `{u.verrouille && …}` : quand la valeur vaut 0
  et non false, React affiche le 0. Corrigé par Boolean().
• Actions en icônes : ✏️ modifier · 🔑 réinitialiser · 🔓 déverrouiller · ⏸️ désactiver · 🗑️ supprimer.
• Le compte super_admin n'apparaît plus dans la liste des comptes de l'étude.

Écrans neufs :
• **/comptabilite** — A rentabilité réelle · B par catégorie d'acte · C par collaborateur ·
  D BALANCE DES TIERS (solde de chaque client) · E trésorerie des formalités.
  « Reste à payer » en gras rouge sobre (#B03030 sur fond #FDF3F3), trop-perçu signalé à part.
  Total facturé = émoluments + TVA + droits d'État + débours + prestations annexes.
  Seuls les émoluments sont un revenu de l'étude : c'est écrit à l'écran.
• **/avis** — formulaire ANONYME. La table `avis` ne contient AUCUN lien vers l'utilisateur ni vers
  l'étude (colonnes : id, fonction, categorie, message, recu_le). Le rôle applicatif a le droit
  d'INSÉRER mais pas de LIRE (vérifié : « permission denied for table avis »). Ni le Notaire ni
  personne dans l'étude ne peut lire les avis. Avertissement sur le secret professionnel affiché.
• Colonne **Formalités** dans le registre des actes (Pas encore débuté / Débuté / En cours / Terminé),
  modifiable en ligne par le Formaliste, le Notaire et le Comptable — jamais par un Clerc.
  Le Formaliste ne saisit PLUS de montants (décision du comptable, proposition n°1).
• Champ **taux de TVA** dans Paramètres, modifiable par Notaire, Notaire salarié et Comptable.
• Menu **Responsable** enfin rempli : rédacteurs (Notaires, Clercs) pour les actes ; tous les
  collaborateurs pour les appels. Mis à jour dès qu'un compte est créé ou modifié.
• Démonstration enrichie : 30 actes avec émoluments, droits, débours, dépenses (14,8 M / 21,7 M / 6,3 M).

Décisions appliquées (feuille de validation n°2) : 1,2,3,4,5,7,13→20,25→30 validées ; n°8 REFUSÉE
(les délais restent 20/40/60 · 30/60/90 · 180/270/365, réglables par étude).
Le Comptable voit désormais le nom des parties (n°4) mais jamais les observations ni les difficultés.

**V2.5 — ÉCRAN COMPTES REFONDU + les deux dernières failles fermées**

ÉCRAN COMPTES (enfin visible !) :
• Menu déroulant **Fonction** — 12 valeurs : Notaire principal, Notaire salarié, Clerc de 1ère
  catégorie, Clerc 2 à 5, Formaliste, Comptable, Archiviste, Secrétariat, Accueil.
• Menu déroulant **Niveau d'accès** — Administrateur / Notaire salarié / Comptable / Standard,
  avec suggestion automatique selon la fonction choisie (modifiable).
• Champ **Nom et prénom** (état civil), distinct du **Nom affiché**.
• Bouton **🎲 Générer** un mot de passe provisoire (10 caractères, sans O/0/l/1 ambigus),
  affiché UNE SEULE FOIS après création dans un encadré, avec bouton **📋 Copier**.
• Bouton **👁 œil** sur les champs mot de passe (vérifier sa saisie sans retaper).
• Bouton **Modifier** sur chaque ligne (nom, nom complet, fonction, niveau d'accès),
  **Réinit. mdp** (génère et affiche un nouveau code), **Désactiver/Réactiver**, **Supprimer**.
  La ligne de l'Administrateur ne peut être ni désactivée ni supprimée depuis l'écran.

FAILLES FERMÉES :
• **C14 (récidive de C7)** : le niveau d'accès et la fonction étaient figés dans le jeton de
  session. Rétrograder un Comptable le laissait comptable jusqu'à sa déconnexion. Ils sont
  désormais relus EN BASE à chaque requête (`compte_etat()`). Rétrogradation = effet immédiat.
• **C15** : `filtrerActe` ne retirait que les montants. Le Comptable recevait les parties, les
  observations et les difficultés des dossiers — contraire à la proposition n° 8 validée.
  Il ne reçoit plus que références, dates, natures, statuts et montants.
• **I9 confirmé** : `estAdmin()` n'existe plus dans le code (seul un commentaire le documente).
  `src/lib/acces.js` est l'unique autorité, et elle lit `niveau_acces`.

RESTE À FAIRE : champs comptables dans le formulaire des actes, champ TVA dans Paramètres,
blocs financiers A/B/C du tableau de bord, écran dédié au Comptable, génération du modèle Excel.

**V2.4 — les quatre brèches du 3e audit sont fermées** :
• **C11 (fuite par les exports — la plus grave)** : /api/exports/actes n'exigeait qu'une session.
  L'Accueil, bloqué sur le registre, pouvait TÉLÉCHARGER tout le registre des actes en Excel
  (parties, natures, conservations). Le droit d'exporter suit désormais EXACTEMENT le droit de
  consulter : voitRegistreActes / voitRegistreAppels appliqués à l'export. Accueil → 403 sur
  l'export des actes ; Comptable → 403 sur l'export des appels.
• **C12 (Comptable aveugle)** : /api/dashboard et /api/exports testaient estAdmin() (fondé sur
  `role`). Le Comptable, de role 'collaborateur', ne voyait AUCUN montant — la fonctionnalité ne
  marchait pas pour la seule personne à qui elle était destinée. Ils utilisent maintenant
  voitMontants() / voitFinancier(). Le bloc Actes du tableau de bord lui reste fermé.
• **C13 (TVA verrouillée à tort)** : la matrice donnait modifieTva() au Notaire et au Comptable,
  mais la route /api/parametres exigeait exigerAdmin(). PATCH distingue désormais le taux de TVA
  seul (Notaire + Notaire salarié + Comptable) du reste des paramètres (Administrateur seul).
  Taux borné entre 0 et 1 par contrainte moteur.
• **I9 (trois sources de vérité)** : estAdmin() est SUPPRIMÉ de src/lib/auth.js. Plus aucun
  contrôle d'accès ne se fonde sur `role` (vérifié : 0 occurrence). src/lib/acces.js, qui lit
  `niveau_acces`, est l'unique autorité. C'est ce qui avait causé C9.
• Bug latent attrapé : un bloc `estAdmin(s)` survivait dans POST /api/actes sans être importé —
  la création d'acte aurait planté à l'exécution (le build ne le voyait pas). Supprimé.
• Le tableau de bord tolère les blocs absents (actes/appels/finances à null selon le profil).

Tests : 6 profils × C11, C12, C13 → conformes. Non-régression : isolation, C4, C7, contrainte TVA ✅.

**V2.3 étape 2 — C9 et C10 CORRIGÉES** :
• **C9 (élévation de privilège)** : `exigerAdmin()` se fondait sur `role` ; le Notaire salarié,
  ayant `role='admin_etude'`, accédait à /comptes, /parametres et /demo. L'autorisation repose
  désormais sur `niveau_acces`. Deux gardes distincts : `exigerAdmin()` (Administrateur SEUL —
  comptes, paramètres, démo) et `exigerNotaire()` (Administrateur + Notaire salarié — suppression
  d'actes/appels, corbeille). Un Notaire salarié ne peut plus se promouvoir administrateur.
• **C10 (matrice non appliquée)** : `src/lib/acces.js` est maintenant branchée sur les routes.
  L'Accueil reçoit 403 sur /api/actes ; le Comptable reçoit 403 sur /api/appels ; `filtrerActe`
  retire tous les champs financiers (anciens ET nouveaux : emoluments, droits_etat, debours,
  prestations_annexes) pour quiconque n'est ni Notaire ni Comptable, sur GET, POST et PATCH.
  L'ancien `filtrerActe` local (qui entrait en collision) a été supprimé.
• Champs `depenses_formalites` et `statut_formalites` modifiables par le Formaliste, le Notaire
  et le Comptable uniquement.
• **Tableau des actes** : colonne « N° dossier » ajoutée après « N° minute » (elle était saisie
  et stockée, mais invisible — les dossiers en cours n'ont pas encore de n° de minute).
  Colonne « Échéance ? » (statut) supprimée ; la date d'échéance est conservée.
  Les colonnes financières suivent la matrice (Notaire + Comptable), plus seulement l'admin.

Test de la matrice : 6 profils vérifiés (Administrateur, Notaire salarié, Comptable, Formaliste,
Clerc, Accueil) sur 8 permissions + filtrerActe. Non-régression : isolation, C4, C7 ✅.

**V2.3 étape 1 — SOCLE DES ACCÈS ET DE LA COMPTABILITÉ (livrée)** :
• Mot de passe : minimum ramené à 8 caractères (serveur + libellés).
• Comptes : nouveaux champs `nom_complet` (état civil) distinct de `nom_affiche` ; `fonction`
  parmi 12 valeurs (Notaire principal, Notaire salarié, Clerc de 1ère catégorie, Clerc 2-5,
  Formaliste, Comptable, Archiviste, Secrétariat, Accueil) ; `niveau_acces` indépendant
  (administrateur / notaire_salarie / comptable / standard), validé serveur ET par contrainte moteur.
• Nouvelle action `modifier` (nom, nom complet, fonction, niveau) et `DELETE` d'un compte,
  réservé à l'Administrateur — un Notaire salarié ne peut ni supprimer un compte ni se promouvoir.
• `src/lib/acces.js` : matrice d'accès centralisée (voitMontants, voitRegistreActes,
  voitTableauActes, saisitDepenses, modifieTva, filtrerActe…). Un seul endroit décide de qui voit quoi.
• Base : colonnes comptables sur `actes` (emoluments, exonere_tva, droits_etat, debours,
  debours_rembourses, prestations_annexes, depenses_formalites, statut_formalites avec CHECK)
  et `taux_tva` (défaut 0.18) sur `parametres_etude`.
• Seed enrichi : 7 comptes de démonstration couvrant tous les niveaux d'accès.

**RESTE À FAIRE (étapes 2 et 3)** : écran Comptes refondu (bouton Générer/Copier, bouton œil,
modification en ligne), suppression de la colonne « Échéance ? », responsables dynamiques,
application de la matrice sur toutes les routes, tableau de bord financier (A/B/C), écran Comptable,
génération et import du modèle Excel.

**V2.2 — ergonomie & présence** : menu du haut ÉPURÉ (Tableau de bord · Appels · Actes),
tout le reste regroupé dans un bouton « ⚙ Paramètres » à droite (Comptes, Corbeille, Délais &
barèmes, Changer mot de passe, Mentions légales, Se déconnecter). Indicateur de CONNEXION discret
sous le nom de l'étude (point vert + nom + rôle de la personne connectée). Carte « QUI EST CONNECTÉ »
sur le tableau de bord, réservée au Notaire (point vert = actif < 5 min, gris = hors ligne + depuis
quand). Volet « ⚙ RÉGLER LES DÉLAIS » directement dans le registre des actes : le Notaire ajuste un
barème et le tableau se recolore, synchronisé avec la page Paramètres. Déconnexion → hors ligne
immédiat. Non-régression vérifiée : isolation, C4/C6/C7/C8, présence.

**V2.1 — réglage rapide + couleurs personnalisables** :
• Bouton « ⚙ Régler les délais » directement dans le registre des actes : le Notaire ajuste
  les seuils (simples / complexes / successions) sans quitter la page, clique « Appliquer »,
  et le tableau se recolore aussitôt. C'est le MÊME paramètre que l'écran Paramètres (aucune
  duplication). • Le Notaire peut choisir les COULEURS des alertes (4 teintes : léger / moyen /
  grave / terminé) via des sélecteurs de couleur, avec aperçu en direct et validation #RRGGBB ;
  bouton « Rétablir les valeurs par défaut » inclus. • Les registres, le tableau de bord et les
  exports utilisent les couleurs de chaque étude. Non-régression : isolation, C4/C6/C7/C8.

**V2.0 — écran PARAMÈTRES du Notaire** : nouveau bouton « Paramètres » (admin) permettant de régler
soi-même, par étude : (1) la DURÉE DE CONSERVATION des données (1 à 10 ans) ; (2) la durée de
SESSION (15/30/60/120 min) ; (3) tous les BARÈMES DE DÉLAIS (actes simples, complexes, successions,
appels/courriers) — chaque seuil modifiable, avec validation « croissants et positifs » côté serveur
ET contraintes au niveau base. Bouton « ↺ Rétablir les valeurs par défaut » (barèmes recommandés).
Les couleurs des registres s'adaptent automatiquement aux barèmes de l'étude. Raccourci vers la
gestion des collaborateurs. Réservé au Notaire (un collaborateur reçoit 403).
Non-régression vérifiée : isolation multi-tenant (2 nouvelles tables sous RLS), C4/C6/C7/C8.

**V1.9 — robustesse et confort quotidien** :
• BROUILLON anti-coupure : le formulaire est sauvegardé dans le navigateur à chaque frappe ;
  après une coupure internet, une fermeture d'onglet ou une session expirée, la saisie est
  proposée à la restauration. • ALERTE anti-doublon : si un acte (même minute/nature) ou un
  appel (même client) vient d'être saisi, une confirmation « Enregistrer quand même ? » s'affiche.
• PAGINATION serveur (50 par page) sur les deux registres. • EXPORTS Excel par PLAGE DE DATES
  (du… au…, ou tout depuis le début). • PURGE DÉCENNALE : fonction recensant les actes de plus de
  10 ans à exporter avant archivage. • RÉCUPÉRATION du compte Notaire : lien « Mot de passe oublié »
  qui crée une demande traitée par le Super-Admin (équipe technique) après confirmation de vive voix.
Note hébergement : les SAUVEGARDES automatiques sont fournies par l'hébergeur (ex. Neon = sauvegardes
quotidiennes incluses) — à activer au déploiement, pas de code applicatif.
Non-régression vérifiée : isolation multi-tenant, C4/C6/C7/C8, nouvelles fonctions moteur.

**V1.8 — 3e audit (tolérance zéro) traité** :
C7 révocation IMMÉDIATE de session (un compte désactivé ou verrouillé perd l'accès à la
requête suivante, sans attendre les 30 min) · C8 verrouillage TEMPORAIRE et progressif
(15 min à 5 échecs, 1 h à 8) et l'admin d'étude n'est JAMAIS verrouillable (plus de déni de
service possible sur le Notaire) · I6 la corbeille purge réellement au-delà de 30 jours ·
N5 page « Mentions légales & protection des données (loi 2013-450) » liée au pied de page,
avec responsable de traitement, finalité, droits et champ de déclaration ARTCI ·
mot de passe provisoire masqué à la saisie. Non-régression vérifiée (isolation, C4, C6).

**V1.7** : C6 corrigée (identifiant de connexion UNIQUE sur toute la plateforme — le moteur
refuse les doublons inter-études) · écran **Corbeille** (Notaire) : consulter, restaurer en un
clic, supprimer définitivement, alerte sur les éléments à moins de 5 jours de la purge ·
**Exports Excel** des deux registres avec les couleurs des barèmes (boutons ⬇ Excel dans les
registres, montants réservés au Notaire, chaque export journalisé) · **vues d'impression**
🖨 Imprimer / PDF pour produire le registre à une inspection.
Liste de recette pour le développeur : (1) restaurer un acte supprimé depuis /corbeille,
(2) tenter de restaurer un doublon → message clair attendu, (3) télécharger /api/exports/actes
en notaire puis en collaborateur (colonnes financières absentes), (4) Ctrl+P sur /imprimer/actes.

**V1.6 — les 4 failles critiques de l'audit sont corrigées et testées** :
C1 blocage SERVEUR du mot de passe provisoire · C2 volet financier filtré sur TOUTES les
réponses (GET/POST/PATCH) · C3+I1+N3 écran « Comptes » du Notaire (créer, désactiver,
déverrouiller, réinitialiser) · C4 journaux audit/pièces inviolables au niveau du moteur
(REVOKE) · C5 unicité des numéros (minute et appels) avec gestion des collisions.
**Également** : modification complète et suppression (corbeille) ligne par ligne dans les
registres · parties multiples (+ Ajouter une partie) · 15 natures de dossier avec complexité
pré-sélectionnée (Succession verrouillée en Complexe) · responsables d'actes limités au
Notaire et aux Clercs · nom de l'étude affiché dans l'en-tête · garde-fous financiers ·
numéros de téléphone étrangers acceptés. IMPORTANT : recréer la base (schema.sql + seed.sql).

**Nouveautés V1.4** : changement de mot de passe OBLIGATOIRE à la première connexion ·
volet financier visible et modifiable par le Notaire (admin) uniquement, masqué côté serveur pour les collaborateurs ·
champ de recherche client dans les deux registres · échéance par défaut alignée sur les barèmes
(simple +20 j, complexe +30 j, succession +180 j) · note déontologique permanente en pied de page.

**Barèmes de délais V1.3** : actes simples 20/40/60 j · actes complexes 30/60/90 j · successions 180/270/365 j · appels et courriers 3/5/10 j (couleurs jaune → orange → rouge, vert pâle = terminé/résolu, violet = annulé).

Socle applicatif conforme au dossier de conception V1.0.
Étude pilote : **Me KOUASSI MARLENE K. ELISEE — Abidjan**.
Les registres démarrent **vides** : aucune donnée des fichiers Excel n'est migrée.

## Contenu du socle

| Périmètre | État |
|---|---|
| Schéma PostgreSQL multi-tenant + Row-Level Security **forcée** | ✅ Inclus (`db/schema.sql`) |
| Référentiels : 29 conservations foncières, motifs, statuts… | ✅ Inclus (`db/seed.sql`) |
| Connexion identifiant + mot de passe, verrouillage après 5 échecs, session 30 min | ✅ Inclus |
| Journal des Appels & Courriers : saisie hybride, SLA 72 h / 5 j, colorations V7 | ✅ Inclus |
| Suivi des Actes : échéance auto J+14, colorations V2, volet financier FCFA | ✅ Inclus |
| Journal historisé des pièces manquantes (append-only) | ✅ Inclus |
| Tableau de bord complet (modèle du classeur Excel V2.1) : compteurs gradués, suivi financier, analyse par Conservation Foncière, répartitions par étape / responsable / flux / motif / collaborateur | ✅ Inclus |
| Pages en deux onglets « Formulaire » / « Registre » (modèle Google Forms → Sheets) | ✅ Inclus |
| Colonne fusionnée ÉTAPE / STATUT (9 étapes + Terminé + Annulé) | ✅ Inclus |
| Journal d'audit (qui, quoi, quand, avant/après) | ✅ Inclus |
| Suppression logique réservée à l'Administrateur (corbeille) | ✅ Inclus (API) |
| Test automatisé d'isolation entre études | ✅ Inclus (`npm run test:isolation`) |
| Connexion Google OAuth du Notaire | ⬜ À brancher (NextAuth) — la connexion par identifiant fonctionne en attendant |
| Exports Excel/PDF, écran corbeille, gestion des comptes par le Notaire, purge décennale | ⬜ Étape suivante |

## Installation (10 minutes)

1. **Prérequis** : Node.js 18+, PostgreSQL 14+ (local, Supabase ou Neon).
2. Copier la configuration :
   ```bash
   cp .env.example .env
   # renseigner DATABASE_URL et un JWT_SECRET aléatoire (openssl rand -hex 32)
   ```
3. Créer la base :
   ```bash
   npm install
   npm run db:init
   ```
   **Données de démonstration — EN UN CLIC** : connectez-vous en tant que `notaire`,
   et sur le tableau de bord (registres vides) cliquez « Charger les données de
   démonstration » : 30 actes + 30 appels (avril-juin 2026) identiques au classeur Excel.
   Un bouton « Effacer les données de démonstration » fait l'inverse — il refuse d'agir
   si les données présentes ne sont pas celles de la démo (protection des vraies données).
   Alternative en ligne de commande : la démo est générée par l'application (src/lib/demo-data.js) ; `db/demo_reset.sql` remet l'étude pilote à zéro.
4. Lancer :
   ```bash
   npm run dev          # http://localhost:3000
   ```
5. Se connecter avec un compte de démonstration :
   - `notaire` / `ChangezMoi2026!` (Administrateur d'étude)
   - `secretariat`, `clerc1`, `accueil` / même mot de passe (collaborateurs)

   **Changez ces mots de passe immédiatement.**

## Sécurité — points non négociables avant toute mise en ligne

- Exécuter `npm run test:isolation` : le moindre échec **bloque la livraison**.
  Le test a besoin de deux variables : `DATABASE_URL` (rôle applicatif `notaria_app`)
  et `ADMIN_DATABASE_URL` (compte administrateur, uniquement pour créer les deux
  études fictives du test — jamais utilisé par l'application).
- L'application doit se connecter avec le rôle `notaria_app` (jamais superuser,
  sinon la RLS ne s'applique pas).
- HTTPS obligatoire ; `JWT_SECRET` long et secret ; sauvegardes quotidiennes chiffrées.
- Faire réaliser un test d'intrusion avant l'ouverture au-delà de l'étude pilote.

## Ce que ce socle N'EST PAS

C'est un **point de départ solide (~90 % du périmètre V1)**, pas un produit fini :
il reste l'OAuth Google, les exports, l'écran d'administration des comptes,
l'onboarding Super-Administrateur, les tests de charge et le déploiement supervisé.
Un développeur doit accompagner la mise en production.
