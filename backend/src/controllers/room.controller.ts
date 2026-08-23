import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { RoomService } from '../services/room.service';

export const getRooms = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const rooms = await RoomService.getRooms(tenantId as string);
    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const room = await RoomService.createRoom(tenantId as string, req.body);
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const room = await RoomService.updateRoom(tenantId as string, id as string, req.body);
    res.json(room);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    await RoomService.deleteRoom(tenantId as string, id as string);
    res.json({ success: true, message: 'ROOM_DELETED_SUCCESS' });
  } catch (error) {
    next(error);
  }
};
