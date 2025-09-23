import ProductModel from "@/db/model/ProductModel";
import { idFromSlug } from "@/lib/slug";
import { notFound } from "next/navigation";
import Image from "next/image";
import AddToCart from "./parts/add-to-cart";

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

  return (
    <main className="min-h-screen page-bg-home">
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">
            <Image
              src={product.imgUrl}
              alt={product.name}
              width={1200}
              height={900}
              className="w-full h-auto object-cover"
              priority
            />
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{product.name}</h1>
            <p className="mt-2 text-muted-foreground">{product.category}</p>
            <p className="mt-4 text-2xl font-semibold text-emerald-700">
              Rp {Number(product.price).toLocaleString("id-ID")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Stock: {product.stock}
            </p>

            <div className="mt-6">
              <AddToCart productId={product._id?.toString?.() || ""} />
            </div>

            <div className="mt-8 prose prose-sm max-w-none">
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          </div>
        </div>
      </section>
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
