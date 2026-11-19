"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting PharmaPOS Database Seeding...');
    console.log('Creating Roles...');
    const rolesData = [
        { name: 'OWNER', description: 'Pemilik Apotek - Akses penuh seluruh sistem, laporan, dan konfigurasi', isSystem: true },
        { name: 'MANAGER', description: 'Manajer Operasional - Akses dashboard, transaksi, stok, dan laporan', isSystem: true },
        { name: 'ADMIN', description: 'Administrator - Kelola master data obat, supplier, dan pembelian', isSystem: true },
        { name: 'KASIR', description: 'Kasir - Melayani transaksi POS, scan barcode, dan cetak struk', isSystem: true },
        { name: 'APOTEKER', description: 'Apoteker Penanggung Jawab - Skrining resep dan verifikasi klinis', isSystem: true },
        { name: 'GUDANG', description: 'Staff Gudang - Penerimaan barang, stock opname, dan batch FEFO', isSystem: true },
    ];
    const roleMap = new Map();
    for (const r of rolesData) {
        const role = await prisma.role.upsert({
            where: { name: r.name },
            update: {},
            create: r,
        });
        roleMap.set(r.name, role.id);
    }
    console.log('Creating Default Branch...');
    const branch = await prisma.branch.upsert({
        where: { code: 'CAB-01' },
        update: {},
        create: {
            code: 'CAB-01',
            name: 'Apotek Sehat Sentosa',
            address: 'Jl. Kesehatan Raya No. 45, Jakarta Selatan 12340',
            phone: '0812-3456-7890',
            isActive: true,
        },
    });
    console.log('Creating Demo Users...');
    const passwordHash = await bcrypt.hash('Demo12345', 10);
    const usersData = [
        { email: 'owner@pharmapos.local', name: 'Bapak Hartono (Owner)', roleName: 'OWNER', phone: '0811111111' },
        { email: 'manager@pharmapos.local', name: 'Ibu Ratna (Manager)', roleName: 'MANAGER', phone: '0822222222' },
        { email: 'admin@pharmapos.local', name: 'Dedi Kusuma (Admin)', roleName: 'ADMIN', phone: '0833333333' },
        { email: 'kasir@pharmapos.local', name: 'Sari Puspita (Kasir)', roleName: 'KASIR', phone: '0844444444' },
        { email: 'apoteker@pharmapos.local', name: 'apt. Farhan Alatas, S.Farm (Apoteker)', roleName: 'APOTEKER', phone: '0855555555' },
        { email: 'gudang@pharmapos.local', name: 'Eko Wahyudi (Staff Gudang)', roleName: 'GUDANG', phone: '0866666666' },
    ];
    const userMap = new Map();
    for (const u of usersData) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash },
            create: {
                email: u.email,
                name: u.name,
                passwordHash,
                phone: u.phone,
                roleId: roleMap.get(u.roleName),
                branchId: branch.id,
                isActive: true,
            },
        });
        userMap.set(u.email, user.id);
    }
    console.log('Creating Categories...');
    const categoriesData = [
        { name: 'Obat Bebas', description: 'Dapat dibeli tanpa resep dokter (Logo Lingkaran Hijau)' },
        { name: 'Obat Bebas Terbatas', description: 'Obat keras peringatan P.No 1-6 (Logo Lingkaran Biru)' },
        { name: 'Obat Keras', description: 'Harus dengan resep dokter (Logo Lingkaran Merah K)' },
        { name: 'Vitamin & Suplemen', description: 'Suplemen nutrisi dan multivitamin daya tahan tubuh' },
        { name: 'Alat Kesehatan', description: 'Kasa, plester, termometer, dan perban medis' },
        { name: 'Herbal & Tradisional', description: 'Obat tradisional, jamu terstandar, dan fitofarmaka' },
    ];
    const categoryMap = new Map();
    for (const c of categoriesData) {
        const cat = await prisma.category.upsert({
            where: { name: c.name },
            update: {},
            create: c,
        });
        categoryMap.set(c.name, cat.id);
    }
    console.log('Creating Suppliers...');
    const suppliersData = [
        { code: 'PBF-01', name: 'PT Sehat Farma Distribusi', companyName: 'PT Sehat Farma', phone: '021-5551234', email: 'order@sehatfarma.co.id', address: 'Kawasan Industri Pulogadung, Jakarta Timur' },
        { code: 'PBF-02', name: 'PT Medika Nusantara Logistik', companyName: 'PT Medika Nusantara', phone: '021-7778899', email: 'sales@medikanusantara.com', address: 'Jl. Rungkut Industri Raya No. 12, Surabaya' },
        { code: 'PBF-03', name: 'CV Sumber Sehat Farma', companyName: 'CV Sumber Sehat', phone: '0274-889900', email: 'info@sumbersehat.co.id', address: 'Jl. Kaliurang KM 9, Sleman, Yogyakarta' },
        { code: 'PBF-04', name: 'PT Kimia Medika Distribusi', companyName: 'PT Kimia Medika', phone: '022-4455667', email: 'distribusi@kimiamedika.id', address: 'Jl. Soekarno-Hatta No. 102, Bandung' },
    ];
    const supplierMap = new Map();
    for (const s of suppliersData) {
        const supp = await prisma.supplier.upsert({
            where: { code: s.code },
            update: {},
            create: s,
        });
        supplierMap.set(s.code, supp.id);
    }
    console.log('Creating Products...');
    const productsData = [
        {
            sku: 'MED-001', barcode: '8991234560011', name: 'Paracetamol 500 mg', genericName: 'Paracetamol', brand: 'Kimia Farma',
            category: 'Obat Bebas', dosageForm: 'Tablet', dosage: '500 mg', unit: 'Strip', buyPrice: 4500, sellPrice: 8000,
            minStock: 20, maxStock: 500, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-002', barcode: '8991234560028', name: 'Amoxicillin 500 mg', genericName: 'Amoxicillin Trihydrate', brand: 'Sanbe Farma',
            category: 'Obat Keras', dosageForm: 'Kaplet', dosage: '500 mg', unit: 'Strip', buyPrice: 6500, sellPrice: 12000,
            minStock: 25, maxStock: 400, isPrescriptionRequired: true,
        },
        {
            sku: 'MED-003', barcode: '8991234560035', name: 'Cetirizine 10 mg', genericName: 'Cetirizine HCl', brand: 'Dexa Medica',
            category: 'Obat Bebas Terbatas', dosageForm: 'Tablet', dosage: '10 mg', unit: 'Strip', buyPrice: 5000, sellPrice: 9500,
            minStock: 15, maxStock: 300, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-004', barcode: '8991234560042', name: 'Ibuprofen 400 mg', genericName: 'Ibuprofen', brand: 'Kalbe Farma',
            category: 'Obat Bebas Terbatas', dosageForm: 'Tablet', dosage: '400 mg', unit: 'Strip', buyPrice: 6000, sellPrice: 11000,
            minStock: 20, maxStock: 350, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-005', barcode: '8991234560059', name: 'Vitamin C 500 mg IPI', genericName: 'Ascorbic Acid', brand: 'Supra Ferbindo',
            category: 'Vitamin & Suplemen', dosageForm: 'Tablet Hisap', dosage: '500 mg', unit: 'Botol', buyPrice: 7500, sellPrice: 13500,
            minStock: 15, maxStock: 200, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-006', barcode: '8991234560066', name: 'Omeprazole 20 mg', genericName: 'Omeprazole', brand: 'Novell Pharma',
            category: 'Obat Keras', dosageForm: 'Kapsul', dosage: '20 mg', unit: 'Strip', buyPrice: 8500, sellPrice: 16000,
            minStock: 15, maxStock: 250, isPrescriptionRequired: true,
        },
        {
            sku: 'MED-007', barcode: '8991234560073', name: 'Antasida Doen', genericName: 'Al(OH)3 & Mg(OH)2', brand: 'Phapros',
            category: 'Obat Bebas', dosageForm: 'Tablet Kunyah', dosage: 'Kombinasi', unit: 'Strip', buyPrice: 3500, sellPrice: 6500,
            minStock: 20, maxStock: 400, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-008', barcode: '8991234560080', name: 'Oralit 200 ml', genericName: 'Garam Elektrolit', brand: 'Phapros',
            category: 'Obat Bebas', dosageForm: 'Serbuk Sachet', dosage: '200 ml', unit: 'Sachet', buyPrice: 1200, sellPrice: 2500,
            minStock: 30, maxStock: 600, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-009', barcode: '8991234560097', name: 'Asam Mefenamat 500 mg', genericName: 'Mefenamic Acid', brand: 'Bernofarm',
            category: 'Obat Keras', dosageForm: 'Kaplet', dosage: '500 mg', unit: 'Strip', buyPrice: 5500, sellPrice: 10500,
            minStock: 15, maxStock: 300, isPrescriptionRequired: true,
        },
        {
            sku: 'MED-010', barcode: '8991234560103', name: 'Ciprofloxacin 500 mg', genericName: 'Ciprofloxacin HCl', brand: 'Bernofarm',
            category: 'Obat Keras', dosageForm: 'Tablet', dosage: '500 mg', unit: 'Strip', buyPrice: 9000, sellPrice: 17500,
            minStock: 10, maxStock: 200, isPrescriptionRequired: true,
        },
        {
            sku: 'MED-011', barcode: '8991234560110', name: 'Dexamethasone 0.5 mg', genericName: 'Dexamethasone', brand: 'Harsen',
            category: 'Obat Keras', dosageForm: 'Tablet', dosage: '0.5 mg', unit: 'Strip', buyPrice: 2500, sellPrice: 5000,
            minStock: 20, maxStock: 400, isPrescriptionRequired: true,
        },
        {
            sku: 'MED-012', barcode: '8991234560127', name: 'Ambroxol 30 mg', genericName: 'Ambroxol HCl', brand: 'Kimia Farma',
            category: 'Obat Bebas Terbatas', dosageForm: 'Tablet', dosage: '30 mg', unit: 'Strip', buyPrice: 3800, sellPrice: 7000,
            minStock: 20, maxStock: 300, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-013', barcode: '8991234560134', name: 'Amlodipine 10 mg', genericName: 'Amlodipine Besilate', brand: 'Dexa Medica',
            category: 'Obat Keras', dosageForm: 'Tablet', dosage: '10 mg', unit: 'Strip', buyPrice: 7000, sellPrice: 13500,
            minStock: 20, maxStock: 350, isPrescriptionRequired: true,
        },
        {
            sku: 'MED-014', barcode: '8991234560141', name: 'Metformin 500 mg', genericName: 'Metformin HCl', brand: 'Dexa Medica',
            category: 'Obat Keras', dosageForm: 'Tablet', dosage: '500 mg', unit: 'Strip', buyPrice: 4200, sellPrice: 8000,
            minStock: 25, maxStock: 400, isPrescriptionRequired: true,
        },
        {
            sku: 'MED-015', barcode: '8991234560158', name: 'Betadine Antiseptik 30 ml', genericName: 'Povidone Iodine 10%', brand: 'Mundipharma',
            category: 'Obat Bebas Terbatas', dosageForm: 'Cairan Obat Luar', dosage: '30 ml', unit: 'Botol', buyPrice: 18000, sellPrice: 26000,
            minStock: 10, maxStock: 150, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-016', barcode: '8991234560165', name: 'Hansaplast Plester Kain', genericName: 'Plester Luka Elastis', brand: 'Beiersdorf',
            category: 'Alat Kesehatan', dosageForm: 'Plester', dosage: 'Standar', unit: 'Amplop (10s)', buyPrice: 6500, sellPrice: 10000,
            minStock: 20, maxStock: 200, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-017', barcode: '8991234560172', name: 'Kasa Steril Husada 16x16', genericName: 'Kasa Hidrofilik Steril', brand: 'Husada Medika',
            category: 'Alat Kesehatan', dosageForm: 'Kasa', dosage: '16x16 cm', unit: 'Kotak (10s)', buyPrice: 11000, sellPrice: 17000,
            minStock: 15, maxStock: 150, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-018', barcode: '8991234560189', name: 'Termometer Digital Onemed', genericName: 'Digital Thermometer', brand: 'Onemed',
            category: 'Alat Kesehatan', dosageForm: 'Alat Ukur Suhu', dosage: 'Akurat 0.1C', unit: 'Unit', buyPrice: 22000, sellPrice: 35000,
            minStock: 5, maxStock: 50, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-019', barcode: '8991234560196', name: 'Minyak Kayu Putih Cap Lang 60ml', genericName: 'Cajuput Oil', brand: 'Cap Lang',
            category: 'Herbal & Tradisional', dosageForm: 'Minyak Gosok', dosage: '60 ml', unit: 'Botol', buyPrice: 21000, sellPrice: 28500,
            minStock: 15, maxStock: 200, isPrescriptionRequired: false,
        },
        {
            sku: 'MED-020', barcode: '8991234560202', name: 'Tolak Angin Cair 15ml', genericName: 'Ekstrak Herbal Madu', brand: 'Sido Muncul',
            category: 'Herbal & Tradisional', dosageForm: 'Cairan Obat Dalam', dosage: '15 ml', unit: 'Sachet', buyPrice: 3200, sellPrice: 5000,
            minStock: 30, maxStock: 500, isPrescriptionRequired: false,
        },
    ];
    const productMap = new Map();
    for (const p of productsData) {
        const prod = await prisma.product.upsert({
            where: { sku: p.sku },
            update: {
                sellPrice: p.sellPrice,
                buyPrice: p.buyPrice,
            },
            create: {
                sku: p.sku,
                barcode: p.barcode,
                name: p.name,
                genericName: p.genericName,
                brand: p.brand,
                dosageForm: p.dosageForm,
                dosage: p.dosage,
                unit: p.unit,
                buyPrice: p.buyPrice,
                sellPrice: p.sellPrice,
                minStock: p.minStock,
                maxStock: p.maxStock,
                isPrescriptionRequired: p.isPrescriptionRequired,
                isActive: true,
                categoryId: categoryMap.get(p.category),
            },
        });
        productMap.set(p.sku, prod.id);
    }
    console.log('Creating Product Batches & Stock (FEFO setup)...');
    const now = new Date();
    const nearExpiryDate = new Date(now.getFullYear(), now.getMonth() + 2, 15);
    const safeExpiryDate = new Date(now.getFullYear() + 2, now.getMonth(), 20);
    const freshExpiryDate = new Date(now.getFullYear() + 3, now.getMonth(), 10);
    const adminUserId = userMap.get('admin@pharmapos.local');
    const supplierId = supplierMap.get('PBF-01');
    for (const [sku, productId] of productMap.entries()) {
        const batch1 = await prisma.productBatch.create({
            data: {
                productId,
                supplierId,
                batchNumber: `BCH-2025-${sku}-01`,
                mfgDate: new Date(2025, 0, 10),
                expDate: nearExpiryDate,
                initialQuantity: 50,
                currentQuantity: 30,
                buyPrice: 5000,
                status: 'NEAR_EXPIRY',
            },
        });
        const batch2 = await prisma.productBatch.create({
            data: {
                productId,
                supplierId,
                batchNumber: `BCH-2026-${sku}-02`,
                mfgDate: new Date(2026, 1, 15),
                expDate: safeExpiryDate,
                initialQuantity: 100,
                currentQuantity: 100,
                buyPrice: 5000,
                status: 'ACTIVE',
            },
        });
        const totalStock = 30 + 100;
        await prisma.inventory.upsert({
            where: {
                branch_product_unique: {
                    branchId: branch.id,
                    productId,
                },
            },
            update: { totalStock },
            create: {
                branchId: branch.id,
                productId,
                totalStock,
                reservedStock: 0,
            },
        });
        await prisma.inventoryMovement.create({
            data: {
                branchId: branch.id,
                productId,
                batchId: batch1.id,
                type: 'PURCHASE_RECEIVE',
                quantity: 50,
                previousStock: 0,
                finalStock: 50,
                referenceId: 'PO-2025-001',
                notes: 'Penerimaan batch awal pengadaan PBF Sehat Farma',
                createdBy: adminUserId,
            },
        });
    }
    console.log('Creating Customers...');
    const customersData = [
        { name: 'Andi Pratama', phone: '081298765431', email: 'andi.pratama@gmail.com', address: 'Jl. Melati No. 12, Kebayoran Baru' },
        { name: 'Siti Rahma', phone: '081298765432', email: 'siti.rahma@yahoo.com', address: 'Jl. Cempaka Putih Tengah No. 5' },
        { name: 'Budi Santoso', phone: '081298765433', email: 'budi.santoso@gmail.com', address: 'Jl. Tebet Barat Dalam No. 88' },
        { name: 'Rina Amelia', phone: '081298765434', email: 'rina.amelia@outlook.com', address: 'Jl. Fatmawati Raya No. 23' },
        { name: 'Hendra Wijaya', phone: '081298765435', email: 'hendra.w@gmail.com', address: 'Jl. Kemang Timur No. 14' },
        { name: 'Dewi Lestari', phone: '081298765436', email: 'dewi.lestari@gmail.com', address: 'Jl. Panglima Polim No. 77' },
        { name: 'Agus Setiawan', phone: '081298765437', email: 'agus.setiawan@gmail.com', address: 'Jl. Pasar Minggu No. 10' },
        { name: 'Maya Indah', phone: '081298765438', email: 'maya.indah@gmail.com', address: 'Jl. Pejaten Barat No. 51' },
        { name: 'Bambang Triyono', phone: '081298765439', email: 'bambang.t@gmail.com', address: 'Jl. Ampera Raya No. 90' },
        { name: 'Nurul Hidayah', phone: '081298765440', email: 'nurul.h@gmail.com', address: 'Jl. Warung Buncit No. 34' },
    ];
    const customerMap = new Map();
    for (const c of customersData) {
        const cust = await prisma.customer.upsert({
            where: { phone: c.phone },
            update: {},
            create: c,
        });
        customerMap.set(c.name, cust.id);
    }
    console.log('Creating Historical Sales Data for Dashboard & AI...');
    const cashierId = userMap.get('kasir@pharmapos.local');
    const paracetamolId = productMap.get('MED-001');
    const vitaminCId = productMap.get('MED-005');
    const antasidaId = productMap.get('MED-007');
    const andiCustomerId = customerMap.get('Andi Pratama');
    const sitiCustomerId = customerMap.get('Siti Rahma');
    const sale1 = await prisma.sale.create({
        data: {
            invoiceNumber: 'INV/20260920/0001',
            branchId: branch.id,
            customerId: andiCustomerId,
            cashierId,
            subtotal: 29500,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: 29500,
            paymentStatus: 'PAID',
            paymentMethod: 'QRIS',
            notes: 'Pembelian obat flu dan vitamin',
            createdAt: new Date(2026, 8, 20, 10, 30),
            items: {
                create: [
                    {
                        productId: paracetamolId,
                        batchId: (await prisma.productBatch.findFirst({ where: { productId: paracetamolId } })).id,
                        quantity: 2,
                        unitPrice: 8000,
                        subtotal: 16000,
                    },
                    {
                        productId: vitaminCId,
                        batchId: (await prisma.productBatch.findFirst({ where: { productId: vitaminCId } })).id,
                        quantity: 1,
                        unitPrice: 13500,
                        subtotal: 13500,
                    },
                ],
            },
            payments: {
                create: {
                    paymentNumber: 'PAY-20260920-0001',
                    method: 'QRIS',
                    amount: 29500,
                    status: 'PAID',
                    referenceCode: 'QRIS-SIM-9823412',
                    paidAt: new Date(2026, 8, 20, 10, 31),
                },
            },
        },
    });
    const sale2 = await prisma.sale.create({
        data: {
            invoiceNumber: 'INV/20260921/0002',
            branchId: branch.id,
            customerId: sitiCustomerId,
            cashierId,
            subtotal: 21000,
            discountAmount: 1000,
            taxAmount: 0,
            totalAmount: 20000,
            paymentStatus: 'PAID',
            paymentMethod: 'TUNAI',
            notes: 'Pembelian antasida sakit maag',
            createdAt: new Date(2026, 8, 21, 14, 15),
            items: {
                create: [
                    {
                        productId: antasidaId,
                        batchId: (await prisma.productBatch.findFirst({ where: { productId: antasidaId } })).id,
                        quantity: 3,
                        unitPrice: 6500,
                        discountAmount: 1000,
                        subtotal: 18500,
                    },
                ],
            },
            payments: {
                create: {
                    paymentNumber: 'PAY-20260921-0002',
                    method: 'TUNAI',
                    amount: 20000,
                    status: 'PAID',
                    referenceCode: 'CASH-REC-002',
                    paidAt: new Date(2026, 8, 21, 14, 16),
                },
            },
        },
    });
    console.log('Creating Sample Prescription...');
    const pharmacistId = userMap.get('apoteker@pharmapos.local');
    const amoxicillinId = productMap.get('MED-002');
    await prisma.prescription.create({
        data: {
            prescriptionNumber: 'RXP-20260922-001',
            branchId: branch.id,
            customerId: andiCustomerId,
            doctorName: 'dr. Hendro Prasetyo, Sp.A',
            doctorSip: 'SIP.440/128/DINKES/2024',
            prescriptionDate: new Date(2026, 8, 22),
            pharmacistId,
            status: 'VERIFIED',
            notes: 'Pasien radang tenggorokan akut. Obat diminum sesudah makan sampai habis.',
            items: {
                create: [
                    {
                        productId: amoxicillinId,
                        dosage: '500 mg',
                        dosageInstructions: '3 kali sehari 1 kaplet (tiap 8 jam) sesudah makan',
                        quantity: 10,
                        isDispensed: true,
                    },
                    {
                        productId: paracetamolId,
                        dosage: '500 mg',
                        dosageInstructions: '3 kali sehari 1 tablet bila demam',
                        quantity: 10,
                        isDispensed: true,
                    },
                ],
            },
        },
    });
    console.log('Creating Initial Notifications & AI Insights...');
    await prisma.notification.createMany({
        data: [
            {
                branchId: branch.id,
                userId: userMap.get('gudang@pharmapos.local'),
                title: 'Peringatan Stok Menipis',
                message: 'Stok Termometer Digital Onemed tersisa 5 unit (mendekati batas minimum). Segera lakukan pemesanan PO.',
                type: 'LOW_STOCK',
                isRead: false,
            },
            {
                branchId: branch.id,
                userId: userMap.get('apoteker@pharmapos.local'),
                title: 'Obat Mendekati Kedaluwarsa (FEFO Alert)',
                message: 'Batch BCH-2025-MED-001-01 (Paracetamol 500 mg) akan kedaluwarsa dalam 60 hari ke depan.',
                type: 'NEAR_EXPIRY',
                isRead: false,
            },
            {
                branchId: branch.id,
                userId: userMap.get('owner@pharmapos.local'),
                title: 'AI Stock Recommendation',
                message: 'AI mendeteksi lonjakan konsumsi Vitamin C 500 mg menjelang musim penghujan. Disarankan menambah 50 botol.',
                type: 'AI_ALERT',
                isRead: false,
            },
        ],
    });
    await prisma.aiInsight.create({
        data: {
            category: 'CUSTOMER_RFM',
            title: 'Segmentasi Loyalitas Pelanggan Bulan Ini',
            summary: 'Ditemukan 45% pelanggan kategori "Loyal Customers" dengan frekuensi belanja obat rutin 2x per bulan.',
            insightDataJson: JSON.stringify({
                loyalCustomersCount: 18,
                atRiskCustomersCount: 5,
                newCustomersCount: 7,
                averageBasketSize: 48500,
            }),
        },
    });
    console.log('✅ Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map