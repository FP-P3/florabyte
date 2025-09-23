This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Domain: Orders & Payments (Simplified Model)

Model sekarang disederhanakan: tidak ada lagi koleksi `orders` terpisah. Semua data transaksi pasca pembayaran disimpan di dokumen `cart` yang statusnya berubah menjadi `paid` atau `cancelled`.

### Field Utama pada `cart`

| Field | Deskripsi |
|-------|-----------|
| `status` | Status pembayaran Midtrans: `pending` | `paid` | `cancelled` |
| `orderStatus` | Status operasional/logistik manual admin: `Pending` | `Diproses` | `Dikirim` | `Selesai` | `Dibatalkan` |
| `productIds` | Array ObjectId duplikat (mewakili qty) |
| `total` | Total rupiah (direfresh saat create payment) |
| `midtransOrderId` | ID transaksi Midtrans (order_id) |
| `createdAt` | Timestamp dibuatnya cart / transaksi |

### Alur
1. User tambah produk → cart `pending`.
2. User klik bayar → endpoint create payment set `midtransOrderId` & update `total`.
3. Midtrans notifikasi: jika sukses → `status = paid` dan jika `orderStatus` belum ada → set `orderStatus = 'Pending'`.
4. Admin ubah `orderStatus` lewat `/admin/orders`.
5. User melihat riwayat (cart dengan `status in ['paid','cancelled']`).

### API Relevan
| Endpoint | Fungsi |
|----------|--------|
| `GET /api/admin/orders` | List semua cart yang sudah `paid` atau `cancelled` (dengan agregasi item & qty) |
| `PATCH /api/orders/:id/status` | Update `orderStatus` (hanya jika cart payment sudah selesai / dibatalkan) |
| `GET /api/users/:id/orders` | Riwayat user (cart paid/cancelled) |
| `POST /api/payment/create` | Inisiasi pembayaran Midtrans |
| `POST /api/payment/notification` | Update `status` (payment) + set default `orderStatus` |

### Status Operasional (`orderStatus`)
`Pending` → `Diproses` → `Dikirim` → `Selesai` atau kapan saja `Dibatalkan`.

Saat ini tidak ada validasi transisi (bisa lompat). Tambahkan guard di endpoint PATCH jika diperlukan.

### Kenapa Disederhanakan?
Snapshot koleksi terpisah menambah kompleksitas tanpa kebutuhan bisnis tambahan. Dengan tetap memakai `cart`, footprint lebih kecil dan query lebih sederhana.

### Testing Cepat
1. Lakukan checkout & bayar (sandbox) → pastikan dokumen cart: `status=paid`, `orderStatus=Pending`.
2. PATCH via UI admin ubah ke `Diproses` → reload → berubah.
3. Buka profile user → tampil orderStatus & payment status.

### Next Ideas (Optional)
- Validasi transisi orderStatus.
- Tambah field `trackingNumber` saat status `Dikirim`.
- Index tambahan `(status, orderStatus, createdAt)` untuk dashboard cepat.
- Hardening verifikasi signature Midtrans + idempotency key.

---
