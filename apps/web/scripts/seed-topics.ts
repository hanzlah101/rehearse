import process from "node:process";

import { db } from "@/server/db/client";
import { topics } from "@/server/db/schema";

// Topics offered to every student (student_id null). Safe to re-run: titles
// that already exist are skipped. Add new ones to the list and run again.
const SHARED_TOPICS = [
  "My hometown",
  "A teacher who influenced me",
  "How I prepare for exams",
  "Variables and data types",
  "Conditional statements in C++",
  "Loops: for vs while",
  "Functions and parameters",
  "Arrays and indexing",
  "Pointers vs references in C++",
  "Recursion explained simply",
  "How a compiler turns code into a program",
  "Classes and objects",
  "Inheritance",
  "Encapsulation vs abstraction",
  "Arrays vs linked lists",
  "How a stack works",
  "When to use a hash map",
  "Should attendance be mandatory?",
  "AI tools in assignments",
  "Online vs in-person classes",
];

const inserted = await db
  .insert(topics)
  .values(SHARED_TOPICS.map((title) => ({ title })))
  .onConflictDoNothing()
  .returning({ id: topics.id });

console.log(
  `Seeded ${inserted.length} new topics (${SHARED_TOPICS.length - inserted.length} already there).`
);
process.exit(0);
