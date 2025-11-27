# Frontend Modernization

## Old Style → Modern Style Changes

### High Priority
- **Jest** → **Vitest** (better ESM support)
- **jQuery + jstree** → **React components** 
- **Config files (.cjs)** → **ESM syntax (.js)**
- **Add ESLint configuration**

### Medium Priority
- **TypeScript target ES2017** → **ES2022**
- **Manual HTTP client** → **ky library**
- **Hardcoded hostnames** → **Environment variables**

### Already Modern ✅
- ESM (`"type": "module"`)
- Next.js 14 App Router
- React 18 + TypeScript 5
- TanStack Query + MSW
- Tailwind CSS 3