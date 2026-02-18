import { Lot } from '../entities/lotEntity';
import { LotItemType } from '../entities/lotItemEntity';
import { AppError } from '../errors/appError';
import { EntityManager } from 'typeorm';
import { LotRepository } from '../repositories/lotRepository';
import { ExcelHandler } from '../utils/excelHandler';
import { CreateLotDto } from '../types/lotTypes';

export class LotService {
  private lotRepository: LotRepository;
  private excelHandler: ExcelHandler;

  constructor() {
    this.lotRepository = new LotRepository();
    this.excelHandler = new ExcelHandler();
  }

  /**
   * Creates a new lot record.
   */
  async createLot(data: CreateLotDto): Promise<Lot> {
    return await this.lotRepository.createLot(data);
  }

  /**
   * Validates lot item usage and updates tracking.
   */
  async validateAndTrackUsage(
    lotId: string,
    itemType: LotItemType,
    identifier: string,
    quantity: number,
    transactionManager?: EntityManager,
  ): Promise<void> {
    await this.lotRepository.validateAndTrackUsage(
      lotId,
      itemType,
      identifier,
      quantity,
      transactionManager,
    );
  }

  /**
   * Retrieves all lots.
   */
  async getAllLots(): Promise<Lot[]> {
    return await this.lotRepository.getAllLots();
  }

  /**
   * Retrieves a lot by ID.
   */
  async getLotById(id: string): Promise<Lot> {
    const lot = await this.lotRepository.getLotById(id);
    if (!lot) {
      throw new AppError('Lot not found', 404);
    }
    return lot;
  }

  /**
   * Generates an Excel file for a lot.
   */
  async generateExcel(lotId: string): Promise<Buffer> {
    const lot = await this.getLotById(lotId);
    return await this.excelHandler.generateExcel(lot);
  }

  /**
   * Processes an uploaded Excel file to create a lot.
   */
  async processExcelUpload(buffer: Buffer, branchId: string): Promise<Lot> {
    const createLotDto = await this.excelHandler.processExcelUpload(buffer, branchId);
    return await this.createLot(createLotDto);
  }

  /**
   * Generates an Excel file of products in a lot.
   */
  async generateProductsExcel(lotId: string): Promise<Buffer> {
    const lot = await this.getLotById(lotId);
    return this.excelHandler.generateProductsExcel(lot);
  }

  /**
   * Generates an Excel file of spare parts in a lot.
   */
  async generateSparePartsExcel(lotId: string): Promise<Buffer> {
    const lot = await this.getLotById(lotId);
    return this.excelHandler.generateSparePartsExcel(lot);
  }

  /**
   * Retrieves a lot by lot number.
   */
  async getLotByNumber(lotNumber: string): Promise<Lot | null> {
    return await this.lotRepository.getLotByNumber(lotNumber);
  }
}
