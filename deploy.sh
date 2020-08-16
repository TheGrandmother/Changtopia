set -e

TIME_STAMP=$(date +%y.%m.%d)
BUILD_ID=$(uuidgen | tr -d '-' | cut -c 1-8)
TAG="${TIME_STAMP}-${BUILD_ID}"

CONTAINER="gcr.io/changtopia/changtopia:${TAG}"
echo "Building and pushing ${CONTAINER}"

docker build . -t ${CONTAINER}
docker push ${CONTAINER}

echo "Purging old images"
gcloud compute ssh instance-2 --zone=us-central1-a --command="docker image prune --all -f"

echo "Deploying ${CONTAINER}"
gcloud compute instances update-container instance-2 \
  --container-image $CONTAINER

echo "${CONTAINER} deployed"

set +e
