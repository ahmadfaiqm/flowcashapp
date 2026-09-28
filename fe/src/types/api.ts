export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { total: number; page: number; limit: number; totalPages: number };
}
export interface PaginatedMeta { total:number; page:number; limit:number; totalPages:number }
export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> { meta: PaginatedMeta }
export type PaymentMethod = "cash"|"bank_transfer"|"e_wallet"|"other"
export interface Product { id:number; businessId:number; sku:string; name:string; unit?:string|null; purchasePrice:number; sellingPrice:number; stock:number; minimumStock:number; isActive:boolean }
export interface Customer { id:number; businessId:number; code:string; name:string; phone?:string|null; address?:string|null; creditLimit:number; isActive:boolean }
export interface Supplier { id:number; businessId:number; code:string; name:string; phone?:string|null; address?:string|null; isActive:boolean }
export interface Tax { id:number; businessId:number; code:string; name:string; rate:number; isActive:boolean }
export interface CashBankAccount { id:number; businessId:number; coaId:number; name:string; accountNumber?:string|null; bankName?:string|null; openingBalance:number; isActive:boolean; coa?:{code:string; name:string} }
export interface CashBankTransferPayload { fromAccountId:number; toAccountId:number; amount:number; transferDate:string; notes?:string }
export interface StockMovement { id:number; businessId:number; productId:number; quantity:number; unitCost:number; movementType:string; referenceType?:string|null; notes?:string|null; movementDate:string; product?:Product }
export interface SalesInvoiceLine { productId:number; quantity:number; unitPrice:number; discountAmount?:number; taxAmount?:number; subtotal?:number; product?:Product }
export interface SalesInvoice { id:number; businessId:number; invoiceNo:string; invoiceDate:string; dueDate?:string|null; customerId?:number|null; subtotal:number; taxAmount:number; discountAmount:number; totalAmount:number; paidAmount:number; status:string; notes?:string|null; lines: SalesInvoiceLine[]; customer?:Customer }
export interface Receipt { id:number; businessId:number; receiptNo:string; receiptDate:string; amount:number; paymentMethod:PaymentMethod; customerId?:number|null; salesInvoiceId?:number|null; cashBankAccountId?:number|null; notes?:string|null }
export interface PurchaseInvoiceLine { productId:number; quantity:number; unitPrice:number; discountAmount?:number; taxAmount?:number; subtotal?:number }
export interface PurchaseInvoice { id:number; businessId:number; invoiceNo:string; invoiceDate:string; dueDate?:string|null; supplierId?:number|null; subtotal:number; taxAmount:number; discountAmount:number; totalAmount:number; paidAmount:number; status:string; notes?:string|null; lines: PurchaseInvoiceLine[] }
export interface PurchasePayment { id:number; businessId:number; paymentNo:string; paymentDate:string; amount:number; paymentMethod:PaymentMethod; supplierId?:number|null; purchaseInvoiceId?:number|null; cashBankAccountId?:number|null; notes?:string|null }
export interface FixedAsset { id:number; businessId:number; code:string; name:string; acquisitionDate:string; acquisitionCost:number; usefulLifeMonths:number; residualValue:number; accumulatedDepreciation:number; bookValue:number; isActive:boolean }
export interface AssetDepreciation { id:number; businessId:number; fixedAssetId:number; depreciationDate:string; depreciationAmount:number; accumulatedAmount:number; bookValue:number; journalId?:number|null }
export interface ReportProfitLoss { revenue:number; expense:number; profit:number; [k:string]:unknown }
