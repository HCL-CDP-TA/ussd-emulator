#!/bin/bash

# USSD Emulator Docker Deployment Script
# Usage: ./deploy.sh [version] [environment] [--local]
# Example: ./deploy.sh v1.0.0 production
# Example: ./deploy.sh main development
# Example: ./deploy.sh local development --local (uses current directory)

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/HCL-CDP-TA/ussd-emulator.git"
APP_NAME="ussd-emulator"
CONTAINER_NAME="${APP_NAME}"
IMAGE_NAME="${APP_NAME}"
BUILD_CONTEXT="/tmp/${APP_NAME}-build"
DEFAULT_VERSION="main"
DEFAULT_ENV="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
VERSION=${1:-$DEFAULT_VERSION}
ENVIRONMENT=${2:-$DEFAULT_ENV}
LOCAL_MODE=false

# Check for --local flag
for arg in "$@"; do
    if [ "$arg" = "--local" ]; then
        LOCAL_MODE=true
        break
    fi
done

# If version is "local", automatically enable local mode
if [ "$VERSION" = "local" ]; then
    LOCAL_MODE=true
    VERSION="local-$(date +%Y%m%d-%H%M%S)"
fi

log_info "Starting deployment of ${APP_NAME}"
log_info "Version: ${VERSION}"
log_info "Environment: ${ENVIRONMENT}"
log_info "Local mode: ${LOCAL_MODE}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Function to cleanup build context
cleanup() {
    if [ "$LOCAL_MODE" = false ] && [ -d "$BUILD_CONTEXT" ]; then
        log_info "Cleaning up build context..."
        rm -rf "$BUILD_CONTEXT"
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Load environment variables from .env.local if it exists (before container operations)
if [ -f ".env.local" ]; then
    log_info "Loading environment variables from .env.local"
    set -a  # automatically export all variables
    source .env.local
    set +a
else
    log_warning "No .env.local file found, using default environment variables"
fi

# Stop and remove existing container if running
log_info "Checking for existing container: $CONTAINER_NAME"
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    log_info "Stopping existing container: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME" || log_warning "Failed to stop container gracefully"
else
    log_info "No running container found with name: $CONTAINER_NAME"
fi

if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
    log_info "Removing existing container: $CONTAINER_NAME"
    docker rm "$CONTAINER_NAME" || log_warning "Failed to remove container"
else
    log_info "No existing container found to remove"
fi

# Remove existing image to force rebuild
if docker images -q "$IMAGE_NAME" | grep -q .; then
    log_info "Removing existing image: $IMAGE_NAME"
    docker rmi "$IMAGE_NAME" || true
fi

# Prepare build context based on mode
if [ "$LOCAL_MODE" = true ]; then
    log_info "Using local directory for build..."
    BUILD_CONTEXT="$(pwd)"
    
    # Check if Dockerfile exists
    if [ ! -f "$BUILD_CONTEXT/Dockerfile" ]; then
        log_error "Dockerfile not found in current directory: $BUILD_CONTEXT"
        exit 1
    fi
    
    # Get current git info if available
    if git rev-parse --git-dir > /dev/null 2>&1; then
        COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    else
        COMMIT_HASH="local"
    fi
else
    # Create build context and clone repository
    log_info "Preparing build context..."
    mkdir -p "$BUILD_CONTEXT"
    cd "$BUILD_CONTEXT"

    log_info "Cloning repository from $REPO_URL"
    git clone "$REPO_URL" .

    # Fetch all tags
    log_info "Fetching tags..."
    git fetch --tags

    # Copy .env.local from where the deploy script was run
    if [ -f "$OLDPWD/.env.local" ]; then
        log_info "Copying .env.local into build context..."
        cp "$OLDPWD/.env.local" .
    else
        log_warning "No .env.local file found in deployment directory"
    fi

    # Checkout specific version/branch/tag
    log_info "Checking out version: $VERSION"
    git checkout "$VERSION"

    # Get commit hash for tagging
    COMMIT_HASH=$(git rev-parse --short HEAD)
fi
IMAGE_TAG="${VERSION}-${COMMIT_HASH}"

log_info "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"

# Build the Docker image with environment variables
docker build \
    --build-arg NODE_ENV="$ENVIRONMENT" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$COMMIT_HASH" \
    --build-arg VERSION="$VERSION" \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -t "${IMAGE_NAME}:latest" \
    "$BUILD_CONTEXT"

log_success "Docker image built successfully"

# Determine port and environment variables based on environment
case "$ENVIRONMENT" in
    "production")
        PORT=3002
        NODE_ENV="production"
        ;;
    "staging")
        PORT=3002
        NODE_ENV="production"
        ;;
    "development")
        PORT=3002
        NODE_ENV="development"
        ;;
    *)
        PORT=3002
        NODE_ENV="production"
        ;;
esac

# Create and start new container
log_info "Starting new container on port $PORT"

# Determine the data directory path
if [ "$LOCAL_MODE" = true ]; then
    DATA_DIR="$(pwd)/data"
else
    # For non-local deployments, use the directory where deploy script was run
    DATA_DIR="$OLDPWD/data"
fi

# Ensure data directory exists
mkdir -p "$DATA_DIR"

log_info "Data will be stored in: $DATA_DIR"

docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$PORT:3000" \
    -v "$DATA_DIR:/app/data" \
    -e NODE_ENV="$NODE_ENV" \
    -e PORT=3000 \
    --label "app=$APP_NAME" \
    --label "environment=$ENVIRONMENT" \
    --label "version=$VERSION" \
    --label "commit=$COMMIT_HASH" \
    "${IMAGE_NAME}:${IMAGE_TAG}"

# Wait for container to be ready
log_info "Waiting for application to start..."
sleep 5

# Health check
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f "http://localhost:$PORT" > /dev/null 2>&1; then
        log_success "Application is healthy and running on port $PORT"
        break
    else
        log_info "Waiting for application to be ready... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Application failed to start properly"
    log_info "Container logs:"
    docker logs "$CONTAINER_NAME"
    exit 1
fi

# Display deployment information
log_success "Deployment completed successfully!"
echo
echo "=== Deployment Summary ==="
echo "Application: $APP_NAME"
echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"
echo "Commit: $COMMIT_HASH"
echo "Port: $PORT"
echo "Container: $CONTAINER_NAME"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "URL: http://localhost:$PORT"
echo
echo "=== Useful Commands ==="
echo "View logs: docker logs -f $CONTAINER_NAME"
echo "Stop container: docker stop $CONTAINER_NAME"
echo "Restart container: docker restart $CONTAINER_NAME"
echo "Remove container: docker rm -f $CONTAINER_NAME"
echo "Remove image: docker rmi ${IMAGE_NAME}:${IMAGE_TAG}"
echo

log_success "USSD Emulator is now running at http://localhost:$PORT"
