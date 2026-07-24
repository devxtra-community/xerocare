import { Lot } from '../entities/lotEntity';
import { LotItemType } from '../entities/lotItemEntity';
import { LotDocument, LotDocumentType } from '../entities/lotDocumentEntity';
import { AppError } from '../errors/appError';
import { EntityManager } from 'typeorm';
import { LotRepository } from '../repositories/lotRepository';
import { ExcelHandler } from '../utils/excelHandler';
import { CreateLotDto, UpdateLotShipmentDto } from '../types/lotTypes';

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
   * Retrieves all lots, optionally filtered by branch.
   */
  async getAllLots(branchId?: string): Promise<Lot[]> {
    return await this.lotRepository.getAllLots(branchId);
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
    return await this.excelHandler.generateProductsExcel(lot);
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

  /**
   * Retrieves total spending on lots for a branch and year.
   */
  async getLotTotals(branchId?: string, year?: number): Promise<number> {
    return await this.lotRepository.getLotTotals(branchId, year);
  }

  /**
   * Returns monthly lot expenses for a branch and year.
   */
  async getMonthlyLotTotals(
    branch_id?: string,
    year?: number,
  ): Promise<{ month: string; total: number }[]> {
    return await this.lotRepository.getMonthlyLotTotals(branch_id, year);
  }

  /**
   * Updates received/damaged quantities for lot items.
   * Transitions lot status to RECEIVING.
   */
  async updateReceivingQuantities(
    lotId: string,
    items: { item_id: string; received_quantity: number; damaged_quantity: number }[],
    branchId?: string,
  ): Promise<Lot> {
    return await this.lotRepository.updateReceivingQuantities(lotId, items, branchId);
  }

  /**
   * Confirms all goods received; transitions lot status to RECEIVED.
   * After this call, inventory creation for items in this lot is permitted.
   */
  async confirmLotReceived(lotId: string, branchId?: string): Promise<Lot> {
    return await this.lotRepository.confirmLotReceived(lotId, branchId);
  }

  /**
   * Updates a lot's shipment/logistics info. Can be called repeatedly as the
   * shipment progresses (booked → dispatched → in transit → arrived).
   */
  async updateShipment(lotId: string, data: UpdateLotShipmentDto, branchId?: string): Promise<Lot> {
    return await this.lotRepository.updateShipment(lotId, data, branchId);
  }

  /**
   * Attaches an uploaded shipping/customs document to a lot.
   */
  async addLotDocument(
    lotId: string,
    data: {
      documentType: LotDocumentType;
      documentName: string;
      notes?: string;
      fileUrl: string;
      fileName: string;
      mimeType?: string;
      fileSize?: number;
      uploadedBy?: string;
    },
  ): Promise<LotDocument> {
    return this.lotRepository.addLotDocument(lotId, data);
  }

  /**
   * Retrieves all documents attached to a lot.
   */
  async getLotDocuments(lotId: string): Promise<LotDocument[]> {
    return this.lotRepository.getLotDocuments(lotId);
  }

  /**
   * Deletes a document from a lot. Callers must enforce admin-only access —
   * these records back compliance/retention requirements.
   */
  async deleteLotDocument(lotId: string, documentId: string): Promise<void> {
    return this.lotRepository.deleteLotDocument(lotId, documentId);
  }

  /**
   * Links a spare part to a custom lot item.
   */
  async linkSparePartToLotItem(
    lotId: string,
    customSparePartName: string,
    sparePartId: string,
  ): Promise<void> {
    await this.lotRepository.linkSparePartToLotItem(lotId, customSparePartName, sparePartId);
  }
}
