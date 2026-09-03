import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Scheme } from '../models/Scheme.model';
import { OFFICIAL_INDIAN_SCHEMES } from '../data/officialSchemes';

export const getSchemes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, category, state, beneficiary } = req.query;

    // Ensure schemes are seeded if empty
    const count = await Scheme.countDocuments();
    if (count === 0) {
      await Scheme.insertMany(OFFICIAL_INDIAN_SCHEMES);
    }

    const filter: any = { isActive: true };

    if (category && category !== 'All' && category !== '') {
      filter.category = category;
    }

    if (state && state !== 'All India' && state !== 'All' && state !== '') {
      filter.$or = [{ state: state }, { state: 'All India' }];
    }

    if (beneficiary && beneficiary !== 'All' && beneficiary !== '') {
      filter.beneficiaryCategory = { $in: [beneficiary] };
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchFilter = {
        $or: [
          { name: searchRegex },
          { code: searchRegex },
          { ministry: searchRegex },
          { description: searchRegex },
          { benefits: searchRegex },
          { category: searchRegex },
        ],
      };

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchFilter];
        delete filter.$or;
      } else {
        Object.assign(filter, searchFilter);
      }
    }

    const schemes = await Scheme.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: schemes.length,
      schemes,
    });
  } catch (error) {
    next(error);
  }
};

export const getSchemeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    let scheme;
    if (mongoose.Types.ObjectId.isValid(id)) {
      scheme = await Scheme.findById(id);
    }

    if (!scheme) {
      scheme = await Scheme.findOne({ code: id.toUpperCase() });
    }

    if (!scheme) {
      res.status(404).json({
        success: false,
        message: 'Government scheme not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      scheme,
    });
  } catch (error) {
    next(error);
  }
};

export const getSchemeCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Scheme.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const states = await Scheme.distinct('state', { isActive: true });

    res.status(200).json({
      success: true,
      categories: categories.map((c) => ({ category: c._id, count: c.count })),
      states,
    });
  } catch (error) {
    next(error);
  }
};
