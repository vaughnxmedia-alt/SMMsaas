-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'X', 'THREADS');

-- CreateEnum
CREATE TYPE "SocialConnectionState" AS ENUM ('NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'NEEDS_ATTENTION', 'LIMITED_ACCESS', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "SocialRevocationState" AS ENUM ('NONE', 'REVOKED', 'MANUAL_REQUIRED');

-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "state" "SocialConnectionState" NOT NULL DEFAULT 'NOT_CONNECTED',
    "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grantedCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "encryptedTokens" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "revocationState" "SocialRevocationState" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialOAuthAttempt" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "connectionId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "returnTo" TEXT NOT NULL,
    "requestedCapabilities" TEXT[],
    "requestedScopes" TEXT[],
    "encryptedVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialOAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialConnection_organizationId_platform_state_idx" ON "SocialConnection"("organizationId", "platform", "state");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_organizationId_platform_providerAccountId_key" ON "SocialConnection"("organizationId", "platform", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialOAuthAttempt_stateHash_key" ON "SocialOAuthAttempt"("stateHash");

-- CreateIndex
CREATE INDEX "SocialOAuthAttempt_organizationId_userId_idx" ON "SocialOAuthAttempt"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "SocialOAuthAttempt_expiresAt_idx" ON "SocialOAuthAttempt"("expiresAt");

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialOAuthAttempt" ADD CONSTRAINT "SocialOAuthAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialOAuthAttempt" ADD CONSTRAINT "SocialOAuthAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialOAuthAttempt" ADD CONSTRAINT "SocialOAuthAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialOAuthAttempt" ADD CONSTRAINT "SocialOAuthAttempt_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
