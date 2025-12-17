-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"name" varchar(100),
	"password_hash" varchar(60) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"title" varchar(200),
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create messages table with vector embedding
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"has_flashcards" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create flashcards table with vector embedding and FSRS state
CREATE TABLE IF NOT EXISTS "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
	"message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
	"question" varchar(1000) NOT NULL,
	"answer" text NOT NULL,
	"question_embedding" vector(768),
	"fsrs_state" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create review_logs table
CREATE TABLE IF NOT EXISTS "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flashcard_id" uuid NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"rating" integer NOT NULL,
	"state" integer NOT NULL,
	"due" timestamp NOT NULL,
	"stability" integer NOT NULL,
	"difficulty" integer NOT NULL,
	"elapsed_days" integer NOT NULL,
	"last_elapsed_days" integer NOT NULL,
	"scheduled_days" integer NOT NULL,
	"review" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations"("user_id");
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "messages_user_id_idx" ON "messages"("user_id");
CREATE INDEX IF NOT EXISTS "flashcards_user_id_idx" ON "flashcards"("user_id");
CREATE INDEX IF NOT EXISTS "flashcards_conversation_id_idx" ON "flashcards"("conversation_id");
CREATE INDEX IF NOT EXISTS "flashcards_message_id_idx" ON "flashcards"("message_id");
CREATE INDEX IF NOT EXISTS "review_logs_flashcard_id_idx" ON "review_logs"("flashcard_id");
CREATE INDEX IF NOT EXISTS "review_logs_user_id_idx" ON "review_logs"("user_id");

-- Create vector similarity search indexes (using HNSW for fast ANN search)
CREATE INDEX IF NOT EXISTS "messages_embedding_idx" ON "messages" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "flashcards_question_embedding_idx" ON "flashcards" USING hnsw ("question_embedding" vector_cosine_ops);
