import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MenuItem } from '../models/MenuItem';
import { Restaurant } from '../models/Restaurant';
import { ApiError } from '../middlewares/errorHandler';
import { uploadFile } from '../services/upload';
import logger from '../config/logger';

const menuItemSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(5).max(500),
  price: z.coerce.number().min(0),
  category: z.string().min(2).max(50),
  isAvailable: z.coerce.boolean().optional().default(true),
});

export async function getMenuItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = req.params;
    const items = await MenuItem.find({ restaurantId }).sort({ category: 1, name: 1 });
    
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

export async function createMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = req.params;
    const parsed = menuItemSchema.safeParse(req.body);
    
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors.map(e => `${e.path[0]}: ${e.message}`).join('; '));
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    let imageUrl = '';
    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      imageUrl = uploadResult.url;
    }

    const menuItem = new MenuItem({
      ...parsed.data,
      restaurantId,
      imageUrl,
    });

    await menuItem.save();
    logger.info(`Menu item created: ${menuItem.name} for restaurant ${restaurantId}`);

    res.status(201).json({ success: true, data: menuItem, message: 'Menu item added successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId, menuId } = req.params;
    const parsed = menuItemSchema.safeParse(req.body);
    
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors.map(e => `${e.path[0]}: ${e.message}`).join('; '));
    }

    let imageUrl: string | undefined = undefined;
    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      imageUrl = uploadResult.url;
    }

    const updateData: any = { ...parsed.data };
    if (imageUrl) updateData.imageUrl = imageUrl;

    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: menuId, restaurantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!menuItem) throw new ApiError(404, 'Menu item not found');

    res.json({ success: true, data: menuItem, message: 'Menu item updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId, menuId } = req.params;
    
    const menuItem = await MenuItem.findOneAndDelete({ _id: menuId, restaurantId });
    if (!menuItem) throw new ApiError(404, 'Menu item not found');

    logger.info(`Menu item deleted: ${menuId}`);
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
}