import ProductModel from "@/db/model/ProductModel";
import { ProductType } from "@/types/ProductType";
import { idFromSlug } from "@/lib/slug";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Tag, ArrowLeft, CheckCircle2 } from "lucide-react";
import AddToCart from "./parts/add-to-cart";
import ProductCard from "@/components/ProductCard";
import ScrollFadeX from "@/components/ui/scroll-fade";

type Params = Promise<{ slug: string }>;

export default async function ProductDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  if (!id) return notFound();

  const product = await ProductModel.getProductById(id).catch(() => null);
  if (!product) return notFound();
  // Fetch related products by category (exclude current product)
  const relatedRaw = (await ProductModel.getByCategory(
    product.category || ""
  )) as ProductType[];
  interface RelatedProduct {
    _id: { toString(): string } | string;
    name?: string;
    imgUrl?: string;
    price?: number | string;
    description?: string;
    stock?: number | string;
    category?: string;
    slug: string;
  }
  const toSlug = (name: string, id: string) =>
    `${name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60)}-${id}`;
  const related: RelatedProduct[] = (relatedRaw || [])
    .filter((r) => String(r._id) !== String(product._id))
    .slice(0, 8)
    .map((r) => {
      const idStr = typeof r._id === "string" ? r._id : r._id.toString();
      const name = typeof r.name === "string" ? r.name : "product";
      const base: Omit<RelatedProduct, "slug"> = {
        _id: r._id as { toString(): string } | string,
        name: r.name,
        imgUrl: r.imgUrl,
        price: r.price,
        description: r.description,
        stock: r.stock,
        category: r.category,
      };
      return { ...base, slug: toSlug(name, idStr) };
    });

  const formatIDR = (v: number) => {
    try {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
    }
  };
  const productIdStr = product._id?.toString?.() || "";
  const lowStock =
    Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5;
  const outOfStock = Number(product.stock || 0) <= 0;
  const features: string[] = (product.description || "")
    .split(/\.|\n|\r/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 3)
    .slice(0, 3);

  return (
    <main className="min-h-screen page-bg-home">
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
        </div>
        <nav className="mb-6 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/products" className="hover:text-foreground">
                Products
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium line-clamp-1 max-w-[60ch]">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-6 md:gap-8 md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.2fr_0.8fr]">
          {/* Image */}
          <Card className="relative overflow-hidden">
            {/* Soft gradient glow */}
            <div className="pointer-events-none absolute -inset-16 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(16,185,129,0.10),transparent_60%)]" />
            <CardContent className="relative p-2 sm:p-3">
              <div className="relative w-full overflow-hidden rounded-2xl ring-1 ring-black/5 aspect-[4/3] md:aspect-[5/4] lg:aspect-[4/3] max-h-[480px]">
                <Image
                  src={product.imgUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                  priority
                />
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="relative md:sticky md:top-24">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-3xl md:text-4xl leading-tight tracking-tight">
                  {product.name}
                </CardTitle>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Link
                  href={`/products?category=${encodeURIComponent(
                    String(product.category || "")
                  )}`}
                >
                  <Badge variant="secondary" className="capitalize">
                    <Tag className="h-3.5 w-3.5 mr-1.5" /> {product.category}
                  </Badge>
                </Link>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${
                    outOfStock
                      ? "bg-red-50 text-red-700 border-red-200"
                      : lowStock
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  {outOfStock
                    ? "Stok habis"
                    : lowStock
                    ? `Stok menipis (${product.stock})`
                    : `Stok: ${product.stock}`}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div>
                  <p className="text-3xl font-semibold text-emerald-700">
                    {formatIDR(Number(product.price))}
                  </p>
                </div>
                <div>
                  <AddToCart productId={productIdStr} />
                </div>
                {product.description && (
                  <>
                    <Separator />
                    <div className="prose prose-sm max-w-none text-foreground/90">
                      <h3 className="mb-2 text-base font-semibold">
                        Deskripsi Produk
                      </h3>
                      <p className="whitespace-pre-line leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  </>
                )}
                {features.length > 0 && (
                  <div className="mt-2">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">
                      Highlights
                    </h4>
                    <ul className="space-y-1.5">
                      {features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground/90"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile sticky buy bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Harga</p>
              <p className="text-lg font-semibold text-emerald-700 truncate">
                {formatIDR(Number(product.price))}
              </p>
            </div>
            <div className="flex-1 max-w-[60%]">
              <AddToCart productId={productIdStr} />
            </div>
          </div>
        </div>
      </section>
      {/* Related Products */}
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 md:px-6 pb-16">
          <div className="mt-10 md:mt-12 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
              Related Products
            </h2>
            <Link
              href={`/products?category=${encodeURIComponent(
                String(product.category || "")
              )}`}
              className="text-sm text-emerald-700 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          <ScrollFadeX className="mt-4" contentClassName="items-stretch">
            {related.map((p) => {
              const idStr =
                typeof p._id === "string" ? p._id : p._id.toString();
              return (
                <div key={idStr} className="min-w-[200px]">
                  <ProductCard product={p} />
                </div>
              );
            })}
          </ScrollFadeX>
        </section>
      )}
    </main>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  if (!id) return {};
  try {
    const product = await ProductModel.getProductById(id);
    return {
      title: `${product.name} • Florabyte`,
      description: product.description?.slice(0, 140),
      openGraph: { images: [{ url: product.imgUrl }] },
    };
  } catch {
    return { title: "Product • Florabyte" };
  }
}
