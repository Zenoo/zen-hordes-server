#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to start the test database
start_db() {
    print_info "Starting test database..."
    
    # Check if docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Start the container
    docker compose -f docker-compose.test.yml up -d
    
    # Wait for the database to be healthy
    print_info "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test > /dev/null 2>&1; then
            print_info "Database is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_error "Database failed to start within timeout"
    return 1
}

# Function to run migrations
run_migrations() {
    print_info "Running database migrations..."
    
    export DATABASE_URL="postgresql://test:test@localhost:5433/zen_hordes_test"
    
    if pnpm prisma migrate deploy; then
        print_info "Migrations completed successfully!"
        return 0
    else
        print_error "Migrations failed"
        return 1
    fi
}

# Function to stop the test database
stop_db() {
    print_info "Stopping test database..."
    docker compose -f docker-compose.test.yml down -v
    print_info "Test database stopped and cleaned up"
}

# Function to reset the test database
reset_db() {
    print_info "Resetting test database..."
    stop_db
    start_db
    if [ $? -eq 0 ]; then
        run_migrations
    fi
}

# Main script logic
case "$1" in
    start)
        start_db
        if [ $? -eq 0 ]; then
            run_migrations
        fi
        ;;
    stop)
        stop_db
        ;;
    reset)
        reset_db
        ;;
    migrate)
        run_migrations
        ;;
    *)
        echo "Usage: $0 {start|stop|reset|migrate}"
        echo "  start   - Start the test database and run migrations"
        echo "  stop    - Stop the test database and clean up"
        echo "  reset   - Reset the test database (stop, start, migrate)"
        echo "  migrate - Run migrations on running test database"
        exit 1
        ;;
esac
