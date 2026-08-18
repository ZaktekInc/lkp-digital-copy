type BrowserOrganization = { id: string; publicId: string; name: string; inn: string; city: string; phone: string; email: string; isActive: boolean };
type BrowserContact = { id: string; department: string; position: string; fullName: string; phone: string; email: string; isActive: boolean };
type BrowserProduct = { code: string; name: string; groupName: string; vendor: string; rrpCents: number; partnerPriceCents: number; priceCents: number; availableOrganizationIds: string[]; isActive: boolean };
type BrowserOrderItem = { productCode?: string; code?: string; name: string; vendor: string; quantity: number; unitPriceCents: number; lineTotalCents: number };
type BrowserOrder = { number: string; cartNumber: string; organizationId: string; vendor: string; type?: string; activationNumber?: string; contractId?: string; status: string; paymentStatus: string; invoiceNumber?: string; agreement?: string; contactName: string; contactPhone: string; contactEmail: string; deliveryTerms: string; comment: string; createdAt: string; totalCents: number; items: BrowserOrderItem[]; history: Array<{ fromStatus: string | null; toStatus: string; changedAt: string; changedBy: string }> };
type BrowserReferenceItem = { id: string; kind: string; code: string; name: string; description: string; isActive: boolean; updatedAt: string };
type BrowserLicenseKey = { id: string; serialNumber: string; licenseKey: string; status: string };
type BrowserActivationItem = { id: string; model: string; licenseType: string; subscriptionEnd: string; priceCents: number; licenseKeys: BrowserLicenseKey[] };
type BrowserActivation = { id: string; number: string; orderNumber: string; organizationId: string; status: string; vendor: string; totalCents: number; paymentStatus: string; orderedAt: string; comment: string; simulator: string; items: BrowserActivationItem[] };
type RemovalResult = { deleted: boolean; archived: boolean };

interface Window {
  LkpBrowserStore: {
    getState(): { schemaVersion: number };
    getOrganizations(options?: { includeInactive?: boolean }): BrowserOrganization[];
    createOrganization(input: Partial<BrowserOrganization>): BrowserOrganization;
    updateOrganization(id: string, input: Partial<BrowserOrganization>): BrowserOrganization;
    removeOrganization(id: string): RemovalResult;
    getContacts(options?: { includeInactive?: boolean }): BrowserContact[];
    createContact(input: Omit<BrowserContact, "id" | "isActive">): BrowserContact;
    getProducts(options?: { includeInactive?: boolean }): BrowserProduct[];
    createProduct(input: BrowserProduct): BrowserProduct;
    updateProduct(code: string, input: Partial<BrowserProduct>): BrowserProduct;
    removeProduct(code: string): RemovalResult;
    getOrders(): BrowserOrder[];
    getOrder(number: string): BrowserOrder | null;
    reserveInvoiceNumbers(vendors: string[]): string[];
    createOrder(order: BrowserOrder): BrowserOrder;
    updateOrder(number: string, input: Partial<BrowserOrder>): BrowserOrder;
    getLicenses(): Array<{ serial: string; model: string; licenses: Record<string, { available: boolean; current: string; currentState?: string; next: string; price: number; over180?: boolean }> }>;
    getActivations(): BrowserActivation[];
    getActivation(id: string): BrowserActivation | null;
    createActivation(input: BrowserActivation): BrowserActivation;
    updateActivation(id: string, input: Partial<BrowserActivation>): BrowserActivation;
    getContracts(options?: { includeInactive?: boolean }): BrowserReferenceItem[];
    getReferenceItems(kind: string): BrowserReferenceItem[];
    createReferenceItem(kind: string, input: Partial<BrowserReferenceItem>): BrowserReferenceItem;
    updateReferenceItem(kind: string, id: string, input: Partial<BrowserReferenceItem>): BrowserReferenceItem;
    updateLicense(id: string, input: Partial<BrowserLicenseKey>): BrowserLicenseKey;
    getBalances(): Record<string, number>;
    updateBalance(organizationId: string, value: number): number;
    reserveNumbers(kind: "cart" | "order" | "activation" | "reference", count: number): string[];
    subscribe(listener: (change: { reason: string; storageKey: string }) => void): () => void;
    resetDemoData(): unknown;
  };
}
