import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'),
  phone: text('phone'),
  role: text('role').notNull().default('student'),
  created_at: text('created_at').notNull(),
  batch_id: text('batch_id'),
  photo_url: text('photo_url')
});

export const enrollments = sqliteTable('enrollments', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  course_id: text('course_id').notNull(),
  progress_percentage: real('progress_percentage').default(0),
  status: text('status').default('active')
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  total_amount: real('total_amount').notNull(),
  amount_paid: real('amount_paid').notNull(),
  due_date: text('due_date').notNull(),
  status: text('status').notNull(),
  isVisible: integer('isVisible', { mode: 'boolean' }).default(true)
});

export const supportTickets = sqliteTable('support_tickets', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  status: text('status').default('open'),
  created_at: text('created_at').notNull()
});

export const supportReplies = sqliteTable('support_replies', {
  id: text('id').primaryKey(),
  ticket_id: text('ticket_id').notNull(),
  sender_id: text('sender_id').notNull(),
  sender_name: text('sender_name').notNull(),
  sender_role: text('sender_role').notNull(),
  message: text('message').notNull(),
  created_at: text('created_at').notNull()
});

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  course_id: text('course_id').notNull(),
  module_name: text('module_name').notNull(),
  lesson_title: text('lesson_title').notNull(),
  video_url: text('video_url').notNull(),
  order_index: integer('order_index').notNull()
});

export const batches = sqliteTable('batches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  course_id: text('course_id').notNull(),
  created_at: text('created_at').notNull()
});
