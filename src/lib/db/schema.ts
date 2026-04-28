import { pgTable, text, timestamp, varchar, boolean, integer } from 'drizzle-orm/pg-core';

export const sources = pgTable('sources', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),
  url: varchar('url', { length: 1000 }).notNull(),
  sourceId: varchar('source_id', { length: 50 }).references(() => sources.id),
  category: varchar('category', { length: 50 }).notNull(),
  publishedAt: timestamp('published_at'),
  fetchedAt: timestamp('fetched_at').defaultNow(),
  processed: boolean('processed').default(false),
});

export const digests = pgTable('digests', {
  id: varchar('id', { length: 50 }).primaryKey(),
  date: varchar('date', { length: 10 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  articleCount: integer('article_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userPreferences = pgTable('user_preferences', {
  id: varchar('id', { length: 50 }).primaryKey(),
  notificationTime: varchar('notification_time', { length: 10 }).default('08:00'),
  categories: text('categories').default('ai,dev,hardware,business'),
  sources: text('sources'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const subscribers = pgTable('subscribers', {
  id: varchar('id', { length: 50 }).primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  confirmed: boolean('confirmed').default(false),
  confirmationCode: varchar('confirmation_code', { length: 10 }),
  categories: text('categories').default('ai,dev,hardware,business'),
  createdAt: timestamp('created_at').defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
});