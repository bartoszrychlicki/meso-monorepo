'use client'

import {
  ProductDetailClient,
  type ProductDetailProduct,
} from '../../product/[id]/ProductDetailClient'

interface ProductDetailsProps {
  product: ProductDetailProduct
}

export function ProductDetails({ product }: ProductDetailsProps) {
  return <ProductDetailClient product={product} />
}
