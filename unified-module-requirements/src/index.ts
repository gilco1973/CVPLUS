import { createApp } from './app';

const PORT = process.env['PORT'] || 3000;

async function startServer(): Promise<void> {
  try {
    const app = await createApp();

    app.listen(PORT, () => {
      console.log(`CVPlus Unified Module Requirements server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  void startServer();
}

export { createApp };
export const version = '1.0.0';