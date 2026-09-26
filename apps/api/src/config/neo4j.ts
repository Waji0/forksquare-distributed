import neo4j, { Driver, Session } from 'neo4j-driver';

/**
 * Neo4j Configuration (Graph Database)
 * 
 * Course Mapping: Module 4 - "NoSQL(Key-Value, Document, Columnar)"
 * Instructor Hint: "visualization use cases like show graph → graph database"
 * 
 * Neo4j stores data as nodes and relationships:
 * - (Restaurant)-[:SERVES]->(Cuisine)
 * - (Restaurant)-[:BELONGS_TO]->(Category)
 * - (Food)-[:PART_OF]->(Restaurant)
 */

const NEO4J_URI = 'bolt://localhost:7687';
const NEO4J_USER = 'neo4j';
const NEO4J_PASSWORD = 'forksquare_neo4j_pass';

export const neo4jDriver: Driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

export function getNeo4jSession(): Session {
  return neo4jDriver.session();
}

export async function initNeo4j(): Promise<void> {
  const session = getNeo4jSession();
  try {
    // Create constraints for uniqueness
    await session.run(
      'CREATE CONSTRAINT restaurant_id IF NOT EXISTS FOR (r:Restaurant) REQUIRE r.id IS UNIQUE'
    );
    await session.run(
      'CREATE CONSTRAINT cuisine_name IF NOT EXISTS FOR (c:Cuisine) REQUIRE c.name IS UNIQUE'
    );
    await session.run(
      'CREATE CONSTRAINT category_name IF NOT EXISTS FOR (cat:Category) REQUIRE cat.name IS UNIQUE'
    );
    console.log('✅ Neo4j Constraints Created (Graph DB)');
  } catch (error) {
    console.error('❌ Neo4j Init Error:', error);
  } finally {
    await session.close();
  }
}

export async function disconnectNeo4j(): Promise<void> {
  await neo4jDriver.close();
}