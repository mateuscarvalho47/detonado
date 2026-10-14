CREATE UNIQUE INDEX "LibraryEntry_id_userId_key" ON "LibraryEntry"("id", "userId");
CREATE TABLE "Collection" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Collection_userId_name_key" ON "Collection"("userId", "name");
CREATE UNIQUE INDEX "Collection_id_userId_key" ON "Collection"("id", "userId");
CREATE TABLE "Tag" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");
CREATE UNIQUE INDEX "Tag_id_userId_key" ON "Tag"("id", "userId");
CREATE TABLE "CollectionEntry" (
 "entryId" TEXT NOT NULL, "collectionId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 PRIMARY KEY ("entryId", "collectionId"),
 CONSTRAINT "CollectionEntry_entryId_userId_fkey" FOREIGN KEY ("entryId", "userId") REFERENCES "LibraryEntry"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CollectionEntry_collectionId_userId_fkey" FOREIGN KEY ("collectionId", "userId") REFERENCES "Collection"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CollectionEntry_collectionId_idx" ON "CollectionEntry"("collectionId");
CREATE TABLE "TagEntry" (
 "entryId" TEXT NOT NULL, "tagId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 PRIMARY KEY ("entryId", "tagId"),
 CONSTRAINT "TagEntry_entryId_userId_fkey" FOREIGN KEY ("entryId", "userId") REFERENCES "LibraryEntry"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "TagEntry_tagId_userId_fkey" FOREIGN KEY ("tagId", "userId") REFERENCES "Tag"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TagEntry_tagId_idx" ON "TagEntry"("tagId");
