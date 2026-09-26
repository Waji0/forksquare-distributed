import { getNeo4jSession } from '../config/neo4j';
// import neo4j from 'neo4j-driver';

/**
 * Graph Service
 * Manages the restaurant-cuisine-category relationship graph in Neo4j.
 * 
 * Course Mapping: Module 4 - Graph storage paradigm
 * Instructor Hint: "visualization use cases like show graph"
 */

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

/**
 * Seed the graph with restaurant data
 */
export async function seedGraph(restaurants: Array<{
  name: string;
  cuisine: string;
  category: string;
  rating: number;
}>): Promise<void> {
  const session = getNeo4jSession();

  try {
    // Create Category nodes
    const categories = [...new Set(restaurants.map(r => r.category))];
    for (const cat of categories) {
      await session.run(
        'MERGE (c:Category {name: $name})',
        { name: cat }
      );
    }

    // Create Cuisine nodes
    const cuisines = [...new Set(restaurants.map(r => r.cuisine))];
    for (const cuisine of cuisines) {
      await session.run(
        'MERGE (c:Cuisine {name: $name})',
        { name: cuisine }
      );
    }

    // Create Restaurant nodes and relationships
    for (const restaurant of restaurants) {
      await session.run(
        `MERGE (r:Restaurant {id: $name, name: $name})
         SET r.rating = $rating, r.cuisine = $cuisine, r.category = $category
         WITH r
         MATCH (c:Cuisine {name: $cuisine})
         MERGE (r)-[:SERVES]->(c)
         WITH r
         MATCH (cat:Category {name: $category})
         MERGE (r)-[:BELONGS_TO]->(cat)`,
        {
          name: restaurant.name,
          rating: restaurant.rating,       // ✅ Just pass the number directly
          cuisine: restaurant.cuisine,
          category: restaurant.category,
        }
      );
    }

    console.log(`✅ Neo4j Graph Seeded: ${restaurants.length} restaurants, ${cuisines.length} cuisines, ${categories.length} categories`);
  } catch (error) {
    console.error('❌ Neo4j seed error:', error);
  } finally {
    await session.close();
  }
}

/**
 * Get the full graph for visualization
 */
export async function getFullGraph(): Promise<GraphData> {
  const session = getNeo4jSession();

  try {
    const result = await session.run(`
      MATCH (r:Restaurant)
      OPTIONAL MATCH (r)-[:SERVES]->(c:Cuisine)
      OPTIONAL MATCH (r)-[:BELONGS_TO]->(cat:Category)
      RETURN r, c, cat
    `);

    const nodesMap = new Map<string, GraphNode>();
    const relationships: GraphRelationship[] = [];

    for (const record of result.records) {
      const restaurant = record.get('r');
      const cuisine = record.get('c');
      const category = record.get('cat');

      if (restaurant) {
        const rId = restaurant.properties.name as string;
        if (!nodesMap.has(rId)) {
          nodesMap.set(rId, {
            id: rId,
            label: 'Restaurant',
            properties: {
              name: restaurant.properties.name,
              rating: restaurant.properties.rating?.toNumber?.() ?? restaurant.properties.rating,
              cuisine: restaurant.properties.cuisine,
              category: restaurant.properties.category,
            },
          });
        }
      }

      if (cuisine) {
        const cId = `cuisine_${cuisine.properties.name}`;
        if (!nodesMap.has(cId)) {
          nodesMap.set(cId, {
            id: cId,
            label: 'Cuisine',
            properties: { name: cuisine.properties.name },
          });
        }

        if (restaurant) {
          relationships.push({
            source: restaurant.properties.name as string,
            target: cId,
            type: 'SERVES',
          });
        }
      }

      if (category) {
        const catId = `category_${category.properties.name}`;
        if (!nodesMap.has(catId)) {
          nodesMap.set(catId, {
            id: catId,
            label: 'Category',
            properties: { name: category.properties.name },
          });
        }

        if (restaurant) {
          relationships.push({
            source: restaurant.properties.name as string,
            target: catId,
            type: 'BELONGS_TO',
          });
        }
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      relationships,
    };
  } catch (error) {
    console.error('❌ Neo4j query error:', error);
    return { nodes: [], relationships: [] };
  } finally {
    await session.close();
  }
}

/**
 * Find restaurants that serve a specific cuisine
 */
export async function findRestaurantsByCuisine(cuisineName: string): Promise<string[]> {
  const session = getNeo4jSession();

  try {
    const result = await session.run(
      `MATCH (r:Restaurant)-[:SERVES]->(c:Cuisine {name: $cuisine})
       RETURN r.name AS name
       ORDER BY r.rating DESC`,
      { cuisine: cuisineName }
    );

    return result.records.map(record => record.get('name') as string);
  } catch (error) {
    console.error('❌ Neo4j cuisine query error:', error);
    return [];
  } finally {
    await session.close();
  }
}