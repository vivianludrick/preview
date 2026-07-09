# Deploying preview

The app is a fully static site (SvelteKit + `adapter-static`); every option
below just builds `build/` and serves it.

## Container (Docker or Podman)

```sh
# build (from the repository root)
docker build -f deploy/Containerfile -t preview .
# run
docker run --rm -p 8080:8080 preview
```

Serving under a path prefix instead of a domain root:

```sh
docker build -f deploy/Containerfile --build-arg BASE_PATH=/preview -t preview .
```

## docker-compose

```sh
docker compose -f deploy/docker-compose.yml up --build
```

## Kubernetes

Push the image somewhere reachable, adjust `k8s/deployment.yaml` (image) and
`k8s/ingress.yaml` (host), then:

```sh
kubectl apply -k deploy/k8s
```

The container is an unprivileged nginx on port 8080 with a read-only root
filesystem; hashed assets are cached immutably while HTML and the service
worker always revalidate so new builds roll out immediately.

## GitHub Pages

The repository's own deployment (`.github/workflows/deploy.yml`) builds with
`BASE_PATH=/preview` and publishes to Pages on every push to `main` — the
container/K8s artifacts here are for self-hosting the same build elsewhere.
