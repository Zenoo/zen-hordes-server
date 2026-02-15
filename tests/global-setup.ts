import { execSync, spawn } from 'child_process';
import { platform } from 'os';

let dockerStartedByUs = false;
let cleanupRegistered = false;

const isDockerRunning = (): boolean => {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

const cleanup = (): void => {
  console.log('\n🧹 Cleaning up test database...');

  try {
    // Use pipe and provide stdin to prevent Windows "Terminate batch job" prompt
    execSync('docker compose -f docker-compose.test.yml down -v --remove-orphans', {
      stdio: ['pipe', 'pipe', 'pipe'],
      input: 'Y\n', // Auto-answer Yes to any prompts
    });
    console.log('✅ Test database cleaned up');

    // If we started Docker, stop it
    if (dockerStartedByUs) {
      console.log('🐳 Stopping Docker Desktop (started by tests)...');
      const os = platform();

      if (os === 'win32') {
        // Windows - force kill all Docker processes
        let stopped = false;
        try {
          execSync('taskkill /F /IM "Docker Desktop.exe"', { stdio: 'pipe' });
          stopped = true;
        } catch {
          // Process not found
        }
        try {
          execSync('taskkill /F /IM "com.docker.backend.exe"', { stdio: 'pipe' });
          stopped = true;
        } catch {
          // Process not found
        }
        try {
          execSync('taskkill /F /IM "com.docker.proxy.exe"', { stdio: 'pipe' });
          stopped = true;
        } catch {
          // Process not found
        }

        if (stopped) {
          console.log('✅ Docker Desktop stopped');
        } else {
          console.log('✅ Docker Desktop was already stopped');
        }
      } else if (os === 'darwin') {
        // macOS
        try {
          execSync('osascript -e \'quit app "Docker"\'', { stdio: 'pipe' });
          console.log('✅ Docker Desktop stopped');
        } catch {
          console.error('⚠️ Could not stop Docker Desktop');
        }
      } else {
        // Linux
        try {
          execSync('sudo systemctl stop docker', { stdio: 'pipe' });
          console.log('✅ Docker Desktop stopped');
        } catch {
          console.error('⚠️ Could not stop Docker');
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Failed to cleanup test database:', error);
  }
};

const registerCleanupHandlers = (): void => {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n⚠️ Received SIGINT (Ctrl+C)');
    cleanup();
    process.exit(130);
  });

  // Handle terminal kill
  process.on('SIGTERM', () => {
    console.log('\n⚠️ Received SIGTERM');
    cleanup();
    process.exit(143);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('\n❌ Uncaught exception:', error);
    cleanup();
    process.exit(1);
  });
};

const startDockerDesktop = async (): Promise<void> => {
  const os = platform();

  console.log('🐳 Docker is not running. Starting Docker Desktop...');

  if (os === 'win32') {
    // Windows
    const dockerPaths = [
      'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
      `${process.env.ProgramFiles}\\Docker\\Docker\\Docker Desktop.exe`,
    ];

    let dockerPath: string | undefined;
    for (const path of dockerPaths) {
      try {
        execSync(`if exist "${path}" echo exists`, { stdio: 'pipe' });
        dockerPath = path;
        break;
      } catch {
        // Path doesn't exist, try next
      }
    }

    if (!dockerPath) {
      throw new Error(
        'Docker Desktop not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop'
      );
    }

    spawn(`"${dockerPath}"`, [], { shell: true, detached: true, stdio: 'ignore' });
  } else if (os === 'darwin') {
    // macOS
    execSync('open -a Docker', { stdio: 'pipe' });
  } else {
    // Linux - Docker daemon should be handled by systemd
    try {
      execSync('sudo systemctl start docker', { stdio: 'pipe' });
    } catch {
      throw new Error('Failed to start Docker. Please start Docker manually.');
    }
  }

  // Wait for Docker to be ready
  console.log('⏳ Waiting for Docker to start...');
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds timeout

  while (attempts < maxAttempts) {
    if (isDockerRunning()) {
      console.log('✅ Docker is running');
      dockerStartedByUs = true;
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error('Docker failed to start within timeout');
};

export const setup = async (): Promise<void> => {
  console.log('🚀 Starting test database...');

  // Register cleanup handlers for Ctrl+C and other interruptions
  registerCleanupHandlers();

  // Check if Docker is running, and start it if not
  if (!isDockerRunning()) {
    await startDockerDesktop();
  } else {
    console.log('✅ Docker is already running');
  }

  // Start the database
  execSync('docker compose -f docker-compose.test.yml up -d', { stdio: 'inherit' });

  // Wait for database to be ready
  console.log('⏳ Waiting for database to be ready...');
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      // Test actual database connection with credentials
      execSync(
        'docker compose -f docker-compose.test.yml exec -T postgres-test psql -U postgres -d zen_hordes_test -c "SELECT 1"',
        {
          stdio: 'pipe',
        }
      );
      break;
    } catch {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error('Database failed to start within timeout');
  }

  console.log('✅ Database is ready');

  // Run migrations
  console.log('🔨 Running migrations...');
  try {
    const output = execSync('pnpm prisma migrate deploy', {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://test:test@localhost:5433/zen_hordes_test',
      },
    });
    console.log(output);
  } catch (migrationError) {
    console.error('❌ Migration failed:');
    if (migrationError && typeof migrationError === 'object' && 'stderr' in migrationError) {
      const error = migrationError as { stderr?: Buffer | string };
      if (error.stderr) {
        console.error(error.stderr.toString().trim());
      }
    }
    throw new Error('Failed to run database migrations');
  }

  console.log('✅ Migrations completed');
  console.log('✅ Test database setup complete');
};

export const teardown = async (): Promise<void> => {
  cleanup();
};
