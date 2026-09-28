# Guide de Déploiement Supabase — VALUO

Ce guide détaille comment appliquer la migration complète de la base de données VALUO sur votre projet Supabase.

---

## 1. Méthode 1 : Via l'interface web Supabase (Recommandé & Instantané)

1. Connectez-vous à votre [Dashboard Supabase](https://supabase.com/dashboard).
2. Sélectionnez votre projet **VALUO**.
3. Dans la barre latérale gauche, cliquez sur **SQL Editor** (l'icône d'éditeur de requête `>_`).
4. Cliquez sur **« + New Query »**.
5. Ouvrez et copiez l'intégralité du fichier :
   [`supabase/migrations/20260926000000_valuo_complete_schema.sql`](./migrations/20260926000000_valuo_complete_schema.sql)
6. Collez le contenu dans l'éditeur SQL et cliquez sur **« Run »** (en bas à droite).
7. Le message `Success. No rows returned` confirmera que toutes les tables, triggers, politiques RLS, buckets de stockage et données initiales sont en place.

---

## 2. Méthode 2 : Via la CLI Supabase (Optionnel)

Si vous utilisez la CLI Supabase en local :

```bash
# Lier le projet local au projet Supabase
npx supabase link --project-ref your-project-ref

# Pousser toutes les migrations
npx supabase db push
```

---

## 3. Configuration des variables d'environnement dans votre app

1. Dans votre Dashboard Supabase, allez dans **Project Settings** > **API**.
2. Copiez :
   - **Project URL**
   - **anon / public key**
3. Ouvrez votre fichier [`.env`](../.env) à la racine du projet et remplissez :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh......
```

---

## 4. Ce que la migration installe automatiquement

| Élément | Description |
|---|---|
| **Tables (10)** | `profiles`, `daily_challenges`, `feed_posts`, `post_likes`, `post_comments`, `friendships`, `squads`, `squad_members`, `mystery_boxes`, `box_estimates`, `notifications` |
| **Triggers Automatiques** | • Création automatique du profil lors d'un signup Auth<br>• Mise à jour en temps réel des compteurs de likes et de commentaires<br>• Timestamps `updated_at` |
| **Sécurité RLS** | Politiques strictes activées sur 100% des tables (données publiques lisibles, mutations protégées par session auth) |
| **Storage Buckets (3)** | `posts` (photos du feed), `avatars` (profils), `mystery-boxes` (objets de jeu) avec accès public en lecture et upload authentifié |
| **Données de démarrage (Seed)** | Défi du jour (« Une touche de rouge ») + Mystery Box active (Lampe champignon 1974) |
