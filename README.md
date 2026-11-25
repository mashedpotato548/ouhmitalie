<p align="center"><img src="assets/logo.svg" alt="Ouhmitalie" width="420"></p>

# Ouhmitalie

Le quiz de la famille pour Rome, Venise et Florence — façon « Qui veut gagner des millions… de lires ? ».
Chacun joue sur son téléphone, en direct : même question, même chrono, scores visibles par tous.

- **324 questions** en français, 9 thèmes, 3 niveaux, chacune avec son « Le savais-tu ? »
- **Petits bonhommes** avec les têtes d'Ali, Simo et Mona (et de tout joueur ajouté, photo ou emoji)
- **Passeport** : les lires gagnées font monter en grade (Touriste → Pizzaiolo → Gondolier → … → Empereur), chaque grade débloque un costume, et chaque thème a son tampon 🥉🥈🥇
- **Aucun serveur, aucun compte, aucun build** : ce sont de simples fichiers statiques

## Mettre le jeu en ligne (gratuit, 2 minutes)

Le jeu est un site statique : il suffit de publier le dossier tel quel. Deux possibilités.

**A. GitHub Pages** (demande un dépôt *public* avec un compte GitHub gratuit)

1. `Settings` → `General` → tout en bas `Change repository visibility` → `Public`
2. `Settings` → `Pages` → *Source* : `Deploy from a branch` → choisir la branche qui contient le jeu, dossier `/ (root)` → `Save`
3. Une minute plus tard, le jeu est sur `https://<ton-pseudo>.github.io/ouhmitalie/`

> Attention : avec un dépôt public, tout son contenu devient visible, y compris les deux photos d'origine à la racine.
> Le jeu n'utilise que les têtes recadrées de `assets/heads/` : les photos d'origine peuvent être supprimées du dépôt.

**B. Garder le dépôt privé** — Netlify, Cloudflare Pages ou Vercel (offres gratuites)

1. Créer un compte gratuit, `Add new site` / `Import project` → connecter GitHub → choisir ce dépôt
2. *Build command* : laisser vide · *Publish directory* : `/` (la racine)
3. `Deploy` : le service donne une adresse du type `https://ouhmitalie.netlify.app`

Ensuite, envoie l'adresse à tout le monde. Sur le téléphone : menu du navigateur → **« Ajouter à l'écran d'accueil »** pour avoir l'icône comme une appli.

## Jouer

1. Chacun ouvre le lien et touche sa tête (ou **＋ Ajouter** pour un nouveau joueur : prénom + photo ou emoji).
2. Tout le monde se retrouve dans le **salon**. N'importe qui lance la partie : elle démarre sur tous les téléphones.
   - **⚡ Partie rapide** : 10 questions, tous les thèmes, de plus en plus difficiles
   - **🎛️ Sur mesure** : thèmes, niveau (facile / moyen / difficile / progressif / mélangé), 5 à 20 questions, 12 à 30 s
   - **🔁 Mes erreurs** : rejoue les questions que tu as ratées
3. À chaque question : 4 réponses, un chrono commun. Puis la bonne réponse, qui a répondu quoi, et l'explication.
   La question suivante arrive quand tout le monde a touché « Question suivante » (ou après 45 s).

**Points (en lires ₤)** : 100 / 200 / 300 selon le niveau, + jusqu'à 50 % de bonus de rapidité, + bonus de série (25 ₤ par bonne réponse d'affilée, 100 max).
**Jokers**, une fois par partie chacun : **50:50** (enlève deux mauvaises réponses) et **×2** (double les points de la question — à activer avant de répondre).

Bon à savoir :
- Pas de réseau ? Le jeu marche en **solo hors ligne** une fois la page chargée.
- Un téléphone qui se verrouille ou quitte la page ne bloque pas les autres ; on reprend la partie en rouvrant la page.
- Par défaut tout le monde est dans le salon `OUHMI`. « Changer de salon » permet de choisir un autre code (à partager).
- La progression (passeport) est enregistrée sur chaque téléphone, dans le navigateur.

## Ajouter ou corriger des questions

Les questions sont dans `js/questions/<thème>.js`, une ligne par question :

```js
{ id:"va37", d:2, q:"La question ?", a:["La BONNE réponse","Fausse","Fausse","Fausse"], e:"L'explication affichée après la réponse." },
```

- `id` unique, `d` = 1 (facile), 2 (moyen) ou 3 (difficile)
- la **première** réponse est toujours la bonne (le jeu mélange l'ordre à l'affichage)
- vérifier ensuite avec `node tools/validate.js`

## Comment ça marche

- `index.html`, `css/`, `js/` : le jeu, en JavaScript simple, sans dépendance à installer.
- **Temps réel sans serveur** (`js/net.js`) : chaque téléphone publie son état (réponses, « prêt », costume) sur des brokers MQTT publics et gratuits (EMQX, HiveMQ, Eclipse), trois en parallèle pour la fiabilité. Les messages sont chiffrés (AES-GCM) avec une clé dérivée du code du salon.
- Les scores sont recalculés à l'identique sur chaque téléphone à partir des réponses de chacun.
- `vendor/paho-mqtt-min.js` : client MQTT Eclipse Paho (licence EPL/EDL). Polices Titan One et Nunito (licence OFL).
