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
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (res) => {
        const orders = res.orders || [];
        const products = res.products || [];

        this.totalOrders = orders.length;
        this.totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        this.recentOrders = [...orders].sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }).slice(0, 5);

        this.activePastries = products.filter(p => p.status !== 'inactive').length;
      }
    });
  }
}
