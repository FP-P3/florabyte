"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";

type Props = {
  product: any;
  onAddToCart?: (id: string) => void | Promise<void>;
};

export default function ProductCard({ product, onAddToCart }: Props) {
  const id = product?._id?.toString?.() || product?.id || "";
  const name = product?.name || "Unnamed product";
  const img =
    product?.imgUrl || product?.imageUrl || product?.image || "/placeholder.png";
  const slug = product?.slug || "";
  const price = Number(product?.price ?? 0);
  const sold = Number(product?.sold ?? product?.soldCount ?? 0);

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart && id) await onAddToCart(id);
  };

  return (
    <div className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 max-w-[180px] md:max-w-[200px] mx-auto">
      <Link href={`/products/${slug}`}>
        {/* Kontainer baru untuk gambar dengan padding */}
        <div className="p-4">
          {/* Area Gambar dengan rounded corners dan overflow-hidden */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl">
            <Image
              src={img}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority={false}
            />
          </div>
        </div>

        {/* Konten Teks */}
        <div className="-mt-4 px-4 pb-16 pt-2">
          <h3 className="text-base font-semibold leading-snug text-slate-800 line-clamp-2">
            {name}
          </h3>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-lg font-bold text-emerald-700">
              Rp {price.toLocaleString("id-ID")}
            </p>
            {sold > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Star className="h-3.5 w-3.5" fill="currentColor" />
                <span className="font-semibold">
                  {sold > 999 ? `${(sold / 1000).toFixed(1)}rb` : sold}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Tombol Add to Cart yang muncul saat hover */}
      <div className="absolute bottom-0 left-0 w-full p-4 opacity-0 transition-all duration-300 group-hover:opacity-100">
        <Button
          onClick={handleAdd}
          className="w-full rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700"
          aria-label={`Add ${name} to cart`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
