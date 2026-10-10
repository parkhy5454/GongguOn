
export default function RefurbishedBadge({ product }) {
  if (!product.isRefurbished) return null;
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice)*100) : 40;
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">박스 없는 새상품</span>
        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">{discount}% OFF</span>
      </div>
      <p className="text-sm font-medium">사유: {product.refurbReason || '박스 찌그러짐'}</p>
      <p className="text-xs text-gray-500 mt-1">제품은 새거입니다. 박스만 찌그러져서 40% 싸게 드립니다. 하자 사진 정직하게 공개 ↓</p>
      <p className="text-xs line-through text-gray-400">정가 {product.originalPrice?.toLocaleString()}원</p>
    </div>
  );
}
