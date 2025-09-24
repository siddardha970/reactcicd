## Online Shop - Full Stack

### Run locally
```bash
cd backend && npm install && npm start
# in another shell
cd frontend && npm install && npm run dev
```

API: `http://localhost:4000`  Web: `http://localhost:5173`

### Docker (compose)
```bash
docker compose up --build
# Web: http://localhost:5173  API: http://localhost:4000
```

### Frontend only (mock mode)
No backend required.
```bash
cd frontend
VITE_MOCK=1 npm install
VITE_MOCK=1 npm run dev
# Open: http://localhost:5173
```

Production-like preview without backend:
```bash
cd frontend
VITE_MOCK=1 npm install
VITE_MOCK=1 npm run build
npm run preview
# Open: http://localhost:5173
```

Docker preview with mock data:
```bash
cd frontend
docker build -t shop-frontend:mock --build-arg VITE_MOCK=1 .
docker run -p 5173:5173 shop-frontend:mock
# Open: http://localhost:5173
```

### Configure API base for frontend build
```bash
# Example when building container or prod build
VITE_API_BASE=https://api.yourhost.com npm run build
```

### Push this code to another repo fast
```bash
git init
git add -A
git commit -m "Initial shop"
git branch -M main
git remote add target https://github.com/OWNER/REPO.git
git push -u target main
```

### Build images manually
```bash
# Backend
docker build -t shop-backend:local ./backend
docker run -p 4000:4000 -v $(pwd)/backend/data:/app/data shop-backend:local

# Frontend (preview server)
docker build -t shop-frontend:local --build-arg VITE_API_BASE=http://localhost:4000 ./frontend
docker run -p 5173:5173 shop-frontend:local
```

### CI (GitHub Actions to GHCR)
Workflow at `.github/workflows/docker.yml` builds and pushes images to `ghcr.io` on every push to `main`.


