import { productImageFromMetadata } from '@/lib/commerce/productImage';

it('accepts only an image retained with an order line and excludes unsafe URLs', () => {
  expect(productImageFromMetadata({ image_url: 'https://cdn.example.com/items/bowl.jpg' })).toBe('https://cdn.example.com/items/bowl.jpg');
  expect(productImageFromMetadata({ image: { src: 'https://cdn.example.com/items/coat.jpg' } })).toBe('https://cdn.example.com/items/coat.jpg');
  expect(productImageFromMetadata({ title: 'Wool coat', sku: 'COAT-01' })).toBeNull();
  expect(productImageFromMetadata({ image_url: 'http://cdn.example.com/coat.jpg' })).toBeNull();
  expect(productImageFromMetadata({ image_url: 'https://127.0.0.1/coat.jpg' })).toBeNull();
  expect(productImageFromMetadata({ image_url: 'https://cdn.example.com/coat.jpg?access_token=secret' })).toBeNull();
});
