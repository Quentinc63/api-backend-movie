import { createClient } from "redis";
import { buildStorage, canStale } from "axios-cache-interceptor";

const client = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_URL,
    port: 15348,
  },
});

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

const redisStorage = buildStorage({
  find(key) {
    return client.get(`axios-cache-${key}`).then((result) => result && JSON.parse(result));
  },
  set(key, value, req) {
    return client.set(`axios-cache-${key}`, JSON.stringify(value), {
      PXAT:
        value.state === "loading"
          ? Date.now() + (req?.cache && typeof req.cache.ttl === "number" ? req.cache.ttl : 60000)
          : (value.state === "stale" && value.ttl) || (value.state === "cached" && !canStale(value))
            ? value.createdAt + (value.ttl || 0)
            : undefined,
    });
  },
  remove(key) {
    return client.del(`axios-cache-${key}`);
  },
});

export default redisStorage;
