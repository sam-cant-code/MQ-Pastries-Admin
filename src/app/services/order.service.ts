import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface OrderItem {
  id: string;
  product: any;
  quantity: number;
  variantName: string;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  borzoOrderId: string;
  createdAt: string;
  items: OrderItem[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/orders`;

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  updateOrderStatus(id: string, status: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${id}/status`, { status });
  }

  requestDelivery(id: string): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/${id}/request-delivery`, {});
  }
}
