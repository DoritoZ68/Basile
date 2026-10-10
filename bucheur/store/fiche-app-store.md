# Fiche App Store : Bûcheur

Textes prêts à copier dans App Store Connect (langue principale : **français**).
Les limites de caractères d'Apple sont indiquées entre parenthèses ; tous les textes les respectent.
Remplace les éléments entre crochets `[…]` avant l'envoi.

---

## Informations sur l'app

| Champ | Valeur |
|---|---|
| **Nom** (30) | Bûcheur : minuteur de révision |
| **Sous-titre** (30) | Révise, un cerne à la fois |
| **Identifiant de lot** | com.bucheur.app |
| **SKU** | bucheur-ios-001 |
| **Catégorie principale** | Éducation |
| **Catégorie secondaire** | Productivité |
| **Classification par âge** | 4+ (répondre « Aucun » à toutes les questions du questionnaire) |
| **Prix** | Gratuit, avec achat intégré |
| **Appareils** | iPhone uniquement |
| **Copyright** | 2026 [Ton nom] |

## Texte promotionnel (170)

> Le bac approche ? Lance une séance, pose ton téléphone et regarde ton tronc grandir : chaque séance de révision ajoute un cerne.

Ce texte peut être modifié à tout moment sans nouvelle vérification : change-le selon la saison
(rentrée, partiels de janvier, bac en juin).

## Description (4000)

```
Bûcheur transforme tes révisions en un tronc qui grandit.

Chaque séance de travail ajoute un cerne, dans la couleur de ta matière. Plus tu révises longtemps, plus le cerne est épais. Ton objectif du jour est un cercle en pointillés : à toi de le remplir.

UN MINUTEUR QUI T'AIDE À TE CONCENTRER
• Choisis ta matière et une durée : 15, 25, 45, 60 minutes ou la tienne.
• Mets la séance en pause, ou ajoute 5 minutes si tu es lancé.
• Pendant la séance, il ne reste que l'essentiel à l'écran : le temps restant et ton cerne qui se dessine.
• L'écran reste allumé et une notification te prévient à la fin, même si tu as fermé l'app.
• À la fin, note ce que tu as révisé et ta concentration, puis prends une pause de 5 à 20 minutes.

TES PROGRÈS, D'UN COUP D'ŒIL
• Le tronc du jour et ton objectif quotidien.
• Ta série de jours de révision consécutifs, et ton record.
• « Ta semaine en rondelles » : un petit tronc par jour pour voir tes efforts prendre forme.
• Le temps passé sur chaque matière, comparé à ton objectif de la semaine.

JUSQU'AU JOUR J
• Ajoute tes examens (bac, brevet, partiels, concours, oraux) et suis le compte à rebours depuis l'écran principal.

SIMPLE ET RESPECTUEUX
• Aucun compte à créer, aucune publicité.
• Tes révisions restent sur ton téléphone.
• Un design calme, en mode clair ou sombre, pensé pour ne pas te distraire.
• Des réglages pour tout adapter : pauses, notifications, vibrations, écran allumé, phrases d'encouragement.

BÛCHEUR PRO : UN SEUL ACHAT, POUR TOUJOURS
La version gratuite te permet de réviser sans limite de temps. Bûcheur Pro ajoute, pour un achat unique et sans abonnement :
• Matières et examens illimités
• Séances jusqu'à 2 heures
• Tout ton historique, semaine par semaine
• Les essences de bois : Chêne, Érable et Bois de nuit pour changer la couleur de l'app

Bûcheur est fait pour les lycéens, les étudiants et tous ceux qui préparent un examen. Une page après l'autre, un cerne après l'autre.
```

## Mots-clés (100)

```
bac,brevet,partiel,examen,pomodoro,concentration,étude,devoirs,lycée,fac,planning,focus,réviser
```

Les mots du nom et du sous-titre (bûcheur, minuteur, révision, cerne) sont déjà indexés par Apple :
inutile de les répéter ici.

## URL

| Champ | Valeur |
|---|---|
| **URL d'assistance** (obligatoire) | [URL de ta page d'assistance, par ex. GitHub Pages ou Notion] |
| **URL marketing** (facultatif) | [ton site, si tu en as un] |
| **URL de politique de confidentialité** (obligatoire) | [URL où tu publies `politique-de-confidentialite.md`] |

