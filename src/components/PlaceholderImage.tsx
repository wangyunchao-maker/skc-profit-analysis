import { Package } from 'lucide-react';

/** 商品占位图：无图或解析失败时使用 */
export function PlaceholderImage({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded bg-gray-100 text-gray-400 ${className}`}
      aria-hidden="true"
    >
      <Package className="h-1/2 w-1/2" />
    </div>
  );
}

/** 商品图片：优先 URL，其次 base64，否则占位图 */
export function ProductImage({
  image,
  className = 'h-10 w-10',
}: {
  image?: string;
  className?: string;
}) {
  if (image) {
    return <img src={image} alt="" className={`rounded object-contain ${className}`} />;
  }
  return <PlaceholderImage className={className} />;
}