import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService, Order } from '../../services/order.service';
import { ProductService, Product } from '../../services/product.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview implements OnInit {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);

  totalOrders = 0;
  totalRevenue = 0;
  activePastries = 0;
  recentOrders: Order[] = [];
  
  loading = true;

  ngOnInit() {
    forkJoin({
      orders: this.orderService.getOrders().pipe(
        catchError(err => {
          console.error('Failed to load orders', err);
          return of([] as Order[]);
        })
      ),
      products: this.productService.getProducts().pipe(
        catchError(err => {
          console.error('Failed to load products', err);
          return of([] as Product[]);
        })
      )
    }).subscribe({
      next: (res) => {
        try {
          const orders = Array.isArray(res.orders) ? res.orders : [];
          const products = Array.isArray(res.products) ? res.products : [];

          this.totalOrders = orders.length;
          this.totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
          
          this.recentOrders = [...orders].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          }).slice(0, 5);

          this.activePastries = products.filter(p => p.status !== 'inactive').length;
        } catch (e) {
          console.error('Error parsing overview data:', e);
        }
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error in overview forkJoin:', err);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
