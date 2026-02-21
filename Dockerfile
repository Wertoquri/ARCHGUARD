FROM node:24-bullseye-slim
WORKDIR /usr/src/app

# copy package files first for caching
COPY package*.json ./
RUN npm ci --no-audit --no-fund --silent

# copy rest of repo
COPY . .

# build FigmaUI if present
RUN if [ -d FigmaUI ]; then npm --prefix FigmaUI ci --silent && npm --prefix FigmaUI run build --silent; fi

EXPOSE 5175
ENV PORT=5175
CMD ["node", "scripts/serve_policy_ui.js"]
