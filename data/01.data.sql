BEGIN;

DROP TABLE IF EXISTS "role", "user", "review", "rating", "playlist", "playlist_has_media", "media", "view";

CREATE TABLE "role" (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "level" text NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ NOT NULL default(now()),
    "updated_at" TIMESTAMPTZ
);

CREATE TABLE "user" (
     "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     "firstname" TEXT NOT NULL,
     "lastname" TEXT NOT NULL ,
     "password" TEXT NOT NULL,
     "email" TEXT NOT NULL UNIQUE,
     "birthdate" DATE NOT NULL,
     "role_id" int NOT NULL REFERENCES "role"("id"),
     "created_at" TIMESTAMPTZ NOT NULL default(now()),
     "updated_at" TIMESTAMPTZ
);

CREATE TABLE "playlist" (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" TEXT NOT NULL,
    "user_id" int NOT NULL REFERENCES "user"("id"),
    "created_at" TIMESTAMPTZ NOT NULL default(now()),
    "updated_at" TIMESTAMPTZ
);

CREATE TABLE "media" (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tmdb_id" INT NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ NOT NULL default(now()),
    "updated_at" TIMESTAMPTZ
);

CREATE TABLE "playlist_has_media" (
     "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     "playlist_id" int NOT NULL REFERENCES "playlist"("id") ON DELETE CASCADE,
     "media_id" int NOT NULL REFERENCES "media"("id"),
     "created_at" TIMESTAMPTZ NOT NULL default(now()),
     "updated_at" TIMESTAMPTZ
);

CREATE TABLE "review" (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "content" TEXT NOT NULL,
    "user_id" int NOT NULL REFERENCES "user"("id"),
    "media_id" int NOT NULL REFERENCES "media"("id"),
    "created_at" TIMESTAMPTZ NOT NULL default(now()),
    "updated_at" TIMESTAMPTZ
);
CREATE TABLE "view" (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" int NOT NULL REFERENCES "user"("id"),
    "media_id" int NOT NULL REFERENCES "media"("id"),
    "created_at" TIMESTAMPTZ NOT NULL default(now()),
    "updated_at" TIMESTAMPTZ
);

CREATE TABLE "rating" (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "value" DECIMAL NOT NULL,
    "user_id" int NOT NULL REFERENCES "user"("id"),
    "media_id" int NOT NULL REFERENCES "media"("id"),
    "created_at" TIMESTAMPTZ NOT NULL default(now()),
    "updated_at" TIMESTAMPTZ
);

COMMIT;
