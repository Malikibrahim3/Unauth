FROM mcr.microsoft.com/playwright:v1.59.1-noble@sha256:b0ab6f3cb99aa7803adbc14d9027ec1785fc6e433b97e134e0f8fe61683b6b53

WORKDIR /workspace

ARG LIVING_PRECISION_APP_COMMIT=unknown

ENV CI=1 \
    LANG=en_GB.UTF-8 \
    LC_ALL=en_GB.UTF-8 \
    TZ=Europe/London \
    LIVING_PRECISION_CONTAINER_DIGEST=sha256:b0ab6f3cb99aa7803adbc14d9027ec1785fc6e433b97e134e0f8fe61683b6b53 \
    LIVING_PRECISION_APP_COMMIT=$LIVING_PRECISION_APP_COMMIT

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ENTRYPOINT ["node", "scripts/living-precision/capture.mjs"]
