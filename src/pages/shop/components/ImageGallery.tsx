import { useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
}

export function ImageGallery({ images, alt = "Produit" }: ImageGalleryProps) {
  const [active, setActive] = useState(0);

  const resolvedImages = images.map((img) =>
    img.startsWith("http") ? img : `/uploads/${img}`
  );

  if (resolvedImages.length === 0) {
    return (
      <div className="aspect-square rounded-[var(--shop-radius,0.5rem)] bg-muted flex items-center justify-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-[var(--shop-radius,0.5rem)] bg-muted group">
        <img
          src={resolvedImages[active]}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {resolvedImages.length > 1 && (
          <>
            <button
              onClick={() => setActive((active - 1 + resolvedImages.length) % resolvedImages.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur-sm hover:bg-background transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActive((active + 1) % resolvedImages.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur-sm hover:bg-background transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {resolvedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {resolvedImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === active ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
