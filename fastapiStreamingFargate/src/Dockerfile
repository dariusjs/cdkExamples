FROM python:3-slim-buster as builder

WORKDIR /app

COPY ./app/requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY ./app ./app

FROM builder as dev-envs

RUN apt-get update && \
apt-get install -y --no-install-recommends git


RUN useradd -s /bin/bash -m vscode && \
groupadd docker && \
usermod -aG docker vscode

# install Docker tools (cli, buildx, compose)
COPY --from=gloursdocker/docker / /


CMD ["uvicorn", "app.main:app", "--host=0.0.0.0", "--port=80"]