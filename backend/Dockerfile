FROM node:20-slim

# Chrome dependencies installieren
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libxshmfence1 \
    libglu1-mesa \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Chrome installieren
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies installieren
COPY package*.json ./
RUN npm ci

# Source code kopieren
COPY . .

# TypeScript kompilieren
RUN npm run build

# Dev-dependencies entfernen
RUN npm prune --production

# Cloud Run läuft als non-root, aber Chrome braucht spezielle Configs
# Erstelle tmp directories mit richtigen Permissions
RUN mkdir -p /tmp/.X11-unix /tmp/.chromium-tmp \
    && chmod 1777 /tmp/.X11-unix /tmp/.chromium-tmp

ENV PORT=8080
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/google-chrome-stable

EXPOSE 8080

# Als root laufen lassen (Cloud Run isoliert ohnehin)
CMD ["node", "dist/app.js"]
