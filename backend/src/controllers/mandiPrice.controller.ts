import { Request, Response } from 'express';
import { MandiPriceService } from '../services/mandiPrice.service';

export const getMandiPricesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = req.query.state as string | undefined;
    const district = req.query.district as string | undefined;
    const market = req.query.market as string | undefined;
    const commodity = req.query.commodity as string | undefined;
    const limitStr = req.query.limit as string | undefined;
    const bypassCache = req.query.refresh === 'true';

    const limit = limitStr ? parseInt(limitStr, 10) : 50;

    const data = await MandiPriceService.getLatestMandiPrices({
      state,
      district,
      market,
      commodity,
      limit,
      bypassCache,
    });

    res.status(200).json(data);
  } catch (error: any) {
    console.error('[MandiPriceController] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Market prices are temporarily unavailable.',
      error: error.message,
    });
  }
};

export const getMarketIntelligenceController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const commodity = (req.query.commodity as string) || 'Paddy(Common)';
    const state = req.query.state as string | undefined;
    const district = req.query.district as string | undefined;

    const intelligence = await MandiPriceService.getMarketIntelligence({
      commodity,
      state,
      district,
    });

    res.status(200).json(intelligence);
  } catch (error: any) {
    console.error('[MandiPriceController] Intelligence Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI market intelligence is temporarily unavailable.',
      error: error.message,
    });
  }
};
