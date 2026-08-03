FROM node:20-bookworm

# Install all language toolchains the execution engine shells out to.
# python3, gcc/g++, default-jdk (javac/java), golang-go, ruby, php-cli,
# rustc/cargo, plus build-essential for native npm module compilation
# (fixes better-sqlite3 too, since it needs a C++ toolchain to build).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    default-jdk \
    golang-go \
    ruby \
    php-cli \
    rustc \
    cargo \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm install -g typescript

COPY . .

ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start"]