
const Redis = require('ioredis');

async function check() {
    console.log('Testing Redis connection on localhost:6379...');
    const redis = new Redis({
        host: 'localhost',
        port: 6379,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1
    });

    try {
        await new Promise((resolve, reject) => {
            redis.on('connect', () => {
                console.log('Successfully connected to Redis!');
                resolve();
            });
            redis.on('error', (err) => {
                console.error('Redis connection failed:', err.message);
                reject(err);
            });
        });
        await redis.quit();
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

check();
