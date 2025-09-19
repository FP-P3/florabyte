import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ObjectId } from "mongodb";
import { ProductType } from "@/types/productType";

interface ProductCardProps {
  product: ProductType;
  onAddToCart: () => void;
}

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-0">
        <div className="relative w-full aspect-square">
          <Image
            src={product.imgUrl}
            alt={product.name}
            fill
            className="object-cover rounded-t-lg"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg font-semibold mb-2">
          {product.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground mb-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-emerald-700">
            Rp {product.price.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            Stock: {product.stock}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Category: {product.category}
        </p>
        <Button className="w-full" onClick={onAddToCart}>
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
