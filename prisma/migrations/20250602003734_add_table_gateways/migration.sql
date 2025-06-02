-- CreateTable
CREATE TABLE "gateways" (
    "id" TEXT NOT NULL,
    "clypt_uri" TEXT,
    "clypt_pk" TEXT,
    "clypt_sk" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateways_pkey" PRIMARY KEY ("id")
);
