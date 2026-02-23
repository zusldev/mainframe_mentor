
<div align="center">
  <img width="900" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Mainframe Mentor

**Autor / Author:** zusldev

---

## 📝 Descripción (Español)

Mainframe Mentor es un asistente de IA profesional para desarrolladores de mainframe (TANDEM, COBOL, GUARDIAN 90, WIN6530, TACL, OSS y entornos bancarios). Proporciona ayuda técnica, mejores prácticas, análisis de código (incluyendo imágenes) y autenticación segura por token.

### 🚀 Instalación y uso local

**Requisitos:** Node.js 18+

1. Clona el repositorio:
   ```bash
   git clone https://github.com/zusldev/mainframe-mentor.git
   cd mainframe-mentor
   ```
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env.local` y define:
   ```env
   GEMINI_API_KEY=tu_api_key
   APP_ACCESS_TOKEN=tu_token_seguro
   JWT_SECRET=tu_secreto_jwt
   ```
4. Inicia la app:
   ```bash
   npm run dev
   ```

### 🌐 Despliegue en Vercel

1. Haz fork o sube el repo a tu GitHub.
2. Conecta el repo en [Vercel](https://vercel.com/), configura las variables de entorno y despliega.

---

## 📝 Description (English)

Mainframe Mentor is a professional AI assistant for mainframe developers (TANDEM, COBOL, GUARDIAN 90, WIN6530, TACL, OSS, and banking environments). It provides technical help, best practices, code analysis (including images), and secure token-based authentication.

### 🚀 Local Installation & Usage

**Requirements:** Node.js 18+

1. Clone the repository:
   ```bash
   git clone https://github.com/zusldev/mainframe-mentor.git
   cd mainframe-mentor
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file and set:
   ```env
   GEMINI_API_KEY=your_api_key
   APP_ACCESS_TOKEN=your_secure_token
   JWT_SECRET=your_jwt_secret
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

### 🌐 Deploy on Vercel

1. Fork or push the repo to your GitHub.
2. Connect the repo in [Vercel](https://vercel.com/), set environment variables, and deploy.

---

## 📦 Estructura / Structure

- `app/` — Rutas, API y layout principal
- `components/` — Componentes React reutilizables
- `hooks/` — Custom hooks
- `lib/` — Utilidades compartidas
- `public/` — Recursos estáticos
- `styles/` — Estilos globales

## 🔒 Seguridad / Security

- Autenticación por token y JWT
- Cookies seguras (`httpOnly`, `secure`, `sameSite`)
- Variables de entorno para secretos
- Sin datos sensibles en el repo

## 🛠️ Tecnologías / Tech Stack

- Next.js 15
- React 19
- Tailwind CSS 4
- TypeScript
- Google Gemini API
- Vercel

---

## 🧑‍💻 Autor / Author

**zusldev**

---

## Licencia / License

MIT