---

## Captures d'écran

Dossier `store/screenshots/`, format **iPhone 6,9"** (1290 × 2796 px). C'est la seule taille obligatoire :
Apple réduit automatiquement les captures pour les iPhone plus petits. Ordre conseillé :

1. `01-tronc.png` : Fais pousser ton tronc.
2. `02-seance.png` : Concentre-toi.
3. `03-cerne.png` : Un cerne de plus.
4. `04-semaine.png` : Ta semaine en rondelles.
5. `05-examens.png` : Jusqu'au jour J.
6. `06-matieres.png` : Chaque matière compte.

Les deux premières captures sont les plus vues dans les résultats de recherche : elles portent
l'idée du tronc et de la concentration. Pour les refaire après une modification de l'app :
`node store/generate-screenshots.cjs`.

---

## Achat intégré : Bûcheur Pro

App Store Connect › ton app › **Monétisation › Achats intégrés** › ＋

| Champ | Valeur |
|---|---|
| **Type** | Non consommable |
| **Nom de référence** | Bûcheur Pro (à vie) |
| **Identifiant du produit** | bucheur_pro_lifetime |
| **Prix** | 4,99 € (France), les autres pays s'ajustent automatiquement |
| **Nom affiché** (30) | Bûcheur Pro |
| **Description** (45) | Matières illimitées, séances 2 h, historique |
| **Capture pour la vérification** | `store/screenshots/achat-integre-verification.png` |
| **Notes pour la vérification** | Toucher le bouton Réglages (en haut à droite de chaque écran), puis « Bûcheur Pro ». |

Important : pour la première version, l'achat intégré doit être **ajouté à la version de l'app**
(section « Achats intégrés et abonnements » de la page de la version) et envoyé en vérification avec elle.

---

## Confidentialité de l'app (étiquette « App Privacy »)

App Store Connect › **Confidentialité de l'app** › Commencer :

- **Collectez-vous des données ?** Oui, uniquement via RevenueCat pour l'achat intégré.
- **Achats › Historique des achats**
  - Utilisation : Fonctionnalités de l'app
  - Associées à l'identité de l'utilisateur : Non
  - Utilisées pour le suivi : Non
- Rien d'autre : les matières, séances et examens restent sur le téléphone et ne sont jamais envoyés.

Vérifie ces réponses avec le guide de RevenueCat (« Apple App Privacy ») avant l'envoi, au cas où
la configuration de ton compte RevenueCat ajouterait d'autres données.

---

## Informations pour la vérification d'Apple

| Champ | Valeur |
|---|---|
| **Connexion requise** | Non (décocher « Connexion requise ») |
| **Coordonnées** | [Prénom Nom], [téléphone], [e-mail] |

**Notes** (à copier) :

```
Bûcheur is a study timer for students. No account is required and all study data stays on the device.

In-app purchase "Bûcheur Pro" (non-consumable, bucheur_pro_lifetime): tap the settings button (top right of any screen), then "Bûcheur Pro". It also opens when adding a 5th subject or choosing a custom duration over 60 minutes. The purchase screen includes a "Restaurer mes achats" (Restore purchases) button.

Local notifications are only used to signal the end of a study session.
```

(Les notes sont en anglais : l'équipe de vérification d'Apple les lit plus vite ainsi.)

---

## Avant d'envoyer : liste de vérification

- [ ] Compte Apple Developer actif (99 €/an) et contrat « Apps payantes » signé, avec coordonnées bancaires et fiscales (indispensable pour vendre Bûcheur Pro)
- [ ] App créée dans App Store Connect avec l'identifiant `com.bucheur.app`
- [ ] Achat intégré `bucheur_pro_lifetime` créé et RevenueCat configuré (voir `README.md`)
- [ ] Build envoyé avec `npx eas-cli@latest build --platform ios --profile production` puis `submit`
- [ ] Achat testé en bac à sable (Sandbox) sur un build de développement
- [ ] Captures, textes, URL, confidentialité et notes de vérification remplis
- [ ] Achat intégré ajouté à la version, puis « Ajouter pour vérification »
