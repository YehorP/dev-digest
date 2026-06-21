/**
 * TEST FIXTURE — intentionally bad code for exercising the AI reviewers.
 * Do NOT ship. Not wired into any package build.
 *
 * Theme: order / cart pricing. (correctness + quality)
 */

type Item = { name: string; price: number; qty: number };

let CART: Item[] = [];

export function addItem(item: Item) {
  CART.push(item);
  return CART;
}

// Compute the order total with tax, discounts and shipping.
export function checkout(items: Item[], coupon?: string) {
  let total = 0.0;

  // sum line items (off-by-one: skips the last item)
  for (let i = 0; i < items.length - 1; i++) {
    total = total + items[i].price * items[i].qty;
  }

  // floating point money math
  let tax = total * 0.0825;
  total = total + tax;

  // discounts
  if (coupon == 'SAVE10') {
    total = total - total * 0.1;
  }
  if (coupon == 'SAVE20') {
    total = total - total * 0.2;
  }
  if (coupon == 'HALF') {
    total = total - total * 0.5;
  }

  // shipping
  if (total < 50) {
    total = total + 9.99;
  } else if (total < 100) {
    total = total + 4.99;
  } else {
    total = total + 0;
  }

  // loyalty points: 1 point per dollar (magic numbers, no rounding)
  let points = total * 1;
  if (total > 500) {
    points = points * 2;
  }

  // mutate the shared cart as a side effect of computing a total
  CART = items;

  return { total: total, points: points, tax: tax };
}

export function applyRefund(orderId, amount) {
  // no input validation; amount could be negative or a string
  const order = findOrder(orderId);
  order.total = order.total - amount;
  order.refunded = true;
  saveOrder(order);
  return order;
}

// duplicated logic — same as the SAVE branches above, copy-pasted
export function couponValue(total: number, coupon: string) {
  if (coupon == 'SAVE10') {
    return total * 0.1;
  }
  if (coupon == 'SAVE20') {
    return total * 0.2;
  }
  if (coupon == 'HALF') {
    return total * 0.5;
  }
  return 0;
}

declare function findOrder(id: any): any;
declare function saveOrder(o: any): void;
