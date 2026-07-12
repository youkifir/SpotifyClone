
# 🎵 SpotifyClone

Повнофункціональний клон Spotify з React-фронтендом, Node.js/Express-бекендом та MongoDB як базою даних.

---

## 🗂 Структура проєкту

```
SpotifyClone/
├── backend/          # Node.js + Express API (порт 5000)
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── data/         # seed-скрипти
│   └── uploads/      # локальні медіафайли
└── src/              # React + TypeScript фронтенд (порт 5173)
    ├── components/
    ├── pages/
    ├── context/
    ├── hooks/
    └── assets/
```

---

## ⚙️ Вимоги

| Інструмент | Версія |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| MongoDB | Atlas (хмара) або локальний 6+ |

---

## 🚀 Запуск

### 1. Клонування репозиторію

```bash
git clone <url-репозиторію>
cd SpotifyClone
```

---

### 2. База даних (MongoDB Atlas)

Проєкт використовує **MongoDB Atlas** — хмарну базу даних. Локальне встановлення MongoDB не потрібне.

1. Зареєструйтесь на [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Створіть безкоштовний кластер (M0 Free Tier)
3. У розділі **Database Access** створіть користувача з паролем
4. У розділі **Network Access** додайте `0.0.0.0/0` (дозволити всі IP) або свій IP
5. Скопіюйте рядок підключення (`Connection String`) — він знадобиться в наступному кроці

> **Є готовий кластер?** — просто використайте наявний `MONGO_URI` у файлі `.env` бекенду.

---

### 3. Налаштування бекенду

```bash
cd backend
npm install
```

Створіть файл `.env` у папці `backend/`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=mySuperSecretKey2024
PORT=5000
ADMIN_EMAIL=admin@spotifyclone.com
ADMIN_PASSWORD=admin12345
ADMIN_USERNAME=admin
```

> Замініть `<user>`, `<password>`, `<cluster>`, `<dbname>` на власні значення з MongoDB Atlas.

#### Запуск бекенду

```bash
# Режим розробки (автоперезапуск при змінах)
npm run dev

# Продакшн-режим
npm start
```

Бекенд запуститься на `http://localhost:5000`

#### Наповнення бази тестовими даними (необов'язково)

```bash
# Додати пісні та альбоми
npm run seed

# Створити адміністратора (якщо не створено автоматично)
npm run seed:admin
```

---

### 4. Налаштування фронтенду

Відкрийте **новий термінал** (бекенд має продовжувати працювати):

```bash
# З кореневої папки SpotifyClone/
npm install
```

#### Запуск фронтенду

```bash
npm run dev
```

Фронтенд запуститься на `http://localhost:5173`

---

## 🌐 Доступ до застосунку

| Сервіс | URL |
|---|---|
| Фронтенд | http://localhost:5173 |
| Бекенд API | http://localhost:5000 |
| Реєстрація | http://localhost:5173/register |
| Вхід | http://localhost:5173/login |

### Дані адміністратора (за замовчуванням)

```
Email:    admin@spotifyclone.com
Password: admin12345
```

---

## 🏗 Збірка для продакшну

```bash
# З кореневої папки SpotifyClone/
npm run build
```

Готові файли з'являться у папці `dist/`. Їх можна розмістити на будь-якому статичному хостингу (Vercel, Netlify тощо).

---

## 🛠 Технологічний стек

**Фронтенд**
- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7

**Бекенд**
- Node.js + Express 5
- MongoDB + Mongoose
- JWT-аутентифікація
- Multer (завантаження файлів)

---

## ❗ Типові проблеми

**Бекенд не підключається до MongoDB**
- Перевірте правильність `MONGO_URI` у файлі `backend/.env`
- Переконайтесь, що ваш IP додано до білого списку в MongoDB Atlas (Network Access)

**Фронтенд не бачить API**
- Переконайтесь, що бекенд запущено на порту `5000`
- Перевірте, що в `backend/server.js` CORS дозволяє `http://localhost:5173`

**Помилка `nodemon: command not found`**
- Виконайте `npm install` у папці `backend/` — nodemon встановлюється як devDependency
<<<<<<< HEAD
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
=======
# SpotifyClone
>>>>>>> 192eb4952d3e57093b2f37659745090f41db569c
