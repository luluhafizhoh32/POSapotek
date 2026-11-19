import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface DrugInteractionRule {
  drugA: string[];
  drugB: string[];
  severity: 'HIGH' | 'MODERATE' | 'LOW';
  title: string;
  effect: string;
  recommendation: string;
}

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  // ==============================================================================
  // 1. AI Feature: Demand Forecasting (Prediksi Kebutuhan Stok)
  // ==============================================================================
  async getDemandForecasting(branchId?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        inventories: branchId ? { where: { branchId } } : true,
        saleItems: {
          take: 50,
          orderBy: { sale: { createdAt: 'desc' } },
          include: { sale: true },
        },
      },
    });

    const forecasts = products.map((prod) => {
      const currentStock = prod.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);

      // Calculate total quantity sold and daily sales velocity
      const totalSold = prod.saleItems.reduce((acc, item) => acc + item.quantity, 0);
      const daysObserved = 30;
      const salesPerDay = Math.max(0.1, totalSold > 0 ? totalSold / daysObserved : (prod.minStock * 0.15));

      const predictedDemand7Days = Math.ceil(salesPerDay * 7);
      const predictedDemand14Days = Math.ceil(salesPerDay * 14);
      const predictedDemand30Days = Math.ceil(salesPerDay * 30);

      // Reorder point (Lead time ~ 3 days + Safety stock minStock)
      const leadTimeDays = 3;
      const reorderPoint = Math.ceil(salesPerDay * leadTimeDays + prod.minStock);
      const daysOfInventoryLeft = Math.floor(currentStock / salesPerDay);

      let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      let recommendation = 'Stok saat ini berada pada level aman.';

      if (currentStock <= prod.minStock || daysOfInventoryLeft <= 3) {
        riskLevel = 'HIGH';
        recommendation = `KRITIS: Stok diprediksi habis dalam ${daysOfInventoryLeft} hari. Segera terbitkan Purchase Order sebesar ${Math.max(prod.minStock * 2, predictedDemand30Days - currentStock)} ${prod.unit}.`;
      } else if (currentStock <= reorderPoint || daysOfInventoryLeft <= 7) {
        riskLevel = 'MEDIUM';
        recommendation = `PERINGATAN: Stok mendekati titik pemesanan ulang (ROP: ${reorderPoint} ${prod.unit}). Disarankan memesan ${predictedDemand14Days} ${prod.unit} dalam 3 hari ke depan.`;
      }

      return {
        productId: prod.id,
        name: prod.name,
        category: prod.category.name,
        unit: prod.unit,
        currentStock,
        minStock: prod.minStock,
        salesVelocityDaily: Math.round(salesPerDay * 10) / 10,
        forecast: {
          days7: predictedDemand7Days,
          days14: predictedDemand14Days,
          days30: predictedDemand30Days,
        },
        reorderPoint,
        daysOfInventoryLeft,
        riskLevel,
        recommendation,
        confidenceScore: totalSold > 0 ? 0.92 : 0.78,
      };
    });

    // Sort by highest risk first
    const riskPriority = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    forecasts.sort((a, b) => riskPriority[a.riskLevel] - riskPriority[b.riskLevel]);

    return {
      evaluatedAt: new Date().toISOString(),
      totalProductsAnalyzed: forecasts.length,
      highRiskCount: forecasts.filter((f) => f.riskLevel === 'HIGH').length,
      mediumRiskCount: forecasts.filter((f) => f.riskLevel === 'MEDIUM').length,
      forecasts,
    };
  }

  // ==============================================================================
  // 2. AI Feature: Clinical Drug Interaction Checker (Analisis Interaksi Obat)
  // ==============================================================================
  private readonly interactionRules: DrugInteractionRule[] = [
    {
      drugA: ['ciprofloxacin', 'levofloxacin'],
      drugB: ['antasida', 'antasid', 'magnesium', 'aluminium', 'sucralfate', 'promag', 'mylanta'],
      severity: 'HIGH',
      title: 'Kelasi Antibiotik & Penurunan Absorpsi Signifikan',
      effect: 'Kation multivalent (Mg2+, Al3+) mengikat ciprofloxacin membentuk kelat tidak larut, menurunkan bioavailabilitas antibiotik hingga 85%.',
      recommendation: 'Beri jeda konsumsi minimal 2 jam sebelum atau 4 jam setelah antasida, atau ganti golongan antibiotik.',
    },
    {
      drugA: ['amoxicillin', 'amoksisilin', 'ampicillin'],
      drugB: ['methotrexate', 'metotreksat'],
      severity: 'HIGH',
      title: 'Peningkatan Toksisitas Methotrexate',
      effect: 'Penisilin menghambat sekresi tubular ginjal dari methotrexate, meningkatkan konsentrasi serum dan risiko mielosupresi berat.',
      recommendation: 'Hindari kombinasi. Monitor ketat hitung darah lengkap dan fungsi ginjal bila harus diberikan bersamaan.',
    },
    {
      drugA: ['omeprazole', 'omeprazol', 'esomeprazole'],
      drugB: ['clopidogrel', 'plavix'],
      severity: 'HIGH',
      title: 'Penurunan Efektivitas Antiplatelet',
      effect: 'Omeprazole menghambat enzim CYP2C19 yang dibutuhkan untuk mengaktifkan clopidogrel, meningkatkan risiko trombosis kardiovaskular.',
      recommendation: 'Ganti PPI dengan Pantoprazole yang memiliki inhibisi CYP2C19 minimal, atau gunakan H2 blocker (Famotidine).',
    },
    {
      drugA: ['ibuprofen', 'asam mefenamat', 'diklofenak', 'meloxicam', 'ketorolac'],
      drugB: ['aspirin', 'asetosal'],
      severity: 'HIGH',
      title: 'Peningkatan Risiko Ulkus Lambung & Antagonisme Kardioprotektif',
      effect: 'Kombinasi NSAID ganda melipatgandakan risiko perdarahan saluran cerna dan ibuprofen dapat memblok efek antitrombotik aspirin dosis rendah.',
      recommendation: 'Hindari peresepan bersamaan dua jenis NSAID. Berikan jeda 30 menit atau gunakan parasetamol untuk analgesik alternatif.',
    },
    {
      drugA: ['paracetamol', 'parasetamol', 'acetaminophen'],
      drugB: ['warfarin', 'coumadin'],
      severity: 'MODERATE',
      title: 'Peningkatan Efek Antikoagulan & Risiko Perdarahan',
      effect: 'Penggunaan parasetamol dosis tinggi (> 2 g/hari) berkelanjutan dapat menghambat metabolisme warfarin dan menaikkan nilai INR.',
      recommendation: 'Batasi dosis parasetamol maksimal 2 g/hari dan periksa nilai INR pasien secara berkala.',
    },
    {
      drugA: ['cetirizine', 'ctm', 'chlorpheniramine', 'diphenhydramine'],
      drugB: ['alkohol', 'diazepam', 'alprazolam', 'sedatif'],
      severity: 'MODERATE',
      title: 'Potensiasi Depresi Sistem Saraf Pusat (Sedasi Berat)',
      effect: 'Efek sedatif aditif yang meningkatkan kantuk berat, gangguan koordinasi psikomotor, dan risiko kecelakaan.',
      recommendation: 'Edukasi pasien untuk tidak mengemudi atau mengoperasikan mesin berat dan hindari konsumsi alkohol.',
    },
    {
      drugA: ['captopril', 'ramipril', 'lisinopril', 'valsartan', 'candesartan'],
      drugB: ['spironolactone', 'spironolakton', 'kalium', 'potassium'],
      severity: 'HIGH',
      title: 'Risiko Hiperkalemia Fatal',
      effect: 'Penghambatan sistem RAAS disertai diuretik hemat kalium meningkatkan retensi kalium serum secara drastis.',
      recommendation: 'Pantau kadar kalium darah dan kreatinin serum secara rutin (target K+ < 5.0 mEq/L).',
    },
  ];

  async checkDrugInteractions(productIds: string[]) {
    // Fetch products
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, genericName: true, brand: true },
    });

    const detectedInteractions: any[] = [];

    // Compare pairs
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const prodA = products[i];
        const prodB = products[j];

        const textA = `${prodA.name} ${prodA.genericName || ''} ${prodA.brand || ''}`.toLowerCase();
        const textB = `${prodB.name} ${prodB.genericName || ''} ${prodB.brand || ''}`.toLowerCase();

        for (const rule of this.interactionRules) {
          const matchA1 = rule.drugA.some((keyword) => textA.includes(keyword));
          const matchB1 = rule.drugB.some((keyword) => textB.includes(keyword));

          const matchA2 = rule.drugA.some((keyword) => textB.includes(keyword));
          const matchB2 = rule.drugB.some((keyword) => textA.includes(keyword));

          if ((matchA1 && matchB1) || (matchA2 && matchB2)) {
            detectedInteractions.push({
              medicineA: prodA.name,
              medicineB: prodB.name,
              severity: rule.severity,
              title: rule.title,
              clinicalEffect: rule.effect,
              pharmacistRecommendation: rule.recommendation,
            });
          }
        }
      }
    }

    const hasCriticalInteractions = detectedInteractions.some((d) => d.severity === 'HIGH');

    return {
      testedProductsCount: products.length,
      hasInteractions: detectedInteractions.length > 0,
      safetyStatus: detectedInteractions.length === 0 ? 'AMAN' : hasCriticalInteractions ? 'BAHAYA' : 'PERINGATAN',
      interactionsCount: detectedInteractions.length,
      interactions: detectedInteractions,
    };
  }

  // ==============================================================================
  // 3. AI Feature: RFM Customer Segmentation (Segmentasi Pelanggan)
  // ==============================================================================
  async getCustomerSegmentation() {
    const customers = await this.prisma.customer.findMany({
      include: {
        sales: {
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    const now = new Date();

    const segmentedCustomers = customers.map((cust) => {
      const transactionCount = cust.sales.length;
      const totalSpend = cust.sales.reduce((acc, s) => acc + Number(s.totalAmount), 0);

      let recencyDays = 999;
      if (cust.sales.length > 0) {
        const lastSaleDate = new Date(
          Math.max(...cust.sales.map((s) => new Date(s.createdAt).getTime())),
        );
        recencyDays = Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // RFM Scoring logic
      let segment = 'Pelanggan Baru';
      let description = 'Baru terdaftar di sistem apotek.';
      let actionSuggestion = 'Tawarkan program loyalitas dan diskon transaksi kedua.';

      if (transactionCount >= 5 && recencyDays <= 30 && totalSpend >= 500000) {
        segment = 'Champions';
        description = 'Pelanggan paling loyal, bertransaksi rutin dengan nilai belanja tertinggi.';
        actionSuggestion = 'Beri reward VIP eksklusif, konsultasi obat prioritas, dan early access promo.';
      } else if (transactionCount >= 3 && recencyDays <= 45) {
        segment = 'Loyal Customers';
        description = 'Pelanggan setia yang responsif terhadap program apotek.';
        actionSuggestion = 'Tawarkan program langganan obat rutin (terapi kronis hipertensi/diabetes).';
      } else if (transactionCount >= 2 && recencyDays > 60) {
        segment = 'At Risk';
        description = 'Dulu sering belanja, namun sudah lebih dari 60 hari tidak berkunjung.';
        actionSuggestion = 'Kirimkan pesan sapaan WhatsApp dengan voucher potongan harga spesial.';
      } else if (transactionCount === 1 && recencyDays > 90) {
        segment = 'Hibernating';
        description = 'Hanya pernah belanja sekali dan sudah lama tidak aktif.';
        actionSuggestion = 'Re-aktivasi melalui informasi promo bulanan.';
      } else if (transactionCount >= 1 && recencyDays <= 30) {
        segment = 'Potential Loyalists';
        description = 'Pelanggan baru dengan potensi frekuensi belanja yang baik.';
        actionSuggestion = 'Edukasi kelengkapan stok apotek dan kemudahan tebus resep.';
      }

      return {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        metrics: {
          recencyDays,
          frequency: transactionCount,
          monetaryTotal: totalSpend,
        },
        segment,
        description,
        actionSuggestion,
      };
    });

    // Grouping count per segment
    const segmentCounts: Record<string, number> = {};
    segmentedCustomers.forEach((c) => {
      segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
    });

    return {
      analyzedAt: now.toISOString(),
      totalCustomers: customers.length,
      segmentSummary: segmentCounts,
      customers: segmentedCustomers,
    };
  }
}
