
export function getSellerTier(seller) {
  const reviewCount = seller._count?.reviews || 0;
  const avgRating = seller.avgRating || 0;
  const totalSales = seller.totalSales || 0;

  if (reviewCount >= 50 && avgRating >= 4.5 && totalSales >= 100) {
    return { level: 'EXCELLENT', label: '우수판매자', settlementDays: 3, maxProducts: 999, badge: '🏆' };
  }
  if (reviewCount >= 10 && avgRating >= 4.0) {
    return { level: 'GOOD', label: '일반판매자', settlementDays: 7, maxProducts: 20, badge: '⭐' };
  }
  return { level: 'NEW', label: '신규판매자', settlementDays: 14, maxProducts: 5, badge: '🌱' };
}

export function canCreateProduct(seller, currentProductCount) {
  const tier = getSellerTier(seller);
  return currentProductCount < tier.maxProducts;
}
