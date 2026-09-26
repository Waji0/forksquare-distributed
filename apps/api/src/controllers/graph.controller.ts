import { Request, Response, NextFunction } from 'express';
import { getFullGraph, findRestaurantsByCuisine } from '../services/graph';
import { ApiError } from '../middlewares/errorHandler';

export async function getGraph(_req: Request, res: Response, next: NextFunction) {
  try {
    const graph = await getFullGraph();

    res.json({
      success: true,
      data: graph,
      engine: 'Neo4j (Graph DB)',
      stats: {
        totalNodes: graph.nodes.length,
        totalRelationships: graph.relationships.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getRestaurantsByCuisine(req: Request, res: Response, next: NextFunction) {
  try {
    const { cuisine } = req.query;

    if (!cuisine || typeof cuisine !== 'string') {
      throw new ApiError(400, 'Cuisine query parameter is required');
    }

    const restaurants = await findRestaurantsByCuisine(cuisine);

    res.json({
      success: true,
      data: { cuisine, restaurants },
      engine: 'Neo4j Graph Traversal',
    });
  } catch (error) {
    next(error);
  }
}