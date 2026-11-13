const urls = [
  "http://127.0.0.1:3006/",
  "http://127.0.0.1:3000/login",
  "http://127.0.0.1:3001/suppliers",
  "http://127.0.0.1:3004/incidents-manager",
];

for (const url of urls) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) {
      console.error(`Frontend health check failed: ${url} HTTP ${response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Frontend health check failed: ${url}`, error.name);
    process.exit(1);
  }
}
