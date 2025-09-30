# Florabyte – Project Documentation

Florabyte is a Next.js app that helps users analyze plant photos using AI, generate care plans, and discover relevant gardening products. It also supports shopping cart checkout via Midtrans and a lightweight admin dashboard for order management.

## Tech Stack

- Framework: Next.js 15 (App Router, Turbopack)
- Language: TypeScript
- UI: Tailwind CSS, Radix UI, lucide-react
- Auth: NextAuth (Google OAuth)
- DB: MongoDB (native driver), Atlas Vector Search for product recommendations
- Media: Cloudinary (image storage)
- AI: Google Generative AI (Gemini Vision + text-embedding-004)
- Notifications: react-hot-toast

## Key Features

- Plant analysis: upload a plant photo, AI returns identification, care plan, and recommended products
- Product discovery: vector search over product embeddings using AI-generated keywords
- Shopping cart + Midtrans payments (status reflected on cart document)
- Admin: view and update order status lifecycle
- User profile: Google OAuth sign-in and account actions

## Repository Structure (high-level)

- `src/app`: App Router pages and API routes
  - `plants/scan`: image upload + result UI
  - `api/plants/analyze`: AI + vector recommendations
  - `api/payment/create|notification`: Midtrans integration
  - `admin/orders`: admin page + API
  - `products`, `cart`, `profile`, `login`, `register`
- `src/db`: Mongo config and domain models (Cart, Product, User, etc.)
- `src/types`: Shared TypeScript types (ProductDoc, ProductRecommendation, Plant types)
- `src/lib`: Auth config, utilities
- `public/`: Static assets

## Environment Variables

Create a `.env` file with the following variables (example names):

- App/Next.js

  - `NEXTAUTH_URL` – external URL for NextAuth
  - `NEXTAUTH_SECRET` – NextAuth secret

- Google OAuth

  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

- Google AI

  - `GOOGLE_API_KEY` – used for Gemini Vision and Embeddings
  - `GEMINI_MODEL` – e.g. `gemini-1.5-pro`

- MongoDB

  - `MONGODB_URI` – connection string
  - `DB_NAME` – database name

- Cloudinary

  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

- Midtrans
  - `MIDTRANS_SERVER_KEY`
  - `MIDTRANS_CLIENT_KEY`
  - `MIDTRANS_BASE_URL` – sandbox/prod endpoint

## Getting Started

1. Install dependencies
   - `npm install`
2. Run dev server
   - `npm run dev`
3. Open the app
   - http://localhost:3000

## Build & Run

- Production build: `npm run build`
- Start: `npm start`
- Lint: `npm run lint`

## Core Flows

### 1. Plant Analysis & Recommendations

- UI: `src/app/plants/scan/page.tsx`
- API: `src/app/api/plants/analyze/route.ts`
  - Accepts an image via multipart form-data
  - Calls Gemini Vision with a constrained JSON prompt
  - Extracts keywords + supplies + species
  - For each term, generates an embedding and performs Mongo `$vectorSearch` on `Products.embedding`
  - Aggregates highest score per product, returns top 8
  - No regex/stock fallback (by design) – may return empty array

Product schema must contain an `embedding: number[]` and a configured Atlas Vector Search index (`products_vector_index`) pointing to that field.

### 2. Cart, Checkout & Orders

- Cart stored as a document with fields like `productIds`, `total`, `status`, `orderStatus`, and `midtransOrderId`
- Payment creation: `POST /api/payment/create`
- Midtrans notifications: `POST /api/payment/notification`
- Admin order management:
  - List: `GET /api/admin/orders`
  - Status update: `PATCH /api/orders/:id/status`

### 3. Authentication

- NextAuth configured in `src/lib/auth.ts` with GoogleProvider
- After sign-in, users land on `/profile`

## Data Models (selected)

- `ProductDoc`:
  - `_id`, `name`, `description`, `price`, `stock`, `imgUrl`, `category`, `embedding: number[]`
- `ProductRecommendation` (API response item):
  - `_id`, `name`, `description`, `price`, `stock`, `imgUrl`, `category`, `score`
- `Cart` (simplified order):
  - `status` (pending | paid | cancelled)
  - `orderStatus` (Pending | Diproses | Dikirim | Selesai | Dibatalkan)
  - `productIds` (duplicate ObjectIds represent quantity)
  - `total`, `midtransOrderId`, timestamps

## Indexing & Search Notes

- Ensure a MongoDB Atlas Vector Search index exists on `Products.embedding` with name `products_vector_index`
- `$vectorSearch` cannot filter on fields that aren’t indexed. This route executes the vector stage first, then filters (e.g., `stock > 0`) in a `$match` stage.

## Development Tips

- Add product embeddings at import time or via a batch job so `$vectorSearch` returns meaningful results.
- Keep AI prompt concise; route sanitizes responses to valid JSON only.
- For debugging recommendations, the analyze route returns `terms` and a `diagnostics` object (e.g., per-term hit counts).

## Security & Secrets

- Never commit `.env` values.
- Midtrans webhook: validate signatures and add idempotency as needed.
- Ensure Cloudinary keys have the minimum required permissions.

## Troubleshooting

- Empty recommendations: verify `embedding` exists on products and the Atlas index name matches.
- Vector search filter errors: avoid using `$vectorSearch.filter` on non-indexed fields; this code matches after the vector stage.
- Build/type errors: run `npm run build` and fix reported TypeScript issues.

## License

Proprietary – for internal use within the project/team unless stated otherwise.
