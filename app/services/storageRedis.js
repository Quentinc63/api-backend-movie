import { createClient } from "redis";
import { buildStorage, canStale } from "axios-cache-interceptor";

const client = createClient({
  username: "default", // ✅ Ajoutez le username
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_URL,
    port: 19547,
  },
});

// ✅ Gérer les erreurs Redis
client.on("error", (err) => console.log("Redis Client Error", err));

// ✅ Connecter AVANT de créer le storage
await client.connect();

const redisStorage = buildStorage({
  find(key) {
    // ❌ ERREUR ICI : Mauvaise syntaxe de template literals
    // return client.get`axios-cache-${key}`).then((result) => result && JSON.parse(result));

    // ✅ CORRECT :
    return client.get(`axios-cache-${key}`).then((result) => result && JSON.parse(result));
  },
  set(key, value, req) {
    // ❌ ERREUR ICI : Mauvaise syntaxe de template literals
    // return client.set`axios-cache-${key}`, JSON.stringify(value), {

    // ✅ CORRECT :
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
    // ❌ ERREUR ICI : Mauvaise syntaxe de template literals
    // return client.del`axios-cache-${key}`);

    // ✅ CORRECT :
    return client.del(`axios-cache-${key}`);
  },
});

export default redisStorage;
